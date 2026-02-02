-- =============================================================================
-- PainScope: reports table + report_id on pain_archetypes (run after pain/agent tables)
-- =============================================================================
-- Run in Supabase Dashboard > SQL Editor AFTER supabase-pain-and-agent-tables.sql
-- =============================================================================

-- 1. reports table (one row per generated report)
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_id uuid,
  created_at timestamptz DEFAULT now(),
  pain_count int DEFAULT 0,
  avg_pain_score numeric DEFAULT 0,
  top_pain text,
  comprehensive_report text,
  dashboard_metrics jsonb DEFAULT '{}',
  structured_data jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can read all reports" ON public.reports;

CREATE POLICY "Users can read own reports"
  ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all reports"
  ON public.reports FOR SELECT USING (public.is_admin());

GRANT SELECT, INSERT ON public.reports TO authenticated;

-- 2. Link pain_archetypes to report (optional; run if pain_archetypes exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pain_archetypes' AND column_name = 'report_id'
  ) THEN
    ALTER TABLE public.pain_archetypes
      ADD COLUMN report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_pain_archetypes_report_id ON public.pain_archetypes(report_id);
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
