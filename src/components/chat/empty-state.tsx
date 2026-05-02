'use client';

import { motion } from 'framer-motion';

interface EmptyStateProps {
  onSuggestionClick?: (text: string) => void;
}

const suggestions = [
  { title: 'Build a web app', prompt: 'Build a modern web application with Next.js, including a landing page and API routes' },
  { title: 'Debug my code', prompt: 'Help me debug a TypeError: Cannot read properties of undefined in my React component' },
  { title: 'Build an API', prompt: 'Design and build a REST API with authentication and CRUD operations' },
  { title: 'Explain code', prompt: 'Explain how React Server Components work under the hood' },
];

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 relative" style={{ zIndex: 2 }}>
      <div className="flex flex-col items-center w-full max-w-md">

        {/* Heading — light, confident */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-2"
        >
          <h2 className="text-3xl sm:text-4xl font-extralight text-foreground/90 tracking-tight">
            What do you want to build?
          </h2>
        </motion.div>

        {/* Tagline — tiny, minimal */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-[13px] text-foreground/25 mb-10 tracking-wide"
        >
          Three AI agents. One answer.
        </motion.p>

        {/* Suggestion chips — minimal, 2x2 grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="grid grid-cols-2 gap-2.5 w-full"
        >
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.06 }}
              onClick={() => onSuggestionClick?.(suggestion.prompt)}
              className="group flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30 backdrop-blur-sm px-4 py-3.5 text-[13px] text-foreground/50 transition-all duration-200 hover:bg-[var(--surface-secondary)]/50 hover:text-foreground/80 hover:border-foreground/10"
            >
              <span>{suggestion.title}</span>
            </motion.button>
          ))}
        </motion.div>

      </div>
    </div>
  );
}
