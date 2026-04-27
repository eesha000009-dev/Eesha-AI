'use client';

import { useChatStore } from '@/stores/chat-store';
import { PanelLeft, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { sidebarOpen, setSidebarOpen, activeConversationId, conversations } = useChatStore();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const showTitle = activeConversation && activeConversationId;

  return (
    <div className="flex items-center gap-3">
      {!sidebarOpen && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="size-4" />
          </Button>
        </>
      )}

      {/* Model selector — like x.ai/z.ai style */}
      <button className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-accent hover:text-foreground">
        <Sparkles className="size-3.5 text-primary" />
        <span className="font-medium">Eesha AI</span>
        <ChevronDown className="size-3 opacity-40" />
      </button>

      {showTitle && (
        <>
          <div className="h-4 w-px bg-border" />
          <h1 className="max-w-[300px] truncate text-sm font-medium text-muted-foreground">
            {activeConversation.title}
          </h1>
        </>
      )}
    </div>
  );
}
