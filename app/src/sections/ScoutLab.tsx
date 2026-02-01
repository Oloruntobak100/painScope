import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  RotateCcw,
  Search,
  Globe,
  MessageSquare,
  Newspaper,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBriefingStore, useAuthStore } from '@/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AgentLog, PainArchetype, PainSource } from '@/types';

interface ScoutLabProps {
  onNavigate: (route: 'landing' | 'dashboard' | 'briefing' | 'scout' | 'library' | 'settings') => void;
  currentRoute: string;
}

// Calculate PainScore
const calculatePainScore = (
  severity: number,
  frequency: number,
  urgency: number,
  competitiveSaturation: number,
  weights = { w1: 0.4, w2: 0.3, w3: 0.3 }
): number => {
  const weightedSum = (severity * weights.w1) + (frequency * weights.w2) + (urgency * weights.w3);
  const score = weightedSum / Math.max(competitiveSaturation, 0.1);
  return Math.min(Math.round(score * 10), 100);
};

// Mock agent logs
const generateMockLogs = (agentId: string): AgentLog[] => [
  { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 5), level: 'info', message: 'Agent initialized', metadata: { agentId } },
  { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 4), level: 'info', message: 'Connecting to data sources...', metadata: {} },
  { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 3), level: 'success', message: 'Connected to Reddit API', metadata: { platform: 'reddit' } },
  { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 2), level: 'info', message: 'Crawling r/fintech for pain mentions...', metadata: { subreddit: 'fintech' } },
  { id: '5', timestamp: new Date(Date.now() - 1000 * 60 * 1), level: 'success', message: 'Found 23 potential pain points', metadata: { count: 23 } },
  { id: '6', timestamp: new Date(Date.now() - 1000 * 30), level: 'info', message: 'Clustering sentiments using NLP...', metadata: {} },
  { id: '7', timestamp: new Date(Date.now() - 1000 * 15), level: 'success', message: 'Identified 5 pain archetypes', metadata: { archetypes: 5 } },
  { id: '8', timestamp: new Date(), level: 'info', message: 'Scoring pains by severity, frequency, urgency...', metadata: {} },
];

// Mock discovered pains
const generateMockPains = (): PainArchetype[] => [
  {
    id: 'pain-1',
    name: 'Payment friction in B2B invoices',
    description: 'Businesses struggle with manual invoice processing, delayed payments, and lack of visibility into payment status.',
    painScore: calculatePainScore(8.5, 7.2, 8.0, 2.1),
    severity: 8.5,
    frequency: 7.2,
    urgency: 8.0,
    competitiveSaturation: 2.1,
    sources: [
      { id: 's1', url: 'https://reddit.com/r/fintech/comments/abc123', title: 'Invoice pain points', platform: 'reddit', snippet: 'We spend 20 hours a week just processing invoices...', sentiment: 'negative', date: new Date() },
      { id: 's2', url: 'https://twitter.com/user/status/123', title: 'B2B payment rant', platform: 'twitter', snippet: 'Why is paying vendors still so hard in 2025?', sentiment: 'negative', date: new Date() },
    ],
    revenuePotential: { tam: 50000000000, sam: 12000000000, som: 500000000, estimatedARR: 25000000, confidence: 0.78 },
    tags: ['payments', 'b2b', 'invoicing', 'automation'],
    createdAt: new Date(),
    frequencyHistory: [45, 52, 48, 61, 72, 87],
  },
  {
    id: 'pain-2',
    name: 'Lack of real-time collaboration',
    description: 'Remote teams need better tools for synchronous document editing and decision-making.',
    painScore: calculatePainScore(7.8, 8.5, 6.5, 4.2),
    severity: 7.8,
    frequency: 8.5,
    urgency: 6.5,
    competitiveSaturation: 4.2,
    sources: [
      { id: 's3', url: 'https://news.ycombinator.com/item?id=123', title: 'Collaboration tools discussion', platform: 'forum', snippet: 'Still waiting for the perfect real-time collaboration tool...', sentiment: 'negative', date: new Date() },
    ],
    revenuePotential: { tam: 35000000000, sam: 8000000000, som: 300000000, estimatedARR: 15000000, confidence: 0.65 },
    tags: ['collaboration', 'remote-work', 'productivity'],
    createdAt: new Date(),
    frequencyHistory: [30, 35, 42, 55, 68, 76],
  },
  {
    id: 'pain-3',
    name: 'Complex onboarding flows',
    description: 'Users abandon products due to lengthy and confusing onboarding experiences.',
    painScore: calculatePainScore(7.2, 6.8, 7.5, 3.5),
    severity: 7.2,
    frequency: 6.8,
    urgency: 7.5,
    competitiveSaturation: 3.5,
    sources: [
      { id: 's4', url: 'https://g2.com/reviews/saas-product', title: 'User review', platform: 'review', snippet: 'Great product but onboarding took way too long', sentiment: 'negative', date: new Date() },
    ],
    revenuePotential: { tam: 20000000000, sam: 5000000000, som: 200000000, estimatedARR: 10000000, confidence: 0.72 },
    tags: ['onboarding', 'ux', 'retention'],
    createdAt: new Date(),
    frequencyHistory: [25, 32, 38, 45, 58, 71],
  },
];

