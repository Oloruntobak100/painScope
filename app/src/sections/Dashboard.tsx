import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Terminal,
  Library,
  Settings,
  Bell,
  Search,
  Menu,
  ChevronDown,
  LogOut,
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/authStore';
import { useAgentStore, usePainLibraryStore, useBriefingStore, useUIStore } from '@/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Notification } from '@/store';

interface DashboardProps {
  onNavigate: (route: 'landing' | 'dashboard' | 'briefing' | 'scout' | 'library' | 'settings', queryParams?: Record<string, string>) => void;
  currentRoute: string;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'briefing', label: 'AI Briefing', icon: Sparkles },
  { id: 'scout', label: 'Scout Lab', icon: Terminal },
  { id: 'library', label: 'Pain Library', icon: Library },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'New Pain Discovered',
    message: 'Agent found "Payment friction in B2B invoices" with PainScore 87',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    read: false,
  },
  {
    id: '2',
    type: 'info',
    title: 'Scout Agent Completed',
    message: 'Fintech Scout finished analyzing 2,847 sources',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'High Urgency Alert',
    message: '3 pains with urgency > 8 detected in your industry',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    read: true,
  },
];

export default function Dashboard({ onNavigate, currentRoute }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [stats, setStats] = useState({ totalPains: 0, avgPainScore: 0, activeAgents: 0, sourcesAnalyzed: 0 });
  const [recentPains, setRecentPains] = useState<Array<{ id?: string; name: string; score: number; trend: number[]; source: string }>>([]);
  const { user, logout } = useAuthStore();
  const { agents } = useAgentStore();
  const { pains } = usePainLibraryStore();
  const { dashboardMetrics, recentDiscoveries, reportHistory } = useBriefingStore();
  const { notifications: uiNotifications, markNotificationRead, markAllNotificationsRead } = useUIStore();

  // Prefer webhook dashboard data when available
  useEffect(() => {
    if (dashboardMetrics) {
      setStats({
        totalPains: dashboardMetrics.totalPainsDiscovered ?? 0,
        avgPainScore: dashboardMetrics.averagePainScore ?? 0,
        activeAgents: dashboardMetrics.activeAgents ?? 0,
        sourcesAnalyzed: dashboardMetrics.sourcesAnalyzed ?? 0,
      });
    }
  }, [dashboardMetrics]);

  useEffect(() => {
    if (recentDiscoveries && recentDiscoveries.length > 0) {
      const mapped = recentDiscoveries.slice(0, 6).map((d: any) => ({
        id: d.id,
        name: d.archetype ?? d.name,
        score: d.painScore,
        trend: d.trend ?? [d.painScore * 0.5, d.painScore * 0.6, d.painScore * 0.7, d.painScore * 0.8, d.painScore * 0.9, d.painScore],
        source: d.topSource?.name ?? d.source ?? 'Discovery',
      }));
      setRecentPains(mapped);
    }
  }, [recentDiscoveries]);

  useEffect(() => {
    // Only load from Supabase if configured and we don't have webhook data
    if (!dashboardMetrics && !recentDiscoveries?.length) {
      if (isSupabaseConfigured() && user) {
        (async () => {
          const { count: painCount } = await supabase.from('pain_archetypes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
          const { data: painRows } = await supabase.from('pain_archetypes').select('pain_score, name').eq('user_id', user.id).order('pain_score', { ascending: false }).limit(5);
          const { count: agentCount } = await supabase.from('agent_jobs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'running');
          const total = painCount ?? 0;
          const avg = painRows?.length ? Math.round(painRows.reduce((s, p) => s + (Number(p.pain_score) ?? 0), 0) / painRows.length) : 0;
          const recent = (painRows ?? []).map((p, i) => ({
            name: (p.name as string) ?? 'Pain',
            score: Number(p.pain_score) ?? 0,
            trend: [40 + i * 10, 50 + i * 8, 55 + i * 6, 60 + i * 5, 65 + i * 4, Number(p.pain_score) ?? 70],
            source: 'Discovery',
          }));
          if (total > 0) {
            setStats({ totalPains: total, avgPainScore: avg, activeAgents: agentCount ?? 0, sourcesAnalyzed: 0 });
            setRecentPains(recent);
          }
        })();
      }
    }
  }, [user, dashboardMetrics, recentDiscoveries]);

  // Use webhook data first, then Supabase data, then show zeros
  const activeAgents = stats.activeAgents || agents.filter(a => a.status === 'running').length;
  const totalPains = stats.totalPains || pains.length || 0;
  const avgPainScore = stats.avgPainScore || 0;
  const sourcesAnalyzed = stats.sourcesAnalyzed || 0;

  const handleLogout = () => {
    logout();
    onNavigate('landing');
  };

  const notifications = uiNotifications.length > 0 ? uiNotifications : mockNotifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="fixed left-0 top-0 bottom-0 z-40 bg-sidebar border-r border-sidebar-border"
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime to-lime-light flex items-center justify-center flex-shrink-0">
                <span className="text-background font-bold">PS</span>
              </div>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-semibold text-lg whitespace-nowrap"
                >
                  PainScope AI
                </motion.span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-lime/10 text-lime'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-lime' : ''}`} />
                  {sidebarOpen && (
                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  )}
                  {isActive && sidebarOpen && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-lime" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Collapse button */}
          <div className="p-3 border-t border-sidebar-border">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            >
              {sidebarOpen ? (
                <Menu className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-200 ${sidebarOpen ? 'ml-[260px]' : 'ml-[72px]'}`}>
        {/* Top Navigation */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="h-full flex items-center justify-between px-6">
            {/* Search */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search pains, sources, or agents..."
                  className="w-full pl-10 pr-4 py-2 bg-secondary/50 rounded-lg text-sm border border-transparent focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/20 transition-all"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-lime text-background text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-96 glass rounded-xl border border-border shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllNotificationsRead()}
                          className="text-xs text-lime hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => !notification.read && markNotificationRead(notification.id)}
                          onKeyDown={(e) => e.key === 'Enter' && !notification.read && markNotificationRead(notification.id)}
                          className={`p-4 border-b border-border last:border-b-0 hover:bg-white/5 transition-colors cursor-pointer ${
                            !notification.read ? 'bg-lime/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                                notification.type === 'success'
                                  ? 'bg-green-500'
                                  : notification.type === 'warning'
                                    ? 'bg-amber-500'
                                    : notification.type === 'error'
                                      ? 'bg-red-500'
                                      : 'bg-blue-500'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {notification.type === 'warning' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 text-lime hover:text-lime-light text-xs h-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate('library');
                                    setNotificationsOpen(false);
                                  }}
                                >
                                  View All
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-lime/20 text-lime text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-56 glass rounded-xl border border-border shadow-xl z-50"
                  >
                    <div className="p-4 border-b border-border">
                      <p className="font-medium">{user?.name || 'User'}</p>
                      <p className="text-sm text-muted-foreground">{user?.email || 'user@example.com'}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onNavigate('settings');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-red-400"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your market intelligence
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-lime" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  +23%
                </Badge>
              </div>
              <p className="text-2xl font-bold">{totalPains}</p>
              <p className="text-sm text-muted-foreground">Pains Discovered</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-lime" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Avg
                </Badge>
              </div>
              <p className="text-2xl font-bold">{avgPainScore}</p>
              <p className="text-sm text-muted-foreground">Average PainScore</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-lime" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              </div>
              <p className="text-2xl font-bold">{activeAgents}</p>
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                  <Library className="w-5 h-5 text-lime" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Today
                </Badge>
              </div>
              <p className="text-2xl font-bold">{sourcesAnalyzed.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Sources Analyzed</p>
            </motion.div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Pains */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2 glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg">Recent Pain Discoveries</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('library')}
                  className="text-lime hover:text-lime-light"
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="space-y-4">
                {recentPains.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No pain discoveries yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate('briefing')}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start Your First Briefing
                    </Button>
                  </div>
                ) : (
                  recentPains.map((pain, index) => (
                    <div
                      key={pain.id ?? index}
                      className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => pain.id ? onNavigate('library', { painId: pain.id }) : onNavigate('library')}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{pain.name}</h3>
                          <Badge variant="secondary" className="text-xs">{pain.source}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 max-w-[200px]">
                            <div className="h-8 flex items-end gap-0.5">
                              {pain.trend.map((value, i) => (
                                <div
                                  key={i}
                                  className="flex-1 bg-lime/60 rounded-sm"
                                  style={{ height: `${value}%` }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-lime">{pain.score}</p>
                        <p className="text-xs text-muted-foreground">PainScore</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              {/* Latest report - View full report */}
              {reportHistory.length > 0 && reportHistory[0].comprehensiveReport && (
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-lime" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Latest Report</h3>
                      <p className="text-sm text-muted-foreground">
                        {reportHistory[0].painCount} pains • Avg score {reportHistory[0].avgPainScore}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-lime text-lime hover:bg-lime/10"
                    onClick={() => onNavigate('library', { report: 'full' })}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Full Report
                  </Button>
                </div>
              )}

              {/* Launch Scout */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-lime" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Launch Scout</h3>
                    <p className="text-sm text-muted-foreground">Deploy new agent</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-lime text-background hover:bg-lime-light"
                  onClick={() => onNavigate('briefing')}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Briefing
                </Button>
              </div>

              {/* Active Agents */}
              <div className="glass rounded-xl p-6">
                <h3 className="font-semibold mb-4">Active Agents</h3>
                <div className="space-y-3">
                  {activeAgents > 0 ? (
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Market Scout</span>
                        <span className="text-xs text-lime">Active</span>
                      </div>
                      <Progress value={75} className="h-1.5 mb-2" />
                      <p className="text-xs text-muted-foreground font-mono">Analyzing sources...</p>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      <p>No active agents</p>
                      <p className="text-xs mt-1">Start a briefing to deploy scouts</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
