'use client';

import type { RaceResults, ResultPlayer } from '../lib/room-types';
import { useLang } from '../lib/i18n';
import Avatar from './Avatar';

const ROWS = ['azertyuiop', 'qsdfghjklm', 'wxcvbn'];
const PALETTE = ['#ff4f1f', '#2f9e44', '#1c7ed6', '#9c36b5', '#f08c00', '#0c8599'];

function statusKey(s: ResultPlayer['status']) {
  return s === 'termine' ? 'statusTermine' : s === 'abandon' ? 'statusAbandon' : s === 'temps_ecoule' ? 'statusTemps' : 'statusEnCourse';
}

/** RES-03 : MPM de chaque coureur au fil du temps (SVG, sans bibliothèque). */
function WpmChart({ players, label }: { players: ResultPlayer[]; label: string }) {
  const W = 560, H = 200, P = 28;
  const pts = players.filter((p) => p.series.length > 0);
  if (pts.length === 0) return null;
  const maxT = Math.max(...pts.flatMap((p) => p.series.map((s) => s.t)), 1);
  const maxW = Math.max(...pts.flatMap((p) => p.series.map((s) => s.wpm)), 10);
  const x = (t: number) => P + (t / maxT) * (W - P * 1.5);
  const y = (w: number) => H - P - (w / maxW) * (H - P * 1.5);
  return (
    <figure className="w-full">
      <figcaption className="font-semibold mb-1">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        <line x1={P} y1={H - P} x2={W - P / 2} y2={H - P} stroke="var(--border)" />
        <line x1={P} y1={P / 2} x2={P} y2={H - P} stroke="var(--border)" />
        <text x={P - 4} y={P / 2 + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(maxW)}</text>
        <text x={W - P / 2} y={H - 8} textAnchor="end" fontSize="10" fill="var(--muted)">{maxT}s</text>
        {pts.map((p, i) => (
          <polyline
            key={p.id}
            fill="none"
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth="2"
            strokeDasharray={i >= 1 ? `${(i % 3) * 3 + 1} ${(i % 3) * 2 + 2}` : undefined}
            points={p.series.map((s) => `${x(s.t)},${y(s.wpm)}`).join(' ')}
          />
        ))}
      </svg>
      <ul className="flex flex-wrap gap-3 text-xs">
        {pts.map((p, i) => (
          <li key={p.id} className="flex items-center gap-1">
            <span className="inline-block w-3 h-1" style={{ background: PALETTE[i % PALETTE.length] }} />
            {p.name}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** RES-05 : touches les plus ratées, sur un clavier AZERTY. */
function KeyHeat({ errors, title, empty }: { errors: Record<string, number>; title: string; empty: string }) {
  const lower: Record<string, number> = {};
  for (const [k, v] of Object.entries(errors)) lower[k.toLowerCase()] = (lower[k.toLowerCase()] ?? 0) + v;
  const max = Math.max(0, ...Object.values(lower));
  return (
    <section className="w-full">
      <h3 className="font-semibold mb-2">{title}</h3>
      {max === 0 ? (
        <p style={{ color: 'var(--muted)' }}>{empty}</p>
      ) : (
        <div className="flex flex-col items-center gap-1" role="img" aria-label={title}>
          {ROWS.map((row) => (
            <div key={row} className="flex gap-1">
              {[...row].map((k) => {
                const n = lower[k] ?? 0;
                return (
                  <span
                    key={k}
                    title={n ? `${k}: ${n}` : k}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono"
                    style={{
                      background: n ? `color-mix(in srgb, var(--accent) ${20 + (n / max) * 70}%, var(--surface))` : 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                    }}
                  >
                    {k}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ResultsView({
  results,
  myId,
  myUserId,
}: {
  results: RaceResults;
  myId?: string | null;
  myUserId?: string | null;
}) {
  const { t } = useLang();
  const players = [...results.players].sort((a, b) => a.rank - b.rank);
  const mine = players.find((p) => p.id === myId || (myUserId && p.userId === myUserId));
  const podium = players.slice(0, 3);

  return (
    <div className="w-full max-w-3xl flex flex-col gap-6">
      <h2 className="text-3xl font-extrabold">{t('results')}</h2>

      <ol className="flex items-end justify-center gap-3" aria-label={t('podium')}>
        {[podium[1], podium[0], podium[2]].map((p, i) =>
          p ? (
            <li key={p.id} className="flex flex-col items-center gap-1" style={{ minWidth: 90 }}>
              <Avatar name={p.name} url={p.avatarUrl} size={i === 1 ? 56 : 44} />
              <span className="text-sm font-semibold truncate max-w-28">{p.name}</span>
              <span className="font-mono text-xs">{p.wpm} {t('colWpm')}</span>
              <span
                className="w-full rounded-t-lg flex items-center justify-center font-extrabold text-xl"
                style={{ height: i === 1 ? 80 : i === 0 ? 56 : 40, background: i === 1 ? 'var(--accent)' : 'var(--accent-2)', color: '#2a1206' }}
              >
                {p.rank}
              </span>
            </li>
          ) : null,
        )}
      </ol>

      {mine?.personalRecord && (
        <p role="status" className="text-center font-bold rounded-xl py-2" style={{ background: 'var(--success)', color: '#2a1206' }}>
          {t('personalRecord')} !
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th className="py-2">{t('rank')}</th>
              <th>{t('player_')}</th>
              <th>{t('colWpm')}</th>
              <th>{t('raw')}</th>
              <th>{t('colAccuracy')}</th>
              <th>{t('colErrors')}</th>
              <th>{t('time')}</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--border)', fontWeight: p === mine ? 700 : 400 }}>
                <td className="py-2">{p.rank}</td>
                <td>
                  <span className="flex items-center gap-2">
                    <Avatar name={p.name} url={p.avatarUrl} size={22} />
                    {p.name}
                    {p.status !== 'termine' && <em style={{ color: 'var(--muted)' }}>({t(statusKey(p.status))})</em>}
                  </span>
                </td>
                <td className="font-mono">{p.wpm}</td>
                <td className="font-mono">{p.rawWpm}</td>
                <td className="font-mono">{p.accuracy}%</td>
                <td className="font-mono">{p.errors}</td>
                <td className="font-mono">{p.timeMs ? `${(p.timeMs / 1000).toFixed(1)} s` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <WpmChart players={players} label={t('wpmOverTime')} />
      <KeyHeat errors={(mine ?? players[0])?.keyErrors ?? {}} title={t('keyErrors')} empty={t('keyErrorsEmpty')} />
    </div>
  );
}
