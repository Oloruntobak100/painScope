import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, X, Zap, Target, Crown, ChevronRight, Clock, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/authStore';

interface PricingPageProps {
  onNavigate: (route: string) => void;
  onSubscribe: (plan: string) => void;
}

const plans = [
  {
    id: 'free',
    name: 'SCOUT',
    icon: Target,
    description: 'Perfect for individuals exploring market intelligence',
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: '1 Active Scout Agent', included: true },
      { text: '50 Pain Discoveries/month', included: true },
      { text: 'Basic PainScore Analysis', included: true },
      { text: 'Email Reports', included: true },
      { text: 'Community Support', included: true },
      { text: 'API Access', included: false },
      { text: 'CRM Integrations', included: false },
      { text: 'Priority Support', included: false },
    ],
    cta: 'Get Started Free',
    popular: false,
    color: 'cyan',
  },
  {
    id: 'pro',
    name: 'RANGER',
    icon: Zap,
    description: 'For teams serious about market discovery',
    price: { monthly: 49, yearly: 39 },
    features: [
      { text: '5 Active Scout Agents', included: true },
      { text: 'Unlimited Discoveries', included: true },
      { text: 'Advanced PainScore + Revenue', included: true },
      { text: 'Real-time Dashboard', included: true },
      { text: 'API (1,000 calls/day)', included: true },
      { text: 'Slack Integration', included: true },
      { text: 'CRM Integrations', included: false },
      { text: 'Priority Support', included: false },
    ],
    cta: 'Start 7-Day Free Trial',
    popular: true,
    color: 'purple',
  },
  {
    id: 'enterprise',
    name: 'COMMANDER',
    icon: Crown,
    description: 'For organizations scaling intelligence',
    price: { monthly: 149, yearly: 119 },
    features: [
      { text: 'Unlimited Scout Agents', included: true },
      { text: 'Unlimited Discoveries', included: true },
      { text: 'Enterprise + Custom Models', included: true },
      { text: 'White-label Reports', included: true },
      { text: 'Unlimited API Access', included: true },
      { text: 'All CRM Integrations', included: true },
      { text: 'Dedicated Account Manager', included: true },
      { text: '24/7 Priority Support', included: true },
    ],
    cta: 'Contact Sales',
    popular: false,
    color: 'pink',
  },
];

const faqs = [
  { q: 'What happens after my trial?', a: 'You\'ll be charged for your selected plan. Cancel anytime before to avoid charges.' },
  { q: 'Can I change plans?', a: 'Yes! Upgrade or downgrade anytime. Changes are prorated.' },
  { q: 'What payment methods?', a: 'Credit cards, PayPal, and bank transfers for Enterprise.' },
  { q: 'Refund policy?', a: '30-day money-back guarantee. Contact us for a full refund.' },
];

