'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Trophy, Calendar, User, ShieldAlert, BarChart3,
  Users, MessageSquare, Edit3, BookOpen, Newspaper
} from 'lucide-react';
import { canManageContent, isClubAdmin } from '@/lib/permissions';
import { useClubLogo } from '@/lib/useClubLogo';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roleAllowed?: (userRole?: string, isAdminFlag?: boolean) => boolean;
}

const navItems: NavItem[] = [
  { label: 'Главная', href: '/home', icon: Home },
  { label: 'Текущий рейтинг', href: '/rating', icon: Trophy },
  { label: 'Профиль', href: '/profile', icon: User },
  { label: 'Турниры', href: '/tournaments', icon: Calendar },
  {
    label: 'Админка',
    href: '/admin',
    icon: ShieldAlert,
    roleAllowed: (role, isAdminFlag) => isClubAdmin(role, isAdminFlag),
  },
  {
    label: 'Аналитика',
    href: '/analytics',
    icon: BarChart3,
    roleAllowed: (role, isAdminFlag) => isClubAdmin(role, isAdminFlag),
  },
  { label: 'Правила клуба', href: '/rules', icon: BookOpen },
  { label: 'Новости', href: '/news', icon: Newspaper },
  { label: 'Чаты', href: '/chat', icon: MessageSquare },
];

interface NavProps {
  userRole?: string;
  isAdminFlag?: boolean;
}

export const Sidebar: React.FC<NavProps> = ({ userRole, isAdminFlag }) => {
  const pathname = usePathname();
  const logoUrl = useClubLogo();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border min-h-screen p-4 sticky top-0">
      <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-border">
        <img
          src={logoUrl}
          alt="Логотип БАЗА"
          className="w-10 h-10 rounded-xl border border-[#014373]/50 object-cover shadow-lg"
          onError={(e) => { (e.target as HTMLImageElement).src = '/icons/logo.png'; }}
        />
        <div>
          <h1 className="font-bold text-lg text-foreground tracking-wide">Клуб &quot;БАЗА&quot;</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          if (item.roleAllowed && !item.roleAllowed(userRole, isAdminFlag)) return null;
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

export const BottomNav: React.FC<NavProps> = ({ userRole, isAdminFlag }) => {
  const pathname = usePathname();

  const canAccessAdmin = isClubAdmin(userRole, isAdminFlag);

  const mobileNavItems = [
    { label: 'Главная', href: '/home', icon: Home },
    { label: 'Рейтинг', href: '/rating', icon: Trophy },
    { label: 'Турниры', href: '/tournaments', icon: Calendar },
    { label: 'Профиль', href: '/profile', icon: User },
    { label: 'Новости', href: '/news', icon: Newspaper },
    { label: 'Чаты', href: '/chat', icon: MessageSquare },
  ];

  if (canAccessAdmin) {
    mobileNavItems.push({ label: 'Аналитика', href: '/analytics', icon: BarChart3 });
    mobileNavItems.push({ label: 'Админ', href: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#014373] border-t border-[#013357] px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pl-[calc(0.25rem+env(safe-area-inset-left,0px))] pr-[calc(0.25rem+env(safe-area-inset-right,0px))] shadow-2xl">
      <div className="flex items-center justify-between overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-1 sm:px-1.5 rounded-xl text-[9px] sm:text-[10px] font-medium min-h-[44px] min-w-[44px] flex-1 snap-start transition-all shrink-0 ${
                isActive
                  ? 'bg-white/20 text-white font-black shadow-inner'
                  : 'text-sky-100/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[56px] text-center leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
