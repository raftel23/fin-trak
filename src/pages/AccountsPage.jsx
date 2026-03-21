import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { dbQuery, dbRun } from '../db';
import { FloatingInput, FloatingSelect } from '../components/FloatingInput';
import { Modal } from '../components/Modal';
import { fmt } from '../insights';

const COLORS = ['#6C63FF', '#00D4AA', '#FF6B8A', '#FFB547', '#4CC9F0', '#A29BFE', '#FDCB6E', '#00B4D8'];

export function AccountsPage({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: 'cash',
    balance: '',
    color: '#6C63FF'
  });

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    try {
      const rows = await dbQuery('SELECT * FROM accounts WHERE user_id = ?', [user.id]);
      setAccounts(rows);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const updateField = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await dbRun(`
        INSERT INTO accounts (user_id, name, type, balance, color)
        VALUES (?, ?, ?, ?, ?)
      `, [user.id, formData.name, formData.type, parseFloat(formData.balance) || 0, formData.color]);
      setShowModal(false);
      setFormData({ name: '', type: 'cash', balance: '', color: '#6C63FF' });
      loadAccounts();
    } catch (err) { alert(err.message); }
  }

  if (loading) return h('div', { class: 'loader' }, h('div', { class: 'spinner' }));

  return h('div', { class: 'page-content' },
    h('header', { class: 'flex-between mb-6' },
      h('h1', { class: 'page-title' }, 'Accounts'),
      h('button', { class: 'btn btn-primary btn-sm', onClick: () => setShowModal(true) }, '+ Add')
    ),

    h('div', { class: 'grid gap-4' },
      accounts.map(acc => h('div', { key: acc.id, class: 'account-card', style: `border-left: 4px solid ${acc.color}` },
        h('p', { class: 'account-type-badge' }, acc.type),
        h('p', { class: 'account-name' }, acc.name),
        h('p', { class: 'account-balance' }, fmt(acc.balance))
      )),

      accounts.length === 0 && h('div', { class: 'empty-state' },
        h('span', { class: 'empty-icon' }, '💳'),
        h('p', { class: 'empty-title' }, 'No accounts found'),
        h('p', { class: 'empty-desc' }, 'Add your bank, wallet, or cash accounts to get started.')
      )
    ),

    showModal && h(Modal, { title: 'Add Account', onClose: () => setShowModal(false) },
      h('form', { onSubmit: handleAdd, class: 'flex flex-col gap-4' },
        h(FloatingInput, {
          label: 'Account Name',
          name: 'name',
          value: formData.name,
          onInput: (e) => updateField('name', e.target.value),
          required: true
        }),
        h(FloatingSelect, {
          label: 'Account Type',
          name: 'type',
          value: formData.type,
          onChange: (e) => updateField('type', e.target.value),
          required: true
        }, [
          h('option', { value: 'cash' }, 'Cash'),
          h('option', { value: 'bank' }, 'Bank Account'),
          h('option', { value: 'ewallet' }, 'E-Wallet')
        ]),
        h(FloatingInput, {
          label: 'Initial Balance',
          name: 'balance',
          type: 'number',
          step: '0.01',
          value: formData.balance,
          onInput: (e) => updateField('balance', e.target.value),
          required: true,
          inputMode: 'decimal'
        }),
        h('div', null,
          h('p', { class: 'text-xs text-muted mb-2 font-semibold uppercase' }, 'Theme Color'),
          h('div', { class: 'color-swatches' },
            COLORS.map(c => h('div', {
              key: c,
              class: `color-swatch ${formData.color === c ? 'selected' : ''}`,
              style: `background: ${c}`,
              onClick: () => updateField('color', c)
            }))
          )
        ),
        h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-lg mt-2' }, 'Create Account')
      )
    )
  );
}
