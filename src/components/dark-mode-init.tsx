'use client';

import { useEffect } from 'react';

/**
 * Dark Mode Initializer — ensures dark mode is applied on first load
 * before React fully hydrates. Runs as early as possible in the client.
 */
export function DarkModeInit() {
  useEffect(() => {
    try {
      document.documentElement.classList.add('dark');
    } catch {
      // Silently fail — CSS will handle default styling
    }
  }, []);

  return null;
}
