import { sendQuestion, validateConfig } from './ask-aki-transport.mjs';

const panel = document.getElementById('ask-aki');
const $ = id => document.getElementById(id);
const question = $('aki-question');
const scroll = $('aki-scroll');
const launcher = document.querySelector('.aki-launcher');
let config = { enabled: false };
let loaded = false;
let configPromise;
let controller;
let sessionId;
let opener;

function announce(text) { $('aki-announcement').textContent = text; }
function notice(text, retryQuestion) {
  const box = $('aki-notice');
  box.replaceChildren();
  box.hidden = !text;
  if (!text) return;
  box.append(document.createTextNode(text));
  if (retryQuestion) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Edit and try again';
    button.addEventListener('click', () => { question.value = retryQuestion; notice(''); updateControls(); question.focus(); });
    box.append(document.createElement('br'), button);
  }
}
function updateControls() {
  $('aki-send').disabled = !loaded || !question.value.trim() || Boolean(controller);
  $('aki-send').hidden = Boolean(controller);
  $('aki-stop').hidden = !controller;
  question.readOnly = Boolean(controller);
  $('aki-reset').hidden = !$('aki-messages').childElementCount;
}
async function loadConfig() {
  if (configPromise) return configPromise;
  configPromise = (async () => {
    try {
      const response = await fetch(new URL('./ask-aki-config.json', import.meta.url), { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Unavailable');
      config = validateConfig(await response.json());
      $('aki-mode').textContent = config.enabled ? 'Public knowledge · Read-only assistant' : 'Preview · Live chat is not connected';
    } catch {
      config = { enabled: false };
      $('aki-mode').textContent = 'Chat is currently unavailable';
      notice('Couldn’t connect to Ask Aki. Please email aki@onenew.ai.');
    } finally { loaded = true; updateControls(); }
  })();
  return configPromise;
}
function open(event) {
  opener = event.currentTarget;
  if (panel.open) return;
  panel.showModal();
  launcher.hidden = true;
  loadConfig();
  question.focus({ preventScroll: true });
}
for (const trigger of document.querySelectorAll('[data-open-ask-aki]')) trigger.addEventListener('click', open);
launcher.hidden = false;
// An in-page trigger is only shown when the widget has successfully initialized.
document.documentElement.classList.add('aki-ready');
$('aki-close').addEventListener('click', () => panel.close());
panel.addEventListener('close', () => { launcher.hidden = false; opener?.focus({ preventScroll: true }); });
panel.addEventListener('click', event => { if (event.target === panel) { const r = panel.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) panel.close(); } });

function addMessage(role, text) {
  const row = document.createElement('article');
  row.className = `aki-message aki-message-${role}`;
  const label = document.createElement('span');
  label.className = 'aki-message-label';
  label.textContent = role === 'user' ? 'You' : 'Ask Aki';
  const body = document.createElement('p');
  body.className = 'aki-message-body';
  body.textContent = text;
  row.append(label, body);
  $('aki-messages').append(row);
  return { row, body };
}
function renderSources(row, sources) {
  if (!sources.length) return;
  const links = document.createElement('div');
  links.className = 'aki-sources';
  links.setAttribute('aria-label', 'Sources for this answer');
  for (const source of sources) {
    const a = document.createElement('a');
    a.href = source.url; a.textContent = source.title; a.target = '_blank'; a.rel = 'noopener noreferrer';
    links.append(a);
  }
  row.append(links);
}
function toBottom() { scroll.scrollTop = scroll.scrollHeight; }
async function submit(message) {
  if (controller) return;
  await loadConfig();
  if (controller) return;
  const text = message.trim();
  if (!text) return;
  if (!config.enabled) {
    question.value = text;
    notice('This preview isn’t connected to live chat. Nothing was sent. You can email Aki directly.');
    updateControls(); question.focus(); return;
  }
  sessionId ||= crypto.randomUUID();
  notice('');
  $('aki-welcome').hidden = true;
  addMessage('user', text);
  const reply = addMessage('assistant', 'Finding an answer in Aki’s public knowledge…');
  reply.row.classList.add('aki-message-pending');
  question.value = '';
  const active = new AbortController();
  controller = active;
  let partial = '';
  updateControls(); toBottom(); announce('Ask Aki is preparing an answer.');
  const slow = setTimeout(() => { if (!partial) reply.body.textContent = 'Still working on your answer. You can stop at any time.'; }, 12000);
  try {
    const result = await sendQuestion({ config, sessionId, message: text, signal: active.signal, onUpdate: update => {
      const nearBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 90;
      if (update.text) { partial = update.text; reply.body.textContent = partial; reply.row.classList.remove('aki-message-pending'); }
      if (nearBottom) toBottom();
    }});
    renderSources(reply.row, result.sources);
    announce(`Ask Aki replied: ${result.text}`);
  } catch (error) {
    if (active.signal.reason === 'reset') return;
    let message = active.signal.aborted ? 'Response stopped.' : error.name === 'TimeoutError' ? 'The answer took too long. Please try again or email Aki.' : error instanceof TypeError ? 'Couldn’t reach Ask Aki. Check your connection or email Aki.' : error.message;
    if (partial) { reply.body.textContent = `${partial}\n\n[Response incomplete]`; }
    else reply.row.remove();
    notice(message, text); announce(message);
  } finally {
    clearTimeout(slow);
    reply.row.classList.remove('aki-message-pending');
    if (controller === active) { controller = undefined; updateControls(); }
  }
}
$('aki-form').addEventListener('submit', event => { event.preventDefault(); submit(question.value); });
question.addEventListener('input', updateControls);
question.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submit(question.value); } });
for (const prompt of panel.querySelectorAll('[data-aki-question]')) prompt.addEventListener('click', () => submit(prompt.dataset.akiQuestion));
$('aki-stop').addEventListener('click', () => controller?.abort('stopped'));
$('aki-reset').addEventListener('click', () => {
  controller?.abort('reset'); controller = undefined; sessionId = undefined;
  $('aki-messages').replaceChildren(); $('aki-welcome').hidden = false;
  question.value = ''; notice(''); updateControls(); announce('New conversation started. Previous messages were cleared from this panel, not from the service.'); question.focus();
});
