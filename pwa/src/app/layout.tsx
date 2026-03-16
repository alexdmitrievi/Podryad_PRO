import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Подряд PRO | Работа и подработка в Омске',
  description: 'Платформа для поиска работы и подработки в Омске. Грузчики, уборка, строительство — быстро и надёжно.',
  manifest: '/manifest.json',
  keywords: 'работа омск, подработка омск, грузчики омск, подряд, уборка',
  openGraph: {
    title: 'Подряд PRO | Работа и подработка в Омске',
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
  themeColor: '#2F5BFF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-surface text-[#2B2B2B] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
