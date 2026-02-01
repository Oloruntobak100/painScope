# PainScope AI - Supabase Setup

This guide covers creating a Supabase project and applying the schema for PainScope AI.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose your organization, name the project (e.g., `painscope-ai`), set a database password, and select a region.
4. Wait for the project to be created.

## 2. Get Credentials

In the Supabase dashboard:

1. Go to **Project Settings** → **API**.
2. Copy:
   - **Project URL** → use as `VITE_SUPABASE_URL`
   - **anon public** key → use as `VITE_SUPABASE_ANON_KEY`

## 3. Run Migrations

### Option A: Supabase SQL Editor

1. Go to **SQL Editor** in the Supabase dashboard.
2. Run each migration file in order from `supabase/migrations/`:
   - `20250201000001_initial_schema.sql`
   - `20250201000002_rls_policies.sql`
   - `20250201000003_profile_trigger.sql`

### Option B: Supabase CLI

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
3. Run migrations:
   ```bash
   supabase db push
   ```

## 4. Schema Overview

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends auth.users) |
| `briefings` | Briefing sessions |
| `briefing_messages` | Chat messages per briefing |
| `pain_archetypes` | Discovered pain points |
| `pain_sources` | Source citations for pains |
| `agent_jobs` | Discovery job metadata |
| `agent_logs` | Log entries per job |
| `user_settings` | Notification and app preferences |
| `notifications` | In-app notifications |

All tables use Row Level Security (RLS). Users can only access their own data.

## 5. Enable Auth Providers

In **Authentication** → **Providers**:

- **Email:** Enabled by default. Configure "Confirm email" as needed.
- **Google:** Enable and add your OAuth credentials from Google Cloud Console.

## 6. Environment Variables

Add to your app (Vercel or `.env`):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Never commit the anon key to public repos; use Vercel env vars or `.env` (and ensure `.env` is in `.gitignore`).
