import { h } from 'preact';
import { clearSession } from '../session.js';

const NAV_ITEMS = [
  { hash: '#/',             icon: HomeIcon,        label: 'Home' },
  { hash: '#/transactions', icon: TxIcon,          label: 'Transactions' },
  { hash: '#/accounts',    icon: AccountsIcon,    label: 'Accounts' },
  { hash: '#/categories',  icon: CategoriesIcon,  label: 'Categories' },
];

export function NavBar({ currentHash }) {
  const handleLogout = () => {
    clearSession();
    window.location.hash = '#/login';
  };

  return h('nav', { class: 'bottom-nav', 'aria-label': 'Main navigation' },
    NAV_ITEMS.map(({ hash, icon, label }) =>
      h('a', {
        key: hash,
        href: hash,
        class: `nav-item${currentHash === hash || (hash === '#/' && currentHash === '') ? ' active' : ''}`,
        'aria-label': label,
        'aria-current': currentHash === hash ? 'page' : undefined,
      },
        h(icon, null),
        h('span', null, label)
      )
    ),
    h('button', {
      class: 'nav-item',
      onClick: handleLogout,
      'aria-label': 'Logout',
    },
      h(LogoutIcon, null),
      h('span', null, 'Logout')
    )
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function HomeIcon() {
  return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    h('path', { d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' }),
    h('polyline', { points: '9 22 9 12 15 12 15 22' })
  );
}
function TxIcon() {
  return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    h('line', { x1: '12', y1: '1', x2: '12', y2: '23' }),
    h('path', { d: 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' })
  );
}
function AccountsIcon() {
  return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    h('rect', { x: '2', y: '5', width: '20', height: '14', rx: '2' }),
    h('line', { x1: '2', y1: '10', x2: '22', y2: '10' })
  );
}
function CategoriesIcon() {
  return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    h('path', { d: 'M4 6h16M4 12h8m-8 6h16' })
  );
}
function LogoutIcon() {
  return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    h('path', { d: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4' }),
    h('polyline', { points: '16 17 21 12 16 7' }),
    h('line', { x1: '21', y1: '12', x2: '9', y2: '12' })
  );
}
