import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  company?: string;
  industry?: string;
  isVerified: boolean;
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
}

function mapSupabaseUser(sbUser: SupabaseUser, profile?: { name?: string; company?: string; industry?: string; avatar?: string } | null): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    name: profile?.name ?? sbUser.user_metadata?.full_name ?? sbUser.user_metadata?.name ?? 'User',
    avatar: profile?.avatar ?? sbUser.user_metadata?.avatar_url,
    company: profile?.company,
    industry: profile?.industry,
    isVerified: sbUser.email_confirmed_at != null,
    subscription: { plan: 'free', status: 'active' },
    createdAt: new Date(sbUser.created_at ?? Date.now()),
  };
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  pendingVerification: null,
  isPasswordRecovery: false,

  setPasswordRecovery: (value) => set({ isPasswordRecovery: value }),

  initAuth: () => {
    if (!isSupabaseConfigured()) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('name, company, industry, avatar')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            set({
              user: mapSupabaseUser(session.user, data),
              isAuthenticated: true,
            });
          })
          .catch(() => {
            set({
              user: mapSupabaseUser(session.user),
              isAuthenticated: true,
            });
          });
      }
    });

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, isAuthenticated: false, pendingVerification: null, isPasswordRecovery: false });
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        set({ isPasswordRecovery: true });
        return;
      }
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('name, company, industry, avatar').eq('id', session.user.id).single();
        set({
          user: mapSupabaseUser(session.user, data),
          isAuthenticated: true,
          pendingVerification: null,
          isPasswordRecovery: false,
        });
      }
    });
  },

  register: async (email, password, name) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured' };
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
      const { data: profile } = await supabase.from('profiles').select('name, company, industry, avatar').eq('id', data.user.id).single();
      set({ user: mapSupabaseUser(data.user, profile), isAuthenticated: true });
      return { success: true };
    }
    return { success: true };
  },

  verifyEmail: async (code) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured' };
    }
    const { pendingVerification } = get();
    if (!pendingVerification) {
      return { success: false, error: 'No pending verification' };
    }
    set({ isLoading: true });
    const { data, error } = await supabase.auth.verifyOtp({
      email: pendingVerification,
      token: code,
      type: 'email',
    });
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    if (data?.user) {
      const { data: profile } = await supabase.from('profiles').select('name, company, industry, avatar').eq('id', data.user.id).single();
      set({ user: mapSupabaseUser(data.user, profile), isAuthenticated: true, pendingVerification: null });
      return { success: true };
    }
    return { success: false, error: 'Verification failed' };
  },

  resendVerification: async (email) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured' };
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
      return { success: false, error: 'Supabase is not configured' };
    }
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    set({ isLoading: false });
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        set({ pendingVerification: email });
        return { success: false, error: 'Please verify your email' };
      }
      return { success: false, error: error.message };
    }
    if (data?.user) {
      const { data: profile } = await supabase.from('profiles').select('name, company, industry, avatar').eq('id', data.user.id).single();
      set({ user: mapSupabaseUser(data.user, profile), isAuthenticated: true });
      return { success: true };
    }
    return { success: false, error: 'Login failed' };
  },

  loginWithOtp: async (email) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured' };
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
      return { success: false, error: 'Supabase is not configured' };
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
    if (!user || !isSupabaseConfigured()) {
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
      return { success: false, error: 'Supabase is not configured' };
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
      return { success: false, error: 'Supabase is not configured' };
    }
    set({ isLoading: true });
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
}));
