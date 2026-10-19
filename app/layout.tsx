import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#014373',
};

import { getClubLogoUrl } from '@/lib/clubSettings';

export async function generateMetadata(): Promise<Metadata> {
  const logoUrl = await getClubLogoUrl();

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
        { url: logoUrl, type: 'image/jpeg' },
        { url: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [
        { url: logoUrl, sizes: '180x180', type: 'image/jpeg' },
        { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
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
    <html lang="ru" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
