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
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBriefingStore, useAuthStore, useUIStore } from '@/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AgentLog, PainArchetype, PainSource } from '@/types';

interface ScoutLabProps {
  onNavigate: (route: 'landing' | 'dashboard' | 'briefing' | 'scout' | 'library' | 'settings', queryParams?: Record<string, string>) => void;
  currentRoute: string;
}

// Dummy crawl lines shown after briefing submit (n8n + FireCrawl workflow running)
const CRAWL_FROM_BRIEFING_LOGS: { level: AgentLog['level']; message: string }[] = [
  { level: 'info', message: 'Initializing FireCrawl pipeline...' },
  { level: 'success', message: 'Connected to FireCrawl API' },
  { level: 'info', message: 'Crawling https://www.g2.com — product reviews & comparisons' },
  { level: 'info', message: 'Fetching https://www.capterra.com — software insights' },
  { level: 'success', message: 'G2 & Capterra: 12 pages indexed' },
  { level: 'info', message: 'Crawling Reddit r/SaaS, r/startups — community discussions' },
  { level: 'success', message: 'Reddit: 47 threads analyzed' },
  { level: 'info', message: 'Scanning Hacker News — tech & founder sentiment' },
  { level: 'success', message: 'Hacker News: 8 relevant threads' },
  { level: 'info', message: 'Parsing LinkedIn articles — B2B pain mentions' },
  { level: 'info', message: 'Extracting pain points from review snippets...' },
  { level: 'success', message: 'NLP clustering: 6 pain themes identified' },
  { level: 'info', message: 'Scoring by severity, frequency, urgency...' },
  { level: 'success', message: 'PainScore matrix computed' },
  { level: 'info', message: 'Estimating revenue potential (TAM/SAM/SOM)...' },
  { level: 'success', message: 'Discovery complete. Sending results to Library.' },
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

/** Normalize webhook pain item for ScoutLab display */
function normalizeWebhookPain(p: Record<string, unknown>): PainArchetype {
  const id = (p.id as string) ?? `pain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const ts = p.topSource as Record<string, unknown> | undefined;
  const sources: PainSource[] = ts ? [{
    id: 's-0',
    url: (ts.url as string) ?? '',
    title: (ts.title as string) ?? (ts.name as string) ?? '',
    platform: ((ts.name as string)?.toLowerCase() === 'web' ? 'forum' : (ts.name as string)?.toLowerCase() === 'news' ? 'news' : 'forum') as PainSource['platform'],
    snippet: (p.description as string) ?? '',
    sentiment: 'negative' as const,
    date: p.timestamp ? new Date(p.timestamp as string) : new Date(),
  }] : [];
  const rev = p.revenuePotential as Record<string, unknown> | undefined;
  const revRaw = rev?.raw ? Number(rev.raw) : 0;
  const painScore = Number(p.painScore ?? p.pain_score) ?? 0;
  return {
    id,
    name: (p.archetype as string) ?? (p.name as string) ?? '',
    description: (p.description as string) ?? '',
    painScore,
    severity: Number(p.severity) ?? 0,
    frequency: Number(p.frequency) ?? 0,
    urgency: Number(p.urgency) ?? 0,
    competitiveSaturation: Number(p.competitiveSaturation ?? p.competitive_saturation) ?? 0,
    sources,
    revenuePotential: {
      tam: revRaw * 10,
      sam: revRaw * 2.5,
      som: revRaw * 0.5,
      estimatedARR: revRaw,
      confidence: 0.7,
    },
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
    createdAt: p.timestamp ? new Date(p.timestamp as string) : new Date(),
    frequencyHistory: [painScore * 0.5, painScore * 0.6, painScore * 0.7, painScore * 0.8, painScore * 0.9, painScore],
  };
}

export default function ScoutLab({ onNavigate }: ScoutLabProps) {
  const [activeTab, setActiveTab] = useState('terminal');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [discoveredPains, setDiscoveredPains] = useState<PainArchetype[]>([]);
  const [currentTask, setCurrentTask] = useState('');
  const [crawlFromBriefingDone, setCrawlFromBriefingDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isComplete: briefingComplete, briefingData, researchWebhookPromise, researchResult, reportHistory, dashboardMetrics, setResearchWebhookPromise, setWebhookPayload } = useBriefingStore();
  const { user } = useAuthStore();
  const { addNotification } = useUIStore();

  // Detect if we just came from briefing submission (active crawl)
  const isActivelyCrawling = briefingComplete && !!briefingData.industry && !crawlFromBriefingDone;
  
  // Load last scrape data when not crawling
  useEffect(() => {
    // Skip if we're actively crawling (waiting for webhook)
    if (isActivelyCrawling && researchWebhookPromise) return;
    
    // Try to load from researchResult first
    if (researchResult && typeof researchResult === 'object') {
      const payload = researchResult as Record<string, unknown>;
      const pains = (payload.painLibrary ?? payload.pains) as Record<string, unknown>[] | undefined;
      if (Array.isArray(pains) && pains.length > 0) {
        setDiscoveredPains(pains.map(normalizeWebhookPain));
        setProgress(100);
        setIsRunning(false);
        const metrics = payload.dashboardMetrics as Record<string, unknown> | undefined;
        setCurrentTask(`Last scan: ${pains.length} pains discovered • ${metrics?.sourcesAnalyzed ?? 0} sources analyzed`);
        
        // Generate completion logs from last scrape
        const timestamp = new Date();
        setLogs([
          { id: 'complete-1', timestamp: new Date(timestamp.getTime() - 60000), level: 'success', message: 'FireCrawl pipeline completed', metadata: {} },
          { id: 'complete-2', timestamp: new Date(timestamp.getTime() - 45000), level: 'success', message: `Analyzed ${metrics?.sourcesAnalyzed ?? 0} sources`, metadata: {} },
          { id: 'complete-3', timestamp: new Date(timestamp.getTime() - 30000), level: 'success', message: `Discovered ${pains.length} pain archetypes`, metadata: {} },
          { id: 'complete-4', timestamp: new Date(timestamp.getTime() - 15000), level: 'info', message: `Average PainScore: ${metrics?.avgPainScore ?? metrics?.averagePainScore ?? 0}`, metadata: {} },
          { id: 'complete-5', timestamp, level: 'success', message: 'Results available in Pain Library', metadata: {} },
        ]);
        return;
      }
    }
    
    // Fallback to report history if no active researchResult
    if (reportHistory.length > 0) {
      const lastReport = reportHistory[0];
      setProgress(100);
      setIsRunning(false);
      setCurrentTask(`Last report: ${lastReport.painCount} pains • Avg score ${lastReport.avgPainScore}`);
      setLogs([
        { id: 'hist-1', timestamp: lastReport.timestamp, level: 'success', message: `Report generated: ${lastReport.topPain || 'Market Research'}`, metadata: {} },
        { id: 'hist-2', timestamp: lastReport.timestamp, level: 'info', message: `${lastReport.painCount} pain archetypes discovered`, metadata: {} },
        { id: 'hist-3', timestamp: lastReport.timestamp, level: 'info', message: `Average PainScore: ${lastReport.avgPainScore}`, metadata: {} },
      ]);
    } else {
      // No data at all - show empty state
      setProgress(0);
      setIsRunning(false);
      setCurrentTask('No active crawl. Start a briefing to begin discovery.');
      setLogs([]);
      setDiscoveredPains([]);
    }
  }, [isActivelyCrawling, researchResult, reportHistory]);

  const isCrawlingFromBriefing = isActivelyCrawling;

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

  // After briefing submit: show cmd/crawl effect while waiting for Respond to Webhook; when data arrives → Library
  useEffect(() => {
    if (!isCrawlingFromBriefing || crawlFromBriefingDone) return;

    // Start the crawl animation
    setIsRunning(true);
    setLogs([]);
    setProgress(0);
    setCurrentTask('Initializing FireCrawl pipeline...');
    setDiscoveredPains([]);

    const promise = researchWebhookPromise;
    if (!promise) {
      // No webhook promise - shouldn't happen with default URL, but handle gracefully
      setCurrentTask('Waiting for webhook connection...');
      const timeout = setTimeout(() => {
        setCrawlFromBriefingDone(true);
        setIsRunning(false);
        onNavigate('library');
      }, 3000);
      return () => clearTimeout(timeout);
    }

    // Stream crawl lines until promise resolves (Respond to Webhook returns)
    let logIndex = 0;
    const crawlLines = [...CRAWL_FROM_BRIEFING_LOGS];
    const iv = setInterval(() => {
      const i = logIndex % crawlLines.length;
      const entry = crawlLines[i];
      setLogs((prev) => [
        ...prev,
        { id: `crawl-${Date.now()}-${i}`, timestamp: new Date(), level: entry.level, message: entry.message, metadata: {} },
      ]);
      setCurrentTask(entry.message);
      setProgress(Math.min(95, (logIndex + 1) * 6));
      logIndex++;
    }, 1200);

    let cancelled = false;
    promise
      .then((data) => {
        if (cancelled) return;
        clearInterval(iv);
        setResearchWebhookPromise(null);
        if (data != null) setWebhookPayload(data);
        setLogs((prev) => [
          ...prev,
          {
            id: 'crawl-done',
            timestamp: new Date(),
            level: 'success',
            message: 'Discovery complete. Sending results to Library.',
            metadata: {},
          },
        ]);
        setCurrentTask('Discovery complete. Sending results to Library.');
        setProgress(100);
        // Pains will be loaded from webhook data via setWebhookPayload
        setIsRunning(false);
        setCrawlFromBriefingDone(true);
        onNavigate('library');
      })
      .catch((err) => {
        if (cancelled) return;
        clearInterval(iv);
        setResearchWebhookPromise(null);
        setCurrentTask(`Error: ${err?.message || 'Webhook failed'}. Redirecting to library...`);
        setIsRunning(false);
        setCrawlFromBriefingDone(true);
        setTimeout(() => onNavigate('library'), 2000);
      });

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [isCrawlingFromBriefing, crawlFromBriefingDone, researchWebhookPromise, setResearchWebhookPromise, setWebhookPayload, addNotification, onNavigate]);

  // Optionally load from Supabase if we have data there
  useEffect(() => {
    if (isCrawlingFromBriefing) return;
    fetchFromSupabase();
  }, [isCrawlingFromBriefing, fetchFromSupabase]);

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

          {/* Last report insight - View full report when not crawling */}
          {!isCrawlingFromBriefing && reportHistory.length > 0 && reportHistory[0].comprehensiveReport && (
            <div className="mb-6 p-4 rounded-xl glass border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-lime" />
                </div>
                <div>
                  <p className="font-medium">Latest report ready</p>
                  <p className="text-sm text-muted-foreground">
                    {reportHistory[0].painCount} pains • Avg score {reportHistory[0].avgPainScore} • {reportHistory[0].topPain || 'Market Research'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-lime text-lime hover:bg-lime/10"
                onClick={() => onNavigate('library', { report: 'full' })}
              >
                <FileText className="w-4 h-4 mr-2" />
                View full report
              </Button>
            </div>
          )}

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
                    <p className="mb-2">{isRunning ? 'Discovering pains...' : 'No pain data available'}</p>
                    {!isRunning && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate('briefing')}
                        className="mt-4"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Start New Briefing
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="visualization" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Key Metrics Summary */}
                <div className="glass rounded-xl p-6 lg:col-span-2">
                  <h3 className="font-semibold mb-4">Discovery Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-lime/10 text-center">
                      <p className="text-3xl font-bold text-lime">{discoveredPains.length}</p>
                      <p className="text-xs text-muted-foreground">Pains Discovered</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 text-center">
                      <p className="text-3xl font-bold">{discoveredPains.length > 0 ? Math.round(discoveredPains.reduce((a, p) => a + p.painScore, 0) / discoveredPains.length) : 0}</p>
                      <p className="text-xs text-muted-foreground">Avg PainScore</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 text-center">
                      <p className="text-3xl font-bold">{dashboardMetrics?.sourcesAnalyzed ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Sources Analyzed</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 text-center">
                      <p className="text-3xl font-bold">${discoveredPains.length > 0 ? (discoveredPains.reduce((a, p) => a + p.revenuePotential.estimatedARR, 0) / 1000000).toFixed(0) : 0}M</p>
                      <p className="text-xs text-muted-foreground">Total Est. ARR</p>
                    </div>
                  </div>
                </div>
                
                {/* PainScore Radar */}
                <div className="glass rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Pain Intensity Matrix</h3>
                  <div className="h-[300px] flex items-center justify-center">
                    <PainRadar pains={discoveredPains} />
                  </div>
                </div>

                {/* Revenue Potential */}
                <div className="glass rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Revenue Potential by Pain</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {discoveredPains.slice(0, 8).map((pain, index) => (
                      <div key={pain.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm truncate max-w-[200px]">{pain.name}</span>
                          <span className="text-sm font-medium text-lime">${(pain.revenuePotential.estimatedARR / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-lime to-lime-light"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((pain.revenuePotential.estimatedARR / 100000000) * 100, 100)}%` }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                          />
                        </div>
                      </div>
                    ))}
                    {discoveredPains.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No data available yet</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Pain Distribution by Urgency */}
                <div className="glass rounded-xl p-6 lg:col-span-2">
                  <h3 className="font-semibold mb-4">Pain Distribution</h3>
                  <div className="flex gap-2 flex-wrap">
                    {discoveredPains.map((pain) => (
                      <motion.div
                        key={pain.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium ${
                          pain.painScore >= 20 ? 'bg-red-500/20 text-red-400' :
                          pain.painScore >= 15 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {pain.name} ({pain.painScore})
                      </motion.div>
                    ))}
                    {discoveredPains.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground w-full">
                        <p>Complete a briefing to see pain distribution</p>
                      </div>
                    )}
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
