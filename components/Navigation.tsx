'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Trophy, Calendar, User, ShieldAlert, BarChart3,
  Users
} from 'lucide-react';

const DEFAULT_LOGO = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/P501EvW31guuymrmZYZM.jpg';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  restricted?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Главная', href: '/home', icon: Home },
  { label: 'Текущий рейтинг', href: '/rating', icon: Trophy },
  { label: 'Профиль', href: '/profile', icon: User },
  { label: 'Регистрация в клуб', href: '/club-register', icon: Users },
  { label: 'Турниры', href: '/tournaments', icon: Calendar },
  { label: 'Админка', href: '/admin', icon: ShieldAlert, restricted: true },
  { label: 'Аналитика', href: '/analytics', icon: BarChart3, restricted: true },
];

export const Sidebar: React.FC<{ isAdminOrOwner?: boolean }> = ({ isAdminOrOwner = false }) => {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);

  useEffect(() => {
    fetch('/api/sheets?sheet=КЛУБ')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data[0] && data.data[0]['Логотип']) {
          setLogoUrl(data.data[0]['Логотип']);
        }
      })
      .catch((err) => console.error('Error fetching logo', err));
  }, []);

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border min-h-screen p-4 sticky top-0">
      <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-border">
        <img
          src={logoUrl}
          alt="Логотип БАЗА"
          className="w-10 h-10 rounded-xl border border-[#014373]/50 object-cover shadow-lg"
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
        />
        <div>
          <h1 className="font-bold text-lg text-foreground tracking-wide">Клуб "БАЗА"</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          if (item.restricted && !isAdminOrOwner) return null;
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

export const BottomNav: React.FC<{ isAdminOrOwner?: boolean }> = ({ isAdminOrOwner = false }) => {
  const pathname = usePathname();

  const mobileNavItems = [
    { label: 'Главная', href: '/home', icon: Home },
    { label: 'Рейтинг', href: '/rating', icon: Trophy },
    { label: 'Профиль', href: '/profile', icon: User },
    { label: 'Турниры', href: '/tournaments', icon: Calendar },
  ];

  if (isAdminOrOwner) {
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
