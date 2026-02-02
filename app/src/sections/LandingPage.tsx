import { motion } from 'framer-motion';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Shield, 
  ArrowRight, 
  BarChart3, 
  Search,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const features = [
  {
    icon: Search,
    title: 'Autonomous Discovery',
    description: 'AI agents crawl the web 24/7 to uncover unmet market needs and pain points.',
  },
  {
    icon: Target,
    title: 'Precision Scoring',
    description: 'PainScore algorithm quantifies severity, frequency, and urgency for prioritization.',
  },
  {
    icon: TrendingUp,
    title: 'Revenue Intelligence',
    description: 'Estimate TAM, SAM, and SOM for every discovered pain archetype.',
  },
  {
    icon: Shield,
    title: 'Source Verification',
    description: 'Every insight links to its source—no hallucinations, only verified data.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Brief the AI',
    description: 'Tell our Strategist about your industry, product, and competitors.',
  },
  {
    number: '02',
    title: 'Launch Scouts',
    description: 'Deploy autonomous agents to crawl Reddit, Twitter, news, and forums.',
  },
  {
    number: '03',
    title: 'Discover Pains',
    description: 'Receive scored pain archetypes with revenue potential analysis.',
  },
  {
    number: '04',
    title: 'Take Action',
    description: 'Push insights to your CRM and build products people actually need.',
  },
];

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen mesh-gradient relative overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-enhanced">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img src="/favicon.svg" alt="PainScope AI" className="w-8 h-8 rounded-lg flex-shrink-0" />
              <span className="font-semibold text-lg">PainScope AI</span>
            </motion.div>

            {/* Nav Links */}
            <motion.div 
              className="hidden md:flex items-center gap-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </motion.div>

            {/* CTA */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Button 
                variant="ghost" 
                onClick={onSignIn}
                className="text-sm hidden sm:flex"
              >
                Sign In
              </Button>
              <Button 
                onClick={onGetStarted}
                className="bg-lime text-background hover:bg-lime-light font-medium"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
            >
              <Sparkles className="w-4 h-4 text-lime" />
              <span className="text-sm text-muted-foreground">
                Now with GPT-4o Powered Agents
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              Discover Market Gaps
              <br />
              <span className="text-gradient">Before Your Competitors</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
            >
              PainScope AI deploys autonomous agents to uncover unmet customer needs, 
              quantify their intensity, and estimate revenue potential—automatically.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button 
                size="lg"
                onClick={onGetStarted}
                className="bg-lime text-background hover:bg-lime-light font-semibold px-8 py-6 text-lg glow-lime"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-border hover:border-lime/50 px-8 py-6 text-lg"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                View Demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-16 pt-8 border-t border-border/50"
            >
              <p className="text-sm text-muted-foreground mb-6">
                Trusted by product teams at
              </p>
              <div className="flex items-center justify-center gap-8 opacity-50">
                {['Stripe', 'Notion', 'Figma', 'Linear', 'Vercel'].map((company) => (
                  <span key={company} className="text-lg font-semibold">
                    {company}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Agentic Intelligence for
              <span className="text-gradient"> Market Discovery</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered platform combines autonomous agents with advanced scoring 
              algorithms to surface high-value market opportunities.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-xl p-6 card-hover"
              >
                <div className="w-12 h-12 rounded-lg bg-lime/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-lime" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              From Brief to
              <span className="text-gradient"> Insights in Minutes</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our streamlined workflow gets you from idea to actionable intelligence 
              faster than traditional market research.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="glass rounded-xl p-6 h-full">
                  <span className="text-4xl font-bold text-lime/30">{step.number}</span>
                  <h3 className="font-semibold text-lg mt-4 mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ChevronRight className="w-6 h-6 text-lime/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-lime/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <Zap className="w-12 h-12 text-lime mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Discover Your Next
                <span className="text-gradient"> Big Opportunity?</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of product teams using PainScope AI to build 
                products that solve real problems.
              </p>
              <Button 
                size="lg"
                onClick={onGetStarted}
                className="bg-lime text-background hover:bg-lime-light font-semibold px-8 py-6 text-lg glow-lime"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                No credit card required. 14-day free trial.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="PainScope AI" className="w-8 h-8 rounded-lg flex-shrink-0" />
              <span className="font-semibold">PainScope AI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 PainScope AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
