import { h } from 'preact';
import { useState } from 'preact/hooks';
import { FloatingInput } from '../components/FloatingInput';
import { registerUser } from '../auth';
import { setSession } from '../session';

export function RegisterPage({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    middleName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const confirmError = formData.confirmPassword && formData.password !== formData.confirmPassword 
    ? 'Passwords do not match' 
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (confirmError) return;
    
    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    setLoading(true);
    setError('');

    try {
      const user = await registerUser(formData);
      setSession(user);
      onLogin(user);
      window.location.hash = '#/';
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return h('div', { class: 'auth-page' },
    h('form', { class: 'auth-card fade-in-up', onSubmit: handleSubmit },
      h('h2', { class: 'text-center mb-6 font-bold' }, 'Create Account'),
      error && h('div', { class: 'alert alert-danger' }, error),

      h('div', { class: 'grid-2' },
        h(FloatingInput, {
          label: 'First Name',
          name: 'firstName',
          value: formData.firstName,
          onInput: (e) => updateField('firstName', e.target.value),
          required: true
        }),
        h(FloatingInput, {
          label: 'Last Name',
          name: 'lastName',
          value: formData.lastName,
          onInput: (e) => updateField('lastName', e.target.value),
          required: true
        })
      ),

      h(FloatingInput, {
        label: 'Middle Name (Optional)',
        name: 'middleName',
        value: formData.middleName,
        onInput: (e) => updateField('middleName', e.target.value)
      }),

      h(FloatingInput, {
        label: 'Username',
        name: 'username',
        value: formData.username,
        onInput: (e) => updateField('username', e.target.value),
        required: true,
        autocomplete: 'username'
      }),

      h(FloatingInput, {
        label: 'Password',
        name: 'password',
        type: 'password',
        value: formData.password,
        onInput: (e) => updateField('password', e.target.value),
        required: true,
        autocomplete: 'new-password'
      }),

      h(FloatingInput, {
        label: 'Confirm Password',
        name: 'confirmPassword',
        type: 'password',
        value: formData.confirmPassword,
        onInput: (e) => updateField('confirmPassword', e.target.value),
        required: true,
        autocomplete: 'new-password',
        error: confirmError
      }),

      h('button', {
        type: 'submit',
        class: 'btn btn-primary btn-block btn-lg mt-4',
        disabled: loading || !!confirmError
      }, loading ? 'Creating Account...' : 'Get Started'),

      h('div', { class: 'auth-switch' },
        'Already have an account?',
        h('button', {
          type: 'button',
          onClick: () => window.location.hash = '#/login'
        }, 'Log In')
      )
    )
  );
}
