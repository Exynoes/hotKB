import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPanel from '../src/components/AuthPanel';
import { AuthProvider } from '../src/lib/auth';

function renderPanel() {
  return render(
    <AuthProvider>
      <AuthPanel />
    </AuthProvider>,
  );
}

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
});
