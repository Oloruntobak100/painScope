// Re-export all stores from a single entry point
export { useAuthStore } from './authStore';
export type { User } from './authStore';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BriefingData,
  ChatMessage,
  PainArchetype,
  AgentState,
  UserSettings,
  PainFilter,
  WebhookDashboardMetrics,
  RecentDiscoveryItem,
  ReportHistory,
} from '@/types';

// Briefing Store
interface BriefingStore {
  messages: ChatMessage[];
  briefingData: BriefingData;
  briefingId: string | null;
  isComplete: boolean;
  /** Set when Respond to Webhook returns; Library consumes pains/painLibrary */
  researchResult: unknown | null;
  /** In-flight webhook promise; Scout awaits it then navigates to Library */
  researchWebhookPromise: Promise<unknown> | null;
  /** Populated from webhook for Dashboard metrics */
  dashboardMetrics: WebhookDashboardMetrics | null;
  /** Populated from webhook for Dashboard recent discoveries */
  recentDiscoveries: RecentDiscoveryItem[] | null;
  /** History of all report generations */
  reportHistory: ReportHistory[];
  addMessage: (message: ChatMessage) => void;
  updateBriefingData: (data: Partial<BriefingData>) => void;
  setBriefingId: (id: string | null) => void;
  setComplete: (complete: boolean) => void;
  setResearchResult: (data: unknown | null) => void;
  setResearchWebhookPromise: (p: Promise<unknown> | null) => void;
  /** Set researchResult and extract dashboardMetrics + recentDiscoveries from webhook payload */
  setWebhookPayload: (data: unknown) => void;
  reset: () => void;
}

const defaultBriefingData: BriefingData = {
  industry: '',
  productFocus: '',
  competitors: [],
  targetAudience: '',
  additionalNotes: '',
};

export const useBriefingStore = create<BriefingStore>()((set) => ({
  messages: [],
  briefingData: defaultBriefingData,
  briefingId: null,
  isComplete: false,
  researchResult: null,
  researchWebhookPromise: null,
  dashboardMetrics: null,
  recentDiscoveries: null,
  reportHistory: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateBriefingData: (data) =>
    set((state) => ({
      briefingData: { ...state.briefingData, ...data },
    })),
  setBriefingId: (id) => set({ briefingId: id }),
  setComplete: (complete) => set({ isComplete: complete }),
  setResearchResult: (data) => set({ researchResult: data }),
  setResearchWebhookPromise: (p) => set({ researchWebhookPromise: p }),
  setWebhookPayload: (data) => {
    if (data == null) return;
    
    // n8n "Respond to Webhook" with "All Incoming Items" returns an array - unwrap it
    let payload: Record<string, unknown>;
    if (Array.isArray(data)) {
      if (data.length === 0) return;
      payload = data[0] as Record<string, unknown>;
      console.log('[PainScope] Unwrapped array from webhook, using first item');
    } else if (typeof data === 'object') {
      payload = data as Record<string, unknown>;
    } else {
      console.error('[PainScope] Invalid webhook data type:', typeof data);
      return;
    }
    
    console.log('[PainScope] Processing webhook payload:', payload);
    
    const rawMetrics = payload.dashboardMetrics as Record<string, unknown> | undefined;
    
    // Normalize n8n field names to app field names
    const metrics: WebhookDashboardMetrics | null = rawMetrics ? {
      totalPainsDiscovered: Number(rawMetrics.painsDiscovered ?? rawMetrics.totalPainsDiscovered) || undefined,
      averagePainScore: Number(rawMetrics.avgPainScore ?? rawMetrics.averagePainScore) || undefined,
      sourcesAnalyzed: Number(rawMetrics.sourcesAnalyzed) || undefined,
      activeAgents: Number(rawMetrics.activeAgents) || undefined,
    } : null;
    
    const recent = payload.recentDiscoveries as RecentDiscoveryItem[] | undefined;
    const pains = (payload.painLibrary ?? payload.pains) as Record<string, unknown>[] | undefined;
    
    // Extract full report and structured data for rich UI
    const comprehensiveReport = typeof payload.comprehensiveReport === 'string' ? payload.comprehensiveReport : undefined;
    const structuredData = payload.aiStructuredData && typeof payload.aiStructuredData === 'object'
      ? (payload.aiStructuredData as Record<string, unknown>)
      : undefined;

    // Create report history entry (includes full report for "Read full report")
    const reportEntry: ReportHistory = {
      id: `report-${Date.now()}`,
      timestamp: new Date(),
      dashboardMetrics: metrics ?? {},
      painCount: Array.isArray(pains) ? pains.length : 0,
      avgPainScore: metrics?.averagePainScore ?? 0,
      topPain: Array.isArray(pains) && pains.length > 0 ? ((pains[0].archetype ?? pains[0].name) as string) : undefined,
      comprehensiveReport,
      structuredData,
    };

    set((state) => ({
      researchResult: payload,
      dashboardMetrics: metrics,
      recentDiscoveries: Array.isArray(recent) ? recent : null,
      reportHistory: [reportEntry, ...state.reportHistory],
    }));
  },
  reset: () =>
    set({
      messages: [],
      briefingData: defaultBriefingData,
      briefingId: null,
      isComplete: false,
      researchResult: null,
      researchWebhookPromise: null,
      dashboardMetrics: null,
      recentDiscoveries: null,
      reportHistory: [],
    }),
}));

