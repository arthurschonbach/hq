// Light / dark toggle. Default is dark (see <html data-theme> + boot script).
const KEY = 'hq-theme';

export function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const current = () => root.dataset.theme || 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  const paint = () => {
    // Match the phone's status bar / browser chrome to the page.
    if (meta) meta.content = current() === 'dark' ? '#131311' : '#fafaf8';
    btn.setAttribute(
      'aria-label',
      current() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
    );
  };
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode — ignore */
    }
    paint();
  });
  paint();
}
