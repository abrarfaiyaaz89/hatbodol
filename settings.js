(function () {
  var dark = document.getElementById('sw-dark'), fx = document.getElementById('sw-fx');
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function fxOn() {
    if (window.HBFx && window.HBFx.isOn) return window.HBFx.isOn();
    try { return localStorage.getItem('hb-fx') !== 'off'; } catch (e) { return true; }
  }
  function sync() {
    dark.setAttribute('aria-checked', String(isDark()));
    fx.setAttribute('aria-checked', String(fxOn()));
  }
  dark.addEventListener('click', function () { if (window.HBTheme) window.HBTheme.toggle(); sync(); });
  fx.addEventListener('click', function () {
    var v = !fxOn();
    if (window.HBFx && window.HBFx.setOn) window.HBFx.setOn(v);
    else { try { localStorage.setItem('hb-fx', v ? 'on' : 'off'); } catch (e) {} }
    if (v && window.HBFx) window.HBFx.tap();
    sync();
  });
  sync();
  window.addEventListener('load', sync);
})();
