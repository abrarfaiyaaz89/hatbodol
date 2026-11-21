// Loaded in <head> so the saved theme is applied before the page paints (no flash).
(function () {
  var KEY = 'hb-theme', root = document.documentElement;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function system() { return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#141414' : '#ffffff');
  }
  apply(stored() || system());
  window.HBTheme = {
    toggle: function () {
      var n = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, n); } catch (e) {}
      apply(n);
      return n;
    }
  };
})();
