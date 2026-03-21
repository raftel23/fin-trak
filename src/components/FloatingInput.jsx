import { h } from 'preact';

/**
 * FloatingInput
 * Hardware-accelerated floating label input component.
 * Uses only GPU-composited properties (transform, opacity) for label animation.
 *
 * @param {object} props
 * @param {string} props.label      - Visible label text
 * @param {string} props.name       - input name/id
 * @param {string} [props.type]     - input type
 * @param {string} [props.value]    - controlled value
 * @param {function} [props.onInput]- onInput handler
 * @param {string} [props.error]    - error message
 * @param {boolean} [props.required]
 * @param {string} [props.autocomplete]
 */
export function FloatingInput({
  label,
  name,
  type = 'text',
  value,
  onInput,
  onChange,
  error,
  required,
  autocomplete,
  min,
  max,
  step,
  pattern,
  inputMode,
}) {
  return h('div', { class: `field${error ? ' error' : ''}` },
    h('input', {
      id: name,
      name,
      type,
      value,
      placeholder: ' ',  // Required for :placeholder-shown selector
      onInput,
      onChange,
      required,
      autocomplete,
      min,
      max,
      step,
      pattern,
      inputMode,
      'aria-invalid': error ? 'true' : undefined,
      'aria-describedby': error ? `${name}-error` : undefined,
    }),
    h('label', { for: name }, label, required && h('span', { 'aria-hidden': 'true', style: 'color:var(--danger);margin-left:2px' }, ' *')),
    error && h('p', { class: 'field-error', id: `${name}-error`, role: 'alert' }, error)
  );
}

/**
 * FloatingSelect
 * Floating label for <select> dropdowns.
 */
export function FloatingSelect({ label, name, value, onChange, children, error, required }) {
  return h('div', { class: `field${error ? ' error' : ''}` },
    h('select', {
      id: name,
      name,
      value,
      onChange,
      required,
      'aria-invalid': error ? 'true' : undefined,
    }, children),
    h('label', { for: name, class: value ? 'floated' : '' },
      label,
      required && h('span', { 'aria-hidden': 'true', style: 'color:var(--danger);margin-left:2px' }, ' *')
    ),
    error && h('p', { class: 'field-error', id: `${name}-error`, role: 'alert' }, error)
  );
}

/**
 * FloatingTextarea
 */
export function FloatingTextarea({ label, name, value, onInput, error }) {
  return h('div', { class: `field${error ? ' error' : ''}` },
    h('textarea', { id: name, name, value, onInput, placeholder: ' ', rows: 3 }),
    h('label', { for: name }, label),
    error && h('p', { class: 'field-error' }, error)
  );
}