export default function PricingPage({ onNavigate, onSubscribe }: PricingPageProps) {
  const [isYearly, setIsYearly] = useState(true);
  const { isAuthenticated, user } = useAuthStore();

  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated) {
      onNavigate('landing');
      return;
    }
    onSubscribe(planId);
  };

  const getCurrentPlan = () => user?.subscription?.plan || 'free';

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
              <button onClick={() => onNavigate('how-it-works')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">How It Works</button>
              <button onClick={() => onNavigate('contact')} className="text-sm text-muted-foreground hover:text-cyan transition-colors">Contact</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full mb-8">
            <Clock className="w-4 h-4 text-cyan" />
            <span className="text-sm text-cyan font-mono">7-DAY FREE TRIAL ON ALL PAID PLANS</span>
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl lg:text-6xl font-orbitron font-bold mb-6">
            CHOOSE YOUR <span className="text-gradient-cyan">LEVEL</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Start free, scale as you grow. All paid plans include a 7-day free trial.
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center justify-center gap-4">
            <span className={`text-sm ${!isYearly ? 'text-cyan' : 'text-muted-foreground'}`}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? 'text-cyan' : 'text-muted-foreground'}`}>Yearly <span className="text-xs text-green-400">Save 20%</span></span>
          </motion.div>
        </div>
      </div>

      {/* Plans */}
      <div className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + index * 0.1 }} className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-4 py-1 bg-gradient-to-r from-cyan to-purple rounded-full text-xs font-bold text-black">MOST POPULAR</div>
                </div>
              )}
              <div className={`h-full glass-panel rounded-xl overflow-hidden ${plan.popular ? 'border-cyan/40 shadow-glow' : ''}`}>
                <div className="p-6 border-b border-cyan/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${plan.color === 'cyan' ? 'bg-cyan/20' : plan.color === 'purple' ? 'bg-purple/20' : 'bg-pink/20'}`}>
                      <plan.icon className={`w-6 h-6 ${plan.color === 'cyan' ? 'text-cyan' : plan.color === 'purple' ? 'text-purple' : 'text-pink'}`} />
                    </div>
                    <div>
                      <h3 className="font-orbitron font-bold text-xl">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-orbitron font-bold">${isYearly ? plan.price.yearly : plan.price.monthly}</span>
                    {plan.price.monthly > 0 && <span className="text-muted-foreground">/month</span>}
                  </div>
                  {isYearly && plan.price.yearly > 0 && <p className="text-sm text-muted-foreground mt-1">Billed annually (${plan.price.yearly * 12}/year)</p>}
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        {f.included ? <Check className={`w-5 h-5 flex-shrink-0 ${plan.color === 'cyan' ? 'text-cyan' : plan.color === 'purple' ? 'text-purple' : 'text-pink'}`} /> : <X className="w-5 h-5 flex-shrink-0 text-muted-foreground" />}
                        <span className={f.included ? 'text-sm' : 'text-sm text-muted-foreground'}>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 pt-0">
                  {getCurrentPlan() === plan.id ? (
                    <Button disabled className="w-full py-6 bg-green-500/20 text-green-400 border border-green-500/30">
                      <Check className="w-5 h-5 mr-2" />Current Plan
                    </Button>
                  ) : (
                    <Button onClick={() => handleSubscribe(plan.id)} className={`w-full py-6 ${plan.popular ? 'btn-cyber-primary' : 'btn-cyber'}`}>
                      {plan.cta}<ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  )}
                </div>
                <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${plan.color === 'cyan' ? 'border-cyan' : plan.color === 'purple' ? 'border-purple' : 'border-pink'}`} />
                <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${plan.color === 'cyan' ? 'border-cyan' : plan.color === 'purple' ? 'border-purple' : 'border-pink'}`} />
                <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${plan.color === 'cyan' ? 'border-cyan' : plan.color === 'purple' ? 'border-purple' : 'border-pink'}`} />
                <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${plan.color === 'cyan' ? 'border-cyan' : plan.color === 'purple' ? 'border-purple' : 'border-pink'}`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="px-6 py-20 border-t border-cyan/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-center mb-12">FEATURE <span className="text-gradient-cyan">COMPARISON</span></h2>
          <div className="glass-panel rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan/10">
                  <th className="text-left p-4 font-orbitron">Feature</th>
                  <th className="text-center p-4 font-orbitron text-cyan">SCOUT</th>
                  <th className="text-center p-4 font-orbitron text-purple">RANGER</th>
                  <th className="text-center p-4 font-orbitron text-pink">COMMANDER</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Scout Agents', scout: '1', ranger: '5', commander: 'Unlimited' },
                  { name: 'Pain Discoveries', scout: '50/mo', ranger: 'Unlimited', commander: 'Unlimited' },
                  { name: 'PainScore Analysis', scout: 'Basic', ranger: 'Advanced', commander: 'Enterprise' },
                  { name: 'Revenue Analysis', scout: '-', ranger: 'Included', commander: 'Custom' },
                  { name: 'API Access', scout: '-', ranger: '1K/day', commander: 'Unlimited' },
                  { name: 'Integrations', scout: '-', ranger: 'Slack', commander: 'All' },
                  { name: 'Support', scout: 'Community', ranger: 'Email', commander: '24/7' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-cyan/5 last:border-0">
                    <td className="p-4 text-sm">{row.name}</td>
                    <td className="p-4 text-center text-sm text-muted-foreground">{row.scout}</td>
                    <td className="p-4 text-center text-sm text-muted-foreground">{row.ranger}</td>
                    <td className="p-4 text-center text-sm text-muted-foreground">{row.commander}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="px-6 py-20 border-t border-cyan/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-center mb-12">FAQs</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} className="glass-panel rounded-lg p-6">
                <h3 className="font-orbitron font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-cyan" />{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
