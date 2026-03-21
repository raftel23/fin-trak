import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { getSession } from './session';
import { initDB } from './db';
import { NavBar } from './components/NavBar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';

export function App() {
  const [user, setUser] = useState(null);
  const [hash, setHash] = useState(window.location.hash);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // 1. Initialize SQLite WASM
    initDB().then(() => setDbReady(true)).catch(console.error);

    // 2. Initial Session Check
    setUser(getSession());

    // 3. Hash Routing
    const handleHashChange = () => {
      setHash(window.location.hash);
      setUser(getSession()); // Re-check session on navigate
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!dbReady) return h('div', { class: 'loader' }, h('div', { class: 'spinner' }), h('p', { class: 'text-sm text-muted mt-4' }, 'Initializing Local Database...'));

  // Auth Guard
  const isAuthPage = hash === '#/login' || hash === '#/register';
  if (!user && !isAuthPage) {
    window.location.hash = '#/login';
    return null;
  }

  // Routing Logic
  let Page;
  switch (hash) {
    case '#/register': Page = h(RegisterPage, { onLogin: setUser }); break;
    case '#/login':    Page = h(LoginPage, { onLogin: setUser }); break;
    case '#/transactions': Page = h(TransactionsPage, { user }); break;
    case '#/accounts':    Page = h(AccountsPage, { user }); break;
    case '#/categories':  Page = h(CategoriesPage, { user }); break;
    default:           Page = h(DashboardPage, { user }); break;
  }

  return h('div', { id: 'app' },
    user && !isAuthPage && h('div', { class: 'app-shell' },
      Page,
      h(NavBar, { currentHash: hash })
    ),
    (!user || isAuthPage) && Page
  );
}
