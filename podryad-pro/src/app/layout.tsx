import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Подряд PRO | Работа Омск',
  description: 'Работа и подработка в Омске. Найдите грузчиков, строителей, уборщиков за минуты. Telegram-бот + PWA.',
  keywords: 'работа омск, подработка омск, грузчики омск, подряд, исполнители',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'Подряд PRO | Работа Омск',
    description: 'Найдите исполнителей или заказы за минуты',
    url: 'https://podryad.pro',
    siteName: 'Подряд PRO',
    locale: 'ru_RU',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0088cc',
  width: 'device-width',
  initialScale: 1,
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
