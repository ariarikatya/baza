'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, BottomNav } from './Navigation';
import { PlayerRow } from '@/types';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const role = currentUser?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || currentUser?.['Админ?'] === true;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <Sidebar isAdminOrOwner={isAdminOrOwner} />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 pb-20 lg:pb-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav isAdminOrOwner={isAdminOrOwner} />
    </div>
  );
};
