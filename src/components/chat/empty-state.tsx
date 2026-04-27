'use client';

import { motion } from 'framer-motion';
import { Code2, Zap, Globe, BookOpen, Rocket, Lightbulb, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  onSuggestionClick?: (text: string) => void;
}

const suggestions = [
  {
    icon: Code2,
    title: 'Build a web app',
    description: 'Create a full-stack application from scratch',
    prompt: 'Build a modern web application with Next.js, including a landing page and API routes',
    iconColor: 'text-violet-400',
  },
  {
    icon: Zap,
    title: 'Debug my code',
    description: 'Find and fix errors in your codebase',
    prompt: 'Help me debug a TypeError: Cannot read properties of undefined in my React component',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Globe,
    title: 'Build an API',
    description: 'Design and implement REST or GraphQL APIs',
    prompt: 'Design and build a REST API with authentication and CRUD operations',
    iconColor: 'text-emerald-400',
  },
  {
    icon: BookOpen,
    title: 'Explain code',
    description: 'Understand complex code and algorithms',
    prompt: 'Explain how React Server Components work under the hood',
    iconColor: 'text-amber-400',
  },
];

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 relative z-10">
      {/* Large centered brand text — like x.ai's "Grok" */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-10"
      >
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-extralight tracking-tight text-foreground/90 mb-4 select-none">
          <span className="text-foreground/30">E</span>esha
        </h1>
        <p className="text-base sm:text-lg text-[var(--text-tertiary)] max-w-md mx-auto font-light">
          AI for all builders
        </p>
      </motion.div>

      {/* Suggestion chips — inline pill style like z.ai */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-center justify-center gap-2 max-w-xl mb-8"
      >
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <motion.button
              key={suggestion.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.06 }}
              onClick={() => onSuggestionClick?.(suggestion.prompt)}
              className="group flex items-center gap-2 rounded-full border border-border/60 bg-[var(--surface-secondary)]/60 backdrop-blur-sm px-4 py-2 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:border-primary/30 hover:bg-[var(--surface-secondary)] hover:text-foreground hover:shadow-lg hover:shadow-primary/5"
            >
              <Icon className={`size-3.5 ${suggestion.iconColor}`} />
              <span>{suggestion.title}</span>
              <ArrowRight className="size-3 opacity-0 -ml-1 transition-all duration-200 group-hover:opacity-60 group-hover:ml-0" />
            </motion.button>
          );
        })}
      </motion.div>

      {/* Bottom hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]"
      >
        <Rocket className="size-3 text-primary/40" />
        <span>Powered by Kimi K2.5</span>
        <span className="mx-0.5 text-[var(--text-tertiary)]/40">·</span>
        <Lightbulb className="size-3 text-amber-500/40" />
        <span>Thinking Mode</span>
      </motion.div>
    </div>
  );
}
