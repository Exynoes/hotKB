import { useState } from 'react';
import AuthPanel from '../components/AuthPanel';
import { useAuth } from '../lib/auth';

export default function Home() {
  const [code, setCode] = useState('');
  const { identity, logout } = useAuth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <svg width="72" height="72" viewBox="0 0 220 220" aria-hidden="true">
          <path
            d="M110 18 C85 42 78 62 92 78 C80 66 78 92 95 104 C90 118 100 128 112 122 C106 112 116 106 120 96 C128 110 126 128 112 140 C132 136 150 118 146 96 C158 108 160 128 146 146 C172 134 182 104 166 76 C160 90 156 82 158 68 C150 84 136 84 132 70 C140 60 138 42 122 24 C126 40 118 46 110 40 C114 32 114 24 110 18 Z M78 150 C70 170 78 188 96 196 C150 210 184 198 190 172 C194 154 182 140 166 146 C172 160 164 176 146 180 C160 168 154 152 140 150 C132 164 116 168 104 158 C96 168 82 164 78 150 Z"
            fill="var(--accent)"
          />
        </svg>
        <h1 className="text-5xl font-extrabold">
          Hot<span style={{ color: 'var(--accent)' }}>KB</span>
        </h1>
        <p className="max-w-md" style={{ color: 'var(--muted)' }}>
          Des courses de dactylographie brûlantes, en temps réel, pour le primaire et
          le secondaire — pratiquer en s'amusant, un lobby à la fois.
        </p>
      </div>

      {!identity ? (
        <AuthPanel />
      ) : (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <p style={{ color: 'var(--muted)' }}>
            Connecté comme <b style={{ color: 'var(--fg)' }}>{identity.displayName}</b>
            {identity.kind === 'guest' && ' (invité)'} ·{' '}
            <button onClick={logout} className="underline underline-offset-2">
              changer
            </button>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code de la salle"
              maxLength={6}
              className="flex-1 rounded-xl border px-4 py-3 text-center font-mono uppercase tracking-widest"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                color: 'var(--fg)',
              }}
            />
            <button
              className="rounded-xl px-5 py-3 font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Rejoindre
            </button>
          </div>

          <button
            className="rounded-full px-6 py-2 font-semibold"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            Créer une salle
          </button>
        </div>
      )}
    </main>
  );
}