// Agent Store
interface AgentStore {
  agents: AgentState[];
  currentAgent: AgentState | null;
  addAgent: (agent: AgentState) => void;
  updateAgent: (id: string, updates: Partial<AgentState>) => void;
  setCurrentAgent: (agent: AgentState | null) => void;
  addLog: (agentId: string, log: AgentState['logs'][0]) => void;
  addDiscoveredPain: (agentId: string, pain: PainArchetype) => void;
}

export const useAgentStore = create<AgentStore>()((set) => ({
  agents: [],
  currentAgent: null,
  addAgent: (agent) =>
    set((state) => ({ agents: [...state.agents, agent] })),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),
  setCurrentAgent: (agent) => set({ currentAgent: agent }),
  addLog: (agentId, log) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, logs: [...a.logs, log] } : a
      ),
    })),
  addDiscoveredPain: (agentId, pain) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId
          ? { ...a, discoveredPains: [...a.discoveredPains, pain] }
          : a
      ),
    })),
}));

// Pain Library Store
interface PainLibraryStore {
  pains: PainArchetype[];
  selectedPain: PainArchetype | null;
  filter: PainFilter;
  setPains: (pains: PainArchetype[]) => void;
  addPain: (pain: PainArchetype) => void;
  selectPain: (pain: PainArchetype | null) => void;
  updateFilter: (filter: Partial<PainFilter>) => void;
  getFilteredPains: () => PainArchetype[];
}

const defaultFilter: PainFilter = {
  search: '',
  minPainScore: 0,
  maxPainScore: 100,
  platforms: [],
  dateRange: 'all',
  sortBy: 'painScore',
  sortOrder: 'desc',
};

export const usePainLibraryStore = create<PainLibraryStore>()((set, get) => ({
  pains: [],
  selectedPain: null,
  filter: defaultFilter,
  setPains: (pains) => set({ pains }),
  addPain: (pain) =>
    set((state) => ({ pains: [...state.pains, pain] })),
  selectPain: (pain) => set({ selectedPain: pain }),
  updateFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  getFilteredPains: () => {
    const { pains, filter } = get();
    return pains
      .filter((pain) => {
        const matchesSearch =
          !filter.search ||
          pain.name.toLowerCase().includes(filter.search.toLowerCase()) ||
          pain.description.toLowerCase().includes(filter.search.toLowerCase());
        const matchesScore =
          pain.painScore >= filter.minPainScore &&
          pain.painScore <= filter.maxPainScore;
        return matchesSearch && matchesScore;
      })
      .sort((a, b) => {
        const multiplier = filter.sortOrder === 'asc' ? 1 : -1;
        switch (filter.sortBy) {
          case 'painScore':
            return (a.painScore - b.painScore) * multiplier;
          case 'frequency':
            return (a.frequency - b.frequency) * multiplier;
          case 'date':
            return (
              (new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()) *
              multiplier
            );
          default:
            return 0;
        }
      });
  },
}));

// Settings Store
interface SettingsStore {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const defaultSettings: UserSettings = {
  emailNotifications: true,
  notificationFrequency: 'daily',
  theme: 'dark',
  defaultIndustry: '',
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'settings-storage',
    }
  )
);

// UI Store
interface UIStore {
  sidebarOpen: boolean;
  currentRoute: string;
  notifications: Notification[];
  toggleSidebar: () => void;
  setCurrentRoute: (route: string) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  currentRoute: '/dashboard',
  notifications: [],
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentRoute: (route) => set({ currentRoute: route }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
