const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  // Не кешировать данные и API — только статику и страницы
  buildExcludes: [/middleware-manifest\.json$/, /_buildManifest\.js$/, /_ssgManifest\.js$/],
  // Максимальный размер файла для precache: 2 MB
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
  runtimeCaching: [
    // Страницы: StaleWhileRevalidate — показываем из кеша мгновенно, обновляем в фоне
    {
      urlPattern: ({ request, url }) =>
        request.destination === 'document' ||
        (request.mode === 'navigate' && !url.pathname.startsWith('/api/')),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages',
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 5,
      },
    },
    // JS бандлы: CacheFirst (immutable, content-hashed)
    {
      urlPattern: /\/_next\/static\/chunks\/.*\.js$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-js',
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    // CSS: CacheFirst
    {
      urlPattern: /\/_next\/static\/css\/.*\.css$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-css',
        expiration: { maxEntries: 16, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    // Изображения/шрифты: CacheFirst
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|ico|webp|woff2?|eot|ttf|otf)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        networkTimeoutSeconds: 3,
      },
    },
    // API: NetworkOnly — никогда не кешируем API-ответы
    {
      urlPattern: /\/api\/.*/,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'api',
      },
    },
    // Внешние ресурсы (Google Fonts, etc.): StaleWhileRevalidate
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'external-fonts',
        expiration: { maxEntries: 8, maxAgeSeconds: 365 * 24 * 60 * 60 },
        networkTimeoutSeconds: 3,
      },
    },
    // Всё остальное: NetworkFirst с таймаутом 5 сек
    {
      urlPattern: /.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'fallback',
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 5,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
};

module.exports = withPWA(nextConfig);
