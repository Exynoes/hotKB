import type { RaceSettings } from '../src/lib/room-types';

export const DEFAULT: RaceSettings = {
  maxTimeSec: null, language: 'fr', textType: 'coherent', words: 40, complexity: 'easy',
  punctuation: true, numbers: false, capitals: true, accents: true, includeChars: '', excludeChars: '',
  errorMode: 'correct', bonuses: true, visibility: 'public', capacity: 8,
};
