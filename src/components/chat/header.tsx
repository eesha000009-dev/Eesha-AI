'use client';

import { useChatStore } from '@/stores/chat-store';
import { PanelLeft, LogIn, User, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const FREE_TIER_MAX = 5;

export function Header() {
  const { sidebarOpen, setSidebarOpen, activeConversationId, conversations, freeCreditsUsed } = useChatStore();
  const { data: session } = useSession();
  const router = useRouter();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const showTitle = activeConversation && activeConversationId;

  const creditsRemaining = Math.max(0, FREE_TIER_MAX - freeCreditsUsed);
  const isAuthenticated = !!session?.user;

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
          <img src="/logo-transparent.png" alt="Eesha AI" className="h-6 w-auto object-contain" />
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

      {/* Auth section — pushed to the right via parent's justify-between */}
      <div className="flex items-center gap-2 ml-auto">
        {isAuthenticated ? (
          /* ── Authenticated: Show user name with avatar ── */
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 text-xs font-bold text-white">
              {session.user.name?.[0]?.toUpperCase() || <User className="size-3.5" />}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-foreground max-w-[120px] truncate">
              {session.user.name || session.user.email?.split('@')[0] || 'User'}
            </span>
          </div>
        ) : (
          /* ── Not authenticated: Show credits + Login & Sign Up buttons ── */
          <div className="flex items-center gap-2">
            {/* Free credits indicator */}
            <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1">
              <Zap className={`size-3 ${creditsRemaining > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
              <span className={`text-[11px] font-medium ${creditsRemaining > 0 ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {creditsRemaining}/{FREE_TIER_MAX}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/login')}
            >
              <LogIn className="size-3" />
              Log in
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0"
              onClick={() => router.push('/signup')}
            >
              <Sparkles className="size-3" />
              Sign up
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
