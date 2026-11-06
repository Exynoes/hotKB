'use client';

import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import type { ExplorerRoom, RoomAck } from '../lib/room-types';
import { useLang, type TranslationKey } from '../lib/i18n';

/** JOIN-02 : salles publiques, mises à jour en direct tant que la liste est affichée. */
export default function Explorer({ onJoin }: { onJoin: (code: string) => void }) {
  const { t } = useLang();
  const [rooms, setRooms] = useState<ExplorerRoom[]>([]);

  useEffect(() => {
    const onList = (l: ExplorerRoom[]) => setRooms(l);
    const subscribe = () => socket.emit('explorer:subscribe', (res: RoomAck) => res.ok && res.rooms && setRooms(res.rooms));
    socket.on('explorer:list', onList);
    socket.on('connect', subscribe);
    if (socket.connected) subscribe();
    return () => {
      socket.off('explorer:list', onList);
      socket.off('connect', subscribe);
      socket.emit('explorer:unsubscribe');
    };
  }, []);

  return (
    <section className="w-full text-left">
      <h2 className="font-semibold mb-2">{t('explorer')}</h2>
      {rooms.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('explorerEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rooms.map((r) => (
            <li key={r.code} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--bg)' }}>
              <span className="font-mono font-bold">{r.code}</span>
              <span className="flex-1 truncate">
                {r.hostName} · {r.count}/{r.capacity} {t('players')} · {r.language.toUpperCase()} · {t(r.complexity as TranslationKey)}
                {r.status !== 'en_attente' && ` · ${t('inProgress')}`}
              </span>
              <button aria-label={`${t("join_")} ${r.code}`} disabled={!r.joinable} onClick={() => onJoin(r.code)} className="underline font-semibold disabled:opacity-40 disabled:no-underline">
                {r.joinable ? t('join_') : t('roomFull_')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
