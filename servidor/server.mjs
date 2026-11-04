// Servidor de referencia del Panel Central (Node 18+, sin dependencias).
//
// Implementa el contrato que el sitio de www.prepdiplomacia.com debe ofrecer al panel:
//   GET  /api/panel/state[?since=rev]   estado completo del panel (requiere sesión de administración)
//   PUT  /api/panel/state               guarda el estado con control de versión (409 si hay conflicto)
//   GET  /api/panel/events?after=id     novedades enviadas por los agentes (requiere sesión)
//   POST /api/panel/events              recibe novedades (sesión o token de agentes en Authorization: Bearer)
//
// Sirve además el panel en /panel/ con su propio inicio de sesión, para usarlo de forma
// independiente (por ejemplo en panel.prepdiplomacia.com) o como guía para integrarlo en el sitio.
//
// Variables de entorno:
//   PANEL_PASSWORD  contraseña de acceso al panel (obligatoria)
//   SESSION_SECRET  secreto largo y aleatorio para firmar la sesión (obligatorio)
//   AGENT_TOKEN     token que usan los agentes de Claude para enviar novedades (obligatorio)
//   PANEL_USER      nombre que se muestra como usuaria conectada (opcional)
//   DATA_DIR        carpeta donde se guardan los datos (por defecto ./datos)
//   PORT            puerto (por defecto 8080)

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'servidor', 'datos'));
const PORT = Number(process.env.PORT || 8080);
const { PANEL_PASSWORD, SESSION_SECRET, AGENT_TOKEN } = process.env;
const PANEL_USER = process.env.PANEL_USER || 'Carolina';
if (!PANEL_PASSWORD || !SESSION_SECRET || !AGENT_TOKEN) {
  console.error('Faltan variables de entorno: PANEL_PASSWORD, SESSION_SECRET y AGENT_TOKEN son obligatorias.');
  process.exit(1);
}

const EVENT_TYPES = new Set(['correcciones.informe', 'agente.corrida', 'workflow.item', 'tarea.nueva', 'metrica', 'movimiento', 'publicacion', 'nota']);
const MAX_BODY = 2 * 1024 * 1024;
const SESSION_DAYS = 30;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };

/* ---------- Almacenamiento en archivos JSON (escritura atómica) ---------- */
await fs.mkdir(DATA_DIR, { recursive: true });
const file = (n) => path.join(DATA_DIR, n);
async function readJson(n, fallback) { try { return JSON.parse(await fs.readFile(file(n), 'utf8')); } catch { return fallback; } }
async function writeJson(n, v) { const tmp = file(n + '.' + process.pid + '.tmp'); await fs.writeFile(tmp, JSON.stringify(v)); await fs.rename(tmp, file(n)); }
let lock = Promise.resolve();
const serial = (fn) => (lock = lock.then(fn, fn));

/* ---------- Sesión firmada ---------- */
const sign = (v) => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('base64url');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
function makeSession() { const exp = Date.now() + SESSION_DAYS * 864e5; const v = `admin.${exp}`; return `${v}.${sign(v)}`; }
function hasSession(req) {
  const m = /(?:^|;\s*)panel_sesion=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return false;
  const [role, exp, sig] = decodeURIComponent(m[1]).split('.');
  return role === 'admin' && Number(exp) > Date.now() && safeEq(sig || '', sign(`${role}.${exp}`));
}
const hasAgentToken = (req) => { const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || ''); return !!m && safeEq(m[1].trim(), AGENT_TOKEN); };
const isHttps = (req) => req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;