function mapDbPainToArchetype(row: Record<string, unknown>, sources: PainSource[]): PainArchetype {
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  const hist = Array.isArray(row.frequency_history) ? (row.frequency_history as number[]) : [];
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    description: (row.description as string) ?? '',
    painScore: Number(row.pain_score) ?? 0,
    severity: Number(row.severity) ?? 0,
    frequency: Number(row.frequency) ?? 0,
    urgency: Number(row.urgency) ?? 0,
    competitiveSaturation: Number(row.competitive_saturation) ?? 0,
    sources,
    revenuePotential: {
      tam: Number(row.tam) ?? 0,
      sam: Number(row.sam) ?? 0,
      som: Number(row.som) ?? 0,
      estimatedARR: Number(row.estimated_arr) ?? 0,
      confidence: Number(row.confidence) ?? 0,
    },
    tags,
    createdAt: new Date((row.created_at as string) ?? Date.now()),
    frequencyHistory: hist,
  };
}

export default function ScoutLab({ onNavigate }: ScoutLabProps) {
  const [activeTab, setActiveTab] = useState('terminal');
  const [isRunning, setIsRunning] = useState(true);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [discoveredPains, setDiscoveredPains] = useState<PainArchetype[]>([]);
  const [currentTask, setCurrentTask] = useState('Initializing agent...');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useBriefingStore();
  const { user } = useAuthStore();

  const fetchFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) return false;
    const { data: jobs } = await supabase
      .from('agent_jobs')
      .select('id, status, current_task, progress, started_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const job = jobs?.[0];
    if (!job) return false;

    const { data: logRows } = await supabase
      .from('agent_logs')
      .select('id, level, message, created_at')
      .eq('agent_job_id', job.id)
      .order('created_at', { ascending: true });
    const agentLogs: AgentLog[] = (logRows ?? []).map((r) => ({
      id: r.id,
      level: (r.level as AgentLog['level']) ?? 'info',
      message: r.message ?? '',
      timestamp: new Date(r.created_at ?? 0),
      metadata: {},
    }));
    setLogs(agentLogs);
    setCurrentTask((job.current_task as string) ?? 'Running...');
    setProgress(Number(job.progress) ?? 0);
    const running = (job.status as string) === 'running';
    setIsRunning(running);

    const { data: painRows } = await supabase
      .from('pain_archetypes')
      .select('*')
      .eq('agent_job_id', job.id);
    if (painRows && painRows.length > 0) {
      const pains: PainArchetype[] = [];
      for (const p of painRows) {
        const { data: srcRows } = await supabase
          .from('pain_sources')
          .select('*')
          .eq('pain_archetype_id', p.id);
        const sources: PainSource[] = (srcRows ?? []).map((s) => ({
          id: s.id,
          url: s.url ?? '',
          title: (s.title as string) ?? '',
          platform: (s.platform as PainSource['platform']) ?? 'forum',
          snippet: (s.snippet as string) ?? '',
          sentiment: (s.sentiment as PainSource['sentiment']) ?? 'neutral',
          date: new Date((s.source_date as string) ?? Date.now()),
        }));
        pains.push(mapDbPainToArchetype(p, sources));
      }
      setDiscoveredPains(pains);
    }
    return true;
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const hasData = await fetchFromSupabase();
      if (mounted && !hasData) {
        const mockLogs = generateMockLogs('agent-1');
        const mockPains = generateMockPains();
        let logIndex = 0;
        const iv = setInterval(() => {
          if (logIndex < mockLogs.length) {
            setLogs((prev) => [...prev, mockLogs[logIndex]]);
            setCurrentTask(mockLogs[logIndex].message);
            setProgress(Math.round(((logIndex + 1) / mockLogs.length) * 100));
            logIndex++;
          } else {
            clearInterval(iv);
            setDiscoveredPains(mockPains);
            setIsRunning(false);
          }
        }, 1500);
      }
    })();
    return () => { mounted = false; };
  }, [fetchFromSupabase]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !user || !isRunning) return;
    pollRef.current = setInterval(fetchFromSupabase, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isRunning, user, fetchFromSupabase]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (level: AgentLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'reddit':
        return <MessageSquare className="w-4 h-4" />;
      case 'twitter':
        return <TrendingUp className="w-4 h-4" />;
      case 'news':
        return <Newspaper className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-16 lg:w-64 border-r border-border bg-sidebar flex-shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime to-lime-light flex items-center justify-center">
              <span className="text-background font-bold">PS</span>
            </div>
            <span className="font-semibold text-lg hidden lg:block">PainScope AI</span>
          </button>
        </div>
        <nav className="p-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <span className="text-sm hidden lg:block">← Back to Dashboard</span>
            <span className="lg:hidden">←</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-lime" />
            </div>
            <div>
              <h1 className="font-semibold">Scout Lab</h1>
              <p className="text-sm text-muted-foreground">Agentic Discovery Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isRunning && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime/10">
                <Loader2 className="w-4 h-4 text-lime animate-spin" />
                <span className="text-sm text-lime">Running</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogs([])}
              disabled={isRunning}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Discovery Progress</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-lime to-lime-light progress-bar-animated"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Current Task */}
          <div className="mb-6 p-4 rounded-lg bg-lime/5 border border-lime/20">
            <div className="flex items-center gap-3">
              {isRunning ? (
                <Loader2 className="w-5 h-5 text-lime animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              <span className="font-mono text-sm">{currentTask}</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="mb-4">
              <TabsTrigger value="terminal" className="gap-2">
                <Terminal className="w-4 h-4" />
                Terminal
              </TabsTrigger>
              <TabsTrigger value="discovered" className="gap-2">
                <Search className="w-4 h-4" />
                Discovered
                {discoveredPains.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{discoveredPains.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="visualization" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Visualization
              </TabsTrigger>
            </TabsList>

            <TabsContent value="terminal" className="mt-0">
              <div className="glass rounded-xl p-4 font-mono text-sm h-[500px] overflow-y-auto scrollbar-thin">
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {getLogIcon(log.level)}
                      <span className={`
                        ${log.level === 'success' ? 'text-green-400' : ''}
                        ${log.level === 'error' ? 'text-red-400' : ''}
                        ${log.level === 'warning' ? 'text-yellow-400' : ''}
                        ${log.level === 'info' ? 'text-blue-400' : ''}
                      `}>
                        {log.message}
                      </span>
                    </motion.div>
                  ))}
                  {isRunning && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-lime rounded-full animate-pulse" />
                      <span className="text-lime animate-pulse">_</span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="discovered" className="mt-0">
              <div className="grid gap-4">
                {discoveredPains.map((pain, index) => (
                  <motion.div
                    key={pain.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass rounded-xl p-6 card-hover"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{pain.name}</h3>
                        <p className="text-sm text-muted-foreground">{pain.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-lime">{pain.painScore}</div>
                        <p className="text-xs text-muted-foreground">PainScore</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <ScoreBadge label="Severity" value={pain.severity} />
                      <ScoreBadge label="Frequency" value={pain.frequency} />
                      <ScoreBadge label="Urgency" value={pain.urgency} />
                      <ScoreBadge label="Competition" value={pain.competitiveSaturation} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pain.sources.map((source, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {getPlatformIcon(source.platform)}
                            {source.platform}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${(pain.revenuePotential.estimatedARR / 1000000).toFixed(1)}M</p>
                        <p className="text-xs text-muted-foreground">Est. ARR</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {discoveredPains.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Waiting for agent to discover pains...</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="visualization" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* PainScore Radar */}
                <div className="glass rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Pain Intensity Matrix</h3>
                  <div className="h-[300px] flex items-center justify-center">
                    <PainRadar pains={discoveredPains} />
                  </div>
                </div>

                {/* Revenue Potential */}
                <div className="glass rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Revenue Potential</h3>
                  <div className="space-y-4">
                    {discoveredPains.map((pain, index) => (
                      <div key={pain.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">{pain.name}</span>
                          <span className="text-sm font-medium">${(pain.revenuePotential.estimatedARR / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-lime to-lime-light"
                            initial={{ width: 0 }}
                            animate={{ width: `${(pain.revenuePotential.estimatedARR / 30000000) * 100}%` }}
                            transition={{ delay: index * 0.2, duration: 0.5 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          {!isRunning && discoveredPains.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex justify-end gap-3"
            >
              <Button
                variant="outline"
                onClick={() => onNavigate('briefing')}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                New Briefing
              </Button>
              <Button
                onClick={() => onNavigate('library')}
                className="bg-lime text-background hover:bg-lime-light"
              >
                <Zap className="w-4 h-4 mr-2" />
                View in Library
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 8) return 'text-red-400';
    if (v >= 6) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="text-center p-2 rounded-lg bg-secondary/30">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${getColor(value)}`}>{value.toFixed(1)}</p>
    </div>
  );
}

// Simple Radar Chart Component
function PainRadar({ pains }: { pains: PainArchetype[] }) {
  if (pains.length === 0) {
    return (
      <div className="text-muted-foreground text-center">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>No data available yet</p>
      </div>
    );
  }

  const maxValue = 10;
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  const axes = ['Severity', 'Frequency', 'Urgency', 'Competition'];

  const getPoint = (value: number, index: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const r = (value / maxValue) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  return (
    <svg width="300" height="300" className="mx-auto">
      {/* Background grid */}
      {[2, 4, 6, 8, 10].map((level) => (
        <polygon
          key={level}
          points={axes.map((_, i) => {
            const point = getPoint(level, i);
            return `${point.x},${point.y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(200, 230, 0, 0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Axes */}
      {axes.map((axis, i) => {
        const end = getPoint(maxValue, i);
        return (
          <line
            key={axis}
            x1={centerX}
            y1={centerY}
            x2={end.x}
            y2={end.y}
            stroke="rgba(200, 230, 0, 0.2)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const pos = getPoint(maxValue + 1.5, i);
        return (
          <text
            key={`label-${axis}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-xs"
          >
            {axis}
          </text>
        );
      })}

      {/* Data polygons for each pain */}
      {pains.slice(0, 3).map((pain, painIndex) => {
        const values = [pain.severity, pain.frequency, pain.urgency, pain.competitiveSaturation];
        const points = values.map((v, i) => getPoint(v, i));
        const opacity = 0.3 - painIndex * 0.1;
        
        return (
          <g key={pain.id}>
            <polygon
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill={`rgba(200, 230, 0, ${opacity})`}
              stroke="#C8E600"
              strokeWidth="2"
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#C8E600"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
