import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  isLocalAuthEnabled,
  localRegister,
  localLogin,
  localLogout,
  localGetCurrentUser,
  localUpdateUser,
} from '@/lib/localAuth';

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
    // Use local auth on localhost
    if (isLocalAuthEnabled()) {
      const localUser = localGetCurrentUser();
      if (localUser) {
        set({
          user: {
            id: localUser.id,
            email: localUser.email,
            name: localUser.name,
            avatar: localUser.avatar,
            company: localUser.company,
            industry: localUser.industry,
            isVerified: localUser.isVerified,
            subscription: { plan: 'free', status: 'active' },
            createdAt: new Date(localUser.createdAt),
          },
          isAuthenticated: true,
        });
      }
      return;
    }

    // Use Supabase in production
    if (!isSupabaseConfigured()) return;

    void Promise.resolve(supabase.auth.getSession()).then(
      ({ data: { session } }) => {
        if (session?.user) {
          void Promise.resolve(
            supabase
              .from('profiles')
              .select('name, company, industry, avatar')
              .eq('id', session.user.id)
              .single()
          )
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
      },
      () => {}
    );

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
    // Use local auth on localhost - skip verification for dev
    if (isLocalAuthEnabled()) {
      set({ isLoading: true });
      const result = localRegister(email, password, name);
      set({ isLoading: false });
      
      if (result.success && result.user) {
        set({
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            avatar: result.user.avatar,
            company: result.user.company,
            industry: result.user.industry,
            isVerified: result.user.isVerified,
            subscription: { plan: 'free', status: 'active' },
            createdAt: new Date(result.user.createdAt),
          },
          isAuthenticated: true,
          pendingVerification: null, // No verification needed for local dev
        });
      }
      return result;
    }

    // Use Supabase in production
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
    // Use hardcoded verification for local dev
    if (isLocalAuthEnabled()) {
      const HARDCODED_CODE = '12345'; // Constant code for development
      
      if (code !== HARDCODED_CODE) {
        return { success: false, error: 'Invalid verification code. Use: 12345' };
      }
      
      // Mark as verified (though local auth auto-verifies anyway)
      const { pendingVerification } = get();
      if (pendingVerification) {
        set({ pendingVerification: null, isAuthenticated: true });
      }
      return { success: true };
    }

    // Use Supabase in production
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
    // For local dev, just return success (no actual email sent)
    if (isLocalAuthEnabled()) {
      return { success: true };
    }

    // Use Supabase in production
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
    // Use local auth on localhost
    if (isLocalAuthEnabled()) {
      set({ isLoading: true });
      const result = localLogin(email, password);
      set({ isLoading: false });
      
      if (result.success && result.user) {
        set({
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            avatar: result.user.avatar,
            company: result.user.company,
            industry: result.user.industry,
            isVerified: result.user.isVerified,
            subscription: { plan: 'free', status: 'active' },
            createdAt: new Date(result.user.createdAt),
          },
          isAuthenticated: true,
        });
      }
      return result;
    }

    // Use Supabase in production
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
    // Use local auth on localhost
    if (isLocalAuthEnabled()) {
      localLogout();
      set({ user: null, isAuthenticated: false, pendingVerification: null });
      return;
    }

    // Use Supabase in production
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    set({ user: null, isAuthenticated: false, pendingVerification: null });
  },

  updateUser: async (updates) => {
    const { user } = get();
    if (!user) return;

    // Use local auth on localhost
    if (isLocalAuthEnabled()) {
      localUpdateUser(user.id, updates);
      set((s) => ({ user: s.user ? { ...s.user, ...updates } : null }));
      return;
    }

    // Use Supabase in production
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
