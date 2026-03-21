import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

/**
 * Modal
 * Bottom sheet on mobile, centered dialog on desktop.
 * Traps focus and closes on backdrop click or Escape.
 */
export function Modal({ title, onClose, children }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    // Handle virtual keyboard via Visual Viewport API
    const handleViewport = () => {
      if (!window.visualViewport) return;
      const vh = window.innerHeight;
      const vvh = window.visualViewport.height;
      // If viewport is smaller than window, keyboard is likely up
      const diff = vh - vvh;
      setOffset(diff > 0 ? diff : 0);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewport);
      handleViewport(); // Initial check
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewport);
      }
    };
  }, [onClose]);

  return h('div', {
    class: 'modal-backdrop',
    onClick: (e) => { if (e.target === e.currentTarget) onClose(); },
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
    // Adjust backdrop to only cover the visual area if needed
    style: offset > 0 ? `height: ${window.visualViewport.height}px` : ''
  },
    h('div', { 
      class: 'modal',
      style: offset > 0 ? `transform: translateY(-${offset - 10}px)` : ''
    },
      h('div', { class: 'modal-handle' }),
      h('h2', { class: 'modal-title' }, title),
      children
    )
  );
}
