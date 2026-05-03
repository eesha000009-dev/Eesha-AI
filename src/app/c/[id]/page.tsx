'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChatStore, ChatMode } from '@/stores/chat-store';
import { ChatPageContent } from '@/components/chat/chat-page-content';
import { useSession } from 'next-auth/react';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const setConversations = useChatStore((s) => s.setConversations);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const setActiveMode = useChatStore((s) => s.setActiveMode);

  const conversationId = params?.id as string;
  const hasLoadedRef = useRef(false);

  // Load and validate conversation on mount
  useEffect(() => {
    if (status === 'loading') return;
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadAndValidate = async () => {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          const normalized = data.map((c: Record<string, unknown>) => ({
            ...c,
            mode: (c.mode as string) || (c.chatMode as string) || 'code',
          }));
          setConversations(normalized);

          // Check if the conversation exists and belongs to the user
          const target = normalized.find(
            (c: Record<string, unknown>) => c.id === conversationId
          );

          if (target) {
            setActiveConversation(target.id);
            setActiveMode((target.mode as ChatMode) || 'code');
          } else {
            // Conversation not found or doesn't belong to user — redirect to home
            router.replace('/');
          }
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      }
    };

    loadAndValidate();
  }, [conversationId, status, router, setConversations, setActiveConversation, setActiveMode]);

  // Wait for session to load before rendering
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" />
          <p className="text-xs text-foreground/30">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return <ChatPageContent initialConversationId={conversationId} />;
}
