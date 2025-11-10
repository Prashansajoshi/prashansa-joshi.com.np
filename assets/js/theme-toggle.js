// assets/js/theme-toggle.js
(function () {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  // initialize theme from localStorage or system preference
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored ? stored === 'dark' : prefersDark;
  setDark(isDark);

  function setDark(value) {
    if (value) {
      document.body.classList.add('dark');
      toggle.textContent = '🌞';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      toggle.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    }
  }

  toggle.addEventListener('click', function () {
    setDark(!document.body.classList.contains('dark'));
  });
})();
