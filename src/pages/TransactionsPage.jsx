import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { dbQuery, dbRun } from '../db';
import { FloatingInput, FloatingSelect, FloatingTextarea } from '../components/FloatingInput';
import { Modal } from '../components/Modal';
import { fmt, today } from '../insights';

export function TransactionsPage({ user }) {
  const [txs, setTxs] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    account_id: '',
    category_id: '',
    date: today(),
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const txRows = await dbQuery(`
        SELECT t.*, a.name as account_name, c.name as cat_name, c.icon as cat_icon, c.color as cat_color
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
        ORDER BY t.date DESC, t.id DESC
        LIMIT 100
      `, [user.id]);

      const accRows = await dbQuery('SELECT * FROM accounts WHERE user_id = ?', [user.id]);
      const catRows = await dbQuery('SELECT * FROM categories WHERE user_id = ?', [user.id]);

      setTxs(txRows);
      setAccounts(accRows);
      setCategories(catRows);

      if (accRows.length > 0 && !formData.account_id) updateField('account_id', accRows[0].id);
      if (catRows.length > 0 && !formData.category_id) updateField('category_id', catRows.find(c => c.type === 'expense')?.id || catRows[0].id);

    } catch (err) {
      console.error('Load Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const updateField = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  async function handleAdd(e) {
    e.preventDefault();
    const { amount, type, account_id, category_id, date, note } = formData;
    const numAmt = parseFloat(amount);

    try {
      // 1. Insert Transaction
      await dbRun(`
        INSERT INTO transactions (user_id, account_id, category_id, amount, type, date, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [user.id, account_id, category_id, numAmt, type, date, note]);

      // 2. Update Account Balance
      const balanceChange = type === 'income' ? numAmt : -numAmt;
      await dbRun('UPDATE accounts SET balance = balance + ? WHERE id = ?', [balanceChange, account_id]);

      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(tx) {
    if (!confirm(`Delete this ${tx.type} record for ${fmt(tx.amount)}?`)) return;

    try {
      // 1. Calculate balance reversal
      const reversal = tx.type === 'income' ? -tx.amount : tx.amount;

      // 2. Perform DB operations
      await dbRun('UPDATE accounts SET balance = balance + ? WHERE id = ?', [reversal, tx.account_id]);
      await dbRun('DELETE FROM transactions WHERE id = ?', [tx.id]);

      setSelectedTx(null);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return h('div', { class: 'loader' }, h('div', { class: 'spinner' }));

  return h('div', { class: 'page-content' },
    h('header', { class: 'flex-between mb-8' },
      h('h1', { class: 'page-title' }, 'Transactions'),
      h('button', { class: 'btn btn-primary btn-sm', onClick: () => setShowModal(true) }, '+ Add Transaction')
    ),

    txs.length === 0 ? h('div', { class: 'empty-state' },
      h('span', { class: 'empty-icon' }, '💸'),
      h('p', { class: 'empty-title' }, 'No transactions yet'),
      h('p', { class: 'empty-desc' }, 'Tap the + button at the top to record your first expense or income.')
    ) : h('div', { class: 'fade-in-up' },
      txs.map((tx) => h('div', { 
        key: tx.id, 
        class: 'tx-item', 
        style: 'cursor: pointer;',
        onClick: () => setSelectedTx(tx) 
      },
        h('div', { class: 'tx-icon', style: `background:${tx.cat_color}25;color:${tx.cat_color}` }, tx.cat_icon),
        h('div', { class: 'tx-info' },
          h('p', { class: 'tx-name' }, tx.cat_name),
          h('p', { class: 'tx-meta' }, `${tx.account_name} • ${tx.date}`)
        ),
        h('div', { class: 'flex flex-col items-end gap-1' },
          h('div', { class: `tx-amount ${tx.type}` },
            tx.type === 'income' ? '+' : '-',
            fmt(tx.amount)
          )
        )
      ))
    ),

    // --- Detail Modal ---
    selectedTx && h(Modal, { title: 'Transaction Details', onClose: () => setSelectedTx(null) },
      h('div', { class: 'flex flex-col gap-6' },
        h('div', { class: 'flex-center flex-col gap-2' },
          h('div', { class: 'tx-icon', style: `width:64px; height:64px; font-size:2rem; background:${selectedTx.cat_color}25; color:${selectedTx.cat_color}` }, selectedTx.cat_icon),
          h('h2', { class: 'text-xl font-bold mt-2' }, selectedTx.cat_name),
          h('div', { class: `text-3xl font-extrabold ${selectedTx.type}` }, 
            selectedTx.type === 'income' ? '+' : '-', fmt(selectedTx.amount)
          ),
          h('p', { class: 'text-muted font-medium' }, selectedTx.date)
        ),
        h('div', { class: 'divider' }),
        h('div', { class: 'grid gap-4' },
          h('div', { class: 'flex-between' },
            h('span', { class: 'text-dim font-bold uppercase text-xs tracking-wider' }, 'Account'),
            h('span', { class: 'font-semibold' }, selectedTx.account_name)
          ),
          h('div', { class: 'flex-between' },
            h('span', { class: 'text-dim font-bold uppercase text-xs tracking-wider' }, 'Type'),
            h('span', { class: `chip chip-${selectedTx.type}` }, selectedTx.type)
          ),
          selectedTx.note && h('div', { class: 'mt-2' },
            h('p', { class: 'text-dim font-bold uppercase text-xs tracking-wider mb-2' }, 'Note'),
            h('div', { class: 'p-4 rounded-lg bg-surface-2 text-sm italic' }, selectedTx.note)
          )
        ),
        h('button', { 
          class: 'btn btn-danger btn-block mt-4',
          onClick: () => handleDelete(selectedTx)
        }, 'Delete Transaction')
      )
    ),

    showModal && h(Modal, { title: 'New Transaction', onClose: () => setShowModal(false) },
      h('form', { onSubmit: handleAdd, class: 'flex flex-col gap-2' },
        h('div', { class: 'grid-2 mb-2' },
          h('button', {
            type: 'button',
            class: `btn ${formData.type === 'income' ? 'btn-accent' : 'btn-ghost'}`,
            onClick: () => updateField('type', 'income')
          }, 'Income'),
          h('button', {
            type: 'button',
            class: `btn ${formData.type === 'expense' ? 'btn-danger' : 'btn-ghost'}`,
            onClick: () => updateField('type', 'expense')
          }, 'Expense')
        ),

        h(FloatingInput, {
          label: 'Amount',
          name: 'amount',
          type: 'number',
          step: '0.01',
          value: formData.amount,
          onInput: (e) => updateField('amount', e.target.value),
          required: true,
          inputMode: 'decimal'
        }),

        h(FloatingSelect, {
          label: 'Account',
          name: 'account_id',
          value: formData.account_id,
          onChange: (e) => updateField('account_id', e.target.value),
          required: true
        }, accounts.map(a => h('option', { value: a.id }, `${a.name} (${fmt(a.balance)})`))),

        h(FloatingSelect, {
          label: 'Category',
          name: 'category_id',
          value: formData.category_id,
          onChange: (e) => updateField('category_id', e.target.value),
          required: true
        }, categories.filter(c => c.type === formData.type).map(c => h('option', { value: c.id }, `${c.icon} ${c.name}`))),

        h(FloatingInput, {
          label: 'Date',
          name: 'date',
          type: 'date',
          value: formData.date,
          onInput: (e) => updateField('date', e.target.value),
          required: true
        }),

        h(FloatingTextarea, {
          label: 'Note (Optional)',
          name: 'note',
          value: formData.note,
          onInput: (e) => updateField('note', e.target.value)
        }),

        h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-lg mt-4' }, 'Save Transaction')
      )
    )
  );
}
