// User & Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  industry?: string;
  company?: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Briefing & Onboarding Types
export interface BriefingData {
  industry: string;
  productFocus: string;
  competitors: string[];
  targetAudience: string;
  additionalNotes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Pain Archetype Types
export interface PainArchetype {
  id: string;
  name: string;
  description: string;
  painScore: number;
  severity: number;
  frequency: number;
  urgency: number;
  competitiveSaturation: number;
  sources: PainSource[];
  revenuePotential: RevenuePotential;
  tags: string[];
  createdAt: Date;
  frequencyHistory: number[];
}

export interface PainSource {
  id: string;
  url: string;
  title: string;
  platform: 'reddit' | 'twitter' | 'linkedin' | 'news' | 'forum' | 'review';
  snippet: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  date: Date;
}

export interface RevenuePotential {
  tam: number;
  sam: number;
  som: number;
  estimatedARR: number;
  confidence: number;
}

// Agent Types
export interface AgentState {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentTask: string;
  progress: number;
  logs: AgentLog[];
  discoveredPains: PainArchetype[];
  startedAt: Date;
  completedAt?: Date;
}

export interface AgentLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

// Dashboard Types
export interface DashboardStats {
  totalPainsDiscovered: number;
  averagePainScore: number;
  activeAgents: number;
  sourcesAnalyzed: number;
  topArchetypes: PainArchetype[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'pain_discovered' | 'agent_started' | 'agent_completed' | 'source_added';
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Settings Types
export interface UserSettings {
  emailNotifications: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  theme: 'dark' | 'light' | 'system';
  defaultIndustry: string;
  crmIntegration?: CRMConfig;
}

export interface CRMConfig {
  provider: 'salesforce' | 'hubspot' | 'pipedrive';
  connected: boolean;
  lastSync?: Date;
}

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Filter Types
export interface PainFilter {
  search: string;
  minPainScore: number;
  maxPainScore: number;
  platforms: string[];
  dateRange: 'all' | 'today' | 'week' | 'month';
  sortBy: 'painScore' | 'frequency' | 'date';
  sortOrder: 'asc' | 'desc';
}
