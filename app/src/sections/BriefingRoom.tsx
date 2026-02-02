import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Building2,
  Target,
  Users,
  FileText,
  Check,
  ArrowRight,
  Loader2,
  Bot,
  User,
  X,
  ArrowUp,
  Edit,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBriefingStore, useAuthStore } from '@/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ChatMessage, BriefingData } from '@/types';

// Default webhook URL for PainScope research
const N8N_WEBHOOK_URL = 'https://northsnow.app.n8n.cloud/webhook/painScope';

interface BriefingRoomProps {
  onNavigate: (route: 'landing' | 'dashboard' | 'briefing' | 'scout' | 'library' | 'settings') => void;
  currentRoute: string;
}

const initialMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your AI Strategist. I'll help you discover valuable market opportunities by understanding your business context. Let's start with a few questions.\n\n**What industry are you operating in?** (e.g., Fintech, HealthTech, SaaS, E-commerce)",
  timestamp: new Date(),
};

// Industry options for dropdown
const INDUSTRY_OPTIONS = [
  'Fintech',
  'HealthTech',
  'SaaS',
  'E-commerce',
  'EdTech',
  'PropTech',
  'InsurTech',
  'LegalTech',
  'MarTech',
  'AgriTech',
  'FoodTech',
  'Logistics',
  'Manufacturing',
  'Retail',
  'Healthcare',
  'Education',
  'Real Estate',
  'Financial Services',
  'Consulting',
  'Other',
];

const questions = [
  {
    field: 'industry' as keyof BriefingData,
    question: 'What industry are you operating in?',
    placeholder: 'Select your industry',
    icon: Building2,
    isDropdown: true,
  },
  {
    field: 'productFocus' as keyof BriefingData,
    question: 'What is your product or business focus?',
    placeholder: 'e.g., B2B payment platform',
    icon: Target,
    isDropdown: false,
  },
  {
    field: 'competitors' as keyof BriefingData,
    question: 'Who are your main competitors? (comma-separated)',
    placeholder: 'e.g., Stripe, PayPal, Square',
    icon: Users,
    isDropdown: false,
  },
  {
    field: 'targetAudience' as keyof BriefingData,
    question: 'Who is your target audience?',
    placeholder: 'e.g., Small business owners, Enterprise CFOs',
    icon: Users,
    isDropdown: false,
  },
];

