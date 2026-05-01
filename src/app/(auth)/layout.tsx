'use client';

import { SessionProvider } from 'next-auth/react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="bg-[#09090f] dark:bg-[#09090f] min-h-screen">
        {children}
      </div>
    </SessionProvider>
  );
}
