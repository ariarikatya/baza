import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#090D16',
  viewportFit: 'cover',
};

import { getClubLogoUrl } from '@/lib/clubSettings';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Покерный Клуб БАЗА',
    description: 'Веб-приложение покерного клуба БАЗА: рейтинги, турниры, чат и аналитика',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'ПК БАЗА',
    },
    icons: {
      icon: [
        { url: '/api/club/logo-icon', type: 'image/png' },
      ],
      apple: [
        { url: '/api/club/logo-icon', sizes: '180x180', type: 'image/png' },
      ],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark" style={{ backgroundColor: '#090D16' }}>
      <head>
        <meta name="theme-color" content="#090D16" />
        <link rel="apple-touch-icon" href="/api/club/logo-icon" />
      </head>
      <body className={inter.className} style={{ backgroundColor: '#090D16', color: '#ffffff' }}>
        <ErrorBoundary>
          <ServiceWorkerRegister />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
