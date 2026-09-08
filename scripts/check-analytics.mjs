import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../assets/analytics.js', import.meta.url), 'utf8');
function boot(saved = null, blocked = false, hostname = 'akigogikar.com') {
  const scripts = [], cookieWrites = [];
  const control = (value) => ({ dataset: { choice: value }, addEventListener(_, f) { this.click = f; }, focus() {} });
  const accept = control('accepted'), reject = control('rejected'), settings = control();
  const panel = { setAttribute() {}, querySelectorAll: () => [reject, accept], querySelector: () => reject };
  let reloaded = false;
  const document = {
    referrer: 'https://example.org/private?email=secret@example.org#private',
    get cookie() { return '_ga=abc; _ga_T327WZ0FQJ=def; unrelated=keep'; },
    set cookie(v) { cookieWrites.push(v); },
    head: { appendChild: s => scripts.push(s) }, body: { appendChild() {} },
    createElement: type => type === 'section' ? panel : {},
    querySelectorAll: () => [settings]
  };
  const localStorage = {
    getItem() { if (blocked) throw Error('blocked'); return saved; },
    setItem(_, v) { if (blocked) throw Error('blocked'); saved = v; }
  };
  const context = { document, localStorage, location: { hostname, pathname: '/press/',
    search: '?email=secret@example.org', hash: '#secret', reload() { reloaded = true; } },
    Date, URL, window: {} };
  vm.runInNewContext(source, context);
  return { context, scripts, panel, accept, reject, settings, cookieWrites,
    saved: () => saved, reloaded: () => reloaded };
}
const choice = (value, at = Date.now()) => JSON.stringify({ value, at });
const first = boot();
assert.equal(first.scripts.length, 0);
assert.equal(first.panel.hidden, false);
first.reject.click();
assert.equal(first.scripts.length, 0);
assert.equal(JSON.parse(first.saved()).value, 'rejected');
first.settings.click(); first.accept.click(); first.accept.click();
assert.equal(first.scripts.length, 1, 'repeat accept must not duplicate tag');
assert.equal(first.scripts[0].referrerPolicy, 'no-referrer');
const commands = first.context.window.dataLayer.map(a => Array.from(a));
assert.equal(commands.filter(c => c[0] === 'event' && c[1] === 'page_view').length, 1);
const config = commands.find(c => c[0] === 'config')[2];
assert.equal(config.send_page_view, false);
assert.equal(config.page_location, 'https://akigogikar.com/press/');
assert.equal(config.page_referrer, 'https://example.org/');
assert.equal(JSON.stringify(commands).includes('secret'), false);
first.reject.click();
assert.equal(first.context.window['ga-disable-G-T327WZ0FQJ'], true);
assert.equal(first.reloaded(), true);
assert(first.cookieWrites.every(c => c.startsWith('_ga')));
assert.equal(boot(choice('accepted')).scripts.length, 1);
assert.equal(boot(choice('rejected')).scripts.length, 0);
assert.equal(boot(choice('accepted', 0)).scripts.length, 0);
assert.equal(boot(choice('accepted', Date.now() + 100000)).scripts.length, 0);
assert.equal(boot('{invalid').scripts.length, 0);
const unavailable = boot(null, true);
assert.equal(unavailable.scripts.length, 0);
unavailable.accept.click(); assert.equal(unavailable.scripts.length, 1);
assert.equal(boot(choice('accepted'), false, 'localhost').scripts.length, 0);
for (const path of ['index.html', 'press/index.html', 'privacy/index.html']) {
  const html = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  assert.equal((html.match(/src="\/assets\/analytics.js"/g) || []).length, 1);
  assert(html.includes('data-analytics-settings'));
  assert(!html.includes('googletagmanager.com/gtag'));
}
console.log('PASS consent lifecycle, storage errors/expiry, single pageview, sanitized payloads, withdrawal and three page installations');
