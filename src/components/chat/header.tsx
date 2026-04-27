'use client';

import { useChatStore } from '@/stores/chat-store';
import { PanelLeft } from 'lucide-react';
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
          <div className="flex items-center gap-2">
            <div className="relative flex size-7 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 blur-sm" />
              <img
                src="/logo-transparent.png"
                alt="Eesha AI"
                className="relative size-6 object-contain"
              />
            </div>
            <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-sm font-semibold text-transparent">
              Eesha AI
            </span>
          </div>
        </>
      )}
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
