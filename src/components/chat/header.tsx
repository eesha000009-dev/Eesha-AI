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
            className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="size-4" />
          </Button>
          <img src="/splash-screen.png" alt="Eesha AI" className="h-8 w-auto object-contain" />
        </>
      )}
      {showTitle && (
        <>
          <h1 className="max-w-[300px] sm:max-w-[400px] truncate text-sm font-light text-muted-foreground">
            {activeConversation.title}
          </h1>
        </>
      )}
    </div>
  );
}
