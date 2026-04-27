'use client';

import { useChatStore } from '@/stores/chat-store';

export function SmokyBackground() {
  const { themeMode } = useChatStore();

  // Determine if dark mode is active
  const isDark = typeof window !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : true;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* x.ai-style smoky light from top-right — breathing animation */}
      <div
        className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] animate-breathe"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(160, 195, 255, 0.08) 0%, rgba(120, 165, 255, 0.04) 30%, rgba(80, 130, 255, 0.015) 60%, transparent 80%)'
            : 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.025) 30%, transparent 60%)',
        }}
      />

      {/* Secondary light from mid-right — slower breathing */}
      <div
        className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] animate-breathe-slow"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(100, 160, 255, 0.06) 0%, rgba(70, 120, 255, 0.03) 40%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.04) 0%, transparent 50%)',
        }}
      />

      {/* Subtle ambient glow bottom-left */}
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%]"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(100, 80, 200, 0.04) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.025) 0%, transparent 50%)',
        }}
      />

      {/* Third subtle glow top-left for depth */}
      <div
        className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] animate-breathe-slow"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.04) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at center, rgba(236, 72, 153, 0.025) 0%, transparent 50%)',
        }}
      />

      {/* Light sweep effect — x.ai style moving gradient */}
      <div
        className="absolute top-0 right-0 w-[80%] h-[50%] opacity-30"
        style={{
          background: isDark
            ? 'linear-gradient(225deg, rgba(160, 195, 255, 0.06) 0%, transparent 40%, transparent 60%, rgba(120, 165, 255, 0.03) 100%)'
            : 'linear-gradient(225deg, rgba(139, 92, 246, 0.04) 0%, transparent 40%, transparent 60%, rgba(6, 182, 212, 0.02) 100%)',
        }}
      />

      {/* ── Dark mode: Centered logo watermark with rotating glow ring ── */}
      {isDark && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Rotating glow ring — spins around the logo */}
            <div className="absolute inset-0 animate-[spin_25s_linear_infinite]">
              {/* Top glow spot */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35vmin] h-[35vmin] rounded-full blur-[80px]"
                style={{
                  background: 'radial-gradient(circle, rgba(100, 170, 255, 0.14) 0%, rgba(80, 140, 255, 0.06) 40%, transparent 70%)',
                }}
              />
              {/* Bottom glow spot */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[30vmin] h-[30vmin] rounded-full blur-[80px]"
                style={{
                  background: 'radial-gradient(circle, rgba(130, 180, 255, 0.12) 0%, rgba(100, 150, 255, 0.05) 40%, transparent 70%)',
                }}
              />
              {/* Left glow spot */}
              <div
                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28vmin] h-[28vmin] rounded-full blur-[80px]"
                style={{
                  background: 'radial-gradient(circle, rgba(160, 130, 255, 0.11) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
                }}
              />
              {/* Right glow spot */}
              <div
                className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-[32vmin] h-[32vmin] rounded-full blur-[80px]"
                style={{
                  background: 'radial-gradient(circle, rgba(120, 175, 255, 0.13) 0%, rgba(90, 145, 255, 0.05) 40%, transparent 70%)',
                }}
              />
            </div>

            {/* The actual logo — semi-transparent, NO background */}
            <img
              src="/logo-transparent.png"
              alt=""
              className="w-[55vmin] h-[55vmin] object-contain opacity-[0.08]"
              style={{ filter: 'brightness(1.3) contrast(1.1) saturate(1.2)' }}
            />
          </div>
        </div>
      )}

      {/* ── Light mode: NO logo watermark, just very subtle gradient effects ── */}
      {!isDark && (
        <>
          {/* Very subtle center glow instead of logo */}
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-[50vmin] h-[50vmin] rounded-full animate-breathe-slow"
              style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.03) 0%, rgba(6, 182, 212, 0.015) 40%, transparent 70%)',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
