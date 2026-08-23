import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Покерный Клуб БАЗА',
  description: 'Веб-приложение покерного клуба БАЗА: рейтинги, турниры, чат и аналитика',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
