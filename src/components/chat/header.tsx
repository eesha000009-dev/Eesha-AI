'use client';

import { useChatStore } from '@/stores/chat-store';
import { PanelLeft, Share, MoreHorizontal, Code2, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { sidebarOpen, setSidebarOpen, activeConversationId, conversations } = useChatStore();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const showTitle = activeConversation && activeConversationId;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0a12]/80 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-cyan-600">
                <Code2 className="size-3 text-white" />
              </div>
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-sm font-semibold text-transparent">
                Kimi K2.5
              </span>
            </div>
          </>
        )}
        {showTitle && (
          <>
            <div className="h-4 w-px bg-white/[0.06]" />
            <h1 className="max-w-[300px] truncate text-sm font-medium text-zinc-400 sm:max-w-[500px]">
              {activeConversation.title}
            </h1>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {activeConversationId && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"
            >
              <Share className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/[0.06] bg-[#0c0c14]">
                <DropdownMenuItem className="text-zinc-400 focus:text-white focus:bg-white/[0.06]">
                  <Cpu className="mr-2 size-4" />
                  Model: Kimi K2.5
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </header>
  );
}
