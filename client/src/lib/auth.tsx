import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { socket } from './socket';

interface Identity {
  token: string;
  kind: 'user' | 'guest';
  displayName: string;
}

interface AuthContextValue {
  oauthError: boolean;
  identity: Identity | null;
  setIdentity: (identity: Identity | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'hotkb:identity';

/** Lit le fragment laissé par le retour OAuth (#token=...&name=... ou #oauth_error=...). */
function readOAuthFragment(): { identity: Identity | null; error: boolean } {
  if (typeof window === 'undefined' || !window.location.hash) return { identity: null, error: false };
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('token');
  const name = params.get('name');
  const error = params.has('oauth_error');
  if (token || error) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return { identity: token && name ? { token, kind: 'user', displayName: name } : null, error };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fragment] = useState(readOAuthFragment);
  const [identity, setIdentityState] = useState<Identity | null>(() => {
    if (fragment.identity) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fragment.identity));
      } catch {
        // stockage indisponible — on garde l'identité en mémoire
      }
      return fragment.identity;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Identity) : null;
    } catch {
      return null;
    }
  });

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
    () => ({ identity, setIdentity, logout, oauthError: fragment.error }),
    [identity, setIdentity, logout, fragment.error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  return ctx;
}