/* ---------- Utilidades HTTP ---------- */
function send(res, status, body, headers = {}) {
  const isObj = body !== undefined && typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, Object.assign({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-store' }, isObj ? { 'Content-Type': 'application/json; charset=utf-8' } : {}, headers));
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJsonBody(req) { const raw = await readBody(req); try { return JSON.parse(raw || 'null'); } catch { throw Object.assign(new Error('JSON inválido'), { status: 400 }); } }

/* ---------- Intentos de inicio de sesión ---------- */
const attempts = new Map();
function tooMany(ip) { const a = attempts.get(ip); return a && a.n >= 8 && Date.now() - a.t < 15 * 60e3; }
function fail(ip) { const a = attempts.get(ip) || { n: 0, t: Date.now() }; if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); } a.n++; attempts.set(ip, a); }

const loginPage = (msg = '') => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ingresar · Panel Central</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F3F5F8;font-family:"Open Sans",sans-serif;color:#0F1720;padding:16px}
form{background:#fff;border:1px solid #E2E8F0;border-top:4px solid #C6A75E;border-radius:16px;padding:28px;width:100%;max-width:360px;box-shadow:0 12px 40px rgba(15,23,32,.08)}
h1{font-family:Montserrat,sans-serif;color:#153D63;font-size:22px;margin:0 0 4px}p{color:#5B6B7C;margin:0 0 18px;font-size:14px}
label{font-size:12px;font-weight:600;color:#5B6B7C}input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #E2E8F0;border-radius:10px;font:inherit;margin:6px 0 16px}
button{width:100%;padding:11px;border:0;border-radius:10px;background:#153D63;color:#fff;font-weight:600;font:inherit;cursor:pointer}.err{color:#C2413A;font-size:13px;margin:-6px 0 12px}</style></head>
<body><form method="post" action="/panel/login"><h1>Panel Central</h1><p>Prep Diplomacia Uy · Carolina Techera RRII</p>${msg ? `<div class="err">${msg}</div>` : ''}<label for="p">Contraseña</label><input id="p" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Ingresar</button></form></body></html>`;

/* ---------- Rutas ---------- */
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  if (p === '/' ) return send(res, 302, '', { Location: '/panel/' });
  if (p === '/panel/login' && req.method === 'GET') return send(res, 200, loginPage(), { 'Content-Type': 'text/html; charset=utf-8' });
  if (p === '/panel/login' && req.method === 'POST') {
    if (tooMany(ip)) return send(res, 429, loginPage('Demasiados intentos. Espera unos minutos.'), { 'Content-Type': 'text/html; charset=utf-8' });
    const pw = new URLSearchParams(await readBody(req)).get('password') || '';
    if (!safeEq(pw, PANEL_PASSWORD)) { fail(ip); return send(res, 401, loginPage('Contraseña incorrecta.'), { 'Content-Type': 'text/html; charset=utf-8' }); }
    attempts.delete(ip);
    const back = url.searchParams.get('ReturnUrl');
    return send(res, 303, '', { Location: back && back.startsWith('/panel/') ? back : '/panel/', 'Set-Cookie': `panel_sesion=${encodeURIComponent(makeSession())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${isHttps(req) ? '; Secure' : ''}` });
  }
  if (p === '/panel/salir') return send(res, 303, '', { Location: '/panel/login', 'Set-Cookie': 'panel_sesion=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' });

  // API
  if (p.startsWith('/api/panel/')) {
    const route = p.slice('/api/panel'.length);
    if (route === '/events' && req.method === 'POST') {
      if (!hasSession(req) && !hasAgentToken(req)) return send(res, 401, { error: 'No autorizado' });
      const body = await readJsonBody(req);
      const list = Array.isArray(body) ? body : [body];
      if (!list.length || list.length > 50) return send(res, 400, { error: 'Envía entre 1 y 50 novedades' });
      for (const ev of list) if (!ev || !EVENT_TYPES.has(ev.type) || (ev.payload && typeof ev.payload !== 'object')) return send(res, 400, { error: `Tipo de novedad no válido: ${ev && ev.type}`, tipos: [...EVENT_TYPES] });
      const ids = await serial(async () => {
        const store = await readJson('events.json', { lastId: 0, items: [] });
        const out = [];
        for (const ev of list) { const id = ++store.lastId; store.items.push({ id, type: ev.type, payload: ev.payload || {}, source: String(ev.source || '').slice(0, 120), createdAt: new Date().toISOString() }); out.push(id); }
        if (store.items.length > 1000) store.items = store.items.slice(-1000);
        await writeJson('events.json', store); return out;
      });
      return send(res, 201, { ok: true, ids });
    }
    if (!hasSession(req)) return send(res, 401, { error: 'Inicia sesión' });
    if (route === '/state' && req.method === 'GET') {
      const st = await readJson('state.json', { rev: 0, data: null });
      const since = Number(url.searchParams.get('since'));
      if (url.searchParams.has('since') && since >= st.rev) return send(res, 204, '');
      return send(res, 200, st);
    }
    if (route === '/state' && req.method === 'PUT') {
      const body = await readJsonBody(req);
      if (!body || typeof body.data !== 'object' || body.data === null) return send(res, 400, { error: 'Falta data' });
      const result = await serial(async () => {
        const st = await readJson('state.json', { rev: 0, data: null });
        if (Number(body.rev) !== st.rev) return { status: 409, body: st };
        const next = { rev: st.rev + 1, data: body.data, updatedAt: new Date().toISOString() };
        await writeJson('state.json', next);
        // copia diaria de seguridad
        await writeJson(`respaldo-${next.updatedAt.slice(0, 10)}.json`, next);
        return { status: 200, body: { rev: next.rev } };
      });
      return send(res, result.status, result.body);
    }
    if (route === '/events' && req.method === 'GET') {
      const after = Number(url.searchParams.get('after') || 0);
      const store = await readJson('events.json', { lastId: 0, items: [] });
      return send(res, 200, store.items.filter((e) => e.id > after).slice(0, 200));
    }
    return send(res, 404, { error: 'Ruta no encontrada' });
  }

  // Panel (archivos estáticos)
  if (p === '/panel' ) return send(res, 302, '', { Location: '/panel/' });
  if (p.startsWith('/panel/')) {
    if (!hasSession(req)) return send(res, 302, '', { Location: '/panel/login' });
    const rel = p === '/panel/' ? 'index.html' : p.slice('/panel/'.length);
    if (!/^(index\.html|assets\/[\w.-]+)$/.test(rel)) return send(res, 404, 'No encontrado');
    let content = await fs.readFile(path.join(ROOT, rel));
    if (rel === 'index.html') {
      const cfg = `<script>window.PANEL_CONFIG=${JSON.stringify({ apiBase: '/api/panel', loginUrl: '/panel/login', user: PANEL_USER, logoutUrl: '/panel/salir' })};</script>`;
      content = content.toString('utf8').replace('<script src="assets/app.js"></script>', `${cfg}\n<script src="assets/app.js"></script>`);
    }
    return send(res, 200, content, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': rel === 'index.html' ? 'no-store' : 'public, max-age=300', 'X-Frame-Options': 'SAMEORIGIN' });
  }
  return send(res, 404, 'No encontrado');
}

http.createServer((req, res) => {
  handle(req, res).catch((e) => { if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Error interno' }); if (!e.status) console.error(e); });
}).listen(PORT, () => console.log(`Panel Central escuchando en http://localhost:${PORT}/panel/`));
