import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBriefingStore, useAuthStore, useUIStore } from '@/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { persistReportAndPainsToSupabase } from '@/lib/reportSupabase';
import type { AgentLog } from '@/types';

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

export default function ScoutLab({ onNavigate }: ScoutLabProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentTask, setCurrentTask] = useState('');
  const [crawlFromBriefingDone, setCrawlFromBriefingDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isComplete: briefingComplete, briefingData, briefingId, researchWebhookPromise, researchResult, reportHistory, setResearchWebhookPromise, setWebhookPayload } = useBriefingStore();
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
        if (data != null) {
          setWebhookPayload(data);
          persistReportAndPainsToSupabase(user?.id ?? '', briefingId ?? null, data).catch(console.error);
        }
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-16 lg:w-64 border-r border-border bg-sidebar flex-shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3"
          >
            <img src="/favicon.svg" alt="PainScope AI" className="w-10 h-10 rounded-xl flex-shrink-0" />
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

          {/* Terminal - single view; empty state when no active job */}
          <div className="glass rounded-xl p-4 font-mono text-sm min-h-[320px] max-h-[500px] overflow-y-auto scrollbar-thin">
            {logs.length === 0 && !isRunning && !researchWebhookPromise ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Terminal className="w-14 h-14 text-muted-foreground/60 mb-4" />
                <p className="text-muted-foreground font-medium mb-1">There’s no active crawling job</p>
                <p className="text-sm text-muted-foreground/80 mb-6 max-w-sm">
                  Complete a briefing and start research to run a scout. Results will appear here and in Pain Library.
                </p>
                <Button
                  onClick={() => onNavigate('briefing')}
                  className="bg-lime text-background hover:bg-lime-light"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Go to Briefing
                </Button>
              </div>
            ) : (
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
            )}
          </div>

          {/* Action: go to Library when we have report history */}
          {!isRunning && reportHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex justify-end"
            >
              <Button
                onClick={() => onNavigate('library')}
                className="bg-lime text-background hover:bg-lime-light"
              >
                View in Pain Library
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
