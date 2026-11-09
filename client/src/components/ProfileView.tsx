'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from './TopBar';
import FlameBackground from './FlameBackground';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';
import Avatar from './Avatar';
import { apiMessage } from '../lib/api-message';
import { profileApi, type HistoryPage, type ProfileData } from '../lib/api';

const card = { background: 'var(--surface)', border: '1px solid var(--border)' } as const;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={card}>
      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {label}
      </dt>
      <dd className="text-3xl font-extrabold font-mono" style={{ color: 'var(--accent)' }}>
        {value}
      </dd>
    </div>
  );
}

function ProgressChart({ points, label }: { points: { date: string; wpm: number }[]; label: string }) {
  const w = 600;
  const h = 180;
  const pad = 24;
  const max = Math.max(10, ...points.map((p) => p.wpm));
  const x = (i: number) => (points.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (points.length - 1));
  const y = (v: number) => h - pad - (v / max) * (h - 2 * pad);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.wpm)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="w-full">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" />
      <text x={pad} y={14} fontSize="11" fill="var(--muted)">
        {max}
      </text>
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.wpm)} r="4" fill="var(--accent)">
          <title>{`${new Date(p.date).toLocaleDateString()} : ${p.wpm}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Identity({ profile, token, onChange }: { profile: ProfileData; token: string; onChange: (p: ProfileData) => void }) {
  const { t } = useLang();
  const [name, setName] = useState(profile.displayName);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (fn: () => Promise<Partial<ProfileData>>) => {
    try {
      onChange({ ...profile, ...(await fn()) });
      setMsg(t('saved'));
    } catch (e) {
      setMsg(e instanceof Error ? apiMessage(e.message, t) : t('genericError'));
    }
  };
  return (
    <section className="rounded-2xl p-4 flex flex-wrap items-center gap-4" style={card}>
      <Avatar name={profile.displayName} url={profile.avatarUrl} size={72} />
      <div className="flex flex-col gap-2">
        <label className="text-sm underline cursor-pointer">
          {t('changePhoto')}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(async () => ({ avatarUrl: (await profileApi.uploadAvatar(token, f)).avatarUrl }));
            }}
          />
        </label>
        {profile.avatarUrl && (
          <button className="text-sm underline text-left" onClick={() => void run(async () => ({ avatarUrl: (await profileApi.removeAvatar(token)).avatarUrl }))}>
            {t('removePhoto')}
          </button>
        )}
      </div>
      <form
        className="flex items-end gap-2 flex-1 min-w-56"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => ({ displayName: (await profileApi.setDisplayName(token, name)).displayName }));
        }}
      >
        <label className="flex flex-col text-sm flex-1">
          {t('displayName')}
          <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className="rounded-lg px-3 py-2 mt-1" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
        </label>
        <button type="submit" className="rounded-lg px-4 py-2 font-semibold text-white" style={{ background: 'var(--accent-btn)' }}>{t('save')}</button>
      </form>
      {msg && <p role="status" className="text-sm w-full" style={{ color: 'var(--muted)' }}>{msg}</p>}
    </section>
  );
}

export default function ProfileView() {
  const { identity, ready } = useAuth();
  const { t, lang } = useLang();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [history, setHistory] = useState<HistoryPage | null>(null);
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  const token = identity?.kind === 'user' ? identity.token : null;

  useEffect(() => {
    if (!token) return;
    profileApi.profile(token).then(setProfile).catch(() => setFailed(true));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    profileApi.history(token, page).then(setHistory).catch(() => setFailed(true));
  }, [token, page]);

  const totalPages = history ? Math.max(1, Math.ceil(history.total / history.pageSize)) : 1;
  const fmt = (d: string) => new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA');

  return (
    <>
      <FlameBackground />
      <TopBar />
      <main className="min-h-screen max-w-3xl mx-auto px-4 py-16 flex flex-col gap-8">
        <header className="flex items-center gap-4">
          <Link href="/" className="underline underline-offset-2">
            ← {t('backHome')}
          </Link>
        </header>
        <h1 className="text-4xl font-extrabold">{t('profileTitle')}</h1>

        {!ready ? null : !identity ? (
          <p style={{ color: 'var(--muted)' }}>{t('profileLogin')}</p>
        ) : identity.kind === 'guest' ? (
          <p style={{ color: 'var(--muted)' }}>{t('profileGuest')}</p>
        ) : failed ? (
          <p style={{ color: 'var(--danger)' }}>{t('genericError')}</p>
        ) : !profile ? (
          <p style={{ color: 'var(--muted)' }}>{t('loading')}</p>
        ) : (
          <>
            <p className="text-xl font-semibold">{profile.username}</p>
            <Identity profile={profile} token={token!} onChange={setProfile} />
            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Stat label={t('statBest')} value={profile.stats.bestWpm} />
              <Stat label={t('statAvg')} value={profile.stats.avgWpm} />
              <Stat label={t('statAccuracy')} value={`${profile.stats.avgAccuracy}%`} />
              <Stat label={t('statRaces')} value={profile.stats.races} />
              <Stat label={t('statWins')} value={profile.stats.wins} />
            </dl>

            <section className="rounded-2xl p-4" style={card}>
              <h2 className="font-bold mb-2">{t('progressionTitle')}</h2>
              {profile.progression.length === 0 ? (
                <p style={{ color: 'var(--muted)' }}>{t('progressionEmpty')}</p>
              ) : (
                <ProgressChart points={profile.progression} label={t('progressionTitle')} />
              )}
            </section>

            <section className="rounded-2xl p-4 overflow-x-auto" style={card}>
              <h2 className="font-bold mb-2">{t('historyTitle')}</h2>
              {!history || history.items.length === 0 ? (
                <p style={{ color: 'var(--muted)' }}>{t('historyEmpty')}</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ color: 'var(--muted)' }}>
                      <th scope="col">{t('colDate')}</th>
                      <th scope="col">{t('colWpm')}</th>
                      <th scope="col">{t('colAccuracy')}</th>
                      <th scope="col">{t('colRank')}</th>
                      <th scope="col">{t('colErrors')}</th>
                      <th scope="col"><span className="sr-only">{t('seeDetail')}</span></th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {history.items.map((r) => (
                      <tr key={r.raceId}>
                        <td>{fmt(r.startedAt)}</td>
                        <td>{r.wpm}</td>
                        <td>{r.accuracy}%</td>
                        <td>{r.rank}</td>
                        <td>{r.errors}</td>
                        <td><Link href={`/results/${r.raceId}`} className="underline">{t('seeDetail')}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  className="underline underline-offset-2 disabled:opacity-40"
                >
                  {t('prev')}
                </button>
                <span style={{ color: 'var(--muted)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="underline underline-offset-2 disabled:opacity-40"
                >
                  {t('next')}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
