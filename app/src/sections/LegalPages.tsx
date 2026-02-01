import { motion } from 'framer-motion';
import { Shield, FileText, Lock, Eye, Database, Globe, AlertTriangle, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LegalPageProps {
  onNavigate: (route: string) => void;
}

export function PrivacyPolicyPage({ onNavigate }: LegalPageProps) {
  return (
    <div className="min-h-screen animated-gradient-bg">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-cyan/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('landing')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center border border-cyan/30">
                <Shield className="w-5 h-5 text-cyan" />
              </div>
              <span className="font-orbitron font-bold text-lg tracking-wider">PAIN<span className="text-cyan">SCOPE</span></span>
            </button>
            <Button variant="ghost" onClick={() => onNavigate('landing')} className="text-cyan hover:text-cyan-light">
              <ArrowLeft className="w-5 h-5 mr-2" />Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full mb-6">
              <Lock className="w-4 h-4 text-cyan" />
              <span className="text-sm text-cyan font-mono">LEGAL</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-orbitron font-bold mb-4">PRIVACY <span className="text-gradient-cyan">POLICY</span></h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-cyan" />1. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">PainScope AI collects:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan mt-1 flex-shrink-0" /><span><strong>Account Info:</strong> Name, email, company, industry</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan mt-1 flex-shrink-0" /><span><strong>Usage Data:</strong> Scout configs, discovered pains</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan mt-1 flex-shrink-0" /><span><strong>Payment Info:</strong> Processed securely via Stripe</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan mt-1 flex-shrink-0" /><span><strong>Technical:</strong> IP, browser, cookies</span></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4 flex items-center gap-2"><Database className="w-5 h-5 text-purple" />2. How We Use Your Data</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-purple mt-1 flex-shrink-0" /><span>Provide market intelligence services</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-purple mt-1 flex-shrink-0" /><span>Process payments and subscriptions</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-purple mt-1 flex-shrink-0" /><span>Send service notifications</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-purple mt-1 flex-shrink-0" /><span>Improve AI models</span></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-pink" />3. Data Security</h2>
              <p className="text-muted-foreground">We use encryption at rest and in transit, regular audits, and SOC 2 compliant data centers. We never sell your data.</p>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-cyan" />4. Third-Party Services</h2>
              <p className="text-muted-foreground">We use Stripe (payments), cloud providers, and analytics tools bound by strict data protection agreements.</p>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" />5. Your Rights</h2>
              <p className="text-muted-foreground mb-2">You can access, update, delete, or export your data. Contact us for requests.</p>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4">6. Contact</h2>
              <p className="text-muted-foreground">Questions? Email <a href="mailto:privacy@painscope.ai" className="text-cyan hover:underline">privacy@painscope.ai</a></p>
            </section>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function TermsPage({ onNavigate }: LegalPageProps) {
  return (
    <div className="min-h-screen animated-gradient-bg">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-cyan/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('landing')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center border border-cyan/30">
                <Shield className="w-5 h-5 text-cyan" />
              </div>
              <span className="font-orbitron font-bold text-lg tracking-wider">PAIN<span className="text-cyan">SCOPE</span></span>
            </button>
            <Button variant="ghost" onClick={() => onNavigate('landing')} className="text-cyan hover:text-cyan-light">
              <ArrowLeft className="w-5 h-5 mr-2" />Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full mb-6">
              <FileText className="w-4 h-4 text-cyan" />
              <span className="text-sm text-cyan font-mono">LEGAL</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-orbitron font-bold mb-4">TERMS & <span className="text-gradient-cyan">CONDITIONS</span></h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4">1. Acceptance</h2>
              <p className="text-muted-foreground">By using PainScope AI, you agree to these terms. If you disagree, do not use the service.</p>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4">2. Service Description</h2>
              <p className="text-muted-foreground">PainScope AI provides AI-powered market intelligence including scout agents, pain scoring, and reporting. We may modify or discontinue features.</p>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground mb-2">You must:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan mt-1 flex-shrink-0" /><span>Provide accurate information</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan mt-1 flex-shrink-0" /><span>Keep credentials secure</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan mt-1 flex-shrink-0" /><span>Report unauthorized access</span></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4">4. Subscriptions</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-purple mt-1 flex-shrink-0" /><span>Subscriptions auto-renew unless cancelled</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-purple mt-1 flex-shrink-0" /><span>30-day money-back guarantee</span></li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-purple mt-1 flex-shrink-0" /><span>Prorated refunds for plan changes</span></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4">5. Acceptable Use</h2>
              <p className="text-muted-foreground mb-2">You may not:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" /><span>Violate laws or regulations</span></li>
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" /><span>Infringe intellectual property</span></li>
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" /><span>Attempt unauthorized access</span></li>
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" /><span>Scrape or crawl our platform</span></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4">6. Limitation of Liability</h2>
              <p className="text-muted-foreground">Our liability is limited to amounts paid in the 12 months preceding any claim.</p>
            </section>

            <section>
              <h2 className="text-xl font-orbitron font-bold mb-4">7. Contact</h2>
              <p className="text-muted-foreground">Questions? Email <a href="mailto:legal@painscope.ai" className="text-cyan hover:underline">legal@painscope.ai</a></p>
            </section>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
