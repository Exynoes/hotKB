'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'fr' | 'en';
const STORAGE_KEY = 'hotkb:lang';

const dict = {
  fr: {
    tagline:
      "Des courses de dactylographie brûlantes, en temps réel, pour le primaire et le secondaire — pratiquer en s'amusant, un lobby à la fois.",
    tabGuest: 'Invité',
    tabLogin: 'Se connecter',
    tabRegister: 'Créer un compte',
    guestPlaceholder: 'Ton nom affiché',
    usernamePlaceholder: "Nom d'utilisateur",
    passwordPlaceholder: 'Mot de passe',
    submitGuest: 'Jouer en invité',
    submitLogin: 'Se connecter',
    submitRegister: 'Créer mon compte',
    connectedAs: 'Connecté comme',
    guestTag: '(invité)',
    change: 'changer',
    roomCodePlaceholder: 'Code de la salle',
    join: 'Rejoindre',
    createRoom: 'Créer une salle',
    guestCannotCreate: 'Connecte-toi avec un compte pour créer une salle.',
    roomCodeLabel: 'CODE DE LA SALLE',
    leave: 'Quitter',
    host: 'HÔTE',
    you: '(toi)',
    waitingForPlayers: "En attente d'au moins un·e autre joueur·euse pour démarrer...",
    startRace: 'Démarrer la course',
    genericError: 'Connexion au serveur impossible.',
    continueWith: 'Continuer avec',
    orDivider: 'ou',
    oauthFailed: 'La connexion externe a échoué. Réessaie.',
  },
  en: {
    tagline:
      'Blazing-fast real-time typing races for elementary and high-school students — practice while having fun, one lobby at a time.',
    tabGuest: 'Guest',
    tabLogin: 'Log in',
    tabRegister: 'Create account',
    guestPlaceholder: 'Your display name',
    usernamePlaceholder: 'Username',
    passwordPlaceholder: 'Password',
    submitGuest: 'Play as guest',
    submitLogin: 'Log in',
    submitRegister: 'Create my account',
    connectedAs: 'Signed in as',
    guestTag: '(guest)',
    change: 'switch',
    roomCodePlaceholder: 'Room code',
    join: 'Join',
    createRoom: 'Create a room',
    guestCannotCreate: 'Log in with an account to create a room.',
    roomCodeLabel: 'ROOM CODE',
    leave: 'Leave',
    host: 'HOST',
    you: '(you)',
    waitingForPlayers: 'Waiting for at least one more player to start...',
    startRace: 'Start the race',
    genericError: 'Could not reach the server.',
    continueWith: 'Continue with',
    orDivider: 'or',
    oauthFailed: 'External sign-in failed. Please try again.',
  },
} as const;

export type TranslationKey = keyof typeof dict.fr;

const LangContext = createContext<{ lang: Lang; t: (key: TranslationKey) => string; toggle: () => void } | null>(
  null,
);

export function LangProvider({ children }: { children: ReactNode }) {
  // Rendu serveur en français ; la préférence réelle est lue après le montage.
  const [lang, setLang] = useState<Lang>('fr');

  useEffect(() => {
    let preferred: Lang = navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'fr';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fr' || saved === 'en') preferred = saved;
    } catch {
      // ignore
    }
    setLang(preferred);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () => {
    const next: Lang = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // stockage indisponible — la langue reste active pour la session en cours
    }
  };
  const t = (key: TranslationKey) => dict[lang][key];

  return <LangContext.Provider value={{ lang, t, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang doit être utilisé à l'intérieur de <LangProvider>");
  return ctx;
}
