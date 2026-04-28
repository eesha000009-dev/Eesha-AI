'use client';

import { motion } from 'framer-motion';
import { Code2, Zap, Globe, BookOpen, Rocket, Lightbulb, Cpu, GitBranch } from 'lucide-react';

interface EmptyStateProps {
  onSuggestionClick?: (text: string) => void;
}

const suggestions = [
  {
    icon: Code2,
    title: 'Build a web app',
    prompt: 'Build a modern web application with Next.js, including a landing page and API routes',
    iconColor: 'text-violet-400',
  },
  {
    icon: Zap,
    title: 'Debug my code',
    prompt: 'Help me debug a TypeError: Cannot read properties of undefined in my React component',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Globe,
    title: 'Build an API',
    prompt: 'Design and build a REST API with authentication and CRUD operations',
    iconColor: 'text-emerald-400',
  },
  {
    icon: BookOpen,
    title: 'Explain code',
    prompt: 'Explain how React Server Components work under the hood',
    iconColor: 'text-amber-400',
  },
];

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 overflow-hidden" style={{ zIndex: 2 }}>

      {/* Large background logo watermark — always behind content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/logo-transparent.png"
          alt=""
          className="object-contain animate-breathe-slow select-none"
          style={{
            maxWidth: '55%',
            maxHeight: '55%',
            opacity: 0.08,
            filter: 'brightness(1.4) saturate(1.3)',
          }}
        />
      </div>

      {/* All content overlays the logo */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg">

        {/* Prominent logo at the top */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4"
        >
          <div className="relative">
            <img
              src="/logo-transparent.png"
              alt="Eesha AI"
              className="size-24 sm:size-28 object-contain drop-shadow-lg"
              style={{ filter: 'brightness(1.1) saturate(1.2)' }}
            />
            <div className="absolute inset-0 rounded-full animate-glow-pulse opacity-50" />
          </div>
        </motion.div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-3"
        >
          <h2 className="text-2xl sm:text-3xl font-light text-foreground/90 mb-1.5">
            What do you want to build?
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] max-w-md mx-auto">
            Eesha AI can write, debug, and deploy code. Ask anything — from quick scripts to full applications.
          </p>
        </motion.div>

        {/* Model badge — compact chip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mb-5 flex items-center gap-1.5 rounded-full border border-white/10 dark:border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-md px-3 py-1"
        >
          <Cpu className="size-3 text-cyan-400" />
          <span className="text-[11px] text-foreground/70">Kimi K2.5</span>
          <span className="text-foreground/20">·</span>
          <GitBranch className="size-2.5 text-violet-400" />
          <span className="text-[11px] text-foreground/70">Thinking</span>
          <span className="text-foreground/20">·</span>
          <Rocket className="size-2.5 text-primary/70" />
          <span className="text-[11px] text-foreground/70">H100s</span>
        </motion.div>

        {/* Suggestion chips — compact */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-2 w-full"
        >
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <motion.button
                key={suggestion.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.06 }}
                onClick={() => onSuggestionClick?.(suggestion.prompt)}
                className="group flex items-center gap-1.5 rounded-full border border-white/10 dark:border-white/8 bg-white/10 dark:bg-white/5 backdrop-blur-md px-3 py-1.5 text-xs text-foreground/70 transition-all duration-200 hover:bg-white/20 dark:hover:bg-white/10 hover:border-primary/30 hover:text-foreground hover:-translate-y-0.5"
              >
                <Icon className={`size-3 ${suggestion.iconColor}`} />
                <span>{suggestion.title}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Bottom hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="mt-5 flex items-center gap-1.5 text-[10px] text-foreground/25"
        >
          <Rocket className="size-2.5 text-primary/30" />
          <span>Powered by Kimi K2.5 via NVIDIA API</span>
          <span className="mx-0.5">·</span>
          <Lightbulb className="size-2.5 text-amber-400/30" />
          <span>Thinking Mode</span>
        </motion.div>

      </div>
    </div>
  );
}
