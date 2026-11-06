'use client';

import { useLang } from '../lib/i18n';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="relative z-10 text-center text-sm py-6" style={{ color: 'var(--muted)' }}>
      HotKB · {t('footerNote')} ·{' '}
      <a href="https://github.com/Exynoes/hotKB" className="underline underline-offset-2">GitHub</a>
    </footer>
  );
}
