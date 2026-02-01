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
import { useAuthStore, usePainLibraryStore } from '@/store';
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

interface PainLibraryProps {
  onNavigate: (route: 'landing' | 'dashboard' | 'briefing' | 'scout' | 'library' | 'settings') => void;
  currentRoute: string;
}

// Mock data for the library
const mockPains: PainArchetype[] = [
  {
    id: 'pain-1',
    name: 'Payment friction in B2B invoices',
    description: 'Businesses struggle with manual invoice processing, delayed payments, and lack of visibility into payment status.',
    painScore: 87,
    severity: 8.5,
    frequency: 7.2,
    urgency: 8.0,
    competitiveSaturation: 2.1,
    sources: [
      { id: 's1', url: 'https://reddit.com/r/fintech/comments/abc123', title: 'Invoice pain points discussion', platform: 'reddit', snippet: 'We spend 20 hours a week just processing invoices manually. There has to be a better way...', sentiment: 'negative', date: new Date('2025-01-28') },
      { id: 's2', url: 'https://twitter.com/user/status/123', title: 'B2B payment rant', platform: 'twitter', snippet: 'Why is paying vendors still so hard in 2025? Every platform has a different process.', sentiment: 'negative', date: new Date('2025-01-27') },
      { id: 's3', url: 'https://linkedin.com/posts/abc', title: 'CFO insights', platform: 'linkedin', snippet: 'Cash flow visibility remains the #1 challenge for finance teams.', sentiment: 'negative', date: new Date('2025-01-26') },
    ],
    revenuePotential: { tam: 50000000000, sam: 12000000000, som: 500000000, estimatedARR: 25000000, confidence: 0.78 },
    tags: ['payments', 'b2b', 'invoicing', 'automation', 'fintech'],
    createdAt: new Date('2025-01-28'),
    frequencyHistory: [45, 52, 48, 61, 72, 87],
  },
  {
    id: 'pain-2',
    name: 'Lack of real-time collaboration',
    description: 'Remote teams need better tools for synchronous document editing and decision-making.',
    painScore: 76,
    severity: 7.8,
    frequency: 8.5,
    urgency: 6.5,
    competitiveSaturation: 4.2,
    sources: [
      { id: 's4', url: 'https://news.ycombinator.com/item?id=123', title: 'Collaboration tools discussion', platform: 'forum', snippet: 'Still waiting for the perfect real-time collaboration tool that actually works.', sentiment: 'negative', date: new Date('2025-01-27') },
      { id: 's5', url: 'https://g2.com/reviews/collab-tool', title: 'User review', platform: 'review', snippet: 'Great features but latency issues make real-time collaboration frustrating.', sentiment: 'negative', date: new Date('2025-01-25') },
    ],
    revenuePotential: { tam: 35000000000, sam: 8000000000, som: 300000000, estimatedARR: 15000000, confidence: 0.65 },
    tags: ['collaboration', 'remote-work', 'productivity', 'saas'],
    createdAt: new Date('2025-01-27'),
    frequencyHistory: [30, 35, 42, 55, 68, 76],
  },
  {
    id: 'pain-3',
    name: 'Complex onboarding flows',
    description: 'Users abandon products due to lengthy and confusing onboarding experiences.',
    painScore: 71,
    severity: 7.2,
    frequency: 6.8,
    urgency: 7.5,
    competitiveSaturation: 3.5,
    sources: [
      { id: 's6', url: 'https://g2.com/reviews/saas-product', title: 'User review', platform: 'review', snippet: 'Great product but onboarding took way too long. Almost gave up.', sentiment: 'negative', date: new Date('2025-01-26') },
      { id: 's7', url: 'https://twitter.com/user/status/456', title: 'Onboarding complaint', platform: 'twitter', snippet: 'Why do I need to watch 10 videos before I can use the product?', sentiment: 'negative', date: new Date('2025-01-25') },
    ],
    revenuePotential: { tam: 20000000000, sam: 5000000000, som: 200000000, estimatedARR: 10000000, confidence: 0.72 },
    tags: ['onboarding', 'ux', 'retention', 'product-led'],
    createdAt: new Date('2025-01-26'),
    frequencyHistory: [25, 32, 38, 45, 58, 71],
  },
  {
    id: 'pain-4',
    name: 'Limited API documentation',
    description: 'Developers struggle with incomplete or outdated API documentation.',
    painScore: 68,
    severity: 6.5,
    frequency: 7.5,
    urgency: 6.8,
    competitiveSaturation: 2.8,
    sources: [
      { id: 's8', url: 'https://stackoverflow.com/questions/123', title: 'API confusion', platform: 'forum', snippet: 'The docs say one thing but the API does another. Anyone else experiencing this?', sentiment: 'negative', date: new Date('2025-01-25') },
      { id: 's9', url: 'https://reddit.com/r/webdev/comments/def', title: 'Documentation rant', platform: 'reddit', snippet: 'Why is API documentation always an afterthought?', sentiment: 'negative', date: new Date('2025-01-24') },
    ],
    revenuePotential: { tam: 15000000000, sam: 4000000000, som: 150000000, estimatedARR: 8000000, confidence: 0.68 },
    tags: ['api', 'developer-experience', 'documentation', 'devtools'],
    createdAt: new Date('2025-01-25'),
    frequencyHistory: [20, 28, 35, 42, 55, 68],
  },
  {
    id: 'pain-5',
    name: 'Data silos between departments',
    description: 'Teams struggle with fragmented data across different tools and systems.',
    painScore: 82,
    severity: 8.0,
    frequency: 7.8,
    urgency: 7.5,
    competitiveSaturation: 3.2,
    sources: [
      { id: 's10', url: 'https://linkedin.com/posts/data-silos', title: 'Data integration challenges', platform: 'linkedin', snippet: 'Breaking down data silos remains the biggest challenge for enterprise analytics.', sentiment: 'negative', date: new Date('2025-01-28') },
      { id: 's11', url: 'https://news.ycombinator.com/item?id=789', title: 'Integration discussion', platform: 'forum', snippet: 'Every team uses different tools and nothing talks to each other.', sentiment: 'negative', date: new Date('2025-01-27') },
    ],
    revenuePotential: { tam: 45000000000, sam: 10000000000, som: 400000000, estimatedARR: 20000000, confidence: 0.75 },
    tags: ['data', 'integration', 'enterprise', 'analytics'],
    createdAt: new Date('2025-01-28'),
    frequencyHistory: [40, 48, 55, 62, 73, 82],
  },
];

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
  const [pains, setPains] = useState<PainArchetype[]>(mockPains);
  const itemsPerPage = 10;
  const { user } = useAuthStore();
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

  useEffect(() => {
    const fromSearch = new URLSearchParams(window.location.search).get('painId');
    const fromHash = new URLSearchParams(window.location.hash.split('?')[1] || '').get('painId');
    const painId = fromSearch || fromHash;
    if (painId && pains.length > 0) {
      const pain = pains.find((p) => p.id === painId);
      if (pain) setSelectedPain(pain);
    }
  }, [pains]);

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
              <Database className="w-5 h-5 text-lime" />
            </div>
            <div>
              <h1 className="font-semibold">Global Pain Library</h1>
              <p className="text-sm text-muted-foreground">{filteredPains.length} pain archetypes discovered</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              <p>No pains found matching your search</p>
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

                {/* Tags */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPain.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
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
    </div>
  );
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
