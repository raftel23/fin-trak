import { h } from 'preact';
import { useState } from 'preact/hooks';
import { FloatingInput } from '../components/FloatingInput';
import { loginUser, decryptData } from '../auth';
import { setSession } from '../session';
import { importFullDatabase } from '../db';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');

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
      h('div', { class: 'text-center mt-4' },
        h('label', { class: 'btn-link', style: 'display: inline-block; cursor: pointer;' },
          'Restore from Backup (.fintrak)',
          h('input', {
            type: 'file',
            accept: '.fintrak',
            style: 'display: none;',
            onChange: handleRestore,
            disabled: loading
          })
        )
      )
    )
  );
}
