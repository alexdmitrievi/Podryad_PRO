const SW_VERSION = '11';

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
      // NetworkOnly для всего — прозрачный прокси, ничего не кешируем
      {
        urlPattern: /.*/,
        handler: 'NetworkOnly',
        options: {
          cacheName: `passthrough-${SW_VERSION}`,
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
