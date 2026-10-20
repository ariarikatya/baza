'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, BottomNav } from './Navigation';
import { PlayerRow } from '@/types';
import { getSavedUserSession, restoreUserSessionAsync } from '@/lib/session';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      <main className="flex-1 p-4 md:p-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:pt-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav userRole={role} isAdminFlag={isAdminFlag} />
    </div>
  );
};
