import type { CSSProperties } from 'react';

const EMBERS = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 11 + 3) % 100}%`,
  size: 3 + ((i * 5) % 8),
  delay: `${-((i * 0.9) % 9)}s`,
  duration: `${6 + ((i * 3) % 7)}s`,
  sway: `${((i % 2 === 0 ? 1 : -1) * (14 + ((i * 7) % 40)))}px`,
}));

/** Langues de flamme au bas de la page : position, taille, rythme et couleur de chacune. */
const TONGUES = [
  { left: '-3%', width: 15, height: 34, duration: 2.6, delay: 0, color: 'var(--accent)' },
  { left: '8%', width: 11, height: 24, duration: 2.1, delay: -0.8, color: 'var(--accent-2)' },
  { left: '17%', width: 16, height: 38, duration: 3.1, delay: -1.4, color: 'var(--accent)' },
  { left: '30%', width: 12, height: 27, duration: 2.3, delay: -0.3, color: 'var(--success)' },
  { left: '40%', width: 17, height: 42, duration: 2.9, delay: -2, color: 'var(--accent)' },
  { left: '53%', width: 12, height: 26, duration: 2.2, delay: -1.1, color: 'var(--accent-2)' },
  { left: '62%', width: 16, height: 36, duration: 3.3, delay: -0.6, color: 'var(--accent)' },
  { left: '75%', width: 11, height: 25, duration: 2.4, delay: -1.7, color: 'var(--success)' },
  { left: '84%', width: 16, height: 40, duration: 2.8, delay: -0.2, color: 'var(--accent)' },
  { left: '95%', width: 12, height: 28, duration: 2.5, delay: -1.2, color: 'var(--accent-2)' },
];

/**
 * Fond décoratif : langues de flamme qui dansent en bas de page, grosses taches de lumière qui ondulent
 * et braises qui montent en se balançant. Tout s'arrête avec « réduire les animations ».
 */
export default function FlameBackground() {
  return (
    <div className="flame-bg" aria-hidden="true">
      <div className="flame-glow" />
      <div className="flame flame-1" />
      <div className="flame flame-2" />
      <div className="flame flame-3" />
      <div className="flame flame-4" />
      {TONGUES.map((f, i) => (
        <svg
          key={i}
          className="tongue"
          viewBox="0 0 40 80"
          preserveAspectRatio="none"
          style={
            {
              left: f.left,
              width: `${f.width}vw`,
              height: `${f.height}vh`,
              color: f.color,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
            } as CSSProperties
          }
        >
          <path d="M20 0 C23 18 38 30 38 52 C38 68 30 80 20 80 C10 80 2 68 2 52 C2 38 12 32 14 18 C16 24 18 22 20 0 Z" />
        </svg>
      ))}
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              animationDelay: e.delay,
              animationDuration: e.duration,
              '--sway': e.sway,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
