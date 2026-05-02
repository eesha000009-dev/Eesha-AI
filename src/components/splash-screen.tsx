'use client';

import { useEffect } from 'react';

/**
 * Splash Screen — client component that fades out and removes the splash overlay
 * after the app has mounted. The splash HTML is rendered server-side in layout.tsx
 * so it shows immediately before React hydrates.
 */
export function SplashScreen() {
  useEffect(() => {
    const splash = document.getElementById('eesha-splash');
    if (splash) {
      const fadeTimer = setTimeout(() => {
        splash.classList.add('fade-out');
        const removeTimer = setTimeout(() => {
          splash.remove();
        }, 700);
        return () => clearTimeout(removeTimer);
      }, 1200);
      return () => clearTimeout(fadeTimer);
    }
  }, []);

  return null;
}
