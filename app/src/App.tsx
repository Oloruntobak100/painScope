import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import HeroSection from '@/sections/HeroSection';
import AuthModal from '@/sections/AuthModal';
import HowItWorksPage from '@/sections/HowItWorksPage';
import PricingPage from '@/sections/PricingPage';
import ContactPage from '@/sections/ContactPage';
import Footer from '@/sections/Footer';
import { PrivacyPolicyPage, TermsPage } from '@/sections/LegalPages';
import Dashboard from '@/sections/Dashboard';
import BriefingRoom from '@/sections/BriefingRoom';
import ScoutLab from '@/sections/ScoutLab';
import PainLibrary from '@/sections/PainLibrary';
import Settings from '@/sections/Settings';
import './App.css';

type PublicRoute = 'landing' | 'how-it-works' | 'pricing' | 'contact' | 'privacy' | 'terms';
type AppRoute = PublicRoute | 'dashboard' | 'briefing' | 'scout' | 'library' | 'settings';

const PROTECTED_ROUTES: AppRoute[] = ['dashboard', 'briefing', 'scout', 'library', 'settings'];

const VALID_ROUTES: AppRoute[] = ['landing', 'how-it-works', 'pricing', 'contact', 'privacy', 'terms', 'dashboard', 'briefing', 'scout', 'library', 'settings'];

function getInitialRoute(): AppRoute {
  const pathname = window.location.pathname.replace(/^\/+/, '') || 'landing';
  const path = pathname.split('/')[0].split('?')[0] || 'landing';
  return VALID_ROUTES.includes(path as AppRoute) ? (path as AppRoute) : 'landing';
}

function getPathForRoute(route: AppRoute, queryParams?: Record<string, string>) {
  const query = queryParams && Object.keys(queryParams).length > 0
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';
  return route === 'landing' ? '/' : `/${route}${query}`;
}

function setRouteUrl(route: AppRoute, queryParams?: Record<string, string>) {
  window.history.replaceState({}, '', getPathForRoute(route, queryParams));
}

function pushRouteUrl(route: AppRoute, queryParams?: Record<string, string>) {
  window.history.pushState({}, '', getPathForRoute(route, queryParams));
}

function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const { isAuthenticated, user, isPasswordRecovery, isInitialized } = useAuthStore();

  useEffect(() => {
    const onPopState = () => setCurrentRoute(getInitialRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Sync auth modal when password recovery
  useEffect(() => {
    if (isPasswordRecovery) {
      setAuthModalOpen(true);
    }
  }, [isPasswordRecovery]);

  // Redirect unauthenticated users from protected routes (only after we've tried to restore session on refresh)
  useEffect(() => {
    if (isInitialized && !isAuthenticated && PROTECTED_ROUTES.includes(currentRoute)) {
      setCurrentRoute('landing');
      setRouteUrl('landing');
    }
  }, [isInitialized, isAuthenticated, currentRoute]);

  // Redirect non-admin users from settings
  useEffect(() => {
    if (currentRoute === 'settings' && isAuthenticated && user?.role !== 'admin') {
      setCurrentRoute('dashboard');
      setRouteUrl('dashboard');
    }
  }, [currentRoute, isAuthenticated, user?.role]);

  // Redirect authenticated users from / (landing) to dashboard or briefing
  useEffect(() => {
    const isLocalDev =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalDev) return;
    if (isAuthenticated && currentRoute === 'landing') {
      const targetRoute = user?.industry ? 'dashboard' : 'briefing';
      setCurrentRoute(targetRoute);
      setRouteUrl(targetRoute);
    }
  }, [isAuthenticated, currentRoute, user?.industry]);

  const navigate = (route: string, queryParams?: Record<string, string>) => {
    const r = route as AppRoute;
    if (PROTECTED_ROUTES.includes(r) && !isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }
    setCurrentRoute(r);
    pushRouteUrl(r, queryParams);
    window.scrollTo(0, 0);
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate(user?.industry ? 'dashboard' : 'briefing');
    } else {
      setAuthMode('signup');
      setAuthModalOpen(true);
    }
  };

  const handleSignIn = () => {
    setAuthMode('signin');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    const currentUser = useAuthStore.getState().user;
    const targetRoute = currentUser?.industry ? 'dashboard' : 'briefing';
    setCurrentRoute(targetRoute);
    pushRouteUrl(targetRoute);
    window.scrollTo(0, 0);
  };

  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const handleSubscribe = async (plan: string, interval: 'monthly' | 'yearly' = 'yearly') => {
    if (!isAuthenticated) {
      setAuthMode('signup');
      setAuthModalOpen(true);
      return;
    }
    if (plan === 'free') return;
    setSubscribeError(null);
    setSubscribeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSubscribeError('Please sign in again.');
        return;
      }
      const apiBase = (import.meta.env.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ planId: plan, interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubscribeError(data.error || 'Could not start checkout.');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setSubscribeError('No checkout URL returned.');
    } catch (e) {
      setSubscribeError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubscribeLoading(false);
    }
  };

  const renderContent = () => {
    // Wait for session restore before showing protected routes (avoids redirect flash on refresh).
    // If we're already authenticated (e.g. just signed in), show the app; don't block on init.
    if (!isInitialized && !isAuthenticated && PROTECTED_ROUTES.includes(currentRoute)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse text-muted-foreground">Loading…</div>
        </div>
      );
    }
    switch (currentRoute) {
      case 'landing':
        return (
          <>
            <HeroSection onGetStarted={handleGetStarted} onSignIn={handleSignIn} onNavigate={navigate} />
            <Footer onNavigate={navigate} />
          </>
        );
      case 'how-it-works':
        return (
          <>
            <HowItWorksPage onNavigate={navigate} onGetStarted={handleGetStarted} />
            <Footer onNavigate={navigate} />
          </>
        );
      case 'pricing':
        return (
          <>
            <PricingPage
              onNavigate={navigate}
              onSubscribe={handleSubscribe}
              subscribeLoading={subscribeLoading}
              subscribeError={subscribeError}
              onClearSubscribeError={() => setSubscribeError(null)}
            />
            <Footer onNavigate={navigate} />
          </>
        );
      case 'contact':
        return (
          <>
            <ContactPage onNavigate={navigate} />
            <Footer onNavigate={navigate} />
          </>
        );
      case 'privacy':
        return <PrivacyPolicyPage onNavigate={navigate} />;
      case 'terms':
        return <TermsPage onNavigate={navigate} />;
      case 'dashboard':
        return <Dashboard onNavigate={navigate} currentRoute="dashboard" />;
      case 'briefing':
        return <BriefingRoom onNavigate={navigate} currentRoute="briefing" />;
      case 'scout':
        return <ScoutLab onNavigate={navigate} currentRoute="scout" />;
      case 'library':
        return <PainLibrary onNavigate={navigate} currentRoute="library" />;
      case 'settings':
        return <Settings onNavigate={navigate} currentRoute="settings" />;
      default:
        return (
          <>
            <HeroSection onGetStarted={handleGetStarted} onSignIn={handleSignIn} onNavigate={navigate} />
            <Footer onNavigate={navigate} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRoute}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      <AuthModal
        isOpen={authModalOpen || isPasswordRecovery}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </div>
  );
}

export default App;
