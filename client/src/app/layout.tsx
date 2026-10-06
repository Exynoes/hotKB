import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'HotKB — Courses de dactylographie',
  description:
    'HotKB : des courses de dactylographie brûlantes en temps réel, pour le primaire et le secondaire.',
  icons: { icon: '/favicon.png' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

/**
 * DES-05 : script exécuté avant le premier rendu pour appliquer le thème (et la
 * langue) choisis — aucun flash du mauvais thème au chargement.
 */
const initScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('hotkb:theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t;var l=localStorage.getItem('hotkb:lang');if(l!=='fr'&&l!=='en'){l=(navigator.language||'fr').toLowerCase().indexOf('en')===0?'en':'fr'}d.lang=l}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
