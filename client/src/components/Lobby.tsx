'use client';

import type { LobbyState } from '../lib/room-types';
import { useLang } from '../lib/i18n';

export default function Lobby({
  room,
  myId,
  onStart,
  onLeave,
}: {
  room: LobbyState;
  myId: string | null;
  onStart: () => void;
  onLeave: () => void;
}) {
  const isHost = room.participants.some((p) => p.id === myId && p.isHost);
  const { t } = useLang();

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('roomCodeLabel')}
          </p>
          <p className="text-3xl font-mono font-bold tracking-[0.2em]">{room.code}</p>
        </div>
        <button onClick={onLeave} className="text-sm underline underline-offset-2">
          {t('leave')}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {room.participants.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'var(--bg)' }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              {i + 1}
            </span>
            <span className="font-semibold flex-1 text-left">
              {p.displayName}
              {p.id === myId && ` ${t('you')}`}
            </span>
            {p.isHost && (
              <span
                className="text-xs font-mono rounded-full px-2 py-1"
                style={{ background: 'var(--accent-2)', color: '#2a1206' }}
              >
                {t('host')}
              </span>
            )}
          </li>
        ))}
      </ul>

      {room.participants.length < 2 && (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {t('waitingForPlayers')}
        </p>
      )}

      {isHost && (
        <button
          onClick={onStart}
          disabled={room.participants.length < 2}
          className="rounded-xl py-3 font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {t('startRace')}
        </button>
      )}
    </div>
  );
}
