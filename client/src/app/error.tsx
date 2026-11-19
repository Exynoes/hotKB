'use client';

import Link from 'next/link';
import StatusPage from '../components/StatusPage';
import { useLang } from '../lib/i18n';

/** Page d'erreur inattendue : on propose de réessayer ou de revenir à l'accueil. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();
  return (
    <StatusPage title={t('errorTitle')} text={t('errorText')}>
      <button
        onClick={reset}
        className="rounded-xl px-5 py-3 font-bold text-white"
        style={{ background: 'var(--accent-btn)' }}
      >
        {t('retry')}
      </button>
      <Link
        href="/"
        className="rounded-xl px-5 py-3 font-bold"
        style={{ border: '2px solid var(--border)', background: 'var(--surface)' }}
      >
        {t('goHome')}
      </Link>
    </StatusPage>
  );
}
