'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Square, Paperclip, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InputAreaProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function InputArea({ onSend, onStop, isStreaming }: InputAreaProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="shrink-0 px-4 pb-4 pt-2 relative z-10">
      <div className="mx-auto max-w-[720px]">
        {/* Input container — x.ai style: rounded, clean, floating */}
        <div className="chat-input-container relative rounded-2xl border border-border/60 bg-[var(--surface-secondary)]/80 backdrop-blur-xl transition-all duration-300 focus-within:border-primary/25 focus-within:bg-[var(--surface-secondary)] focus-within:shadow-xl focus-within:shadow-primary/5">
          <div className="flex items-end gap-2 p-3">
            {/* Left action icons — like x.ai's attach/globe */}
            <div className="flex items-center gap-1 mb-0.5 shrink-0">
              <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground" title="Attach file">
                <Paperclip className="size-4" />
              </button>
              <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground" title="Web search">
                <Globe className="size-4" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to build?"
              rows={1}
              className="max-h-[200px] min-h-[28px] flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder-[var(--text-tertiary)] outline-none"
            />

            {/* Send / Stop button — arrow-up style like x.ai */}
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    onClick={onStop}
                    className="size-8 shrink-0 rounded-xl bg-red-500/90 text-white shadow-lg shadow-red-500/20 hover:bg-red-600"
                    size="icon"
                    title="Stop generating"
                  >
                    <Square className="size-3" fill="currentColor" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                    className="size-8 shrink-0 rounded-xl bg-foreground text-background shadow-lg transition-all hover:opacity-90 disabled:opacity-15 disabled:shadow-none"
                    size="icon"
                    title="Send message"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom info — minimal */}
        <div className="mt-2 flex items-center justify-center px-1">
          <span className="text-[11px] text-[var(--text-tertiary)]/60">
            Eesha AI can make mistakes. Review code carefully.
          </span>
        </div>
      </div>
    </div>
  );
}
