'use client';

import type { CSSProperties } from 'react';
import { useLang } from '../lib/i18n';

/**
 * Aperçu de frappe façon Monkeytype : les lettres déjà tapées s'allument en
 * couleur d'accent, un curseur clignote. Purement décoratif.
 */
export default function TypingDemo() {
  const { t } = useLang();
  const text = t('typingDemo');
  return (
    <div
      aria-hidden="true"
      className="rounded-xl px-6 py-4 max-w-full overflow-x-auto"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p className="typing-demo" style={{ '--n': text.length } as CSSProperties}>
        <span className="typing-base">{text}</span>
        <span className="typing-done">{text}</span>
        <span className="typing-caret" />
      </p>
    </div>
  );
}
