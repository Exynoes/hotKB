/** Générateur pseudo-aléatoire à graine (mulberry32) : même graine, même suite — BOT-05. */
export interface Rng {
  (): number;
  int(min: number, max: number): number;
  pick<T>(list: readonly T[]): T;
  shuffle<T>(list: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = next as Rng;
  rng.int = (min, max) => min + Math.floor(next() * (max - min + 1));
  rng.pick = (list) => list[Math.floor(next() * list.length)];
  rng.shuffle = (list) => {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  return rng;
}

/** Graine à partir d'une chaîne (identifiant de course, par exemple). */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
