import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  company?: string;
  industry?: string;
  isVerified: boolean;
  role?: UserRole;
  isLocked?: boolean;
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'trialing' | 'canceled';
    trialEndsAt?: Date;
  };
  createdAt: Date;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** False until INITIAL_SESSION has been processed (so we don't redirect before restoring session on refresh) */
  isInitialized: boolean;
  pendingVerification: string | null;
  isPasswordRecovery: boolean;
}

interface AuthStore extends AuthState {
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  initAuth: () => void;
  setPasswordRecovery: (value: boolean) => void;
  /** Admin only: update another user's profile (role, is_locked, name, company, industry) */
  updateUserProfileAsAdmin: (userId: string, updates: { name?: string; company?: string; industry?: string; role?: UserRole; is_locked?: boolean }) => Promise<{ success: boolean; error?: string }>;
  /** Admin only: list all users (from Supabase profiles, RLS allows admins to select all) */
  listUsersForAdmin: () => Promise<Array<{ id: string; email: string; name: string; company?: string; industry?: string; role: UserRole; is_locked: boolean }>>;
}

// Full profiles schema: run supabase-profiles-admin.sql once so these columns exist
const PROFILE_SELECT = 'name, company, industry, avatar, role, email, is_locked';

function mapSupabaseUser(
  sbUser: SupabaseUser,
  profile?: { name?: string; company?: string; industry?: string; avatar?: string; role?: string; is_locked?: boolean; email?: string } | null
): User {
  const role = (profile?.role === 'admin' ? 'admin' : 'user') as User['role'];
  return {
    id: sbUser.id,
    email: profile?.email ?? sbUser.email ?? '',
    name: profile?.name ?? sbUser.user_metadata?.full_name ?? sbUser.user_metadata?.name ?? 'User',
    avatar: profile?.avatar ?? sbUser.user_metadata?.avatar_url,
    company: profile?.company,
    industry: profile?.industry,
    isVerified: sbUser.email_confirmed_at != null,
    role,
    isLocked: profile?.is_locked === true,
    subscription: { plan: 'free', status: 'active' },
    createdAt: new Date(sbUser.created_at ?? Date.now()),
  };
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  pendingVerification: null,
  isPasswordRecovery: false,

  setPasswordRecovery: (value) => set({ isPasswordRecovery: value }),

  initAuth: () => {
    if (!isSupabaseConfigured()) {
      set({ isInitialized: true });
      return;
    }

    type ProfileRow = { name?: string; company?: string; industry?: string; avatar?: string; role?: string; email?: string; is_locked?: boolean } | null;

    const PROFILE_SELECT_MINIMAL = 'name, company, industry, avatar, role';
    const fetchProfileWithRetry = async (userId: string): Promise<ProfileRow> => {
      const run = async (select: string): Promise<ProfileRow> => {
        const res = await supabase.from('profiles').select(select).eq('id', userId).single();
        return (res.data as ProfileRow) ?? null;
      };
      try {
        const data = await run(PROFILE_SELECT);
        if (data != null) return data;
      } catch {
        // Full select may fail if email/is_locked columns missing; retry with minimal so role (admin) loads
      }
      try {
        await new Promise((r) => setTimeout(r, 200));
        return await run(PROFILE_SELECT_MINIMAL);
      } catch {
        return null;
      }
    };

    const applySession = async (session: { user: SupabaseUser } | null): Promise<void> => {
      if (!session?.user) return;
      const data = await fetchProfileWithRetry(session.user.id);
      const mapped = mapSupabaseUser(session.user, data);
      if (mapped.isLocked) {
        void supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      } else {
        set({ user: mapped, isAuthenticated: true });
      }
    };

    const markInitialized = () => set({ isInitialized: true });

    // INITIAL_SESSION: Supabase restores session from storage and emits this once
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        void applySession(session).then(markInitialized);
        return;
      }
      if (event === 'SIGNED_OUT') {
        set({ user: null, isAuthenticated: false, pendingVerification: null, isPasswordRecovery: false });
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        set({ isPasswordRecovery: true });
        return;
      }
      if (session?.user) {
        void fetchProfileWithRetry(session.user.id).then((data) => {
          const mapped = mapSupabaseUser(session.user!, data);
          if (mapped.isLocked) {
            void supabase.auth.signOut();
            set({ user: null, isAuthenticated: false });
            return;
          }
          set({
            user: mapped,
            isAuthenticated: true,
            pendingVerification: null,
            isPasswordRecovery: false,
          });
        });
      }
    });

    // Fallback: getSession() in case INITIAL_SESSION is delayed or doesn't fire (e.g. some clients)
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (get().isInitialized) return;
      void applySession(session).then(markInitialized);
    });

    // Safety: if neither INITIAL_SESSION nor getSession() sets state in time, mark initialized after 4s
    setTimeout(() => {
      if (!get().isInitialized) markInitialized();
    }, 4000);
  },

  register: async (email, password, name) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, name },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    if (data?.user && !data.user.email_confirmed_at) {
      set({ pendingVerification: email });
      return { success: true };
    }
    if (data?.user) {
      const { data: profile } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', data.user.id).single();
      set({ user: mapSupabaseUser(data.user, profile), isAuthenticated: true });
      return { success: true };
    }
    return { success: true };
  },

  verifyEmail: async (code) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }
    const { pendingVerification } = get();
    if (!pendingVerification) {
      return { success: false, error: 'No pending verification' };
    }
    set({ isLoading: true });
    try {
      const token = String(code).trim();
      let result = await supabase.auth.verifyOtp({
        email: pendingVerification,
        token,
        type: 'email',
      });
      if (result.error && result.data == null) {
        const trySignup = await supabase.auth.verifyOtp({
          email: pendingVerification,
          token,
          type: 'signup',
        });
        if (!trySignup.error) result = trySignup;
      }
      const { data, error } = result;
      if (error) return { success: false, error: error.message };
      if (data?.user) {
        const { data: profile } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', data.user.id).single();
        set({ user: mapSupabaseUser(data.user, profile), isAuthenticated: true, pendingVerification: null });
        return { success: true };
      }
      return { success: false, error: 'Verification failed' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  resendVerification: async (email) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }
    set({ isLoading: true });
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }
    set({ isLoading: true });
    try {
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const { data, error } = await Promise.race([
        signInPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 15000)
        ),
      ]);
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          set({ pendingVerification: email });
          return { success: false, error: 'Please verify your email' };
        }
        return { success: false, error: error.message };
      }
      if (data?.user) {
        let profile: { name?: string; company?: string; industry?: string; avatar?: string; role?: string; email?: string; is_locked?: boolean } | null = null;
        try {
          const profilePromise = supabase.from('profiles').select(PROFILE_SELECT).eq('id', data.user.id).single();
          const res = await Promise.race([
            profilePromise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('profile_timeout')), 8000)),
          ]);
          profile = res?.data ?? null;
        } catch {
          // Profile fetch failed or timed out; use auth user only so login still completes
        }
        const mapped = mapSupabaseUser(data.user, profile);
        if (mapped.isLocked) {
          await supabase.auth.signOut();
          return { success: false, error: 'Account is locked. Contact an administrator.' };
        }
        set({ user: mapped, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithOtp: async (email) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  loginWithGoogle: async () => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    set({ user: null, isAuthenticated: false, pendingVerification: null });
  },

  updateUser: async (updates) => {
    const { user } = get();
    if (!user) return;
    if (!isSupabaseConfigured()) {
      set((s) => ({ user: s.user ? { ...s.user, ...updates } : null }));
      return;
    }
    await supabase
      .from('profiles')
      .update({
        name: updates.name,
        company: updates.company,
        industry: updates.industry,
        avatar: updates.avatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    set((s) => ({ user: s.user ? { ...s.user, ...updates } : null }));
  },

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }
    set({ isLoading: true });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  resetPassword: async (newPassword: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Authentication is not configured' };
    }
    set({ isLoading: true });
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  updateUserProfileAsAdmin: async (userId, updates) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Authentication is not configured' };
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.company !== undefined) payload.company = updates.company;
    if (updates.industry !== undefined) payload.industry = updates.industry;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.is_locked !== undefined) payload.is_locked = updates.is_locked;
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    return error ? { success: false, error: error.message } : { success: true };
  },

  listUsersForAdmin: async () => {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase.from('profiles').select('id, email, name, company, industry, role, is_locked');
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id,
      email: (r.email as string) ?? '',
      name: (r.name as string) ?? '',
      company: r.company as string | undefined,
      industry: r.industry as string | undefined,
      role: (r.role === 'admin' ? 'admin' : 'user') as UserRole,
      is_locked: Boolean(r.is_locked),
    }));
  },
}));
