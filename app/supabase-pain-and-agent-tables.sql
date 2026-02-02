-- =============================================================================
-- PainScope: pain_archetypes, pain_sources, agent_jobs, agent_logs (run once)
-- =============================================================================
-- Run in Supabase Dashboard > SQL Editor AFTER supabase-profiles-admin.sql
-- and the is_admin() fix (so public.is_admin() exists).
-- =============================================================================

-- 1. pain_archetypes (report_id added by supabase-reports.sql)
CREATE TABLE IF NOT EXISTS public.pain_archetypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_job_id uuid,
  name text,
  description text,
  pain_score numeric DEFAULT 0,
  severity numeric DEFAULT 0,
  frequency numeric DEFAULT 0,
  urgency numeric DEFAULT 0,
  competitive_saturation numeric DEFAULT 0,
  tam numeric DEFAULT 0,
  sam numeric DEFAULT 0,
  som numeric DEFAULT 0,
  estimated_arr numeric DEFAULT 0,
  confidence numeric DEFAULT 0,
  tags text[] DEFAULT '{}',
  frequency_history numeric[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure agent_job_id exists (in case table was created earlier without it)
ALTER TABLE public.pain_archetypes ADD COLUMN IF NOT EXISTS agent_job_id uuid;

CREATE INDEX IF NOT EXISTS idx_pain_archetypes_user_id ON public.pain_archetypes(user_id);
CREATE INDEX IF NOT EXISTS idx_pain_archetypes_agent_job_id ON public.pain_archetypes(agent_job_id);
CREATE INDEX IF NOT EXISTS idx_pain_archetypes_created_at ON public.pain_archetypes(created_at DESC);

ALTER TABLE public.pain_archetypes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own pain_archetypes" ON public.pain_archetypes;
DROP POLICY IF EXISTS "Users can insert own pain_archetypes" ON public.pain_archetypes;
DROP POLICY IF EXISTS "Users can update own pain_archetypes" ON public.pain_archetypes;
DROP POLICY IF EXISTS "Admins can read all pain_archetypes" ON public.pain_archetypes;

CREATE POLICY "Users can read own pain_archetypes"
  ON public.pain_archetypes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pain_archetypes"
  ON public.pain_archetypes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pain_archetypes"
  ON public.pain_archetypes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all pain_archetypes"
  ON public.pain_archetypes FOR SELECT USING (public.is_admin());

-- 2. pain_sources
CREATE TABLE IF NOT EXISTS public.pain_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pain_archetype_id uuid NOT NULL REFERENCES public.pain_archetypes(id) ON DELETE CASCADE,
  url text,
  title text,
  platform text DEFAULT 'forum',
  snippet text,
  sentiment text DEFAULT 'neutral',
  source_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pain_sources_pain_archetype_id ON public.pain_sources(pain_archetype_id);

ALTER TABLE public.pain_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read pain_sources for own pains" ON public.pain_sources;
DROP POLICY IF EXISTS "Users can insert pain_sources for own pains" ON public.pain_sources;
DROP POLICY IF EXISTS "Users can update pain_sources for own pains" ON public.pain_sources;
DROP POLICY IF EXISTS "Admins can read all pain_sources" ON public.pain_sources;

CREATE POLICY "Users can read pain_sources for own pains"
  ON public.pain_sources FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.pain_archetypes pa WHERE pa.id = pain_sources.pain_archetype_id AND pa.user_id = auth.uid()));
CREATE POLICY "Users can insert pain_sources for own pains"
  ON public.pain_sources FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.pain_archetypes pa WHERE pa.id = pain_sources.pain_archetype_id AND pa.user_id = auth.uid()));
CREATE POLICY "Users can update pain_sources for own pains"
  ON public.pain_sources FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.pain_archetypes pa WHERE pa.id = pain_sources.pain_archetype_id AND pa.user_id = auth.uid()));
CREATE POLICY "Admins can read all pain_sources"
  ON public.pain_sources FOR SELECT USING (public.is_admin());

-- 3. agent_jobs
CREATE TABLE IF NOT EXISTS public.agent_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_id uuid,
  status text DEFAULT 'idle',
  current_task text,
  progress numeric DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_user_id ON public.agent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_created_at ON public.agent_jobs(created_at DESC);

ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own agent_jobs" ON public.agent_jobs;
DROP POLICY IF EXISTS "Users can insert own agent_jobs" ON public.agent_jobs;
DROP POLICY IF EXISTS "Users can update own agent_jobs" ON public.agent_jobs;
DROP POLICY IF EXISTS "Admins can read all agent_jobs" ON public.agent_jobs;

CREATE POLICY "Users can read own agent_jobs"
  ON public.agent_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agent_jobs"
  ON public.agent_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agent_jobs"
  ON public.agent_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all agent_jobs"
  ON public.agent_jobs FOR SELECT USING (public.is_admin());

-- 4. pain_archetypes.agent_job_id: ensure column exists then add FK (after agent_jobs exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pain_archetypes' AND column_name = 'agent_job_id'
  ) THEN
    ALTER TABLE public.pain_archetypes ADD COLUMN agent_job_id uuid;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pain_archetypes_agent_job_id_fkey'
    AND table_schema = 'public' AND table_name = 'pain_archetypes'
  ) THEN
    ALTER TABLE public.pain_archetypes
      ADD CONSTRAINT pain_archetypes_agent_job_id_fkey
      FOREIGN KEY (agent_job_id) REFERENCES public.agent_jobs(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. agent_logs
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_job_id uuid NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  level text DEFAULT 'info',
  message text,
  created_at timestamptz DEFAULT now()
);

-- Ensure agent_job_id exists (in case table was created earlier without it)
ALTER TABLE public.agent_logs ADD COLUMN IF NOT EXISTS agent_job_id uuid REFERENCES public.agent_jobs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_job_id ON public.agent_logs(agent_job_id);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read agent_logs for own jobs" ON public.agent_logs;
DROP POLICY IF EXISTS "Users can insert agent_logs for own jobs" ON public.agent_logs;
DROP POLICY IF EXISTS "Admins can read all agent_logs" ON public.agent_logs;

CREATE POLICY "Users can read agent_logs for own jobs"
  ON public.agent_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agent_jobs aj WHERE aj.id = agent_logs.agent_job_id AND aj.user_id = auth.uid()));
CREATE POLICY "Users can insert agent_logs for own jobs"
  ON public.agent_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_jobs aj WHERE aj.id = agent_logs.agent_job_id AND aj.user_id = auth.uid()));
CREATE POLICY "Admins can read all agent_logs"
  ON public.agent_logs FOR SELECT USING (public.is_admin());

-- 6. Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pain_archetypes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pain_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_jobs TO authenticated;
GRANT SELECT, INSERT ON public.agent_logs TO authenticated;
