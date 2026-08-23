'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, BottomNav } from './Navigation';
import { Player } from '@/types';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Player | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('baza_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const isAdmin = currentUser?.role === 'Админ';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
};
