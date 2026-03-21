/**
 * session.js
 * sessionStorage-based session management.
 * sessionStorage is natively cleared by the browser when the tab/window is closed.
 * An explicit logout button is also available from the NavBar.
 */

const SESSION_KEY = 'ft_session';

/** @returns {object|null} */
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {object} user */
export function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Returns true if there is an active session */
export function isAuthenticated() {
  return getSession() !== null;
}
