import { useState, type FormEvent } from 'react';
import { authApi, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';

type Tab = 'guest' | 'login' | 'register';

/**
 * AUTH-1 (compte local) et AUTH-3 (invité) : seuls les deux parcours
 * prioritaires pour le checkpoint #1. OAuth (AUTH-2) reste hors scope ici.
 */
export default function AuthPanel() {
  const [tab, setTab] = useState<Tab>('guest');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setIdentity } = useAuth();
  const { t } = useLang();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'guest') {
        const res = await authApi.guest(displayName);
        setIdentity({ token: res.token, kind: 'guest', displayName: res.guest!.displayName });
      } else if (tab === 'login') {
        const res = await authApi.login(username, password);
        setIdentity({ token: res.token, kind: 'user', displayName: res.user!.username });
      } else {
        const res = await authApi.register(username, password);
        setIdentity({ token: res.token, kind: 'user', displayName: res.user!.username });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'guest', label: t('tabGuest') },
    { id: 'login', label: t('tabLogin') },
    { id: 'register', label: t('tabRegister') },
  ];

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex gap-1 rounded-xl p-1 mb-5" style={{ background: 'var(--bg)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className="flex-1 rounded-lg py-2 text-sm font-semibold transition"
            style={
              tab === t.id
                ? { background: 'var(--accent)', color: '#fff' }
                : { color: 'var(--muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {tab === 'guest' ? (
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('guestPlaceholder')}
            maxLength={20}
            required
            className="rounded-xl border px-4 py-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
          />
        ) : (
          <>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('usernamePlaceholder')}
              maxLength={20}
              required
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              type="password"
              minLength={6}
              required
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
            />
          </>
        )}

        {error && (
          <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl py-3 font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--accent)' }}
        >
          {loading
            ? '...'
            : tab === 'guest'
              ? t('submitGuest')
              : tab === 'login'
                ? t('submitLogin')
                : t('submitRegister')}
        </button>
      </form>
    </div>
  );
}
