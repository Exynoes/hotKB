import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPanel from '../src/components/AuthPanel';
import { AuthProvider } from '../src/lib/auth';
import { LangProvider } from '../src/lib/i18n';

function renderPanel() {
  return render(
    <LangProvider>
      <AuthProvider>
        <AuthPanel />
      </AuthProvider>
    </LangProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem('hotkb:lang', 'fr');
});

describe('AuthPanel', () => {
  it('affiche le formulaire invité par défaut (AUTH-3)', () => {
    renderPanel();
    expect(screen.getByPlaceholderText('Ton nom affiché')).toBeInTheDocument();
  });

  it('bascule vers le formulaire de connexion', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(screen.getByPlaceholderText("Nom d'utilisateur")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument();
  });

  it("bascule vers le formulaire d'inscription (AUTH-1)", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Créer un compte' }));

    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeInTheDocument();
  });

  it('affiche les boutons OAuth des fournisseurs configurés (AUTH-01)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ providers: ['github', 'discord'] }) }),
    );
    renderPanel();
    expect(await screen.findByText('Continuer avec GitHub')).toHaveAttribute(
      'href',
      '/api/auth/oauth/github',
    );
    expect(screen.getByText('Continuer avec Discord')).toBeInTheDocument();
  });

  it("n'affiche aucun bouton OAuth si aucun fournisseur n'est configuré", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ providers: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText(/Continuer avec/)).not.toBeInTheDocument();
  });

  it('connecte l’utilisateur au retour OAuth (fragment #token)', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ providers: [] }) }));
    window.location.hash = '#token=abc&name=camille';
    renderPanel();
    expect(JSON.parse(localStorage.getItem('hotkb:identity')!)).toMatchObject({
      token: 'abc',
      displayName: 'camille',
      kind: 'user',
    });
    expect(window.location.hash).toBe('');
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
