'use client';

import type { Member, Tick } from '../lib/room-types';
import { useLang } from '../lib/i18n';
import Avatar from './Avatar';

/** Piste de course en direct (élément signature, DES-04) : une voie par coureur, mise à jour ~5 fois/s. */
export default function LiveTrack({ members, tick, myId }: { members: Member[]; tick: Tick | null; myId: string | null }) {
  const { t } = useLang();
  const runners = members.filter((m) => m.role === 'player' || m.kind === 'bot');
  return (
    <ol className="flex flex-col gap-2 w-full" aria-label="Piste">
      {runners.map((m) => {
        const p = tick?.players.find((x) => x.id === m.id);
        const pct = Math.round((p?.p ?? 0) * 100);
        const fog = (p?.fog ?? 0) > 0;
        return (
          <li key={m.id} className="flex items-center gap-3" data-testid="lane">
            <span className="w-28 sm:w-36 truncate text-sm font-semibold text-left">
              {m.name}
              {m.id === myId && <span style={{ color: 'var(--muted)' }}> ({t('you_')})</span>}
            </span>
            <div
              className="lane flex-1"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label={m.name}
            >
              <div className="finish" />
              <div
                className="absolute top-1/2"
                style={{
                  left: `calc(${pct} * (100% - 2.2rem) / 100 + 0.15rem)`,
                  transform: 'translateY(-50%)',
                  transition: 'left 200ms linear',
                }}
              >
                <Avatar name={m.name} url={m.avatarUrl} size={30} />
                {fog && <span className="sr-only">{t('fogOn')}</span>}
              </div>
            </div>
            <span className="w-24 text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
              {pct}% · {Math.round(p?.wpm ?? 0)} {t('colWpm')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
