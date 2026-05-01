'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getProviders } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github, Mail, Shield, Infinity, MessageSquare,
  Code2, Terminal, Eye, EyeOff, Lock, ArrowRight, Check,
  AlertCircle, RefreshCw, KeyRound, ArrowLeft
} from 'lucide-react';
import { SmokyBackground } from '@/components/chat/smoky-background';

interface ProviderInfo {
  id: string;
  name: string;
}

type Step = 'email' | 'password' | 'policy' | 'verify' | 'success';

// ─── Password Strength Indicator ──────────────────────────────────────────────
function getPasswordStrength(password: string): {
  score: number; label: string; color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Fair', color: 'bg-amber-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

// ─── OTP Input Component ──────────────────────────────────────────────────────
function OTPInput({ value, onChange, disabled }: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const digits = 6;

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return;
    const newVal = value.split('');
    newVal[index] = digit.slice(-1);
    onChange(newVal.join('').padEnd(value.length).slice(0, digits));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, digits);
    if (pasted.length > 0) {
      onChange(pasted.padEnd(value.length).slice(0, digits));
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: digits }).map((_, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => {
            handleChange(i, e.target.value);
            if (e.target.value && i < digits - 1) {
              document.getElementById(`otp-${i + 1}`)?.focus();
            }
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="size-12 rounded-xl border border-white/10 bg-white/5 text-center text-lg font-bold text-white outline-none transition-all focus:border-violet-500/50 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/30 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

// ─── Signup Page ──────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});

  // Multi-step state
  const [step, setStep] = useState<Step>('email');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [otp, setOtp] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    getProviders().then((p) => {
      if (p) setProviders(p as Record<string, ProviderInfo>);
    });
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const hasGithub = !!providers['github'];

  // ── Step 1: Email validation & next ──────────────────────────────────────
  const handleEmailNext = () => {
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setStep('password');
  };

  // ── Step 2: Password validation & next ───────────────────────────────────
  const handlePasswordNext = () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.');
      return;
    }
    setStep('policy');
  };

  // ── Step 3: Policy agreement & submit sign-up ────────────────────────────
  const handlePolicySubmit = async () => {
    setError('');
    if (!agreedToPolicy) {
      setError('You must agree to the Eesha AI Privacy Policy and Terms of Service.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, agreedToPolicy }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Sign-up failed. Please try again.');
        return;
      }

      if (data.emailConfirmed) {
        setStep('success');
        return;
      }

      setStep('verify');
      setResendCooldown(60);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 4: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setError('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        return;
      }

      setStep('success');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not resend code.');
      } else {
        setResendCooldown(60);
        setError('');
        setOtp('');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── GitHub sign-in ───────────────────────────────────────────────────────
  const handleGithubSignIn = async () => {
    setIsLoading(true);
    await signIn('github', { callbackUrl: '/' });
  };

  // ── Step indicator ───────────────────────────────────────────────────────
  const signupSteps: Step[] = ['email', 'password', 'policy', 'verify', 'success'];
  const currentStepIndex = signupSteps.indexOf(step);

  const StepIndicator = () => {
    const visibleSteps = ['email', 'password', 'policy', 'verify'];
    const activeIndex = step === 'success' ? 4 : currentStepIndex;

    return (
      <div className="mb-6 flex items-center justify-center gap-1.5">
        {visibleSteps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < activeIndex
                ? 'w-8 bg-emerald-500'
                : i === activeIndex
                ? 'w-8 bg-violet-500'
                : 'w-4 bg-white/10'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      {/* Canvas background — same as chat console */}
      <SmokyBackground />

      {/* Content — on top of canvas */}
      <div className="relative z-10 w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-2xl shadow-black/50"
        >
          {/* Gradient glow at top */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-violet-600/20 to-transparent" />

          <div className="relative p-6">
            {/* Back to home link */}
            <button
              onClick={() => router.push('/')}
              className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <ArrowLeft className="size-3" />
              Back to chat
            </button>

            {/* Header */}
            <div className="mb-4 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <img src="/logo-transparent.png" alt="Eesha AI" className="h-12 w-auto object-contain" />
              </div>

              {step === 'success' ? (
                <>
                  <h2 className="text-xl font-bold text-emerald-400">Email Verified!</h2>
                  <p className="mt-2 text-sm text-zinc-400">Your account is ready. Sign in to start using Eesha AI.</p>
                </>
              ) : step === 'verify' ? (
                <>
                  <h2 className="text-xl font-bold text-white">Verify your email</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Enter the 6-digit code sent to <strong className="text-white">{email}</strong>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white">Create your free account</h2>
                  <p className="mt-2 text-sm text-zinc-400">Sign up to unlock unlimited AI conversations.</p>
                </>
              )}
            </div>

            {/* Step indicator */}
            <StepIndicator />

            {/* Error display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
              >
                <AlertCircle className="size-4 shrink-0 text-red-400" />
                <span className="text-sm text-red-300">{error}</span>
              </motion.div>
            )}

            {/* ── SIGN UP FLOW ────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {/* Step 1: Email */}
              {step === 'email' && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* GitHub */}
                  {hasGithub && (
                    <button
                      onClick={handleGithubSignIn}
                      disabled={isLoading}
                      className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
                    >
                      <Github className="size-5" />
                      Continue with GitHub
                    </button>
                  )}

                  {hasGithub && (
                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-black/60 px-3 text-zinc-500">or sign up with email</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError(''); }}
                          placeholder="you@example.com"
                          autoFocus
                          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-violet-500/50 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/30"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleEmailNext}
                      disabled={!email.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-3 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Password */}
              {step === 'password' && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400">Create a password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(''); }}
                          placeholder="At least 8 characters"
                          autoFocus
                          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-violet-500/50 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password strength */}
                    {password.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6].map(i => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all ${
                                i <= getPasswordStrength(password).score
                                  ? getPasswordStrength(password).color
                                  : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={`
                            ${getPasswordStrength(password).label === 'Weak' ? 'text-red-400' : ''}
                            ${getPasswordStrength(password).label === 'Fair' ? 'text-amber-400' : ''}
                            ${getPasswordStrength(password).label === 'Strong' ? 'text-emerald-400' : ''}
                          `}>
                            {getPasswordStrength(password).label}
                          </span>
                          <span className="text-zinc-500">Use 8+ chars with mix of letters, numbers & symbols</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setStep('email'); setError(''); }}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400 transition-all hover:bg-white/10"
                      >
                        Back
                      </button>
                      <button
                        onClick={handlePasswordNext}
                        disabled={password.length < 8}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-3 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Policy Agreement */}
              {step === 'policy' && (
                <motion.div
                  key="policy"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Mail className="size-4 text-violet-400" />
                        <span className="truncate">{email}</span>
                        <Check className="size-3 text-emerald-400 ml-auto" />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Lock className="size-4 text-cyan-400" />
                        <span>Password set</span>
                        <Check className="size-3 text-emerald-400 ml-auto" />
                      </div>
                    </div>

                    {/* Policy checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        agreedToPolicy
                          ? 'border-violet-500 bg-violet-600'
                          : 'border-white/20 bg-white/5 group-hover:border-white/30'
                      }`}>
                        {agreedToPolicy && <Check className="size-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={agreedToPolicy}
                        onChange={(e) => { setAgreedToPolicy(e.target.checked); setError(''); }}
                        className="sr-only"
                      />
                      <span className="text-xs leading-relaxed text-zinc-400">
                        I agree to the{' '}
                        <a href="#" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                          Privacy Policy
                        </a>{' '}and{' '}
                        <a href="#" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                          Terms of Service
                        </a>
                        . I understand that my data is protected by end-to-end encryption and Row Level Security.
                      </span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setStep('password'); setError(''); }}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400 transition-all hover:bg-white/10"
                      >
                        Back
                      </button>
                      <button
                        onClick={handlePolicySubmit}
                        disabled={isLoading || !agreedToPolicy}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-3 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <RefreshCw className="size-4 animate-spin" />
                        ) : (
                          <>
                            <Shield className="size-4" />
                            Create Account & Send Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: OTP Verification */}
              {step === 'verify' && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="flex size-16 items-center justify-center rounded-full bg-violet-600/10 border border-violet-500/20">
                        <KeyRound className="size-7 text-violet-400" />
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-zinc-400">
                        Check your email for a 6-digit verification code
                      </p>
                    </div>

                    <OTPInput value={otp} onChange={setOtp} disabled={isLoading} />

                    <button
                      onClick={handleVerifyOtp}
                      disabled={isLoading || otp.length !== 6}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-3 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Shield className="size-4" />
                          Verify Email
                        </>
                      )}
                    </button>

                    <div className="text-center">
                      {resendCooldown > 0 ? (
                        <p className="text-xs text-zinc-500">
                          Resend code in <span className="text-violet-400">{resendCooldown}s</span>
                        </p>
                      ) : (
                        <button
                          onClick={handleResendOtp}
                          disabled={isLoading}
                          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          Didn&apos;t get a code? Resend
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                      <AlertCircle className="size-4 shrink-0 text-amber-400" />
                      <span className="text-xs text-amber-200">
                        Your account is locked until you verify your email. This protects your data from unauthorized access. The code expires after 24 hours.
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Success */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-4 text-center">
                    <div className="flex justify-center">
                      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-600/10 border border-emerald-500/20">
                        <Check className="size-7 text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Your email has been verified. You can now sign in with your credentials.
                    </p>
                    <button
                      onClick={() => router.push('/login')}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-3 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500"
                    >
                      Sign In Now
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Benefits */}
            {(step === 'email' || step === 'password') && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  { icon: Infinity, label: 'Unlimited chats', color: 'text-violet-400' },
                  { icon: MessageSquare, label: 'Save history', color: 'text-cyan-400' },
                  { icon: Code2, label: 'Workspace access', color: 'text-emerald-400' },
                  { icon: Terminal, label: 'Terminal access', color: 'text-amber-400' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                    <Icon className={`size-4 ${color}`} />
                    <span className="text-xs text-zinc-300">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Toggle login */}
            {step !== 'success' && step !== 'verify' && (
              <div className="mt-5 text-center text-sm text-zinc-400">
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
                >
                  Log in
                </button>
              </div>
            )}

            {/* Security notice */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <Shield className="size-3 text-zinc-600" />
              <span className="text-[10px] text-zinc-600">
                Protected by Supabase RLS, end-to-end encryption &amp; email verification
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
