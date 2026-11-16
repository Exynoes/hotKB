import type { CSSProperties } from 'react';

type Props = {
  /** Vitesse actuelle (mots par minute), donnée par le serveur. */
  wpm: number;
  /** Change à chaque bonne lettre : relance l'étincelle. */
  sparkKey: number;
  /** Change à chaque faute : relance le nuage de fumée. */
  smokeKey: number;
  /** Série de lettres justes assez longue : la flamme « s'enflamme ». */
  fire: boolean;
  label: string;
};

/**
 * Flamme de vitesse (purement décorative) : elle grandit avec les MPM, lance une étincelle à chaque
 * bonne lettre, un petit nuage de fumée à chaque faute, et brille quand la série est « en feu ».
 */
export default function FireMeter({ wpm, sparkKey, smokeKey, fire, label }: Props) {
  // 0 MPM : petite braise (0,55) ; 100 MPM et plus : grande flamme (1,5)
  const level = Math.min(Math.max(wpm, 0), 100) / 100;
  const scale = 0.55 + level * 0.95;
  return (
    <div className={`fire-meter${fire ? ' is-fire' : ''}`} aria-hidden="true" data-testid="fire-meter">
      {fire && <span className="fire-label">{label}</span>}
      <div className="fire-stage">
        <svg viewBox="0 0 40 56" className="fire-flame" style={{ '--scale': scale } as CSSProperties}>
          <path
            className="fire-outer"
            d="M20 2 C22 14 36 22 36 38 C36 49 28 54 20 54 C12 54 4 49 4 38 C4 28 11 24 14 14 C16 20 18 20 20 2 Z"
          />
          <path
            className="fire-inner"
            d="M20 24 C21 32 29 35 29 42 C29 48 25 51 20 51 C15 51 11 48 11 42 C11 36 18 32 20 24 Z"
          />
        </svg>
        {sparkKey > 0 && (
          <span
            key={`s${sparkKey}`}
            className="fire-spark"
            style={{ '--dx': `${((sparkKey * 37) % 40) - 20}px` } as CSSProperties}
          />
        )}
        {smokeKey > 0 && <span key={`m${smokeKey}`} className="fire-smoke" />}
      </div>
    </div>
  );
}
