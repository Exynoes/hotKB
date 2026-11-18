'use client';

import Link from 'next/link';
import StatusPage from '../components/StatusPage';
import { useLang } from '../lib/i18n';

/** Page 404 aux couleurs du site (remplace la page blanche par défaut de Next.js). */
export default function NotFound() {
  const { t } = useLang();
  return (
    <StatusPage code="404" title={t('notFoundTitle')} text={t('notFoundText')}>
      <Link
        href="/"
        className="rounded-xl px-5 py-3 font-bold text-white"
        style={{ background: 'var(--accent-btn)' }}
      >
        {t('goHome')}
      </Link>
    </StatusPage>
  );
}
