import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, MessageSquare, FileText, ArrowLeft, Check, Send,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContactPageProps {
  onNavigate: (route: string) => void;
}

const supportEmail = 'support@painscope.ai';
const salesEmail = 'sales@painscope.ai';

export default function ContactPage({ onNavigate }: ContactPageProps) {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen animated-gradient-bg">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-cyan/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('landing')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center border border-cyan/30">
                <Mail className="w-5 h-5 text-cyan" />
              </div>
              <span className="font-orbitron font-bold text-lg tracking-wider">PAIN<span className="text-cyan">SCOPE</span></span>
            </button>
            <Button variant="ghost" onClick={() => onNavigate('landing')} className="text-cyan hover:text-cyan-light">
              <ArrowLeft className="w-5 h-5 mr-2" />Back
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full mb-6">
              <MessageSquare className="w-4 h-4 text-cyan" />
              <span className="text-sm text-cyan font-mono">SUPPORT</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-orbitron font-bold mb-4">
              GET IN <span className="text-gradient-cyan">TOUCH</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Have questions? Our team is here to help you navigate the future of market intelligence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Contact Cards */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-lg bg-cyan/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-cyan" />
              </div>
              <h3 className="font-orbitron font-bold mb-2">Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Technical help & account issues</p>
              <a href={`mailto:${supportEmail}`} className="text-cyan hover:underline font-mono text-sm">{supportEmail}</a>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-lg bg-purple/20 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-purple" />
              </div>
              <h3 className="font-orbitron font-bold mb-2">Sales</h3>
              <p className="text-sm text-muted-foreground mb-3">Enterprise & custom solutions</p>
              <a href={`mailto:${salesEmail}`} className="text-purple hover:underline font-mono text-sm">{salesEmail}</a>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-lg bg-pink/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-pink" />
              </div>
              <h3 className="font-orbitron font-bold mb-2">Response Time</h3>
              <p className="text-sm text-muted-foreground mb-3">We typically respond within</p>
              <span className="text-pink font-mono text-sm">24 hours</span>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel rounded-xl p-8 max-w-2xl mx-auto">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-orbitron font-bold text-xl mb-2">Message Sent!</h3>
                <p className="text-muted-foreground">We&apos;ll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your name" required className="w-full px-4 py-3 bg-black/40 border border-cyan/30 rounded-lg focus:border-cyan focus:outline-none text-foreground" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@company.com" required className="w-full px-4 py-3 bg-black/40 border border-cyan/30 rounded-lg focus:border-cyan focus:outline-none text-foreground" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Subject</label>
                  <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required className="w-full px-4 py-3 bg-black/40 border border-cyan/30 rounded-lg focus:border-cyan focus:outline-none text-foreground">
                    <option value="">Select topic</option>
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="enterprise">Enterprise Sales</option>
                    <option value="partners">Partnerships</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Message</label>
                  <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="How can we help?" required rows={4} className="w-full px-4 py-3 bg-black/40 border border-cyan/30 rounded-lg focus:border-cyan focus:outline-none text-foreground resize-none" />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full btn-cyber-primary py-6">
                  {isSubmitting ? <span className="flex items-center gap-2"><span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Sending...</span> : <><Send className="w-5 h-5 mr-2" />Send Message</>}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
