import type { CSSProperties } from 'react';
import { FLAME_SHAPES } from './flameShapes';

const EMBERS = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 11 + 3) % 100}%`,
  size: 3 + ((i * 5) % 8),
  delay: `${-((i * 0.9) % 9)}s`,
  duration: `${6 + ((i * 3) % 7)}s`,
  sway: `${((i % 2 === 0 ? 1 : -1) * (14 + ((i * 7) % 40)))}px`,
}));

/** Flammes au bas de la page : position, forme (0 à 3), hauteur en vh, rythme et dégradé de chacune. */
const TONGUES = [
  { left: '-3%', shape: 0, height: 34, duration: 2.6, delay: 0, grad: 'a' },
  { left: '8%', shape: 2, height: 22, duration: 2.1, delay: -0.8, grad: 'b' },
  { left: '17%', shape: 1, height: 38, duration: 3.1, delay: -1.4, grad: 'a' },
  { left: '30%', shape: 3, height: 26, duration: 2.3, delay: -0.3, grad: 'b' },
  { left: '40%', shape: 0, height: 42, duration: 2.9, delay: -2, grad: 'a' },
  { left: '53%', shape: 2, height: 24, duration: 2.2, delay: -1.1, grad: 'b' },
  { left: '62%', shape: 3, height: 36, duration: 3.3, delay: -0.6, grad: 'a' },
  { left: '75%', shape: 1, height: 25, duration: 2.4, delay: -1.7, grad: 'b' },
  { left: '84%', shape: 0, height: 40, duration: 2.8, delay: -0.2, grad: 'a' },
  { left: '95%', shape: 3, height: 28, duration: 2.5, delay: -1.2, grad: 'b' },
];

/**
 * Fond décoratif : flammes plates qui dansent en bas de page, grosses taches de lumière qui ondulent
 * et braises qui montent en se balançant. Tout s'arrête avec « réduire les animations ».
 */
export default function FlameBackground() {
  return (
    <div className="flame-bg" aria-hidden="true">
      {/* dégradés partagés par les flammes, aux couleurs de la palette (clair et sombre) */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="hk-flame-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--success)' }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
          </linearGradient>
          <linearGradient id="hk-flame-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--accent-2)' }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="flame-glow" />
      <div className="flame flame-1" />
      <div className="flame flame-2" />
      <div className="flame flame-3" />
      <div className="flame flame-4" />
      {TONGUES.map((f, i) => {
        const shape = FLAME_SHAPES[f.shape];
        return (
          <svg
            key={i}
            className="tongue"
            viewBox={`0 0 ${shape.w} 100`}
            style={
              {
                left: f.left,
                height: `${f.height}vh`,
                width: `${(f.height * shape.w) / 100}vh`,
                animationDuration: `${f.duration}s`,
                animationDelay: `${f.delay}s`,
              } as CSSProperties
            }
          >
            <path d={shape.d} fillRule="evenodd" fill={`url(#hk-flame-${f.grad})`} />
          </svg>
        );
      })}
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
