import { API_ERRORS } from './i18n-race';
import type { TranslationKey } from './i18n';

/** Traduit un message d'erreur renvoyé par une route REST (le serveur répond en français). */
export function apiMessage(message: string, t: (k: TranslationKey) => string): string {
  const key = API_ERRORS[message];
  return key ? t(key as TranslationKey) : message;
}
