// LOCAL QA ONLY: no OneNew calls; never ship this server or fixture in the site.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = `
const realFetch = window.fetch.bind(window);
window.fetch = async (url, init = {}) => {
  if (String(url).endsWith('ask-aki-config.json')) return new Response(JSON.stringify({enabled:true,serverUrl:'https://fixture.invalid',embedId:'11111111-1111-4111-8111-111111111111'}));
  if (!String(url).startsWith('https://fixture.invalid/api/embed/')) throw new Error('Unexpected fixture request blocked');
  const {message} = JSON.parse(init.body);
  const enc = new TextEncoder();
  let timer;
  let streamController;
  const body = new ReadableStream({
    start(c) {
      streamController = c;
      let i = 0;
      const answer = '[LOCAL TEST FIXTURE — not an AI answer]\\n\\n' + ('A readable answer about public work. <img src=x onerror=alert(1)> stays harmless text.\\n\\n').repeat(5);
      const words = answer.match(/.{1,24}/gs);
      timer = setInterval(() => {
        if (/fail/i.test(message)) { c.enqueue(enc.encode('data: '+JSON.stringify({type:'abort',error:'private detail',close:true})+'\\n\\n')); c.close(); clearInterval(timer); return; }
        if (i < words.length) c.enqueue(enc.encode('data: '+JSON.stringify({type:'textResponseChunk',textResponse:words[i++]})+'\\n\\n'));
        else { c.enqueue(enc.encode('data: '+JSON.stringify({close:true,citations:[{url:'https://onenew.ai/',title:'OneNew'}]})+'\\n\\n')); c.close(); clearInterval(timer); }
      }, /slow/i.test(message) ? 700 : 12);
      init.signal.addEventListener('abort', () => {clearInterval(timer); try {c.error(init.signal.reason);} catch {}}, {once:true});
    }, cancel() { clearInterval(timer); }
  });
  return new Response(body,{headers:{'Content-Type':'text/event-stream'}});
};
document.addEventListener('DOMContentLoaded',()=>{document.title='LOCAL QA FIXTURE — Ask Aki';document.getElementById('aki-description').textContent='LOCAL QA FIXTURE · No live AI';});
`;
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1:4180').pathname;
    if (pathname === '/fixture.js') { res.writeHead(200, {'Content-Type':'text/javascript'}); res.end(fixture); return; }
    if (pathname === '/') {
      const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
      res.writeHead(200, {'Content-Type':'text/html'}); res.end(html.replace('<script type="module"', '<script src="/fixture.js"></script><script type="module"')); return;
    }
    if (!/^\/assets\/[a-z0-9.-]+$/.test(pathname) && pathname !== '/styles.css') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type':mime[path.extname(pathname)] || 'text/plain'});
    res.end(await fs.readFile(path.join(root, pathname)));
  } catch { res.writeHead(404); res.end(); }
}).listen(4180, '127.0.0.1', () => console.log('Local QA fixture: http://127.0.0.1:4180/ (no live AI or external requests)'));
