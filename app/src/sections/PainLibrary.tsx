import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Database,
  MessageSquare,
  Twitter,
  Linkedin,
  Newspaper,
  Star,
  X,
  Zap,
  Building2,
  BarChart3,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore, usePainLibraryStore, useBriefingStore } from '@/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PainArchetype, PainSource } from '@/types';

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

/** Normalize webhook pain item (may use camelCase/snake_case, string dates) to PainArchetype */
function normalizePainArchetype(p: PainArchetype | Record<string, unknown>): PainArchetype {
  const r = p as Record<string, unknown>;
  const id = (r.id as string) ?? `pain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  // Handle both sources array and topSource object from n8n
  let sources: PainSource[] = [];
  if (Array.isArray(r.sources)) {
    sources = (r.sources as Record<string, unknown>[]).map((s, i) => ({
      id: (s.id as string) ?? `s-${i}`,
      url: (s.url as string) ?? '',
      title: (s.title as string) ?? '',
      platform: ((s.platform as string) ?? 'forum') as PainSource['platform'],
      snippet: (s.snippet as string) ?? '',
      sentiment: ((s.sentiment as string) ?? 'neutral') as PainSource['sentiment'],
      date: s.date ? new Date(s.date as string | number) : new Date(),
    }));
  } else if (r.topSource && typeof r.topSource === 'object') {
    const ts = r.topSource as Record<string, unknown>;
    sources = [{
      id: 's-0',
      url: (ts.url as string) ?? '',
      title: (ts.title as string) ?? (ts.name as string) ?? '',
      platform: ((ts.name as string)?.toLowerCase() === 'web' ? 'forum' : (ts.name as string)?.toLowerCase() === 'news' ? 'news' : 'forum') as PainSource['platform'],
      snippet: (r.description as string) ?? '',
      sentiment: 'negative' as const,
      date: r.timestamp ? new Date(r.timestamp as string) : new Date(),
    }];
  }
  
  // Handle revenuePotential from n8n (estimate/raw/label only; no tam/sam/som - derive to avoid NaN)
  const rev = (r.revenuePotential ?? r.revenue_potential) as Record<string, unknown> | undefined;
  const revRaw = rev?.raw != null ? Number(rev.raw) : (rev?.estimatedARR ?? rev?.estimated_arr != null ? Number(rev.estimatedARR ?? rev.estimated_arr) : 0);
  const revNum = Number.isFinite(revRaw) ? revRaw : 0;
  const tam = Number(rev?.tam);
  const sam = Number(rev?.sam);
  const som = Number(rev?.som);
  const conf = Number(rev?.confidence);

  const tags = Array.isArray(r.tags) ? (r.tags as string[]) : [];
  const hist = Array.isArray(r.frequencyHistory)
    ? (r.frequencyHistory as number[])
    : Array.isArray(r.frequency_history)
      ? (r.frequency_history as number[])
      : [];
  
  const painScore = Number(r.painScore ?? r.pain_score) ?? 0;
  
  return {
    id,
    name: (r.archetype as string) ?? (r.name as string) ?? '',
    description: (r.description as string) ?? '',
    painScore,
    severity: Number(r.severity) ?? 0,
    frequency: Number(r.frequency) ?? 0,
    urgency: Number(r.urgency) ?? 0,
    competitiveSaturation: Number(r.competitiveSaturation ?? r.competitive_saturation) ?? 0,
    sources,
    revenuePotential: {
      tam: Number.isFinite(tam) ? tam : revNum * 10,
      sam: Number.isFinite(sam) ? sam : revNum * 2.5,
      som: Number.isFinite(som) ? som : revNum * 0.5,
      estimatedARR: revNum,
      confidence: Number.isFinite(conf) ? conf : 0.7,
    },
    tags,
    createdAt: r.createdAt || r.created_at || r.timestamp ? new Date((r.createdAt ?? r.created_at ?? r.timestamp) as string | number) : new Date(),
    frequencyHistory: hist.length ? hist : [painScore * 0.5, painScore * 0.6, painScore * 0.7, painScore * 0.8, painScore * 0.9, painScore],
    opportunityNote: typeof r.opportunityNote === 'string' ? r.opportunityNote : undefined,
    existingSolutions: typeof r.existingSolutions === 'string' ? r.existingSolutions : undefined,
    quotes: Array.isArray(r.quotes) ? (r.quotes as string[]) : undefined,
  };
}

interface PainLibraryProps {
  onNavigate: (route: 'landing' | 'dashboard' | 'briefing' | 'scout' | 'library' | 'settings') => void;
  currentRoute: string;
}

// No mock data - only display real webhook data

const platformIcons: Record<string, React.ElementType> = {
  reddit: MessageSquare,
  twitter: Twitter,
  linkedin: Linkedin,
  news: Newspaper,
  forum: MessageSquare,
  review: Star,
};

export default function PainLibrary({ onNavigate }: PainLibraryProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'painScore' | 'frequency' | 'date'>('painScore');
  const [selectedPain, setSelectedPain] = useState<PainArchetype | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pains, setPains] = useState<PainArchetype[]>([]);
  const [reportSidebarOpen, setReportSidebarOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const [fullReportContent, setFullReportContent] = useState<string | null>(null);
  const itemsPerPage = 10;
  const { user } = useAuthStore();
  const { researchResult, setResearchResult, reportHistory } = useBriefingStore();
  const { setPains: setStorePains } = usePainLibraryStore();

  const fetchPains = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) return;
    const { data: painRows } = await supabase
      .from('pain_archetypes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (painRows && painRows.length > 0) {
      const result: PainArchetype[] = [];
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
        result.push(mapDbPainToArchetype(p, sources));
      }
      setPains(result);
      setStorePains(result);
    }
  }, [user, setStorePains]);

  useEffect(() => {
    fetchPains();
  }, [fetchPains]);

  // When arriving from Scout (Respond to Webhook data), show that result
  useEffect(() => {
    if (researchResult == null || typeof researchResult !== 'object') return;
    const data = researchResult as { pains?: PainArchetype[]; painLibrary?: PainArchetype[] };
    const list = data.painLibrary ?? data.pains;
    if (Array.isArray(list) && list.length > 0) {
      const normalized = list.map((p) => normalizePainArchetype(p));
      setPains(normalized);
      setStorePains(normalized);
      setResearchResult(null);
    }
  }, [researchResult, setResearchResult, setStorePains]);

  useEffect(() => {
    const fromSearch = new URLSearchParams(window.location.search).get('painId');
    const fromHash = new URLSearchParams(window.location.hash.split('?')[1] || '').get('painId');
    const painId = fromSearch || fromHash;
    if (painId && pains.length > 0) {
      const pain = pains.find((p) => p.id === painId);
      if (pain) setSelectedPain(pain);
    }
  }, [pains]);

  // Open full report when URL has report=full (e.g. from Dashboard "View full report")
  useEffect(() => {
    const hashQuery = window.location.hash.split('?')[1] || '';
    const reportParam = new URLSearchParams(hashQuery).get('report');
    if (reportParam === 'full' && reportHistory.length > 0 && reportHistory[0].comprehensiveReport) {
      setFullReportContent(reportHistory[0].comprehensiveReport);
      setFullReportOpen(true);
    }
  }, [reportHistory]);

  // Filter and sort pains
  const filteredPains = useMemo(() => {
    let result = [...pains];
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(pain =>
        pain.name.toLowerCase().includes(searchLower) ||
        pain.description.toLowerCase().includes(searchLower) ||
        pain.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'painScore':
          return b.painScore - a.painScore;
        case 'frequency':
          return b.frequency - a.frequency;
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [search, sortBy, pains]);

  const paginatedPains = filteredPains.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPains.length / itemsPerPage);

  const handleExportCsv = () => {
    const headers = ['Name', 'Description', 'PainScore', 'Severity', 'Frequency', 'Urgency', 'Tags', 'Est. ARR', 'Sources'];
    const rows = filteredPains.map((p) => [
      `"${(p.name ?? '').replace(/"/g, '""')}"`,
      `"${(p.description ?? '').replace(/"/g, '""')}"`,
      p.painScore,
      p.severity,
      p.frequency,
      p.urgency,
      `"${(p.tags ?? []).join(', ')}"`,
      p.revenuePotential?.estimatedARR ?? 0,
      (p.sources ?? []).length,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `painscope-pains-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
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
        <nav className="p-3 space-y-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <span className="text-sm hidden lg:block">← Back to Dashboard</span>
            <span className="lg:hidden">←</span>
          </button>
          <button
            onClick={() => setReportSidebarOpen(!reportSidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm hidden lg:block">Report History</span>
          </button>
        </nav>
      </div>

      {/* Report History Sidebar */}
      <AnimatePresence>
        {reportSidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 border-r border-border bg-sidebar/50 backdrop-blur-sm flex-shrink-0 overflow-y-auto"
          >
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-sidebar/95 backdrop-blur">
              <h3 className="font-semibold">Report History</h3>
              <button
                onClick={() => setReportSidebarOpen(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {reportHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No reports yet. Complete a briefing to generate your first report.
                </div>
              ) : (
                reportHistory.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(selectedReport === report.id ? null : report.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedReport === report.id ? 'bg-lime/10 border border-lime/30' : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.timestamp).toLocaleDateString()} {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {report.painCount} pains
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{report.topPain || 'Market Research'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Avg Score: {report.avgPainScore}</span>
                      <span>•</span>
                      <span>{report.dashboardMetrics.sourcesAnalyzed || 0} sources</span>
                    </div>
                    {selectedReport === report.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t border-border space-y-2"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-background/50">
                            <p className="text-muted-foreground">Pains Discovered</p>
                            <p className="font-semibold text-lime">{report.dashboardMetrics.totalPainsDiscovered || report.painCount}</p>
                          </div>
                          <div className="p-2 rounded bg-background/50">
                            <p className="text-muted-foreground">Avg PainScore</p>
                            <p className="font-semibold text-lime">{report.avgPainScore}</p>
                          </div>
                          <div className="p-2 rounded bg-background/50">
                            <p className="text-muted-foreground">Sources</p>
                            <p className="font-semibold">{report.dashboardMetrics.sourcesAnalyzed || 0}</p>
                          </div>
                          <div className="p-2 rounded bg-background/50">
                            <p className="text-muted-foreground">Active Agents</p>
                            <p className="font-semibold">{report.dashboardMetrics.activeAgents || 0}</p>
                          </div>
                        </div>
                        {report.comprehensiveReport && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 border-lime text-lime hover:bg-lime/10"
                            onClick={() => {
                              setFullReportContent(report.comprehensiveReport ?? null);
                              setFullReportOpen(true);
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Read full report
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-lime" />
            </div>
            <div>
              <h1 className="font-semibold">Global Pain Library</h1>
              <p className="text-sm text-muted-foreground">{filteredPains.length} pain archetypes discovered</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {reportHistory.length > 0 && reportHistory[0].comprehensiveReport && (
              <Button
                variant="outline"
                size="sm"
                className="border-lime text-lime hover:bg-lime/10"
                onClick={() => {
                  setFullReportContent(reportHistory[0].comprehensiveReport ?? null);
                  setFullReportOpen(true);
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                View full report
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              className="bg-lime text-background hover:bg-lime-light"
              size="sm"
              onClick={() => onNavigate('briefing')}
            >
              <Zap className="w-4 h-4 mr-2" />
              New Scout
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pains, tags, or descriptions..."
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="painScore">PainScore (High-Low)</SelectItem>
                <SelectItem value="frequency">Frequency (High-Low)</SelectItem>
                <SelectItem value="date">Date (Newest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-secondary/30 sticky top-0">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Pain Archetype</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">PainScore</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Frequency</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Top Source</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground hidden xl:table-cell">Revenue Potential</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedPains.map((pain, index) => (
                <motion.tr
                  key={pain.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => setSelectedPain(pain)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{pain.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{pain.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pain.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${
                        pain.painScore >= 80 ? 'text-red-400' :
                        pain.painScore >= 60 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {pain.painScore}
                      </span>
                      <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lime rounded-full"
                          style={{ width: `${pain.painScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <Sparkline data={pain.frequencyHistory} />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {pain.sources[0] && (
                      <a
                        href={pain.sources[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-lime hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(() => {
                          const Icon = platformIcons[pain.sources[0].platform] || MessageSquare;
                          return <Icon className="w-4 h-4" />;
                        })()}
                        <span className="truncate max-w-[150px]">{pain.sources[0].platform}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <div className="text-sm">
                      <p className="font-medium">${(pain.revenuePotential.estimatedARR / 1000000).toFixed(1)}M</p>
                      <p className="text-xs text-muted-foreground">Est. ARR</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedPain(pain); }}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Building2 className="w-4 h-4 mr-2" />
                          Push to CRM
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {paginatedPains.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {pains.length === 0 ? (
                <>
                  <p className="mb-2">No pain data available yet</p>
                  <p className="text-sm mb-4">Complete an AI briefing to discover market pains</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('briefing')}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Start Briefing
                  </Button>
                </>
              ) : (
                <p>No pains found matching your search</p>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPains.length)} of {filteredPains.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details Panel */}
      <AnimatePresence>
        {selectedPain && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedPain(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l border-border overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedPain.name}</h2>
                  <p className="text-sm text-muted-foreground">Discovered {new Date(selectedPain.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setSelectedPain(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* PainScore */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">PainScore Analysis</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <ScoreCard label="PainScore" value={selectedPain.painScore} unit="" large />
                    <ScoreCard label="Severity" value={selectedPain.severity} unit="/10" />
                    <ScoreCard label="Frequency" value={selectedPain.frequency} unit="/10" />
                    <ScoreCard label="Urgency" value={selectedPain.urgency} unit="/10" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <p className="text-foreground">{selectedPain.description}</p>
                </div>

                {/* Opportunity note (from webhook) */}
                {selectedPain.opportunityNote && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Opportunity</h3>
                    <p className="text-foreground bg-lime/5 border border-lime/20 rounded-lg p-4">{selectedPain.opportunityNote}</p>
                  </div>
                )}

                {/* Existing solutions (from webhook) */}
                {selectedPain.existingSolutions && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Existing Solutions</h3>
                    <p className="text-foreground">{selectedPain.existingSolutions}</p>
                  </div>
                )}

                {/* Voice of customer quotes (from webhook) */}
                {selectedPain.quotes && selectedPain.quotes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Voice of Customer</h3>
                    <ul className="space-y-2">
                      {selectedPain.quotes.map((q, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-lime">“</span>
                          <span className="text-foreground">{q.replace(/^["']|["']$/g, '')}</span>
                          <span className="text-lime">”</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPain.tags.length > 0 ? selectedPain.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    )) : (
                      <span className="text-muted-foreground text-sm">No tags</span>
                    )}
                  </div>
                </div>

                {/* Revenue Potential */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Revenue Potential</h3>
                  <div className="glass rounded-xl p-6">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-3xl font-bold text-lime">${(selectedPain.revenuePotential.tam / 1000000000).toFixed(1)}B</p>
                        <p className="text-sm text-muted-foreground">Total Addressable Market</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">${(selectedPain.revenuePotential.sam / 1000000000).toFixed(1)}B</p>
                        <p className="text-sm text-muted-foreground">Serviceable Addressable Market</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-2xl font-bold">${(selectedPain.revenuePotential.som / 1000000).toFixed(0)}M</p>
                        <p className="text-sm text-muted-foreground">Serviceable Obtainable Market</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-lime">${(selectedPain.revenuePotential.estimatedARR / 1000000).toFixed(1)}M</p>
                        <p className="text-sm text-muted-foreground">Estimated ARR</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confidence Score</span>
                        <span className="font-medium">{Math.round(selectedPain.revenuePotential.confidence * 100)}%</span>
                      </div>
                      <Progress value={selectedPain.revenuePotential.confidence * 100} className="h-2 mt-2" />
                    </div>
                  </div>
                </div>

                {/* Sources */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Source Snippets</h3>
                  <div className="space-y-4">
                    {selectedPain.sources.map((source) => (
                      <SourceCard key={source.id} source={source} />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-lime text-background hover:bg-lime-light">
                    <Building2 className="w-4 h-4 mr-2" />
                    Push to CRM
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full report modal */}
      <AnimatePresence>
        {fullReportOpen && fullReportContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setFullReportOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-lime" />
                  Comprehensive Report
                </h2>
                <button
                  onClick={() => setFullReportOpen(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReportMarkdown content={fullReportContent} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Renders markdown-like report content: headings, bold, links, code blocks */
function ReportMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-lg font-semibold mt-6 mb-2 text-foreground">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-base font-semibold mt-4 mb-1 text-foreground">{line.slice(4)}</h3>);
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={key++} className="font-semibold text-foreground my-1">{line.slice(2, -2)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={key++} className="ml-4 my-0.5 text-muted-foreground">{line.slice(2)}</li>);
    } else if (line.trim() === '---') {
      elements.push(<hr key={key++} className="border-border my-4" />);
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      // Inline: replace [text](url) with links
      const parts: React.ReactNode[] = [];
      const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      let lastIndex = 0;
      while ((match = linkRe.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        parts.push(<a key={`${key}-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-lime underline hover:no-underline">{match[1]}</a>);
        lastIndex = linkRe.lastIndex;
      }
      if (lastIndex < line.length) parts.push(line.slice(lastIndex));
      elements.push(<p key={key++} className="text-muted-foreground my-1">{parts.length > 0 ? parts : line}</p>);
    }
  }
  return <>{elements}</>;
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 20;
    return `${x},${y}`;
  }).join(' ');

  const isTrendingUp = data[data.length - 1] > data[0];

  return (
    <div className="flex items-center gap-2">
      <svg width="60" height="24" className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={isTrendingUp ? '#C8E600' : '#ef4444'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="sparkline-path"
        />
      </svg>
      {isTrendingUp ? (
        <TrendingUp className="w-4 h-4 text-lime" />
      ) : (
        <TrendingDown className="w-4 h-4 text-red-400" />
      )}
    </div>
  );
}

function ScoreCard({ label, value, unit, large = false }: { label: string; value: number; unit: string; large?: boolean }) {
  const getColor = (v: number) => {
    if (v >= 80) return 'text-red-400';
    if (v >= 60) return 'text-yellow-400';
    if (v >= 40) return 'text-lime';
    return 'text-green-400';
  };

  return (
    <div className="text-center p-4 rounded-lg bg-secondary/30">
      <p className={`font-bold ${getColor(value)} ${large ? 'text-4xl' : 'text-2xl'}`}>
        {value.toFixed(large ? 0 : 1)}{unit}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function SourceCard({ source }: { source: PainSource }) {
  const Icon = platformIcons[source.platform] || MessageSquare;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium capitalize">{source.platform}</span>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-sm text-muted-foreground mb-2">&ldquo;{source.snippet}&rdquo;</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{new Date(source.date).toLocaleDateString()}</span>
        <Badge 
          variant="secondary" 
          className={`text-xs ${
            source.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
            source.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' :
            'bg-gray-500/10 text-gray-400'
          }`}
        >
          {source.sentiment}
        </Badge>
      </div>
    </a>
  );
}
