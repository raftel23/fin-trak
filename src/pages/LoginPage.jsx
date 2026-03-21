import { h } from 'preact';
import { useState } from 'preact/hooks';
import { FloatingInput } from '../components/FloatingInput';
import { loginUser } from '../auth';
import { setSession } from '../session';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      )
    )
  );
}
