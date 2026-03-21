import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { dbQuery, dbRun } from '../db';
import { FloatingInput, FloatingSelect } from '../components/FloatingInput';
import { Modal } from '../components/Modal';

const ICONS = ['💼', '💻', '📈', '🍔', '🚗', '🏠', '⚕️', '🛍️', '⚡', '📚', '🎮', '📦', '🎈', '🎁', '🛒', '🚲', '✈️', '🎨', '🎬', '🧥'];
const COLORS = ['#6C63FF', '#00D4AA', '#FF6B8A', '#FFB547', '#4CC9F0', '#A29BFE', '#FDCB6E', '#00B4D8'];

export function CategoriesPage({ user }) {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    icon: '📦',
    color: '#6C63FF'
  });

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try {
      const rows = await dbQuery('SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC', [user.id]);
      setCategories(rows);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Are you sure you want to delete category "${name}"?\n\nThis will also PERMANENTLY delete all transactions associated with this category.`)) return;
    try {
      await dbRun('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, user.id]);
      loadCategories();
    } catch (err) { alert(err.message); }
  }

  const updateField = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await dbRun(`
        INSERT INTO categories (user_id, name, type, icon, color)
        VALUES (?, ?, ?, ?, ?)
      `, [user.id, formData.name, formData.type, formData.icon, formData.color]);
      setShowModal(false);
      setFormData({ name: '', type: 'expense', icon: '📦', color: '#6C63FF' });
      loadCategories();
    } catch (err) { alert(err.message); }
  }

  if (loading) return h('div', { class: 'loader' }, h('div', { class: 'spinner' }));

  return h('div', { class: 'page-content' },
    h('header', { class: 'flex-between mb-6' },
      h('h1', { class: 'page-title' }, 'Categories'),
      h('button', { class: 'btn btn-primary btn-sm', onClick: () => setShowModal(true) }, '+ Add')
    ),

    h('div', { class: 'grid gap-3' },
      categories.map(cat => h('div', { key: cat.id, class: 'cat-item' },
        h('div', { class: 'cat-icon', style: `background: ${cat.color}25; color: ${cat.color}` }, cat.icon),
        h('div', { class: 'cat-info' },
          h('p', { class: 'cat-name' }, cat.name),
          h('p', { class: 'cat-type uppercase font-bold text-xs opacity-60' }, cat.type)
        ),
        h('button', {
          class: 'btn-icon text-danger',
          onClick: () => handleDelete(cat.id, cat.name),
          title: 'Delete Category'
        }, h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('polyline', { points: '3 6 5 6 21 6' }),
          h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
          h('line', { x1: '10', y1: '11', x2: '10', y2: '17' }),
          h('line', { x1: '14', y1: '11', x2: '14', y2: '17' })
        ]))
      ))
    ),

    showModal && h(Modal, { title: 'Add Category', onClose: () => setShowModal(false) },
      h('form', { onSubmit: handleAdd, class: 'flex flex-col gap-4' },
        h(FloatingInput, {
          label: 'Category Name',
          name: 'name',
          value: formData.name,
          onInput: (e) => updateField('name', e.target.value),
          required: true
        }),
        h(FloatingSelect, {
          label: 'Type',
          name: 'type',
          value: formData.type,
          onChange: (e) => updateField('type', e.target.value),
          required: true
        }, [
          h('option', { value: 'expense' }, 'Expense'),
          h('option', { value: 'income' }, 'Income')
        ]),
        h('div', null,
          h('p', { class: 'text-xs text-muted mb-2 font-semibold uppercase' }, 'Select Icon'),
          h('div', { class: 'color-swatches' },
            ICONS.map(i => h('div', {
              key: i,
              class: `color-swatch flex-center text-lg ${formData.icon === i ? 'selected' : ''}`,
              onClick: () => updateField('icon', i)
            }, i))
          )
        ),
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
        h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-lg mt-2' }, 'Create Category')
      )
    )
  );
}
