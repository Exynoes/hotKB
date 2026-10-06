import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

/** UI-3 (thème clair/sombre) et I18N-1 (bascule FR/EN). */
export default function TopBar() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();

  return (
    <div className="fixed top-4 right-4 flex gap-2">
      <button
        onClick={toggleLang}
        aria-label="Changer de langue / Switch language"
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono font-bold"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
      >
        {lang === 'fr' ? 'EN' : 'FR'}
      </button>
      <button
        onClick={toggleTheme}
        aria-label="Changer de thème / Toggle theme"
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  );
}
