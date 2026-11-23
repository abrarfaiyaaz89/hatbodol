// Haptics (vibration), soft sounds, theme button and header shadow. Loaded by layout.js.
(function () {
  var KEY = 'hb-fx', ctx = null;

  function on() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }
  function setOn(v) { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {} label(); }
  function vibrate(p) { if (on() && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

  function audio() {
    if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, delay) {
    if (!on()) return;
    var c = audio(); if (!c) return;
    var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.04, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }

  var Fx = {
    tap: function () { vibrate(8); tone(700, 0.045, 'sine', 0.035); },
    heavy: function () { vibrate(18); tone(520, 0.07, 'sine', 0.05); tone(780, 0.09, 'sine', 0.04, 0.05); },
    success: function () { vibrate([12, 40, 12]); tone(660, 0.1, 'sine', 0.05); tone(990, 0.16, 'sine', 0.05, 0.09); },
    error: function () { vibrate([30, 40, 30]); tone(220, 0.2, 'triangle', 0.06); },
    isOn: on,
    setOn: setOn
  };
  window.HBFx = Fx;

  // Small non-blocking messages
  var toastBox = null;
  window.HBToast = {
    show: function (text) {
      if (!toastBox) {
        toastBox = document.createElement('div');
        toastBox.className = 'toasts';
        toastBox.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastBox);
      }
      var t = document.createElement('div');
      t.className = 'toast';
      t.textContent = text;
      toastBox.appendChild(t);
      requestAnimationFrame(function () { t.classList.add('in'); });
      setTimeout(function () { t.classList.remove('in'); setTimeout(function () { t.remove(); }, 300); }, 2600);
    }
  };

  // Every tap on a link or button
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('a[href], button, [role="tab"]');
    if (!t || t.disabled) return;
    if (t.classList.contains('post-btn') || t.classList.contains('btn-post')) Fx.heavy(); else Fx.tap();
  }, true);

  // Footer sound & vibration switch
  var fxBtn = document.getElementById('fx-toggle');
  function label() {
    if (fxBtn) fxBtn.textContent = 'Sound & vibration: ' + (on() ? 'On' : 'Off');
  }
  if (fxBtn) {
    label();
    fxBtn.addEventListener('click', function () { var v = !on(); setOn(v); if (v) Fx.tap(); });
  }

  // Dark mode button
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn && window.HBTheme) {
    var sync = function () { themeBtn.setAttribute('aria-pressed', String(document.documentElement.getAttribute('data-theme') === 'dark')); };
    sync();
    themeBtn.addEventListener('click', function () { window.HBTheme.toggle(); sync(); });
  }

  // Header shadow once the page scrolls
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
