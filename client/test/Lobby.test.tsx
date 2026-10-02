import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Lobby from '../src/components/Lobby';
import type { LobbyState } from '../src/lib/room-types';

const baseRoom: LobbyState = {
  code: 'ABCDE',
  status: 'en_attente',
  participants: [
    { id: 'p1', displayName: 'Camille', isHost: true },
    { id: 'p2', displayName: 'Nathan', isHost: false },
  ],
};

describe('Lobby', () => {
  it('affiche le code de la salle et les participants', () => {
    render(<Lobby room={baseRoom} myId="p2" onStart={vi.fn()} onLeave={vi.fn()} />);

    expect(screen.getByText('ABCDE')).toBeInTheDocument();
    expect(screen.getByText('Camille')).toBeInTheDocument();
    expect(screen.getByText(/Nathan/)).toBeInTheDocument();
    expect(screen.getByText('HÔTE')).toBeInTheDocument();
  });

  it('identifie le joueur courant avec « (toi) »', () => {
    render(<Lobby room={baseRoom} myId="p2" onStart={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.getByText(/Nathan.*\(toi\)/)).toBeInTheDocument();
  });

  it("ne montre le bouton « Démarrer » qu'à l'hôte", () => {
    const { rerender } = render(
      <Lobby room={baseRoom} myId="p2" onStart={vi.fn()} onLeave={vi.fn()} />,
    );
    expect(screen.queryByText('Démarrer la course')).not.toBeInTheDocument();

    rerender(<Lobby room={baseRoom} myId="p1" onStart={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.getByText('Démarrer la course')).toBeEnabled();
  });

  it('désactive « Démarrer » avec un seul joueur (COURSE-1)', () => {
    const soloRoom: LobbyState = {
      ...baseRoom,
      participants: [{ id: 'p1', displayName: 'Camille', isHost: true }],
    };
    render(<Lobby room={soloRoom} myId="p1" onStart={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.getByText('Démarrer la course')).toBeDisabled();
  });
});
