-- PainScope AI: Initial Schema
-- Run this migration in Supabase SQL Editor or via Supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles: extends auth.users with app-specific fields
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  company TEXT,
  industry TEXT,
  is_verified BOOLEAN DEFAULT false,
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'canceled')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Briefings: user briefing sessions
CREATE TABLE public.briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  industry TEXT NOT NULL DEFAULT '',
  product_focus TEXT NOT NULL DEFAULT '',
  competitors TEXT[] DEFAULT '{}',
  target_audience TEXT NOT NULL DEFAULT '',
  additional_notes TEXT DEFAULT '',
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Briefing messages: chat history per briefing
CREATE TABLE public.briefing_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent jobs: discovery run metadata (created before pain_archetypes for FK)
CREATE TABLE public.agent_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  briefing_id UUID REFERENCES public.briefings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'completed', 'error')),
  current_task TEXT DEFAULT '',
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent logs: per-job log entries
CREATE TABLE public.agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'success', 'warning', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pain archetypes: discovered market pains
CREATE TABLE public.pain_archetypes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_job_id UUID REFERENCES public.agent_jobs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pain_score INTEGER NOT NULL DEFAULT 0,
  severity DECIMAL(5,2) NOT NULL DEFAULT 0,
  frequency DECIMAL(5,2) NOT NULL DEFAULT 0,
  urgency DECIMAL(5,2) NOT NULL DEFAULT 0,
  competitive_saturation DECIMAL(5,2) NOT NULL DEFAULT 0,
  tam BIGINT DEFAULT 0,
  sam BIGINT DEFAULT 0,
  som BIGINT DEFAULT 0,
  estimated_arr BIGINT DEFAULT 0,
  confidence DECIMAL(3,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  frequency_history DECIMAL[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pain sources: source citations for pain archetypes
CREATE TABLE public.pain_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pain_archetype_id UUID NOT NULL REFERENCES public.pain_archetypes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('reddit', 'twitter', 'linkedin', 'news', 'forum', 'review')),
  snippet TEXT,
  sentiment TEXT CHECK (sentiment IN ('negative', 'neutral', 'positive')),
  source_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings: notification and preference storage
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  notification_frequency TEXT DEFAULT 'daily' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  default_industry TEXT DEFAULT '',
  crm_provider TEXT CHECK (crm_provider IN ('salesforce', 'hubspot', 'pipedrive')),
  crm_connected BOOLEAN DEFAULT false,
  crm_last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications: in-app notification records
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_briefings_user_id ON public.briefings(user_id);
CREATE INDEX idx_briefing_messages_briefing_id ON public.briefing_messages(briefing_id);
CREATE INDEX idx_pain_archetypes_user_id ON public.pain_archetypes(user_id);
CREATE INDEX idx_pain_archetypes_agent_job_id ON public.pain_archetypes(agent_job_id);
CREATE INDEX idx_pain_sources_pain_archetype_id ON public.pain_sources(pain_archetype_id);
CREATE INDEX idx_agent_jobs_user_id ON public.agent_jobs(user_id);
CREATE INDEX idx_agent_logs_agent_job_id ON public.agent_logs(agent_job_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
