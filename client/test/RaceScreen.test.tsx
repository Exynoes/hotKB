import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import RaceScreen from '../src/components/RaceScreen';
import ResultsView from '../src/components/ResultsView';
import { LangProvider } from '../src/lib/i18n';
import { DEFAULT } from './fixtures';
import type { RaceResults, RoomState } from '../src/lib/room-types';

const room: RoomState = {
  code: 'ABCDE', status: 'en_course', settings: DEFAULT,
  members: [
    { id: 'me', name: 'Camille', kind: 'user', role: 'player', isHost: true, botLevel: null, avatarUrl: null, connected: true },
    { id: 'b1', name: 'Bot', kind: 'bot', role: 'player', isHost: false, botLevel: 'noob', avatarUrl: null, connected: true },
  ],
};
const race = { startsAt: Date.now() - 1000, serverNow: Date.now(), text: 'ab c', pos: 0, status: 'en_course' as const, errorMode: 'correct' as const, maxTimeSec: null, language: 'fr' as const, bonuses: true, youId: 'me' };

beforeEach(() => {
  localStorage.setItem('hotkb:lang', 'fr');
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never;
});

function setup(onKeys = vi.fn()) {
  render(
    <LangProvider>
      <RaceScreen room={room} race={race} text="ab c" tick={null} myId="me" bonusLog={[]} clockOffset={() => 0} onKeys={onKeys} onAbandon={vi.fn()} onLeave={vi.fn()} />
    </LangProvider>,
  );
  return onKeys;
}

describe('RaceScreen', () => {
  it('colore les lettres tapées et ignore les erreurs en mode correction', async () => {
    vi.useFakeTimers();
    const onKeys = setup();
    act(() => { vi.advanceTimersByTime(200); });
    const box = screen.getByTestId('typing-box');
    const input = screen.getByTestId('typing-input');
    fireEvent.input(input, { target: { value: 'a' } });
    fireEvent.input(input, { target: { value: 'ax' } }); // erreur : on n'avance pas
    expect(box.querySelectorAll('[data-state="done"]')).toHaveLength(1);
    expect(box.querySelector('[data-state="current"]')?.textContent).toBe('x'); // la faute tapée est visible
    act(() => { vi.advanceTimersByTime(100); });
    expect(onKeys).toHaveBeenCalledWith('ax'); // les frappes partent groupées
    vi.useRealTimers();
  });

  it('accepte un caractère composé comme « ê » (touche morte)', () => {
    vi.useFakeTimers();
    const onKeys = vi.fn();
    render(
      <LangProvider>
        <RaceScreen room={room} race={race} text="forêt" tick={null} myId="me" bonusLog={[]} clockOffset={() => 0} onKeys={onKeys} onAbandon={vi.fn()} onLeave={vi.fn()} />
      </LangProvider>,
    );
    act(() => { vi.advanceTimersByTime(200); });
    const input = screen.getByTestId('typing-input');
    fireEvent.input(input, { target: { value: 'f' } });
    fireEvent.input(input, { target: { value: 'fo' } });
    fireEvent.input(input, { target: { value: 'for' } });
    fireEvent.compositionStart(input);
    fireEvent.input(input, { target: { value: 'for^' }, isComposing: true }); // pendant la composition : ignoré
    fireEvent.input(input, { target: { value: 'forê' }, isComposing: true }); // le navigateur remplace ^ par le caractère composé
    fireEvent.compositionEnd(input, { data: 'ê' });
    act(() => { vi.advanceTimersByTime(200); });
    expect(onKeys).toHaveBeenCalledWith('forê');
    expect(screen.getByTestId('typing-box').querySelectorAll('[data-state="done"]')).toHaveLength(4);
    vi.useRealTimers();
  });

  it('ne reste pas bloqué après un « é » composé : la lettre suivante passe', () => {
    vi.useFakeTimers();
    const onKeys = vi.fn();
    render(
      <LangProvider>
        <RaceScreen room={room} race={race} text="représ" tick={null} myId="me" bonusLog={[]} clockOffset={() => 0} onKeys={onKeys} onAbandon={vi.fn()} onLeave={vi.fn()} />
      </LangProvider>,
    );
    act(() => { vi.advanceTimersByTime(200); });
    const input = screen.getByTestId('typing-input');
    fireEvent.input(input, { target: { value: 'rep' } });
    fireEvent.input(input, { target: { value: 'repr' } });
    fireEvent.compositionStart(input);
    fireEvent.input(input, { target: { value: 'repr´' }, isComposing: true });
    fireEvent.input(input, { target: { value: 'représ' }, isComposing: true }); // composé : é remplace ´
    fireEvent.compositionEnd(input, { data: 'é' });
    // le navigateur laisse « é » dans le champ ; la lettre suivante s'ajoute après
    fireEvent.input(input, { target: { value: 'représ' } });
    fireEvent.input(input, { target: { value: 'représ' } });
    act(() => { vi.advanceTimersByTime(200); });
    expect(onKeys).toHaveBeenCalledWith('représ');
    vi.useRealTimers();
  });

  it('ignore un accent isolé de touche morte', () => {
    vi.useFakeTimers();
    const onKeys = vi.fn();
    render(
      <LangProvider>
        <RaceScreen room={room} race={race} text="abc" tick={null} myId="me" bonusLog={[]} clockOffset={() => 0} onKeys={onKeys} onAbandon={vi.fn()} onLeave={vi.fn()} />
      </LangProvider>,
    );
    act(() => { vi.advanceTimersByTime(200); });
    const input = screen.getByTestId('typing-input');
    fireEvent.input(input, { target: { value: '^' } });
    fireEvent.input(input, { target: { value: '^a' } });
    act(() => { vi.advanceTimersByTime(200); });
    expect(onKeys).toHaveBeenCalledWith('a');
    vi.useRealTimers();
  });

  it('affiche une voie par coureur', () => {
    setup();
    expect(screen.getAllByTestId('lane')).toHaveLength(2);
  });
});

describe('ResultsView', () => {
  it('affiche le classement et le record personnel', () => {
    const base = { kind: 'user' as const, botLevel: null, avatarUrl: null, userId: null, status: 'termine' as const, rawWpm: 50, accuracy: 98, errors: 1, timeMs: 12000, progress: 1, bonuses: [], series: [{ t: 1, wpm: 40 }, { t: 2, wpm: 50 }], keyErrors: { e: 2 } };
    const results: RaceResults = {
      raceId: 'r', roomCode: 'ABCDE', startedAt: new Date().toISOString(), durationMs: 12000, language: 'fr', text: 'ab c', settings: {},
      players: [{ ...base, id: 'me', name: 'Camille', rank: 1, wpm: 50, personalRecord: true }, { ...base, id: 'b1', name: 'Bot', rank: 2, wpm: 30, personalRecord: false }],
    };
    render(<LangProvider><ResultsView results={results} myId="me" /></LangProvider>);
    expect(screen.getByText(/Record perso/)).toBeInTheDocument();
    expect(screen.getAllByText('Camille').length).toBeGreaterThan(0);
  });
});