export default function BriefingRoom({ onNavigate }: BriefingRoomProps) {
  const [input, setInput] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showFinalForm, setShowFinalForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<BriefingData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const { messages, briefingData, briefingId, addMessage, updateBriefingData, setBriefingId, setComplete, setResearchWebhookPromise } = useBriefingStore();
  const { user } = useAuthStore();

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      addMessage(initialMessage);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const persistToSupabase = async (
    briefId: string,
    msg: { role: string; content: string }
  ) => {
    if (!isSupabaseConfigured() || !user) return;
    await supabase.from('briefing_messages').insert({
      briefing_id: briefId,
      role: msg.role,
      content: msg.content,
    });
  };

  const handleSend = async (selectedValue?: string) => {
    const valueToSend = selectedValue || input.trim();
    if (!valueToSend) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: valueToSend,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    const currentQuestion = questions[currentQuestionIndex];
    const updatedData: Partial<BriefingData> =
      currentQuestion.field === 'competitors'
        ? { [currentQuestion.field]: valueToSend.split(',').map((c) => c.trim()) }
        : { [currentQuestion.field]: valueToSend };
    updateBriefingData(updatedData);

    setInput('');
    setIsTyping(true);

    // Q&A only collects input locally; webhook is fired only from "Submit & Start Research"
    await new Promise((r) => setTimeout(r, 800));
    const isComplete = currentQuestionIndex >= questions.length - 1;
    const assistantReply = currentQuestionIndex < questions.length - 1
      ? `Great! **${questions[currentQuestionIndex + 1].question}**`
      : "Perfect! I've gathered all the information I need. Take a look at the briefing summary on the right—you can edit, save, then use **Submit & Start Research** when you're ready.";

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: assistantReply,
      timestamp: new Date(),
    };
    addMessage(assistantMessage);

    if (isSupabaseConfigured() && user) {
      try {
        let briefId = briefingId;
        if (!briefId) {
          const merged = { ...briefingData, ...updatedData };
          const { data: brief, error } = await supabase
            .from('briefings')
            .insert({
              user_id: user.id,
              industry: merged.industry,
              product_focus: merged.productFocus,
              competitors: merged.competitors ?? [],
              target_audience: merged.targetAudience,
              additional_notes: merged.additionalNotes ?? '',
              is_complete: false,
            })
            .select('id')
            .single();
          if (!error && brief) {
            briefId = brief.id;
            setBriefingId(briefId);
          }
        }
        if (briefId) {
          await persistToSupabase(briefId, { role: 'user', content: input });
          await persistToSupabase(briefId, { role: 'assistant', content: assistantReply });
          if (isComplete) {
            const finalData = { ...briefingData, ...updatedData };
            await supabase
              .from('briefings')
              .update({
                industry: finalData.industry,
                product_focus: finalData.productFocus,
                competitors: finalData.competitors,
                target_audience: finalData.targetAudience,
                additional_notes: finalData.additionalNotes,
                is_complete: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', briefId);
          }
        }
      } catch {
        // Persist is best-effort
      }
    }

    setIsTyping(false);

    if (isComplete) {
      setShowSummary(true);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleConfirmLaunch = async () => {
    const agentWebhookUrl = import.meta.env.VITE_N8N_AGENT_WEBHOOK_URL ?? '';
    if (isSupabaseConfigured() && user) {
      try {
        const { data: job, error } = await supabase
          .from('agent_jobs')
          .insert({
            user_id: user.id,
            briefing_id: briefingId,
            status: 'running',
            current_task: 'Initializing...',
            progress: 0,
          })
          .select('id')
          .single();
        if (!error && job && agentWebhookUrl) {
          await fetch(agentWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: job.id,
              userId: user.id,
              briefingId,
              briefingData: briefingData,
              appBaseUrl: window.location.origin,
            }),
          });
        }
      } catch {
        // Best-effort
      }
    }
    setComplete(true);
    onNavigate('scout');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToSummary = () => {
    summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData({ ...briefingData });
  };

  const handleSaveEdit = () => {
    if (editedData) {
      updateBriefingData(editedData);
    }
    setIsEditing(false);
    setEditedData(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(null);
  };

  const handleSubmitBriefing = () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const webhookPayload = {
      userId: user?.id,
      briefingId,
      briefingData: briefingData,
      timestamp: new Date().toISOString(),
      action: 'start_research',
    };

    console.log('[PainScope] Firing webhook to:', N8N_WEBHOOK_URL);
    console.log('[PainScope] Payload:', webhookPayload);

    // Fire webhook to n8n
    const promise = fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    })
      .then(async (response) => {
        console.log('[PainScope] Webhook response status:', response.status);
        if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
        const data = await response.json().catch(() => ({}));
        console.log('[PainScope] Webhook response data:', data);
        return data;
      })
      .then((researchData) => {
        // ScoutLab will call setWebhookPayload when it receives this data
        // which normalizes metrics and creates report history
        if (isSupabaseConfigured() && user && briefingId) {
          supabase
            .from('briefings')
            .update({
              is_complete: true,
              research_data: researchData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', briefingId)
            .then(() => {});
        }
        return researchData;
      })
      .catch((error) => {
        console.error('[PainScope] Webhook error:', error);
        return null;
      });

    setResearchWebhookPromise(promise);
    setComplete(true);
    setIsSubmitting(false);
    onNavigate('scout');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Simplified for this view */}
      <div className="w-16 lg:w-64 border-r border-border bg-sidebar flex-shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3"
          >
<img src="/favicon.svg" alt="PainScope AI" className="w-10 h-10 rounded-xl flex-shrink-0" />
              <span className="font-semibold text-lg hidden lg:block">PainScope AI</span>
          </button>
        </div>
        <nav className="p-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <span className="text-sm hidden lg:block">← Back to Dashboard</span>
            <span className="lg:hidden">←</span>
          </button>
        </nav>
      </div>

      {/* Main Content - min-h-0 so summary panel flex/scroll works */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border flex items-center px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-lime" />
              </div>
              <div>
                <h1 className="font-semibold">AI Briefing Room</h1>
                <p className="text-sm text-muted-foreground">Strategist Session</p>
              </div>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'assistant' 
                    ? 'bg-lime/10' 
                    : 'bg-secondary'
                }`}>
                  {message.role === 'assistant' ? (
                    <Bot className="w-5 h-5 text-lime" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className={`max-w-[70%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block rounded-2xl px-5 py-3 text-left ${
                    message.role === 'assistant'
                      ? 'glass'
                      : 'bg-lime text-background'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-lime/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-lime" />
                </div>
                <div className="glass rounded-2xl px-5 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-lime rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-lime rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-lime rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-border">
            <div className="flex gap-3">
              {questions[currentQuestionIndex]?.isDropdown ? (
                <Select
                  value={input}
                  onValueChange={(value) => {
                    setInput(value);
                    handleSend(value);
                  }}
                  disabled={isTyping || showSummary}
                >
                  <SelectTrigger className="flex-1 py-6 bg-secondary/50 border-border focus:border-lime/50 focus:ring-lime/20">
                    <SelectValue placeholder={questions[currentQuestionIndex]?.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={questions[currentQuestionIndex]?.placeholder || 'Type your message...'}
                      disabled={showSummary}
                      className="pr-12 py-6 bg-secondary/50 border-border focus:border-lime/50 focus:ring-lime/20"
                    />
                  </div>
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping || showSummary}
                    className="bg-lime text-background hover:bg-lime-light px-6"
                  >
                    {isTyping ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </>
              )}
            </div>
            {!questions[currentQuestionIndex]?.isDropdown && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            )}
            
            {/* Up Arrow Button - Show after all questions answered */}
            {showSummary && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={scrollToSummary}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ArrowUp className="w-4 h-4" />
                  View Summary
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Briefing Summary Panel - flex layout so buttons stay visible */}
        <AnimatePresence>
          {(showSummary || messages.length > 1) && (
            <motion.div
              ref={summaryRef}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-80 border-l border-border bg-secondary/20 hidden lg:flex lg:flex-col lg:min-h-0"
            >
              <div className="px-6 pt-4 pb-2 flex-shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-lime" />
                  <h2 className="font-semibold">Briefing Summary</h2>
                </div>
              </div>

              {/* Scrollable summary content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
                <div className="space-y-3">
                  {isEditing && editedData ? (
                    <>
                      <EditableSummaryItem
                        icon={Building2}
                        label="Industry"
                        value={editedData.industry}
                        onChange={(val) => setEditedData({ ...editedData, industry: val })}
                        isDropdown
                        options={INDUSTRY_OPTIONS}
                      />
                      <EditableSummaryItem
                        icon={Target}
                        label="Product Focus"
                        value={editedData.productFocus}
                        onChange={(val) => setEditedData({ ...editedData, productFocus: val })}
                      />
                      <EditableSummaryItem
                        icon={Users}
                        label="Competitors"
                        value={editedData.competitors.join(', ')}
                        onChange={(val) => setEditedData({ ...editedData, competitors: val.split(',').map(c => c.trim()) })}
                      />
                      <EditableSummaryItem
                        icon={Users}
                        label="Target Audience"
                        value={editedData.targetAudience}
                        onChange={(val) => setEditedData({ ...editedData, targetAudience: val })}
                      />
                    </>
                  ) : (
                    <>
                      <SummaryItem
                        icon={Building2}
                        label="Industry"
                        value={briefingData.industry}
                        isComplete={!!briefingData.industry}
                      />
                      <SummaryItem
                        icon={Target}
                        label="Product Focus"
                        value={briefingData.productFocus}
                        isComplete={!!briefingData.productFocus}
                      />
                      <SummaryItem
                        icon={Users}
                        label="Competitors"
                        value={briefingData.competitors.join(', ')}
                        isComplete={briefingData.competitors.length > 0}
                      />
                      <SummaryItem
                        icon={Users}
                        label="Target Audience"
                        value={briefingData.targetAudience}
                        isComplete={!!briefingData.targetAudience}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Buttons section - compact, always visible, deep green for primary actions */}
              {showSummary && (
                <div className="flex-shrink-0 p-4 pt-3 border-t border-border bg-background/50">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="flex-1 border-border text-foreground hover:bg-secondary"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-actionGreen text-white hover:bg-actionGreen-hover font-medium shadow-md"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={handleEdit}
                        variant="outline"
                        className="w-full mb-2 border-border text-foreground hover:bg-secondary"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Responses
                      </Button>
                      <Button
                        onClick={handleSubmitBriefing}
                        disabled={isSubmitting}
                        className="w-full bg-actionGreen text-white hover:bg-actionGreen-hover font-semibold py-5 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5 mr-2" />
                        )}
                        Submit & Start Research
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                      {submitError && (
                        <p className="text-xs text-amber-500 text-center mt-2" role="alert">{submitError}</p>
                      )}
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Triggers AI research using FireCrawl
                      </p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Final Confirmation Modal */}
      <AnimatePresence>
        {showFinalForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass rounded-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Confirm Briefing</h2>
                <button
                  onClick={() => setShowFinalForm(false)}
                  className="p-2 rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-muted-foreground mb-6">
                Review your briefing details before launching the scout agents:
              </p>

              <div className="space-y-4 mb-8">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground mb-1">Industry</p>
                  <p className="font-medium">{briefingData.industry}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground mb-1">Product Focus</p>
                  <p className="font-medium">{briefingData.productFocus}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground mb-1">Competitors</p>
                  <div className="flex flex-wrap gap-2">
                    {briefingData.competitors.map((comp, i) => (
                      <Badge key={i} variant="secondary">{comp}</Badge>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground mb-1">Target Audience</p>
                  <p className="font-medium">{briefingData.targetAudience}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFinalForm(false)}
                  className="flex-1 py-6"
                >
                  Edit Briefing
                </Button>
                <Button
                  onClick={handleConfirmLaunch}
                  className="flex-1 bg-lime text-background hover:bg-lime-light py-6 font-semibold"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Launch Scouts
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SummaryItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isComplete: boolean;
}

function SummaryItem({ icon: Icon, label, value, isComplete }: SummaryItemProps) {
  return (
    <div className={`p-4 rounded-lg border transition-all ${
      isComplete 
        ? 'bg-lime/5 border-lime/30' 
        : 'bg-secondary/30 border-transparent'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${isComplete ? 'text-lime' : 'text-muted-foreground'}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
        {isComplete && <Check className="w-4 h-4 text-lime ml-auto" />}
      </div>
      <p className={`font-medium ${isComplete ? 'text-foreground' : 'text-muted-foreground italic'}`}>
        {value || 'Not specified'}
      </p>
    </div>
  );
}

interface EditableSummaryItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDropdown?: boolean;
  options?: string[];
}

function EditableSummaryItem({ icon: Icon, label, value, onChange, isDropdown, options }: EditableSummaryItemProps) {
  return (
    <div className="p-4 rounded-lg border bg-secondary/50 border-lime/30">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-lime" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      {isDropdown && options ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-background"
        />
      )}
    </div>
  );
}
