import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?pwa=1',
    name: 'Покерный Клуб БАЗА',
    short_name: 'ПК БАЗА',
    description: 'Веб-приложение покерного клуба БАЗА: рейтинги, турниры, чат и аналитика',
    start_url: '/?pwa=1',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#014373',
    icons: [
      {
        src: '/api/club/logo-icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
