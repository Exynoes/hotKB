'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'hotkb:theme';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Valeur initiale neutre (rendu serveur) ; le vrai thème est déjà appliqué sur <html>
  // par le script d'initialisation du layout (aucun flash), on le relit après le montage.
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const applied = document.documentElement.dataset.theme;
    setTheme(applied === 'dark' ? 'dark' : systemPrefersDark() ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // stockage indisponible — le thème reste actif pour la session en cours
    }
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé à l\'intérieur de <ThemeProvider>');
  return ctx;
}
