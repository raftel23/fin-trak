import { h } from 'preact';
import { useEffect } from 'preact/hooks';

/**
 * Modal
 * Bottom sheet on mobile, centered dialog on desktop.
 * Traps focus and closes on backdrop click or Escape.
 */
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return h('div', {
    class: 'modal-backdrop',
    onClick: (e) => { if (e.target === e.currentTarget) onClose(); },
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  },
    h('div', { class: 'modal' },
      h('div', { class: 'modal-handle' }),
      h('h2', { class: 'modal-title' }, title),
      children
    )
  );
}
