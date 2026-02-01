# PainScope AI - Deployment Guide

This guide covers deploying PainScope AI to Vercel via GitHub.

## Prerequisites

- GitHub account
- Vercel account
- Supabase account (create at [supabase.com](https://supabase.com))

## 1. Push to GitHub

1. Initialize git (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/PainScopeAi.git
   git branch -M main
   git push -u origin main
   ```

## 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** and import your PainScope AI repository.
3. **Configure the project:**
   - **Root Directory:** Set to `app` (the Vite app lives in the `app/` folder).
   - **Framework Preset:** Vite (auto-detected).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. Add environment variables (see [Environment Variables](#environment-variables) below). You can add them now or after Supabase setup.

5. Click **Deploy**.

## 3. Vercel Configuration

The project includes an `app/vercel.json` that configures:

- SPA rewrites: all routes redirect to `index.html` for client-side routing
- Build output: `dist` folder

If your repository root is the `app` folder (i.e., you cloned only the app), no Root Directory change is needed. If your repo contains an `app/` subfolder, set **Root Directory** to `app` in Vercel project settings.

## 4. Environment Variables

Add these in Vercel: **Project → Settings → Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes (after Phase 2) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes (after Phase 2) |
| `VITE_N8N_WEBHOOK_URL` | n8n webhook URL for AI chat | Yes (after Phase 3) |

For local development, create an `app/.env` file (see `app/.env.example`).

## 5. Post-Deploy

After deployment:

1. Your app will be available at `https://your-project.vercel.app`
2. If Supabase/env vars are not yet set, the app will show auth errors until configured.
3. Run Supabase migrations (see [docs/SUPABASE.md](./SUPABASE.md)) before using auth.

## 6. Custom Domain (Optional)

In Vercel: **Project → Settings → Domains** → Add your domain and follow DNS instructions.
