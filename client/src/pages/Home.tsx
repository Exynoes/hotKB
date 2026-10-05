import { useState } from 'react';
import AuthPanel from '../components/AuthPanel';
import Lobby from '../components/Lobby';
import TopBar from '../components/TopBar';
import { useAuth } from '../lib/auth';
import { useRoom } from '../lib/useRoom';
import { useLang } from '../lib/i18n';

export default function Home() {
  const [code, setCode] = useState('');
  const { identity, logout } = useAuth();
  const { room, myId, error, createRoom, joinRoom, startRace, leaveRoom } = useRoom();
  const { t } = useLang();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <TopBar />
      <div className="flex flex-col items-center gap-2">
        <img src="/logo.png" width="96" height="96" alt="Logo HotKB" />
        <h1 className="text-5xl font-extrabold">
          Hot<span style={{ color: 'var(--accent)' }}>KB</span>
        </h1>
        <p className="max-w-md" style={{ color: 'var(--muted)' }}>
          {t('tagline')}
        </p>
      </div>

      {!identity ? (
        <AuthPanel />
      ) : room ? (
        <Lobby room={room} myId={myId} onStart={startRace} onLeave={leaveRoom} />
      ) : (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <p style={{ color: 'var(--muted)' }}>
            {t('connectedAs')} <b style={{ color: 'var(--fg)' }}>{identity.displayName}</b>
            {identity.kind === 'guest' && ` ${t('guestTag')}`} ·{' '}
            <button onClick={logout} className="underline underline-offset-2">
              {t('change')}
            </button>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('roomCodePlaceholder')}
              maxLength={6}
              className="flex-1 rounded-xl border px-4 py-3 text-center font-mono uppercase tracking-widest"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                color: 'var(--fg)',
              }}
            />
            <button
              onClick={() => code && joinRoom(code)}
              className="rounded-xl px-5 py-3 font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              {t('join')}
            </button>
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}

          <button
            onClick={createRoom}
            className="rounded-full px-6 py-2 font-semibold"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {t('createRoom')}
          </button>
        </div>
      )}
    </main>
  );
}
