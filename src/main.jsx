import { render } from 'preact';
import { App } from './App';
import './index.css';

render(<App />, document.getElementById('app'));

// ─── Service Worker Registration ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[FinTrak] SW Registered:', reg.scope))
      .catch(err => console.error('[FinTrak] SW Registration Failed:', err));
  });
}
