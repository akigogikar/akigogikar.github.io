(() => {
  'use strict';
  const ID = 'G-T327WZ0FQJ';
  const KEY = 'aki-analytics-choice-v1';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  let started = false;
  let choice = null;
  let returnFocus = null;
  window['ga-disable-' + ID] = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && ['accepted', 'rejected'].includes(saved.value) &&
        Number.isFinite(saved.at) && Date.now() >= saved.at &&
        Date.now() - saved.at < MAX_AGE) choice = saved.value;
  } catch { /* Storage unavailable: ask on each page; do not track by default. */ }

  function clearAnalyticsCookies() {
    for (const entry of document.cookie.split(';')) {
      const name = entry.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', '; Domain=akigogikar.com', '; Domain=.akigogikar.com']) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure' + domain;
      }
    }
  }

  function start() {
    if (started || choice !== 'accepted' || location.hostname !== 'akigogikar.com') return;
    started = true;
    window['ga-disable-' + ID] = false;
    window.dataLayer = window.dataLayer || [];
    const gtag = function () { window.dataLayer.push(arguments); };
    gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('js', new Date());
    // ponytail: only known static pages; extend this allowlist with new pages.
    const pages = {
      '/': 'Aki Gogikar', '/index.html': 'Aki Gogikar',
      '/press/': 'Press and speaking', '/press/index.html': 'Press and speaking',
      '/privacy/': 'Privacy', '/privacy/index.html': 'Privacy'
    };
    const page = Object.hasOwn(pages, location.pathname) ? location.pathname : '/';
    let referrer = '';
    try { referrer = new URL(document.referrer).origin + '/'; } catch { /* No referrer. */ }
    gtag('config', ID, {
      send_page_view: false,
      page_location: 'https://akigogikar.com' + page,
      page_title: pages[page], page_referrer: referrer,
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_expires: 60 * 24 * 60 * 60, cookie_update: false
    });
    gtag('event', 'page_view');
    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(script);
  }

  const panel = document.createElement('section');
  panel.className = 'analytics-choice';
  panel.setAttribute('aria-label', 'Analytics privacy choice');
  panel.innerHTML = '<h2>Optional website analytics</h2>' +
    '<p>With your permission, Google Analytics helps us understand visits to this site. ' +
    'It uses cookies and sends usage data to Google. No advertising tracking. ' +
    '<a href="/privacy/">Privacy details</a>. You can change your choice at any time.</p>' +
    '<div><button type="button" data-choice="rejected">Reject analytics</button> ' +
    '<button type="button" data-choice="accepted">Accept analytics</button></div>';
  document.body.appendChild(panel);
  panel.hidden = choice !== null;
  if (choice !== 'accepted') clearAnalyticsCookies();
  for (const button of panel.querySelectorAll('[data-choice]')) {
    button.addEventListener('click', () => {
      choice = button.dataset.choice;
      try { localStorage.setItem(KEY, JSON.stringify({ value: choice, at: Date.now() })); }
      catch { /* In-memory choice works for this page only. */ }
      panel.hidden = true;
      if (choice === 'accepted') start();
      else {
        window['ga-disable-' + ID] = true;
        clearAnalyticsCookies();
        // Unload third-party code rather than trusting it to stop every timer.
        if (started) { location.reload(); return; }
      }
      if (returnFocus) returnFocus.focus();
    });
  }
  for (const button of document.querySelectorAll('[data-analytics-settings]')) {
    button.addEventListener('click', () => {
      returnFocus = button;
      panel.hidden = false;
      panel.querySelector('[data-choice="rejected"]').focus();
    });
  }
  start();
})();
