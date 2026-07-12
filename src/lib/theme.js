/**
 * Theme utility — Dark / Light / System with localStorage persistence.
 *
 * The resolved theme is applied as `data-theme="light|dark"` on the <html>
 * element. CSS in index.css uses `:root[data-theme="light"]` to override
 * the dark defaults.
 *
 * Note: many components still ship hardcoded rgba() colors from an
 * earlier dark-only era. Those will not adjust to light theme until they
 * migrate to CSS variables. This is a known follow-up, not a bug here.
 */

const STORAGE_KEY = 'agentos-theme';
export const THEME_MODES = ['dark', 'light', 'system'];

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return THEME_MODES.includes(raw) ? raw : 'system';
}

export function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(mode) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute('data-theme', resolved);
}

export function setTheme(mode) {
  if (!THEME_MODES.includes(mode)) mode = 'system';
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, mode);
    // Broadcast to same-window listeners (localStorage 'storage' only fires cross-tab).
    window.dispatchEvent(new CustomEvent('agentos-theme-change', { detail: mode }));
  }
  applyTheme(mode);
}

/**
 * Idempotent boot hook — call once from the app entry.
 * Applies the stored theme immediately and keeps `system` mode in sync
 * with OS-level `prefers-color-scheme` changes.
 */
export function initTheme() {
  if (typeof window === 'undefined') return;
  applyTheme(getStoredTheme());
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => {
    if (getStoredTheme() === 'system') applyTheme('system');
  };
  // Older Safari uses addListener/removeListener.
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else if (mq.addListener) mq.addListener(handler);
}
