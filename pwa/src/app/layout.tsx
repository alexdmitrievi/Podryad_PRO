import type { Metadata, Viewport } from 'next';
import { Inter, Manrope, Space_Grotesk } from 'next/font/google';
import DevUnregisterSW from '@/components/DevUnregisterSW';
import NavWrapper from '@/components/NavWrapper';
import SWRecovery from '@/components/SWRecovery';
import ToastProvider from '@/components/ui/Toast';
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

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Подряд PRO',
  description:
    'Закажите работы по дому и участку',
  manifest: '/manifest.json',
  keywords:
    'работа омск, подработка омск, грузчики омск, новосибирск, работа новосибирск, подработка новосибирск, подряд, уборка',
  openGraph: {
    title: 'Подряд PRO',
    description: 'Закажите работы по дому и участку',
    type: 'website',
    url: 'https://podryadpro.ru',
    siteName: 'Подряд PRO',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Подряд PRO',
    description: 'Закажите работы по дому и участку',
  },
  alternates: { canonical: 'https://podryadpro.ru' },
  robots: 'index, follow',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#2F5BFF',
};

const THEME_SCRIPT = `
(function(){try{
  var d=document.documentElement;
  if(localStorage.getItem('theme')==='dark'||(
    !localStorage.getItem('theme')&&window.matchMedia('(prefers-color-scheme:dark)').matches
  )){d.classList.add('dark')}
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <meta name="theme-color" content="#2F5BFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-surface dark:bg-dark-bg text-[#2B2B2B] dark:text-dark-text font-sans antialiased transition-colors duration-300">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-xl focus:text-sm focus:font-semibold">Перейти к контенту</a>
        <DevUnregisterSW />
        <SWRecovery />
        <ToastProvider />
        <NavWrapper>{children}</NavWrapper>
      </body>
    </html>
  );
}
