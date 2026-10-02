import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { socket } from './socket';

interface Identity {
  token: string;
  kind: 'user' | 'guest';
  displayName: string;
}

interface AuthContextValue {
  identity: Identity | null;
  setIdentity: (identity: Identity | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'hotkb:identity';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<Identity | null>(() => {
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

  const value = useMemo(() => ({ identity, setIdentity, logout }), [identity, setIdentity, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  return ctx;
}
