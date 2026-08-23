'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Trophy, Calendar, User, ShieldAlert, BarChart3,
  MessageSquare, Newspaper, ScrollText, HelpCircle, Award, Sparkles
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Главная', href: '/home', icon: Home },
  { label: 'Рейтинг', href: '/rating', icon: Trophy },
  { label: 'Турниры', href: '/tournaments', icon: Calendar },
  { label: 'Чат', href: '/chat', icon: MessageSquare },
  { label: 'Профиль', href: '/profile', icon: User },
  { label: 'Акции', href: '/events', icon: Sparkles },
  { label: 'Новости', href: '/news', icon: Newspaper },
  { label: 'Геральдика', href: '/heraldry', icon: Award },
  { label: 'Правила', href: '/rules', icon: ScrollText },
  { label: 'О клубе', href: '/about', icon: HelpCircle },
  { label: 'Аналитика', href: '/analytics', icon: BarChart3 },
  { label: 'Панель Админа', href: '/admin', icon: ShieldAlert, adminOnly: true },
];

export const Sidebar: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border min-h-screen p-4 sticky top-0">
      <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center font-bold text-white text-xl shadow-lg">
          Б
        </div>
        <div>
          <h1 className="font-bold text-lg text-foreground tracking-wide">Клуб "БАЗА"</h1>
          <p className="text-xs text-muted-foreground">Poker Club & Community</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export const BottomNav: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const pathname = usePathname();

  const mobileNavItems = [
    { label: 'Главная', href: '/home', icon: Home },
    { label: 'Рейтинг', href: '/rating', icon: Trophy },
    { label: 'Турниры', href: '/tournaments', icon: Calendar },
    { label: 'Чат', href: '/chat', icon: MessageSquare },
    { label: 'Профиль', href: '/profile', icon: User },
  ];

  if (isAdmin) {
    mobileNavItems.push({ label: 'Админ', href: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border px-2 py-2 shadow-lg">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium min-h-[44px] min-w-[44px] transition-colors ${
                isActive ? 'text-brand font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
