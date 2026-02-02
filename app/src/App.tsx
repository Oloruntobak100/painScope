import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
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

function getInitialRoute(): AppRoute {
  const raw = window.location.hash.slice(1) || 'landing';
  const path = raw.split('?')[0];
  const valid: AppRoute[] = ['landing', 'how-it-works', 'pricing', 'contact', 'privacy', 'terms', 'dashboard', 'briefing', 'scout', 'library', 'settings'];
  return valid.includes(path as AppRoute) ? (path as AppRoute) : 'landing';
}

function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const { isAuthenticated, user, isPasswordRecovery, isInitialized } = useAuthStore();

  useEffect(() => {
    const onHashChange = () => setCurrentRoute(getInitialRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
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
    }
  }, [isInitialized, isAuthenticated, currentRoute]);

  // Redirect non-admin users from settings
  useEffect(() => {
    if (currentRoute === 'settings' && isAuthenticated && user?.role !== 'admin') {
      setCurrentRoute('dashboard');
      window.location.hash = 'dashboard';
    }
  }, [currentRoute, isAuthenticated, user?.role]);

  // Redirect authenticated users from landing to app only when URL has a hash
  // (and never on local dev so we always see the homepage at localhost/127.0.0.1)
  useEffect(() => {
    const isLocalDev =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalDev) return;
    const hash = window.location.hash.slice(1);
    if (isAuthenticated && currentRoute === 'landing' && hash) {
      const targetRoute = user?.industry ? 'dashboard' : 'briefing';
      setCurrentRoute(targetRoute);
      window.location.hash = targetRoute;
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
    const query = queryParams && Object.keys(queryParams).length > 0
      ? '?' + new URLSearchParams(queryParams).toString()
      : '';
    window.location.hash = r === 'landing' ? '' : r + query;
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
  };

  const handleSubscribe = (plan: string) => {
    if (!isAuthenticated) {
      setAuthMode('signup');
      setAuthModalOpen(true);
      return;
    }
    alert(`Starting subscription for ${plan} plan...`);
  };

  const renderContent = () => {
    // Wait for session restore before showing protected routes (avoids redirect flash on refresh)
    if (!isInitialized && PROTECTED_ROUTES.includes(currentRoute)) {
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
            <HeroSection onGetStarted={handleGetStarted} onSignIn={handleSignIn} />
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
            <PricingPage onNavigate={navigate} onSubscribe={handleSubscribe} />
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
            <HeroSection onGetStarted={handleGetStarted} onSignIn={handleSignIn} />
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
