import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?pwa=1',
    name: 'Покерный Клуб БАЗА',
    short_name: 'ПК БАЗА',
    description: 'Веб-приложение покерного клуба БАЗА: рейтинги, турниры, чат и аналитика',
    start_url: '/?pwa=1',
    display: 'standalone',
    background_color: '#090D16',
    theme_color: '#090D16',
    icons: [
      {
        src: '/api/club/logo-icon',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/club/logo-icon',
        sizes: 'any',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
