'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, BottomNav } from './Navigation';
import { PlayerRow } from '@/types';
import { getSavedUserSession, restoreUserSessionAsync } from '@/lib/session';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Intercept external links in iOS Standalone WebView
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      if (href && (targetAttr === '_blank' || href.startsWith('http://') || href.startsWith('https://'))) {
        const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
        if (isExternal || targetAttr === '_blank') {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);

  useEffect(() => {
    const session = getSavedUserSession();
    if (session) {
      setCurrentUser(session);
    } else {
      restoreUserSessionAsync().then((restored) => {
        if (restored) setCurrentUser(restored);
      });
    }
  }, []);

  const role = currentUser?.['Роль'];
  const isAdminFlag = currentUser?.['Админ?'] === true;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <Sidebar userRole={role} isAdminFlag={isAdminFlag} />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 pt-safe pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav userRole={role} isAdminFlag={isAdminFlag} />
    </div>
  );
};
