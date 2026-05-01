'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getProviders } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Github, Mail, Eye, EyeOff, Lock, ArrowRight, ArrowLeft,
  AlertCircle, RefreshCw, Shield
} from 'lucide-react';
import { SmokyBackground } from '@/components/chat/smoky-background';

interface ProviderInfo {
  id: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProviders().then((p) => {
      if (p) setProviders(p as Record<string, ProviderInfo>);
    });
  }, []);

  const hasGithub = !!providers['github'];

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    await signIn('github', { callbackUrl: '/' });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/',
        redirect: false,
      });
      if (result?.error) {
        setError('Invalid email or password.');
      } else if (result?.ok) {
        router.push('/');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <img src="/logo-transparent.png" alt="Eesha AI" className="h-12 w-auto object-contain" />
              </div>
              <h2 className="text-xl font-bold text-white">Welcome back</h2>
              <p className="mt-2 text-sm text-zinc-400">Sign in to continue where you left off.</p>
            </div>

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

            {/* GitHub sign-in */}
            {hasGithub && (
              <button
                onClick={handleGithubSignIn}
                disabled={isLoading}
                className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
              >
                <Github className="size-5" />
                Sign in with GitHub
              </button>
            )}

            {hasGithub && (
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-black/60 px-3 text-zinc-500">or sign in with email</span>
                </div>
              </div>
            )}

            {/* Email + Password form */}
            <form onSubmit={handleEmailLogin} className="space-y-3">
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

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
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

              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-3 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <RefreshCw className="size-4 animate-spin" /> : (
                  <>
                    Sign In
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle signup */}
            <div className="mt-5 text-center text-sm text-zinc-400">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => router.push('/signup')}
                className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                Sign up
              </button>
            </div>

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
