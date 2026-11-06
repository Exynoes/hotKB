'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import FlameBackground from './FlameBackground';
import ResultsView from './ResultsView';
import TopBar from './TopBar';
import { racesApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';
import type { RaceResults } from '../lib/room-types';

/** HIST-02 : revoir les résultats détaillés d'une course passée. */
export default function ResultsPage({ raceId }: { raceId: string }) {
  const { identity, ready } = useAuth();
  const { t } = useLang();
  const [data, setData] = useState<RaceResults | null>(null);
  const [missing, setMissing] = useState(false);
  const token = identity?.token ?? null;

  useEffect(() => {
    if (!token) return;
    racesApi.get(token, raceId).then(setData).catch(() => setMissing(true));
  }, [token, raceId]);

  return (
    <>
      <FlameBackground />
      <main className="min-h-screen flex flex-col items-center gap-6 px-4 py-16">
        <TopBar />
        <Link href="/profile" className="underline underline-offset-2 self-start sm:self-center">{t('myProfile')}</Link>
        {!ready ? null : !identity || missing ? (
          <p>{t('notFound')}</p>
        ) : data ? (
          <>
            <ResultsView results={data} />
            <section className="w-full max-w-3xl text-left">
              <h3 className="font-semibold mb-1">{t('raceText')}</h3>
              <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>{data.text}</p>
            </section>
          </>
        ) : (
          <p>{t('loading')}</p>
        )}
      </main>
    </>
  );
}
