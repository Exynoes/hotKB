'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthPanel from './AuthPanel';
import FlameBackground from './FlameBackground';
import TopBar from './TopBar';
import { useAuth } from '../lib/auth';
import { useLang, type TranslationKey } from '../lib/i18n';
import { useRoom } from '../lib/useRoom';

/** JOIN-04 : arrivée par lien d'invitation. Un invité peut entrer en choisissant simplement un nom. */
export default function JoinView({ token }: { token: string }) {
  const { identity, ready } = useAuth();
  const { t } = useLang();
  const rm = useRoom();
  const router = useRouter();

  useEffect(() => {
    if (rm.room) router.replace('/');
  }, [rm.room, router]);

  return (
    <>
      <FlameBackground />
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <TopBar />
        <h1 className="text-4xl font-extrabold">{t('joinTitle')}</h1>
        <p style={{ color: 'var(--muted)' }}>{t('joinWithLink')}</p>
        {!ready ? null : !identity ? (
          <AuthPanel />
        ) : (
          <button onClick={() => rm.joinWithToken(token)} className="rounded-2xl px-6 py-4 text-xl font-extrabold text-white" style={{ background: 'var(--accent)' }}>
            {t('joinNow')}
          </button>
        )}
        {rm.error && <p role="alert" style={{ color: 'var(--danger)' }}>{t(`err_${rm.error}` as TranslationKey)}</p>}
      </main>
    </>
  );
}
