import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Lobby, { type LobbyActions } from '../src/components/Lobby';
import { LangProvider } from '../src/lib/i18n';
import { DEFAULT } from './fixtures';
import type { Member, RoomState } from '../src/lib/room-types';

const member = (id: string, name: string, isHost = false): Member => ({
  id, name, kind: 'user', role: 'player', isHost, botLevel: null, avatarUrl: null, connected: true,
});

const baseRoom: RoomState = {
  code: 'ABCDE',
  status: 'en_attente',
  settings: DEFAULT,
  members: [member('p1', 'Camille', true), member('p2', 'Nathan')],
};

const actions = (): LobbyActions => ({
  onStart: vi.fn(), onLeave: vi.fn(), onClose: vi.fn(), onSettings: vi.fn(), onRole: vi.fn(),
  onAddBot: vi.fn(), onRemoveBot: vi.fn(), onKick: vi.fn(), onInvite: vi.fn(), onRevoke: vi.fn(),
});

function renderLobby(room: RoomState, myId: string, a = actions()) {
  render(
    <LangProvider>
      <Lobby room={room} myId={myId} invites={[]} error={null} actions={a} />
    </LangProvider>,
  );
  return a;
}

beforeEach(() => localStorage.setItem('hotkb:lang', 'fr'));

describe('Lobby', () => {
  it('affiche le code de la salle et les participants', () => {
    renderLobby(baseRoom, 'p2');
    expect(screen.getByLabelText('ABCDE')).toBeInTheDocument();
    expect(screen.getByText('Camille')).toBeInTheDocument();
    expect(screen.getByText(/Nathan.*\(toi\)/)).toBeInTheDocument();
    expect(screen.getByText('HÔTE')).toBeInTheDocument();
  });

  it("ne montre « Démarrer » et les réglages modifiables qu'à l'hôte (CONF-12)", () => {
    renderLobby(baseRoom, 'p2');
    expect(screen.queryByText('Démarrer la course')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de mots')).toBeDisabled();
  });

  it("l'hôte modifie un réglage et démarre", () => {
    const a = renderLobby(baseRoom, 'p1');
    fireEvent.change(screen.getByLabelText('Difficulté'), { target: { value: 'hard' } });
    expect(a.onSettings).toHaveBeenCalledWith({ complexity: 'hard' });
    fireEvent.click(screen.getByText('Démarrer la course'));
    expect(a.onStart).toHaveBeenCalled();
  });

  it('désactive « Démarrer » avec un seul coureur', () => {
    renderLobby({ ...baseRoom, members: [member('p1', 'Camille', true)] }, 'p1');
    expect(screen.getByText('Démarrer la course')).toBeDisabled();
  });

  it("l'hôte peut ajouter un bot", () => {
    const a = renderLobby(baseRoom, 'p1');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un bot' }));
    expect(a.onAddBot).toHaveBeenCalledWith('debutant');
  });
});
