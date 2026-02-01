import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, 
  Zap, 
  Target, 
  TrendingUp, 
  Activity,
  ChevronRight,
  Play,
  Globe,
  Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

// Animated particle background
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }
    
    let animationId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(5, 5, 8, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 245, 212, ${p.alpha})`;
        ctx.fill();
        
        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 245, 212, ${0.08 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        });
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
};

// Dashboard Preview Component
const DashboardPreview = () => {
  const [scanPos, setScanPos] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setScanPos(p => (p + 1) % 100), 40);
    return () => clearInterval(interval);
  }, []);
  
  const pains = [
    { name: 'Payment Friction', score: 87 },
    { name: 'Onboarding Issues', score: 76 },
    { name: 'API Latency', score: 68 },
    { name: 'Data Silos', score: 82 },
  ];
  
  return (
    <motion.div
      className="relative w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.8 }}
    >
      <div className="absolute -inset-10 bg-gradient-radial from-cyan/20 via-purple/10 to-transparent blur-3xl" />
      
      <div className="relative glass-panel rounded-xl overflow-hidden">
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent z-20 pointer-events-none"
          style={{ top: `${scanPos}%` }}
        />
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan/20 flex items-center justify-center">
              <Radar className="w-4 h-4 text-cyan" />
            </div>
            <span className="font-orbitron text-sm text-cyan">PAINSCOPE DASHBOARD</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground font-mono">AGENTS: 3 ACTIVE</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 grid grid-cols-12 gap-4">
          {/* Stats */}
          <div className="col-span-12 grid grid-cols-4 gap-4">
            {[
              { label: 'PAINS FOUND', value: '24', icon: Target, color: 'cyan' },
              { label: 'AVG SCORE', value: '73.5', icon: Activity, color: 'purple' },
              { label: 'SOURCES', value: '2,847', icon: Globe, color: 'pink' },
              { label: 'REVENUE', value: '$45.2M', icon: TrendingUp, color: 'cyan' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="glass-panel rounded-lg p-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 text-${stat.color}`} />
                  <span className="text-xs text-muted-foreground font-mono">{stat.label}</span>
                </div>
                <p className={`text-2xl font-orbitron font-bold text-${stat.color}`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>
          
          {/* Chart */}
          <motion.div
            className="col-span-8 glass-panel rounded-lg p-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-orbitron text-cyan">PAIN INTENSITY</span>
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground font-mono">LIVE</span>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>
            <div className="h-32 flex items-end gap-1">
              {[65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 88, 72].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{ background: `linear-gradient(180deg, rgba(0, 245, 212, ${0.3 + h/200}) 0%, rgba(168, 85, 247, 0.2) 100%)` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: 1.1 + i * 0.03 }}
                />
              ))}
            </div>
          </motion.div>
          
          {/* Top Pains */}
          <motion.div
            className="col-span-4 glass-panel rounded-lg p-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1 }}
          >
            <span className="text-sm font-orbitron text-cyan mb-3 block">TOP PAINS</span>
            <div className="space-y-2">
              {pains.map((pain, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-black/30"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                >
                  <span className="text-xs">{pain.name}</span>
                  <span className={`text-sm font-orbitron font-bold ${pain.score >= 80 ? 'text-red-400' : pain.score >= 70 ? 'text-yellow-400' : 'text-cyan'}`}>
                    {pain.score}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Terminal */}
          <motion.div
            className="col-span-12 glass-panel rounded-lg p-4 font-mono text-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-cyan" />
              <span className="text-cyan">AGENT LOGS</span>
            </div>
            <div className="space-y-1 text-muted-foreground">
              <p><span className="text-cyan">[14:32:01]</span> Scout Agent #3 connected to Reddit API</p>
              <p><span className="text-cyan">[14:32:15]</span> Analyzing r/fintech for pain mentions...</p>
              <p><span className="text-purple">[14:32:48]</span> Discovered: &ldquo;Payment friction&rdquo; - PainScore: 87</p>
              <p className="animate-pulse"><span className="text-cyan">[14:33:15]</span> Crawling Twitter for competitor mentions_</p>
            </div>
          </motion.div>
        </div>
        
        {/* Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan" />
      </div>
    </motion.div>
  );
};

export default function HeroSection({ onGetStarted, onSignIn }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen overflow-hidden animated-gradient-bg">
      <ParticleField />
      
      {/* Grid Lines */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`h-${i}`}
            className="absolute w-full h-px"
            style={{ top: `${(i + 1) * 6}%`, background: 'linear-gradient(90deg, transparent 0%, rgba(0, 245, 212, 0.08) 50%, transparent 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`v-${i}`}
            className="absolute w-px h-full"
            style={{ left: `${(i + 1) * 5}%`, background: 'linear-gradient(180deg, transparent 0%, rgba(168, 85, 247, 0.06) 50%, transparent 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
          />
        ))}
      </div>
      
      <div className="scan-lines" />
      
      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-cyan/20"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center border border-cyan/30">
                <Radar className="w-5 h-5 text-cyan" />
              </div>
              <span className="font-orbitron font-bold text-lg tracking-wider">
                PAIN<span className="text-cyan">SCOPE</span>
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-cyan transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-cyan transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-cyan transition-colors">Pricing</a>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onSignIn} className="text-cyan hover:text-cyan-light hover:bg-cyan/10">
                Sign In
              </Button>
              <Button onClick={onGetStarted} className="btn-cyber-primary">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>
      
      {/* Hero Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-12">
        <div className="max-w-7xl w-full mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full">
              <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
              <span className="text-sm text-cyan font-mono">AGENTIC AI v2.0 NOW LIVE</span>
            </div>
          </motion.div>
          
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-orbitron font-bold mb-6 leading-tight"
          >
            DISCOVER MARKET
            <br />
            <span className="text-gradient-cyan">GAPS BEFORE</span>
            <br />
            <span className="text-gradient-purple">THEY EXIST</span>
          </motion.h1>
          
          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Deploy autonomous AI scouts that crawl the web 24/7, uncover unmet customer needs, 
            and quantify their revenue potential with surgical precision.
          </motion.p>
          
          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button size="lg" onClick={onGetStarted} className="btn-cyber-primary text-lg px-8 py-6">
              <Zap className="w-5 h-5 mr-2" />
              Start Free Trial
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-cyan/30 text-cyan hover:bg-cyan/10 text-lg px-8 py-6">
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </motion.div>
          
          {/* Dashboard Preview */}
          <DashboardPreview />
          
          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="mt-16 glass-panel rounded-xl p-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '50K+', label: 'Pain Points Discovered' },
                { value: '$2.1B', label: 'Revenue Potential' },
                { value: '500+', label: 'Active Scout Agents' },
                { value: '99.9%', label: 'Source Verification' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl md:text-3xl font-orbitron font-bold text-cyan">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
