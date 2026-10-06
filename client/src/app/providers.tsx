'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import { LangProvider } from '../lib/i18n';
import { ThemeProvider } from '../lib/theme';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>{children}</AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
