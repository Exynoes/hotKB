import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';

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
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}
