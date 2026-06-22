import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RefBase',
    short_name: 'RefBase',
    icons: [
      { src: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
    theme_color: '#021444',
    background_color: '#021444',
    display: 'standalone',
  };
}
