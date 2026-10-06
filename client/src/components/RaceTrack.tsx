import type { CSSProperties } from 'react';

/**
 * Élément signature (DES-04) : la piste de progression. Version décorative de la
 * page d'accueil — trois coureurs qui se dépassent, avec une traînée de flamme.
 * Inspirée de TypeRacer ; la piste « réelle » viendra avec la course.
 */
const RUNNERS = [
  { name: 'Léa', wpm: 74, initial: 'L', color: 'var(--accent)', duration: '7s', delay: '0s', rest: '70%' },
  { name: 'Noé', wpm: 68, initial: 'N', color: 'var(--accent-2)', duration: '8.5s', delay: '-2s', rest: '55%' },
  { name: 'Zoé', wpm: 61, initial: 'Z', color: 'var(--success)', duration: '9.5s', delay: '-4s', rest: '40%' },
];

export default function RaceTrack() {
  return (
    <div className="race-track" aria-hidden="true">
      {RUNNERS.map((r) => (
        <div className="lane" key={r.name}>
          <span className="lane-label">
            {r.name} · {r.wpm} MPM
          </span>
          <span className="finish" />
          <span
            className="runner"
            style={
              {
                '--runner': r.color,
                '--rest': r.rest,
                animationDuration: r.duration,
                animationDelay: r.delay,
              } as CSSProperties
            }
          >
            <span className="trail" />
            <span className="avatar">{r.initial}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
