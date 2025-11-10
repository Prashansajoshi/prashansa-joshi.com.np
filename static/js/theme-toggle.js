// static/js/theme-toggle.js - diagnostic version
(function () {
  console.log('[theme-toggle] script loaded');
  function init() {
    const toggle = document.getElementById('theme-toggle');
    console.log('[theme-toggle] button element:', toggle);
    if (!toggle) {
      console.warn('[theme-toggle] no toggle found in DOM');
      return;
    }

    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : (prefersDark || true);
    console.log('[theme-toggle] initial preference:', { stored, prefersDark, isDark });

    function applyDark(on) {
      if (on) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        toggle.textContent = '🌞';
        localStorage.setItem('theme', 'dark');
        console.log('[theme-toggle] applied dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        toggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
        console.log('[theme-toggle] removed dark');
      }
      console.log('[theme-toggle] now classes on <html>:', document.documentElement.className);
    }

    applyDark(isDark);

    toggle.addEventListener('click', function () {
      const next = !document.documentElement.classList.contains('dark');
      applyDark(next);
      console.log('[theme-toggle] click triggered, next:', next);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
