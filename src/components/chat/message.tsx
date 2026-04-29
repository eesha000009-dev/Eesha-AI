'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RefreshCw, Brain, ChevronDown, ChevronRight, Sparkles, Shield, ShieldCheck, Zap, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/chat/code-block';
import type { Message as MessageType } from '@/stores/chat-store';

interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

// ─── Agent metadata for the committee ─────────────────────────────────────────

const COMMITTEE_AGENTS = [
  {
    id: 'architect',
    label: 'Architect',
    icon: Sparkles,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    ring: 'ring-blue-500/40',
    dot: 'bg-blue-400',
    desc: 'Designing & coding',
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldAlert,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    ring: 'ring-red-500/40',
    dot: 'bg-red-400',
    desc: 'Auditing vulnerabilities',
  },
  {
    id: 'optimizer',
    label: 'Optimizer',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    ring: 'ring-amber-500/40',
    dot: 'bg-amber-400',
    desc: 'Optimizing performance',
  },
];

// ─── Committee Deliberation Component ─────────────────────────────────────────

function CommitteeDeliberation({ agentStatuses }: { agentStatuses: Record<string, string> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="my-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="size-5 text-primary animate-pulse" />
        <span className="text-sm font-medium text-foreground/80">Committee is deliberating</span>
        <span className="flex gap-0.5 ml-1">
          <span className="animate-thinking-dot inline-block size-1.5 rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
          <span className="animate-thinking-dot inline-block size-1.5 rounded-full bg-primary" style={{ animationDelay: '200ms' }} />
          <span className="animate-thinking-dot inline-block size-1.5 rounded-full bg-primary" style={{ animationDelay: '400ms' }} />
        </span>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-3 gap-2">
        {COMMITTEE_AGENTS.map((agent, idx) => {
          const status = agentStatuses[agent.id] || 'idle';
          const isActive = status === 'working';
          const isDone = status === 'done';
          const Icon = agent.icon;

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative rounded-xl border p-3 text-center transition-all duration-500 ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                  : isActive
                    ? `border-white/20 ${agent.bg} ring-1 ${agent.ring}`
                    : 'border-white/8 bg-white/[0.02]'
              }`}
            >
              {/* Active pulse ring */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ boxShadow: `0 0 20px var(--glow-color)` }}
                />
              )}

              {/* Agent icon */}
              <div className={`inline-flex items-center justify-center size-8 rounded-lg ${agent.bg} mb-2`}>
                <Icon className={`size-4 ${agent.color} ${isActive ? 'animate-pulse' : ''}`} />
              </div>

              {/* Agent name */}
              <div className={`text-xs font-semibold ${isDone ? 'text-emerald-400' : isActive ? agent.color : 'text-foreground/40'}`}>
                {agent.label}
              </div>

              {/* Status */}
              <div className="text-[10px] text-foreground/40 mt-0.5">
                {isDone ? 'Complete' : isActive ? agent.desc : 'Waiting...'}
              </div>

              {/* Status indicator dot */}
              <div className="flex justify-center mt-2">
                <div className={`size-2 rounded-full ${
                  isDone ? 'bg-emerald-400' : isActive ? `${agent.dot} animate-pulse` : 'bg-foreground/15'
                }`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom note */}
      <div className="mt-3 text-center">
        <span className="text-[10px] text-foreground/25">
          All 3 agents work in parallel, then synthesize a consensus answer
        </span>
      </div>
    </motion.div>
  );
}

// ─── Thinking Bubble ──────────────────────────────────────────────────────────

function ThinkingBubble({ thinking, isThinking }: { thinking: string; isThinking?: boolean }) {
  const [expanded, setExpanded] = useState(isThinking ?? false);

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-accent"
      >
        {expanded ? (
          <ChevronDown className="size-3 text-primary" />
        ) : (
          <ChevronRight className="size-3 text-primary" />
        )}
        <Brain className="size-3 text-primary" />
        <span className="text-primary/80">
          {isThinking ? 'Thinking...' : 'Reasoning'}
        </span>
        {isThinking && (
          <span className="flex gap-0.5 ml-1">
            <span className="animate-thinking-dot inline-block size-1 rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
            <span className="animate-thinking-dot inline-block size-1 rounded-full bg-primary" style={{ animationDelay: '200ms' }} />
            <span className="animate-thinking-dot inline-block size-1 rounded-full bg-primary" style={{ animationDelay: '400ms' }} />
          </span>
        )}
      </button>
      <AnimatePresence>
        {expanded && thinking && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-2 mt-1 rounded-lg border border-primary/10 bg-primary/[0.03] p-3">
              <div className="prose-thinking text-xs leading-relaxed text-[var(--text-tertiary)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {thinking}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Thinking Indicator ───────────────────────────────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 px-1">
      <Brain className="size-4 text-primary animate-pulse" />
      <span className="text-sm text-muted-foreground">Thinking</span>
      <span className="flex gap-0.5">
        <span className="animate-thinking-dot inline-block size-1.5 rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
        <span className="animate-thinking-dot inline-block size-1.5 rounded-full bg-primary" style={{ animationDelay: '200ms' }} />
        <span className="animate-thinking-dot inline-block size-1.5 rounded-full bg-primary" style={{ animationDelay: '400ms' }} />
      </span>
    </div>
  );
}

// ─── Main Message Component ───────────────────────────────────────────────────

export function Message({ message, isStreaming, onRegenerate }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isAssistantStreaming = isStreaming && message.role === 'assistant' && !message.content && !message.isDeliberating;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [message.content]);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="group relative max-w-[85%] sm:max-w-[70%]">
          <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-violet-600/90 to-purple-600/90 px-4 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-violet-500/10">
            {message.content}
          </div>
          <div className="absolute -bottom-7 right-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="size-6 text-muted-foreground hover:text-foreground"
              title="Copy"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group flex gap-3"
    >
      {/* Avatar */}
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-violet-600/20 to-cyan-600/20">
        <ShieldCheck className="size-4 text-primary" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isAssistantStreaming ? (
          <ThinkingIndicator />
        ) : (
          <>
            {/* Committee deliberation animation */}
            <AnimatePresence>
              {message.isDeliberating && message.agentStatuses && (
                <CommitteeDeliberation agentStatuses={message.agentStatuses} />
              )}
            </AnimatePresence>

            {/* Thinking/reasoning (legacy) */}
            {message.thinking && !message.isDeliberating && (
              <ThinkingBubble thinking={message.thinking} isThinking={message.isThinking} />
            )}

            {/* Final answer content */}
            {message.content && !message.isDeliberating && (
              <div className="border-l-2 border-cyan-500/30 pl-3">
                <div className="prose-chat">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !className;

                        if (isInline) {
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }

                        const language = match ? match[1] : '';
                        const codeStr = String(children).replace(/\n$/, '');

                        return <CodeBlock language={language} code={codeStr} />;
                      },
                      a({ href, children }) {
                        return (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {/* Streaming cursor */}
                {isStreaming && message.content && (
                  <span className="animate-blink-cursor ml-0.5 inline-block size-2 rounded-full bg-cyan-500" />
                )}
              </div>
            )}

            {/* Still thinking but no content yet */}
            {isStreaming && message.isThinking && !message.content && !message.isDeliberating && (
              <ThinkingIndicator />
            )}
          </>
        )}

        {/* Hover actions */}
        {!isAssistantStreaming && message.content && !message.isDeliberating && (
          <div className="mt-1.5 flex items-center gap-1 pl-5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="size-6 text-muted-foreground hover:text-foreground"
              title="Copy"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRegenerate}
                className="size-6 text-muted-foreground hover:text-foreground"
                title="Regenerate"
              >
                <RefreshCw className="size-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
