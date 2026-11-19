'use client';

import type { ReactNode } from 'react';
import FlameBackground from './FlameBackground';

/** Cadre commun des pages 404 et d'erreur : fond de flammes, logo, titre, texte et actions. */
export default function StatusPage({
  code,
  title,
  text,
  children,
}: {
  code?: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <>
      <FlameBackground />
      <main className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <img src="/logo-192.png" width="96" height="96" alt="Logo HotKB" />
        {code && (
          <p
            aria-hidden="true"
            className="text-7xl font-extrabold leading-none"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-text)' }}
          >
            {code}
          </p>
        )}
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h1>
        <p className="max-w-md" style={{ color: 'var(--muted)' }}>
          {text}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">{children}</div>
      </main>
    </>
  );
}
