import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Lobby from '../src/components/Lobby';
import { LangProvider } from '../src/lib/i18n';
import type { LobbyState } from '../src/lib/room-types';

const baseRoom: LobbyState = {
  code: 'ABCDE',
  status: 'en_attente',
  participants: [
    { id: 'p1', displayName: 'Camille', isHost: true },
    { id: 'p2', displayName: 'Nathan', isHost: false },
  ],
};

function renderLobby(props: Parameters<typeof Lobby>[0]) {
  return render(
    <LangProvider>
      <Lobby {...props} />
    </LangProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem('hotkb:lang', 'fr');
});

describe('Lobby', () => {
  it('affiche le code de la salle et les participants', () => {
    renderLobby({ room: baseRoom, myId: 'p2', onStart: vi.fn(), onLeave: vi.fn() });

    expect(screen.getByLabelText('ABCDE')).toBeInTheDocument();
    expect(screen.getByText('Camille')).toBeInTheDocument();
    expect(screen.getByText(/Nathan/)).toBeInTheDocument();
    expect(screen.getByText('HÔTE')).toBeInTheDocument();
  });

  it('identifie le joueur courant avec « (toi) »', () => {
    renderLobby({ room: baseRoom, myId: 'p2', onStart: vi.fn(), onLeave: vi.fn() });
    expect(screen.getByText(/Nathan.*\(toi\)/)).toBeInTheDocument();
  });

  it("ne montre le bouton « Démarrer » qu'à l'hôte", () => {
    const { rerender } = renderLobby({
      room: baseRoom,
      myId: 'p2',
      onStart: vi.fn(),
      onLeave: vi.fn(),
    });
    expect(screen.queryByText('Démarrer la course')).not.toBeInTheDocument();

    rerender(
      <LangProvider>
        <Lobby room={baseRoom} myId="p1" onStart={vi.fn()} onLeave={vi.fn()} />
      </LangProvider>,
    );
    expect(screen.getByText('Démarrer la course')).toBeEnabled();
  });

  it('désactive « Démarrer » avec un seul joueur (COURSE-1)', () => {
    const soloRoom: LobbyState = {
      ...baseRoom,
      participants: [{ id: 'p1', displayName: 'Camille', isHost: true }],
    };
    renderLobby({ room: soloRoom, myId: 'p1', onStart: vi.fn(), onLeave: vi.fn() });
    expect(screen.getByText('Démarrer la course')).toBeDisabled();
  });
});
