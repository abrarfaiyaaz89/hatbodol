// Shared layout: header, mobile bottom nav, footer. Used by every page.
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(name) { return page === name ? ' aria-current="page"' : ''; }

  var icon = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    explore: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    moon: '<path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>'
  };
  function svg(name, size) {
    return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icon[name] + '</svg>';
  }

  var header =
    '<header class="site-header"><div class="container">' +
      '<a class="brand" href="index.html" aria-label="Hat Bodol home"><img src="logo.jpg" alt="Hat Bodol"></a>' +
      '<nav class="nav-desktop" aria-label="Main">' +
        '<a href="index.html"' + cur('home') + '>Home</a>' +
        '<a href="explore.html"' + cur('explore') + '>Explore</a>' +
        '<a href="services.html"' + cur('services') + '>Services</a>' +
        '<a href="vendors.html"' + cur('vendors') + '>Food &amp; Vendors</a>' +
      '</nav>' +
      '<form class="search" role="search" action="explore.html">' +
        '<label class="visually-hidden" for="site-search">Search HATBODOL</label>' +
        '<input id="site-search" name="q" type="search" placeholder="Search items, services...">' +
        '<button type="submit" aria-label="Search">' + svg('search', 20) + '</button>' +
      '</form>' +
      '<button class="icon-btn" id="theme-toggle" type="button" aria-label="Switch dark mode"><span class="moon">' + svg('moon', 20) + '</span><span class="sun">' + svg('sun', 20) + '</span></button>' +
      '<a class="btn-login" href="login.html"' + cur('profile') + '>Login</a>' +
      '<a class="btn-post" href="post.html">Post</a>' +
      '<div class="um" id="user-menu"></div>' +
    '</div></header>';

  var bottom =
    '<nav class="bottom-nav" aria-label="Mobile">' +
      '<a href="index.html"' + cur('home') + '>' + svg('home') + 'Home</a>' +
      '<a href="explore.html"' + cur('explore') + '>' + svg('explore') + 'Explore</a>' +
      '<a class="post-btn" href="post.html"' + cur('post') + ' aria-label="Post a listing"><span class="circle">' + svg('plus', 26) + '</span>Post</a>' +
      '<a href="messages.html"' + cur('messages') + '>' + svg('msg') + 'Messages</a>' +
      '<a href="auth.html"' + cur('profile') + '>' + svg('user') + 'Profile</a>' +
    '</nav>';

  var footer =
    '<footer class="site-footer"><div class="container">' +
      '<div class="cols">' +
        '<div><h2>HATBODOL</h2><p>A student marketplace for the University of Chittagong.</p></div>' +
        '<div><h2>Explore</h2><ul><li><a href="explore.html">Marketplace</a></li><li><a href="services.html">Services</a></li><li><a href="vendors.html">Food &amp; Vendors</a></li></ul></div>' +
        '<div><h2>Help</h2><ul><li><a href="help.html">Help &amp; Support</a></li><li><a href="about.html">About</a></li><li><a href="settings.html">Settings</a></li><li><a href="privacy.html">Privacy &amp; Terms</a></li></ul></div>' +
      '</div>' +
      '<button class="fx-btn" id="fx-toggle" type="button">Sound &amp; vibration</button>' +
      '<p class="copy">&copy; ' + new Date().getFullYear() + ' HATBODOL</p>' +
    '</div></footer>';

  function put(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
  put('site-header', header);
  put('site-bottom-nav', bottom);
  put('site-footer', footer);

  // Load sound/haptics/theme button behaviour after the layout exists
  var fx = document.createElement('script');
  fx.src = 'fx.js';
  document.body.appendChild(fx);
  var um = document.createElement('script');
  um.type = 'module';
  um.src = 'usermenu.js';
  document.body.appendChild(um);
})();
