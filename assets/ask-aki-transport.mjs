// Public embed transport only. Never use an authenticated workspace/API key here.
export const MAX_QUESTION_LENGTH = 2000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const PUBLIC_HOSTS = new Set(['akigogikar.com', 'onenew.ai', 'actpass.org', 'mendelinfolabs.com', 'www.mendelinfolabs.com', 'arxiv.org', 'github.com', 'medium.com', 'huggingface.co']);

export function validateConfig(config) {
  if (config?.enabled !== true) return { enabled: false };
  const url = new URL(config.serverUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || !UUID.test(config.embedId)) {
    throw new Error('Invalid public embed configuration.');
  }
  return { enabled: true, serverUrl: url.origin, embedId: config.embedId };
}

export function publicSources(sources = []) {
  if (!Array.isArray(sources)) return [];
  const result = new Map();
  for (const source of sources) {
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || url.username || url.password || !PUBLIC_HOSTS.has(url.hostname)) continue;
      // Only explicit public URLs are surfaced; never expose internal document paths.
      result.set(url.href, { url: url.href, title: typeof source.title === 'string' ? source.title.slice(0,100) : url.hostname });
    } catch { /* Missing or non-public source links are not citations. */ }
  }
  return [...result.values()].slice(0, 8);
}

export async function readSSE(body, onEvent) {
  if (!body) throw new Error('The response stream is unavailable.');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let bytes = 0;
  let completed = false;
  const consume = () => {
    buffer = buffer.replace(/\r\n/g, '\n');
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      if (data === '[DONE]') { completed = true; return; }
      let event;
      try { event = JSON.parse(data); } catch { throw new Error('The response was interrupted. Please try again.'); }
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('The response was interrupted. Please try again.');
      onEvent(event);
      if (event.close === true) { completed = true; return; }
    }
  };
  try {
    while (!completed) {
      const { done, value } = await reader.read();
      if (done) { buffer += decoder.decode(); consume(); break; }
      bytes += value.byteLength;
      if (bytes > 262144) throw new Error('The response was too long. Please ask a narrower question.');
      buffer += decoder.decode(value, { stream: true });
      consume();
    }
    if (!completed) throw new Error('The connection ended before the answer was complete.');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function sendQuestion({ config, sessionId, message, signal, onUpdate, fetchImpl = fetch, timeoutMs = 90000 }) {
  const checked = validateConfig(config);
  if (!checked.enabled) throw new Error('Live chat is awaiting activation. You can still email Aki directly.');
  if (!UUID.test(sessionId)) throw new Error('Please start a new conversation.');
  const question = String(message ?? '').trim();
  if (!question || question.length > MAX_QUESTION_LENGTH) throw new Error('Please enter a question of 2,000 characters or fewer.');
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const response = await fetchImpl(`${checked.serverUrl}/api/embed/${checked.embedId}/stream-chat`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ sessionId, message: question }), signal: combined,
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('Ask Aki is receiving too many questions. Please try again later.');
    if (response.status === 403 || response.status === 404) throw new Error('Live chat is not available on this site yet. Please email Aki.');
    throw new Error('Ask Aki is unavailable right now. Please try again or email Aki.');
  }
  if (!response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Ask Aki returned an unexpected response. Please try again later.');
  let text = '';
  let sources = [];
  await readSSE(response.body, event => {
    if (event.type === 'abort' || event.type === 'error' || event.error) throw new Error('Ask Aki couldn’t complete this answer. Please try again or email Aki.');
    if (typeof event.textResponse === 'string') {
      if (event.type === 'textResponseChunk') text += event.textResponse;
      else if (event.type === 'textResponse') text = event.textResponse;
    }
    sources = publicSources([
      ...sources,
      ...(Array.isArray(event.sources) ? event.sources : []),
      ...(Array.isArray(event.citations) ? event.citations : []),
    ]);
    onUpdate?.({ text, sources });
  });
  if (!text.trim()) throw new Error('No answer was returned. Please try again or email Aki.');
  return { text, sources };
}
