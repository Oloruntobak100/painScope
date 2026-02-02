import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Chrome, ArrowRight, Check, Loader2, Eye, EyeOff, Lock, User, 
  AlertCircle, RefreshCw, Shield, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'signin' | 'signup';
}

type AuthView = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }: AuthModalProps) {
  const [view, setView] = useState<AuthView>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const { login, register, verifyEmail, resendVerification, loginWithGoogle, loginWithOtp, requestPasswordReset, resetPassword, isLoading, pendingVerification, isPasswordRecovery, setPasswordRecovery } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setView(isPasswordRecovery ? 'reset' : initialMode);
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen, initialMode, isPasswordRecovery]);


  const handleSignIn = async () => {
    setError('');
    if (!signInEmail || !signInPassword) {
      setError('Please enter email and password');
      return;
    }
    const result = await login(signInEmail, signInPassword);
    if (result.success) onSuccess();
    else if (result.error === 'Please verify your email') setView('verify');
    else setError(result.error || 'Invalid credentials');
  };

  const handleSignUp = async () => {
    setError('');
    if (!signUpName || !signUpEmail || !signUpPassword) {
      setError('Please fill all fields');
      return;
    }
    if (signUpPassword.length < 8) {
      setError('Password must be 8+ characters');
      return;
    }
    if (signUpPassword !== signUpConfirm) {
      setError('Passwords do not match');
      return;
    }
    const result = await register(signUpEmail, signUpPassword, signUpName);
    if (result.success) {
      setView('verify');
      setSuccessMessage('Check your email for verification code!');
    } else setError(result.error || 'Registration failed');
  };

  const handleVerify = async () => {
    setError('');
    const code = verificationCode.trim().replace(/\s/g, '');
    if (!code) {
      setError('Enter or paste your verification code');
      return;
    }
    const result = await verifyEmail(code);
    if (result.success) onSuccess();
    else setError(result.error || 'Invalid code');
  };

  const handleGoogle = async () => {
    setError('');
    const result = await loginWithGoogle();
    if (result.success) onSuccess();
    else setError(result.error || 'Google sign-in failed');
  };

  const handleForgot = async () => {
    setError('');
    if (!forgotEmail) {
      setError('Enter your email');
      return;
    }
    const result = await requestPasswordReset(forgotEmail);
    if (result.success) {
      setForgotEmailSent(true);
      setSuccessMessage('Check your email for the password reset link.');
    } else setError(result.error || 'Failed to send reset');
  };

  const handleReset = async () => {
    setError('');
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be 8+ characters');
      return;
    }
    const result = await resetPassword(newPassword);
    if (result.success) {
      setSuccessMessage('Password reset! Please sign in.');
      setPasswordRecovery(false);
      setTimeout(() => { setView('signin'); setSuccessMessage(''); setNewPassword(''); }, 2000);
    } else setError(result.error || 'Failed to reset password');
  };

  const handleOtpSignIn = async () => {
    setError('');
    if (!signInEmail) {
      setError('Please enter your email');
      return;
    }
    const result = await loginWithOtp(signInEmail);
    if (result.success) {
      setSuccessMessage('Check your email for the sign-in link!');
    } else setError(result.error || 'Failed to send magic link');
  };

  const handleResend = async () => {
    const email = pendingVerification || signUpEmail;
    if (!email) return;
    const result = await resendVerification(email);
    if (result.success) setSuccessMessage('New code sent!');
    else setError('Failed to resend');
  };

  const resetAndClose = () => {
    setView('signin'); setError(''); setSuccessMessage('');
    setSignInEmail(''); setSignInPassword('');
    setSignUpName(''); setSignUpEmail(''); setSignUpPassword(''); setSignUpConfirm('');
    setVerificationCode('');
    setForgotEmail(''); setForgotEmailSent(false); setNewPassword('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={resetAndClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan/30 via-purple/30 to-cyan/30 rounded-xl blur-lg" />
        <div className="relative glass-panel rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-cyan/20">
            <div className="flex items-center gap-3">
              {view !== 'signin' && view !== 'signup' && (
                <button onClick={() => setView(view === 'verify' ? 'signup' : 'signin')} className="p-2 rounded-lg hover:bg-cyan/10 transition-colors">
                  <ArrowLeft className="w-4 h-4 text-cyan" />
                </button>
              )}
              <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center border border-cyan/30">
                <Shield className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <h2 className="font-orbitron font-bold text-lg">
                  {view === 'signin' && 'SIGN IN'}
                  {view === 'signup' && 'CREATE ACCOUNT'}
                  {view === 'verify' && 'VERIFY EMAIL'}
                  {view === 'forgot' && 'RESET PASSWORD'}
                  {view === 'reset' && 'NEW PASSWORD'}
                </h2>
              </div>
            </div>
            <button onClick={resetAndClose} className="p-2 rounded-lg hover:bg-cyan/10 transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
            {successMessage && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mx-6 mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-400">{successMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Sign In */}
              {view === 'signin' && (
                <motion.div key="signin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <Button variant="outline" className="w-full py-6 border-cyan/30 hover:border-cyan/60 hover:bg-cyan/5" onClick={handleGoogle} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Chrome className="w-5 h-5 mr-2" />}
                    Continue with Google
                  </Button>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-cyan/20" /></div>
                    <div className="relative flex justify-center"><span className="px-4 text-xs text-muted-foreground bg-[#0a0c14]">OR</span></div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
                        <Input type="email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} placeholder="you@company.com" className="pl-10 py-6 bg-black/40 border-cyan/30 focus:border-cyan" onKeyDown={(e) => e.key === 'Enter' && handleSignIn()} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
                        <Input type={showPassword ? 'text' : 'password'} value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10 py-6 bg-black/40 border-cyan/30 focus:border-cyan" onKeyDown={(e) => e.key === 'Enter' && handleSignIn()} />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan/60 hover:text-cyan">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setView('forgot')} className="text-sm text-cyan hover:underline">Forgot password?</button>
                    </div>
                    <Button className="w-full btn-cyber-primary py-6" onClick={handleSignIn} disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{'Sign In'}<ArrowRight className="w-5 h-5 ml-2" /></>}
                    </Button>
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-cyan/20" /></div>
                      <div className="relative flex justify-center"><span className="px-4 text-xs text-muted-foreground bg-[#0a0c14]">OR</span></div>
                    </div>
                    <Button variant="outline" className="w-full py-6 border-cyan/30 hover:border-cyan/60 hover:bg-cyan/5" onClick={handleOtpSignIn} disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />}
                      Sign in with magic link
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Don&apos;t have an account?{' '}<button onClick={() => setView('signup')} className="text-cyan hover:underline font-medium">Sign up</button>
                  </p>
                </motion.div>
              )}

              {/* Sign Up */}
              {view === 'signup' && (
                <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
                        <Input type="text" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} placeholder="John Doe" className="pl-10 py-6 bg-black/40 border-cyan/30 focus:border-cyan" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
                        <Input type="email" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} placeholder="you@company.com" className="pl-10 py-6 bg-black/40 border-cyan/30 focus:border-cyan" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
                        <Input type={showPassword ? 'text' : 'password'} value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} placeholder="8+ characters" className="pl-10 pr-10 py-6 bg-black/40 border-cyan/30 focus:border-cyan" />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan/60 hover:text-cyan">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
                        <Input type={showPassword ? 'text' : 'password'} value={signUpConfirm} onChange={(e) => setSignUpConfirm(e.target.value)} placeholder="Confirm password" className="pl-10 py-6 bg-black/40 border-cyan/30 focus:border-cyan" onKeyDown={(e) => e.key === 'Enter' && handleSignUp()} />
                      </div>
                    </div>
                    <Button className="w-full btn-cyber-primary py-6" onClick={handleSignUp} disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{'Create Account'}<ArrowRight className="w-5 h-5 ml-2" /></>}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    By signing up, you agree to our <a href="/terms" className="text-cyan hover:underline">Terms</a> and <a href="/privacy" className="text-cyan hover:underline">Privacy Policy</a>
                  </p>
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}<button onClick={() => setView('signin')} className="text-cyan hover:underline font-medium">Sign in</button>
                  </p>
                </motion.div>
              )}

              {/* Verify */}
              {view === 'verify' && (
                <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-cyan/20 flex items-center justify-center mx-auto mb-4 border border-cyan/30">
                      <Mail className="w-8 h-8 text-cyan" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ve sent a verification code to<br /><span className="text-cyan font-mono">{pendingVerification || signUpEmail}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Paste or type the code from your email below</p>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Paste your verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-14 text-center text-xl font-mono bg-black/40 border-cyan/30 focus:border-cyan"
                    maxLength={12}
                  />
                  <Button className="w-full btn-cyber-primary py-6" onClick={handleVerify} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{'Verify Email'}<Check className="w-5 h-5 ml-2" /></>}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Didn&apos;t receive it?{' '}<button onClick={handleResend} className="text-cyan hover:underline inline-flex items-center gap-1" disabled={isLoading}><RefreshCw className="w-3 h-3" />Resend</button>
                  </p>
                </motion.div>
              )}

              {/* Forgot */}
              {view === 'forgot' && (
                <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  {forgotEmailSent ? (
                    <>
                      <div className="text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                          <Mail className="w-8 h-8 text-green-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          We&apos;ve sent a password reset link to<br /><span className="text-cyan font-mono">{forgotEmail}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Click the link in the email to reset your password.</p>
                      </div>
                      <Button variant="outline" className="w-full py-6" onClick={() => { setView('signin'); setForgotEmailSent(false); setSuccessMessage(''); }}>
                        Back to sign in
                      </Button>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
                          <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@company.com" className="pl-10 py-6 bg-black/40 border-cyan/30 focus:border-cyan" onKeyDown={(e) => e.key === 'Enter' && handleForgot()} />
                        </div>
                      </div>
                      <Button className="w-full btn-cyber-primary py-6" onClick={handleForgot} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{'Send Reset Link'}<ArrowRight className="w-5 h-5 ml-2" /></>}
                      </Button>
                    </>
                  )}
                </motion.div>
              )}

              {/* Reset - shown when user landed from password recovery link */}
              {view === 'reset' && isPasswordRecovery && (
                <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">Enter your new password</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/60" />
                      <Input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8+ characters" className="pl-10 pr-10 py-6 bg-black/40 border-cyan/30 focus:border-cyan" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan/60 hover:text-cyan">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button className="w-full btn-cyber-primary py-6" onClick={handleReset} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{'Reset Password'}<Check className="w-5 h-5 ml-2" /></>}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan" />
        </div>
      </motion.div>
    </div>
  );
}
