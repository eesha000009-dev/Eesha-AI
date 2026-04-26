'use client';

import { useChatStore } from '@/stores/chat-store';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { sidebarOpen, setSidebarOpen, activeConversationId, conversations } = useChatStore();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const showTitle = activeConversation && activeConversationId;

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      {!sidebarOpen && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 sm:size-7 text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="size-4 sm:size-4" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <img src="/logo-transparent.png" alt="Eesha AI" className="size-9 object-contain shrink-0" />
            <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-base font-bold text-transparent whitespace-nowrap">
              Eesha AI
            </span>
          </div>
        </>
      )}
      {showTitle && (
        <>
          <div className="h-4 w-px bg-border shrink-0" />
          <h1 className="max-w-[160px] sm:max-w-[300px] truncate text-xs sm:text-sm font-medium text-muted-foreground">
            {activeConversation.title}
          </h1>
        </>
      )}
    </div>
  );
}
