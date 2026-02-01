import { motion } from 'framer-motion';
import { 
  UserPlus, 
  Target, 
  Cpu, 
  BarChart3, 
  LayoutDashboard,
  ArrowRight,
  Check,
  Globe,
  Search,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HowItWorksPageProps {
  onNavigate: (route: string) => void;
  onGetStarted: () => void;
}

const steps = [
  {
    number: '01',
    title: 'Sign Up & Verify',
    description: 'Create your account in seconds. Verify your email to activate full access to the platform.',
    icon: UserPlus,
    color: 'cyan',
    details: [
      'Enter your name and email',
      'Create a secure password',
      'Verify via email link',
      'Access your dashboard'
    ]
  },
  {
    number: '02',
    title: 'Configure Your Scout',
    description: 'Tell our AI what market intelligence you need. Define your industry, competitors, and target audience.',
    icon: Target,
    color: 'purple',
    details: [
      'Select your industry',
      'Add competitor names',
      'Define target audience',
      'Set discovery parameters'
    ]
  },
  {
    number: '03',
    title: 'Launch Scout Agents',
    description: 'Our autonomous AI agents begin crawling the web, analyzing millions of data points across platforms.',
    icon: Cpu,
    color: 'pink',
    details: [
      'Agents scan Reddit, Twitter, forums',
      'Analyze news and reviews',
      'Process competitor mentions',
      'Identify pain patterns'
    ]
  },
  {
    number: '04',
    title: 'AI Processing',
    description: 'Advanced NLP models cluster sentiments, score pain intensity, and calculate revenue potential.',
    icon: Zap,
    color: 'cyan',
    details: [
      'Sentiment analysis',
      'Pain intensity scoring',
      'Frequency tracking',
      'Revenue estimation'
    ]
  },
  {
    number: '05',
    title: 'View Results',
    description: 'Access your personalized dashboard with actionable insights, pain archetypes, and growth opportunities.',
    icon: LayoutDashboard,
    color: 'purple',
    details: [
      'Interactive pain charts',
      'Source verification links',
      'Revenue potential metrics',
      'Exportable reports'
    ]
  }
];

const features = [
  { icon: Globe, title: 'Multi-Platform', desc: 'Reddit, Twitter, LinkedIn, News, Forums' },
  { icon: Search, title: 'Real-Time', desc: 'Continuous monitoring 24/7' },
  { icon: Zap, title: 'AI-Powered', desc: 'GPT-4o + Custom NLP models' },
  { icon: Check, title: 'Verified', desc: 'Every insight links to source' },
];

export default function HowItWorksPage({ onNavigate, onGetStarted }: HowItWorksPageProps) {
  return (
    <div className="min-h-screen animated-gradient-bg">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-cyan/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('landing')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center border border-cyan/30">
                <Target className="w-5 h-5 text-cyan" />
              </div>
              <span className="font-orbitron font-bold text-lg tracking-wider">PAIN<span className="text-cyan">SCOPE</span></span>
            </button>
            <div className="flex items-center gap-4">
              <button onClick={() => onNavigate('landing')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">Home</button>
              <button onClick={() => onNavigate('pricing')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">Pricing</button>
              <Button onClick={onGetStarted} className="btn-cyber-primary text-sm">Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full mb-8">
            <BarChart3 className="w-4 h-4 text-cyan" />
            <span className="text-sm text-cyan font-mono">THE PROCESS</span>
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl lg:text-6xl font-orbitron font-bold mb-6">
            HOW IT <span className="text-gradient-cyan">WORKS</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From signup to insights in 5 simple steps. Our autonomous AI scouts do the heavy lifting while you focus on building.
          </motion.p>
        </div>
      </div>

      {/* Steps */}
      <div className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan/50 via-purple/50 to-cyan/50 hidden md:block" />
            
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`relative flex flex-col md:flex-row gap-8 mb-16 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Icon Circle */}
                <div className="flex-shrink-0 flex justify-center md:w-1/2">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                      step.color === 'cyan' ? 'bg-cyan/20 border-cyan' :
                      step.color === 'purple' ? 'bg-purple/20 border-purple' :
                      'bg-pink/20 border-pink'
                    }`}>
                      <step.icon className={`w-8 h-8 ${
                        step.color === 'cyan' ? 'text-cyan' :
                        step.color === 'purple' ? 'text-purple' :
                        'text-pink'
                      }`} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black border border-cyan/50 flex items-center justify-center">
                      <span className="text-xs font-orbitron font-bold text-cyan">{step.number}</span>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className={`md:w-1/2 ${index % 2 === 1 ? 'md:text-right' : ''}`}>
                  <div className="glass-panel rounded-xl p-6 card-cyber">
                    <h3 className="text-xl font-orbitron font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <ul className="space-y-2">
                      {step.details.map((detail, i) => (
                        <li key={i} className={`flex items-center gap-2 text-sm ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                          <Check className={`w-4 h-4 flex-shrink-0 ${
                            step.color === 'cyan' ? 'text-cyan' :
                            step.color === 'purple' ? 'text-purple' :
                            'text-pink'
                          }`} />
                          <span className="text-muted-foreground">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-6 py-20 border-t border-cyan/10">
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl md:text-3xl font-orbitron font-bold text-center mb-12">
            POWERED BY <span className="text-gradient-cyan">CUTTING-EDGE TECH</span>
          </motion.h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="glass-panel rounded-xl p-6 text-center"
              >
                <feature.icon className="w-8 h-8 text-cyan mx-auto mb-3" />
                <h3 className="font-orbitron font-bold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-20 border-t border-cyan/10">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl md:text-3xl font-orbitron font-bold mb-4">
            READY TO <span className="text-gradient-cyan">START</span>?
          </motion.h2>
          <p className="text-muted-foreground mb-8">Begin your 7-day free trial today. No credit card required.</p>
          <Button onClick={onGetStarted} className="btn-cyber-primary text-lg px-8 py-6">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
