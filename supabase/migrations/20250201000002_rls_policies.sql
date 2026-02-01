-- PainScope AI: Row Level Security Policies
-- Ensures users can only access their own data

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Briefings: users can CRUD own briefings
CREATE POLICY "Users can manage own briefings" ON public.briefings
  FOR ALL USING (auth.uid() = user_id);

-- Briefing messages: via briefing ownership
CREATE POLICY "Users can manage own briefing messages" ON public.briefing_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.briefings b
      WHERE b.id = briefing_id AND b.user_id = auth.uid()
    )
  );

-- Pain archetypes: users can CRUD own pains
CREATE POLICY "Users can manage own pain archetypes" ON public.pain_archetypes
  FOR ALL USING (auth.uid() = user_id);

-- Pain sources: via pain archetype ownership
CREATE POLICY "Users can manage own pain sources" ON public.pain_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pain_archetypes p
      WHERE p.id = pain_archetype_id AND p.user_id = auth.uid()
    )
  );

-- Agent jobs: users can CRUD own jobs
CREATE POLICY "Users can manage own agent jobs" ON public.agent_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Agent logs: via agent job ownership
CREATE POLICY "Users can manage own agent logs" ON public.agent_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agent_jobs j
      WHERE j.id = agent_job_id AND j.user_id = auth.uid()
    )
  );

-- User settings: users can CRUD own settings
CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Notifications: users can read/update own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
