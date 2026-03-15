import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Подряд PRO | Работа Омск',
  description: 'Платформа для поиска работы и подработки в Омске. Грузчики, уборка, строительство.',
  manifest: '/manifest.json',
  keywords: 'работа омск, подработка омск, грузчики омск, подряд',
  openGraph: {
    title: 'Подряд PRO | Работа Омск',
    description: 'Платформа для поиска работы и подработки в Омске',
    type: 'website',
    url: 'https://podryad.pro',
    siteName: 'Подряд PRO',
  },
  robots: 'index, follow',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0088cc',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
