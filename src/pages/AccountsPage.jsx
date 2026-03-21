import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { dbQuery, dbRun } from '../db';
import { FloatingInput, FloatingSelect } from '../components/FloatingInput';
import { Modal } from '../components/Modal';
import { fmt } from '../insights';

const COLORS = ['#6C63FF', '#00D4AA', '#FF6B8A', '#FFB547', '#4CC9F0', '#A29BFE', '#FDCB6E', '#00B4D8'];

const ACCOUNT_ICONS = {
  cash: '💵',
  bank: '🏦',
  ewallet: '📱',
  investment: '📈',
  savings: '💰'
};

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

  async function handleDelete(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis will also PERMANENTLY delete all transactions associated with this account.`)) return;
    try {
      await dbRun('DELETE FROM accounts WHERE id = ? AND user_id = ?', [id, user.id]);
      loadAccounts();
    } catch (err) { alert(err.message); }
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
        h('div', { class: 'flex-between items-start mb-2' },
          h('p', { class: 'account-type-badge mb-0' }, 
            `${ACCOUNT_ICONS[acc.type] || '💳'} ${acc.type}`
          ),
          h('button', {
            class: 'btn-icon text-danger',
            onClick: () => handleDelete(acc.id, acc.name),
            title: 'Delete Account'
          }, h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
            h('polyline', { points: '3 6 5 6 21 6' }),
            h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
            h('line', { x1: '10', y1: '11', x2: '10', y2: '17' }),
            h('line', { x1: '14', y1: '11', x2: '14', y2: '17' })
          ]))
        ),
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
          h('option', { value: 'cash' }, '💵 Cash'),
          h('option', { value: 'bank' }, '🏦 Bank Account'),
          h('option', { value: 'ewallet' }, '📱 E-Wallet'),
          h('option', { value: 'investment' }, '📈 Investment Portfolio'),
          h('option', { value: 'savings' }, '💰 Savings Account')
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
