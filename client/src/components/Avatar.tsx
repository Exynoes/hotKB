'use client';

const COLORS = ['#ff4f1f', '#ffb347', '#ffc825', '#ff7a45', '#e8590c', '#f59f00', '#d9480f', '#ffa94d'];

/** Avatar rond : image de profil si elle existe, sinon initiale sur fond coloré (stable par nom). */
export default function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const style = { width: size, height: size, fontSize: size * 0.45 };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="rounded-full object-cover shrink-0" style={style} />;
  }
  return (
    <span
      aria-hidden="true"
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ ...style, background: COLORS[h % COLORS.length], color: '#2a1206', fontFamily: 'var(--font-display)' }}
    >
      {[...name][0]?.toUpperCase() ?? '?'}
    </span>
  );
}
