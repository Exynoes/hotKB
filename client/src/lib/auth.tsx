'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { socket } from './socket';

interface Identity {
  token: string;
  kind: 'user' | 'guest';
  displayName: string;
}

interface AuthContextValue {
  oauthError: boolean;
  /** false tant que l'identité enregistrée n'a pas été relue (évite un flash au chargement). */
  ready: boolean;
  identity: Identity | null;
  setIdentity: (identity: Identity | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'hotkb:identity';

/** Lit le fragment laissé par le retour OAuth (#token=...&name=... ou #oauth_error=...). */
function readOAuthFragment(): { identity: Identity | null; error: boolean } {
  if (!window.location.hash) return { identity: null, error: false };
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('token');
  const name = params.get('name');
  const error = params.has('oauth_error');
  if (token || error) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return { identity: token && name ? { token, kind: 'user', displayName: name } : null, error };
}

function loadStored(): Identity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);
  const [oauthError, setOauthError] = useState(false);

  const setIdentity = useCallback((next: Identity | null) => {
    setIdentityState(next);
    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // stockage indisponible (navigation privée) — on continue sans persister
    }
  }, []);

  // Après le montage : retour OAuth éventuel, sinon identité enregistrée.
  useEffect(() => {
    const fragment = readOAuthFragment();
    if (fragment.error) setOauthError(true);
    if (fragment.identity) {
      setIdentity(fragment.identity);
    } else {
      setIdentityState(loadStored());
    }
    setReady(true);
  }, [setIdentity]);

  const logout = useCallback(() => setIdentity(null), [setIdentity]);

  useEffect(() => {
    if (identity) {
      socket.auth = { token: identity.token };
      socket.connect();
    } else {
      socket.disconnect();
    }
    return () => {
      socket.disconnect();
    };
  }, [identity]);

  const value = useMemo(
    () => ({ identity, ready, setIdentity, logout, oauthError }),
    [identity, ready, setIdentity, logout, oauthError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  return ctx;
}
