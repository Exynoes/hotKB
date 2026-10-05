const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7 + 5) % 100}%`,
  size: 4 + ((i * 5) % 7),
  delay: `${(i * 0.9) % 8}s`,
  duration: `${7 + ((i * 3) % 6)}s`,
}));

/** Fond décoratif : flammes qui ondulent en bas de page + braises qui montent. */
export default function FlameBackground() {
  return (
    <div className="flame-bg" aria-hidden="true">
      <div className="flame-glow" />
      <div className="flame flame-1" />
      <div className="flame flame-2" />
      <div className="flame flame-3" />
      <div className="flame flame-4" />
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            animationDelay: e.delay,
            animationDuration: e.duration,
          }}
        />
      ))}
    </div>
  );
}
