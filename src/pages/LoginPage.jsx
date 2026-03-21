import { h } from 'preact';
import { useState } from 'preact/hooks';
import { FloatingInput } from '../components/FloatingInput';
import { loginUser, decryptData } from '../auth';
import { setSession } from '../session';
import { importFullDatabase } from '../db';
import { Modal } from '../components/Modal';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [showFeatures, setShowFeatures] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await loginUser({ username, password });
      if (user) {
        setSession(user);
        onLogin(user);
        window.location.hash = '#/';
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const pass = prompt('Enter the backup password:');
    if (!pass) return;

    setLoading(true);
    setError('');
    try {
      const decrypted = await decryptData(file, pass);
      await importFullDatabase(decrypted);
      alert('Backup restored successfully! You can now log in.');
    } catch (err) {
      setError(err.message || 'Restoration failed.');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const FEATURES = [
    { icon: '🛡️', title: 'Privacy First', desc: 'No servers. All your financial data is stored locally on your device only.' },
    { icon: '🔐', title: 'Encrypted Sync', desc: 'Move data between devices safely with password-protected .fintrak portable files.' },
    { icon: '📡', title: '100% Offline', desc: 'Works without internet. Your money tracking should never depend on a signal.' },
    { icon: '📈', title: 'Smart Insights', desc: 'Visual charts and automated trend analysis to help you spend smarter.' },
    { icon: '📱', title: 'Installable PWA', desc: 'Add to Home Screen for a native app experience on iOS and Android.' }
  ];

  return h('div', { class: 'auth-page' },
    h('div', { class: 'auth-logo' },
      h('div', { class: 'auth-logo-icon' }, '💰'),
      h('h1', null, 'FinTrak'),
      h('p', null, 'Smart Financial Management')
    ),
    h('form', { class: 'auth-card fade-in-up', onSubmit: handleSubmit },
      h('h2', { class: 'text-center mb-6 font-bold' }, 'Log In'),
      error && h('div', { class: 'alert alert-danger' }, error),
      h(FloatingInput, {
        label: 'Username',
        name: 'username',
        value: username,
        onInput: (e) => setUsername(e.target.value),
        required: true,
        autocomplete: 'username'
      }),
      h(FloatingInput, {
        label: 'Password',
        name: 'password',
        type: 'password',
        value: password,
        onInput: (e) => setPassword(e.target.value),
        required: true,
        autocomplete: 'current-password'
      }),
      h('button', {
        type: 'submit',
        class: 'btn btn-primary btn-block btn-lg mt-4',
        disabled: loading
      }, loading ? 'Logging in...' : 'Sign In'),
      h('div', { class: 'auth-switch' },
        'Don\'t have an account?',
        h('button', {
          type: 'button',
          onClick: () => window.location.hash = '#/register'
        }, 'Create Account')
      ),
      h('div', { class: 'divider mt-6' }),
      h('div', { class: 'flex-center flex-col gap-3 mt-4' },
        h('button', { 
          type: 'button',
          class: 'btn-link text-xs font-semibold uppercase tracking-wider',
          onClick: () => setShowFeatures(true)
        }, '💡 How FinTrak Works'),
        h('label', { class: 'btn-link text-xs', style: 'display: inline-block; cursor: pointer;' },
          'Restore from Backup (.fintrak)',
          h('input', {
            type: 'file',
            accept: '.fintrak',
            style: 'display: none;',
            onChange: handleRestore,
            disabled: loading
          })
        ),
        h('div', { class: 'mt-2 opacity-50 text-xs font-medium uppercase tracking-widest' }, 
          'Developed by Denver Balangbang'
        )
      )
    ),

    // --- Features Modal ---
    showFeatures && h(Modal, { title: 'Discover FinTrak', onClose: () => setShowFeatures(false) },
      h('div', { class: 'flex flex-col gap-6 py-2' },
        h('div', { class: 'text-center' },
          h('h3', { class: 'text-xl font-bold mb-2' }, 'Private, Fast & Portable'),
          h('p', { class: 'text-dim text-sm' }, 'FinTrak isn\'t your typical finance app. It leverages cutting-edge web technology to give you 100% control over your data.')
        ),
        h('div', { class: 'grid gap-5' },
          FEATURES.map(f => h('div', { key: f.title, class: 'flex gap-4 items-start' },
            h('div', { class: 'flex-center rounded-xl bg-surface-2', style: 'width:48px; height:48px; min-width:48px; font-size:1.5rem;' }, f.icon),
            h('div', null,
              h('h4', { class: 'font-bold' }, f.title),
              h('p', { class: 'text-dim text-xs leading-relaxed' }, f.desc)
            )
          ))
        ),
        h('button', { 
          class: 'btn btn-primary btn-block mt-4',
          onClick: () => setShowFeatures(false)
        }, 'Awesome, Let\'s Go!')
      )
    )
  );
}
