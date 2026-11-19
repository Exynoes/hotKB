'use client';

import { useLang } from '../lib/i18n';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="relative z-10 flex justify-center py-6 px-4">
      {/* pastille à fond uni : le texte reste lisible par-dessus les flammes du fond (WCAG AA) */}
      <p
        className="rounded-xl px-4 py-2 text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
      >
        HotKB · {t('footerNote')} ·{' '}
        <a href="https://github.com/Exynoes/hotKB" className="underline underline-offset-2" style={{ color: 'var(--fg)' }}>GitHub</a>
      </p>
    </footer>
  );
}
