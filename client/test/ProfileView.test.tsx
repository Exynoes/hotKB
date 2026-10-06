import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileView from '../src/components/ProfileView';
import { AuthProvider } from '../src/lib/auth';
import { LangProvider } from '../src/lib/i18n';
import { ThemeProvider } from '../src/lib/theme';

function renderProfile() {
  return render(
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <ProfileView />
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem('hotkb:lang', 'fr');
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('ProfileView', () => {
  it('affiche les statistiques et l\'historique du compte (AUTH-06, HIST-01)', async () => {
    localStorage.setItem('hotkb:identity', JSON.stringify({ token: 't', kind: 'user', displayName: 'demo' }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = url.includes('/history')
          ? {
              page: 1,
              pageSize: 5,
              total: 1,
              items: [{ raceId: 'r1', startedAt: '2026-10-01T12:00:00Z', wpm: 55, accuracy: 97, rank: 1, errors: 2, language: 'fr' }],
            }
          : {
              username: 'demo',
              avatarUrl: null,
              stats: { races: 1, wins: 1, bestWpm: 55, avgWpm: 55, avgAccuracy: 97 },
              progression: [{ date: '2026-10-01T12:00:00Z', wpm: 55 }],
            };
        return { ok: true, json: async () => body };
      }),
    );
    renderProfile();
    expect(await screen.findByText('Meilleur MPM')).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Progression (MPM)' })).toBeInTheDocument();
  });

  it('refuse les statistiques à un invité', async () => {
    localStorage.setItem('hotkb:identity', JSON.stringify({ token: 't', kind: 'guest', displayName: 'x' }));
    renderProfile();
    expect(await screen.findByText(/réservées aux comptes/)).toBeInTheDocument();
  });
});
