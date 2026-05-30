const SW_VERSION = '09';

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  manifest: {
    name: 'Подряд PRO',
    short_name: 'Подряд PRO',
    description: 'Закажите работы по дому и участку',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f0f2f5',
    theme_color: '#2F5BFF',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    exclude: [
      /_buildManifest\.js$/,
      /_ssgManifest\.js$/,
      /middleware-manifest\.json$/,
      /\.map$/,
      /\/_next\/static\/.*\.woff2$/,
    ],
    runtimeCaching: [
      // Страницы: NetworkOnly — всегда свежий HTML с сервера
      {
        urlPattern: ({ request, url }) =>
          request.destination === 'document' ||
          (request.mode === 'navigate' && !url.pathname.startsWith('/api/')),
        handler: 'NetworkOnly',
        options: {
          cacheName: `pages-${SW_VERSION}`,
        },
      },
      // JS бандлы: CacheFirst (immutable, content-hashed)
      {
        urlPattern: /\/_next\/static\/chunks\/.*\.js$/,
        handler: 'CacheFirst',
        options: {
          cacheName: `next-js-${SW_VERSION}`,
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // CSS: CacheFirst
      {
        urlPattern: /\/_next\/static\/css\/.*\.css$/,
        handler: 'CacheFirst',
        options: {
          cacheName: `next-css-${SW_VERSION}`,
          expiration: { maxEntries: 16, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      // Изображения/шрифты: CacheFirst
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|ico|webp|woff2?|eot|ttf|otf)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: `static-${SW_VERSION}`,
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
          networkTimeoutSeconds: 3,
        },
      },
      // API: NetworkOnly — никогда не кешируем
      {
        urlPattern: /\/api\/.*/,
        handler: 'NetworkOnly',
        options: {
          cacheName: `api-${SW_VERSION}`,
        },
      },
      // Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: `fonts-${SW_VERSION}`,
          expiration: { maxEntries: 8, maxAgeSeconds: 365 * 24 * 60 * 60 },
          networkTimeoutSeconds: 3,
        },
      },
      // Внешние CDN (не Next.js, не API)
      {
        urlPattern: ({ url }) =>
          !url.pathname.startsWith('/_next/') &&
          !url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: `fallback-${SW_VERSION}`,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
    ],
  },
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  assetPrefix: process.env.VERCEL_ENV === 'production'
    ? 'https://podryad-pro-kohl.vercel.app'
    : undefined,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/sw-push.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
