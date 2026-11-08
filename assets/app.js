/* Panel Central · Prep Diplomacia Uy y Carolina Techera RRII
   Aplicación de una sola página, sin dependencias. Los datos viven en localStorage
   y se exportan o importan como JSON desde Ajustes. */
(function () {
  'use strict';

  const KEY = 'panel-central-pd-v1';
  const THEME_KEY = 'panel-central-theme';
  /* Modo servidor: la web define window.PANEL_CONFIG = { apiBase: '/api/panel', loginUrl: '/cuenta/login' }.
     Sin esa configuración el panel guarda los datos en el navegador. */
  const CFG = Object.assign({ pollSeconds: 30 }, window.PANEL_CONFIG || {});
  const REMOTE = !!CFG.apiBase;

  /* ================= Utilidades ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  const today = () => iso(new Date());
  const fmtDate = (s) => { if (!s) return ''; const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTHS_S = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const DOW_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const ym = (s) => String(s).slice(0, 7);
  const ymLabel = (k) => { const [y, m] = k.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
  const nextDow = (dow) => { const d = new Date(); return addDays(d, (dow - d.getDay() + 7) % 7); };
  const num = (v) => new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(v || 0);
  const money = (v, cur = 'UYU') => (cur === 'USD' ? 'US$ ' : '$ ') + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(Math.round(v || 0));
  const short = (v) => { const a = Math.abs(v); if (a >= 1e6) return (v / 1e6).toFixed(1) + ' M'; if (a >= 1e3) return Math.round(v / 1e3) + ' k'; return String(Math.round(v)); };
  const plural = (n, s, p) => `${num(n)} ${n === 1 ? s : (p || s + 's')}`;

  /* ================= Catálogos ================= */
  const BRANDS = [
    { id: 'pd', name: 'Prep Diplomacia Uy', short: 'Prep Diplomacia', color: '#153D63' },
    { id: 'ct', name: 'Carolina Techera RRII', short: 'Carolina Techera', color: '#C6A75E' },
  ];
  const brandName = (id) => (BRANDS.find((b) => b.id === id) || { name: 'Ambas marcas' }).name;
  const brandColor = (id) => (BRANDS.find((b) => b.id === id) || { color: '#64768C' }).color;
  const TASK_STATUS = [['pendiente', 'Pendiente', '#94A3B8'], ['en_curso', 'En curso', '#5B8FC7'], ['hecha', 'Hecha', '#1F8A5B']];
  const POST_STATUS = [['idea', 'Idea', '#94A3B8'], ['produccion', 'En producción', '#5B8FC7'], ['programada', 'Programada', '#C6A75E'], ['publicada', 'Publicada', '#1F8A5B']];
  const PROJ_STATUS = [['planificado', 'Planificado'], ['activo', 'Activo'], ['pausado', 'Pausado'], ['cerrado', 'Cerrado']];
  const CHANNELS = ['Instagram', 'LinkedIn', 'Web / Blog', 'Substack', 'Newsletter', 'YouTube', 'Facebook', 'WhatsApp', 'Otro'];
  const INCOME_CATS = ['Matrículas del curso', 'Cuotas del curso', 'Formaciones y talleres', 'Consultoría e investigación', 'Clases particulares', 'Otros ingresos'];
  const EXPENSE_CATS = ['Plataformas y software', 'Publicidad y marketing', 'Docentes y colaboradores', 'Diseño y producción', 'Impuestos y aportes', 'Comisiones bancarias', 'Dominio y web', 'Otros gastos'];
  const METRIC_KEYS = [['ig_seguidores', 'Seguidores en Instagram'], ['li_seguidores', 'Seguidores en LinkedIn'], ['web_visitas', 'Visitas a la web'], ['news_suscriptores', 'Suscriptores (newsletter y Substack)'], ['alumnos', 'Alumnos activos'], ['consultas', 'Consultas recibidas'], ['conversion', 'Conversión de consultas (%)'], ['clientes', 'Clientes de consultoría']];
  const metricLabel = (k) => (METRIC_KEYS.find((m) => m[0] === k) || [k, k])[1];
  const CONTACT_TYPES = ['Alumno/a', 'Interesado/a', 'Cliente', 'Aliado/a', 'Docente', 'Proveedor', 'Otro'];
  const CRM_STAGES = [['nuevo', 'Nuevo', '#94A3B8'], ['contactado', 'Contactado', '#5B8FC7'], ['reunion', 'Reunión', '#6B4FBB'], ['propuesta', 'Propuesta', '#C6A75E'], ['activo', 'Alumno o cliente activo', '#1F8A5B'], ['inactivo', 'Inactivo', '#64768C'], ['perdido', 'Perdido', '#C2413A']];
  const INTER_TYPES = [['nota', 'Nota'], ['llamada', 'Llamada'], ['reunion', 'Reunión'], ['correo', 'Correo'], ['whatsapp', 'WhatsApp'], ['pago', 'Pago'], ['clase', 'Clase o devolución'], ['otro', 'Otro']];
  const SOURCES = ['Instagram', 'WhatsApp', 'Web', 'Recomendación', 'Google Calendar', 'Calendly', 'LinkedIn', 'Correo', 'Evento', 'Notion', 'Importación', 'Otro'];
  const OWNERS = ['Carolina', 'Agente IA', 'Colaborador/a'];
  const label = (arr, v) => (arr.find((a) => a[0] === v) || [v, v])[1];

  /* Tareas de redacción del curso en Moodle (cmid de cada actividad) */
  const MOODLE = 'https://prepdiplomacia.moodlecloud.com';
  const CLASSES = [
    { key: 'C02', label: 'Clase 02 · Diagnóstico', cmid: 125 },
    { key: 'C03', label: 'Clase 03 · Tarea 1', cmid: 134 },
    { key: 'C03-T3', label: 'Clase 03 · Tarea 3 · Nacionalidad y ciudadanía', cmid: 178 },
    { key: 'C04', label: 'Clase 04 · Tarea 1', cmid: 140 },
    { key: 'C05', label: 'Clase 05 · Tarea 1', cmid: 146 },
    { key: 'C06', label: 'Clase 06 · Tarea 1', cmid: 154 },
    { key: 'C07', label: 'Clase 07 · Tarea 1', cmid: 167 },
    { key: 'C08', label: 'Clase 08 · Tarea 1', cmid: 170 },
  ];
  const classMeta = (k) => CLASSES.find((c) => c.key === k) || { key: k, label: k.replace(/^C(\d+)/, 'Clase $1'), cmid: null };
  const gradingUrl = (k) => { const c = classMeta(k); return c.cmid ? `${MOODLE}/mod/assign/view.php?id=${c.cmid}&action=grading` : `${MOODLE}/mod/assign/index.php?id=9`; };
  const CORR_STAGES = ['nueva', 'descargada', 'revision', 'devuelta', 'problema'];

  /* ================= Workflows predefinidos ================= */
  const st = (id, name, color) => ({ id, name, color });
  function defaultWorkflows() {
    return [
      { id: 'wf-corr', name: 'Correcciones de alumnos', brand: 'pd', color: '#153D63', builtin: true, desc: 'Tareas de redacción del curso, desde la entrega en Moodle hasta la devolución. Lo alimenta el agente diario de correcciones.',
        stages: [st('nueva', 'Entregada en Moodle', '#94A3B8'), st('descargada', 'Descargada sin corregir', '#5B8FC7'), st('revision', 'En tu revisión', '#C6A75E'), st('devuelta', 'Devuelta en Moodle', '#1F8A5B'), st('problema', 'Con problema', '#C2413A')] },
      { id: 'wf-carrusel', name: 'Carrusel de noticia', brand: 'all', color: '#B2914A', builtin: true, desc: 'De la propuesta diaria del agente a la publicación en Instagram, para ambas cuentas.',
        stages: [st('propuesta', 'Propuesta del agente', '#94A3B8'), st('elegida', 'Noticia elegida', '#6B4FBB'), st('verificacion', 'Verificación en fuentes', '#5B8FC7'), st('redaccion', 'Redacción', '#2F6FB0'), st('canva', 'Diseño en Canva', '#C6A75E'), st('programado', 'Programado', '#B7700B'), st('publicado', 'Publicado', '#1F8A5B')] },
      { id: 'wf-blog', name: 'Artículo Panorama internacional', brand: 'pd', color: '#2F6FB0', builtin: true, desc: 'Blog en www.prepdiplomacia.com y Substack: propuesta de temas, redacción con auditoría y publicación.',
        stages: [st('propuesta', 'Temas propuestos', '#94A3B8'), st('elegido', 'Tema elegido', '#6B4FBB'), st('redaccion', 'Redacción y auditoría', '#2F6FB0'), st('listo', 'Listo para publicar', '#C6A75E'), st('publicado', 'Publicado', '#1F8A5B')] },
      { id: 'wf-materiales', name: 'Materiales de la semana', brand: 'pd', color: '#1F4F7D', builtin: true, desc: 'Preparación de los materiales de cada clase, publicados el jueves nueve días antes.',
        stages: [st('prep', 'En preparación', '#94A3B8'), st('revision', 'En revisión', '#C6A75E'), st('cargado', 'Cargado en Moodle', '#5B8FC7'), st('publicado', 'Publicado', '#1F8A5B')] },
      { id: 'wf-captacion', name: 'Captación de alumnos', brand: 'pd', color: '#1F8A5B', builtin: true, desc: 'Embudo de consultas para el curso: de la primera consulta a la inscripción.',
        stages: [st('consulta', 'Consulta recibida', '#94A3B8'), st('respondida', 'Respuesta enviada', '#5B8FC7'), st('reunion', 'Reunión', '#6B4FBB'), st('propuesta', 'Propuesta enviada', '#C6A75E'), st('inscripto', 'Inscripto/a', '#1F8A5B')] },
      { id: 'wf-consultoria', name: 'Consultoría e investigación', brand: 'ct', color: '#C6A75E', builtin: true, desc: 'Encargos de consultoría y de investigación académica, del primer contacto al cobro.',
        stages: [st('contacto', 'Contacto', '#94A3B8'), st('propuesta', 'Propuesta', '#C6A75E'), st('curso', 'En curso', '#2F6FB0'), st('entregado', 'Entregado', '#6B4FBB'), st('cobrado', 'Cobrado', '#1F8A5B')] },
    ];
  }

  /* Agentes programados en Claude (datos al 04/11/2026) */
  function defaultAgents() {
    const a = (id, name, brand, time, tz, desc, wf, status, note) => ({ id, name, brand, time, tz, desc, wf, lastRun: '2026-11-04', lastStatus: status, lastNote: note || '', link: 'https://claude.ai/code' });
    return [
      a('ag-blog', 'Artículo diario · Panorama internacional', 'pd', '08:47', 'París', 'Propone temas del día y redacta el artículo cuando eliges uno. Deja el borrador en Google Docs, listo para la web y Substack.', 'wf-blog', 'ok'),
      a('ag-corr', 'Correcciones diarias Moodle', 'pd', '11:18', 'París', 'Lee las entregas en Moodle, las descarga, las corrige con un auditor independiente y las deja para tu revisión. Moodle queda en solo lectura.', 'wf-corr', 'falla', 'Moodle pidió iniciar sesión en los dos intentos. Séptimo día seguido sin datos de Moodle.'),
      a('ag-carr-pd', 'Carrusel del día · Prep Diplomacia Uy', 'pd', '12:00', 'Casablanca', 'Propone tres noticias para @prepdiplomaciauy y espera tu elección para verificar y redactar el carrusel.', 'wf-carrusel', 'ok'),
      a('ag-news', 'Noticias de política exterior · análisis diario', 'ct', '12:00', 'UTC', 'Cinco noticias de geopolítica para elegir y guion de reel en PowerPoint para editar en Canva.', 'wf-carrusel', 'ok'),
      a('ag-ctrl', 'Control del agente de correcciones', 'pd', '12:15', 'París', 'Comprueba que el agente de correcciones haya corrido y te avisa si no lo hizo.', 'wf-corr', 'ok'),
      a('ag-carr-ct', 'Carrusel del día · Carolina Techera RRII', 'ct', '18:55', 'Casablanca', 'Propone tres noticias con lectura de autora para @carolina_techera_rrii.', 'wf-carrusel', 'ok'),
    ];
  }

  /* Informe del agente de correcciones del 04/11/2026 (cantidades agregadas, sin datos personales) */
  function defaultReport() {
    return {
      id: 'rep-2026-11-04', date: '2026-11-04', time: '11:20', status: 'falla',
      summary: 'Moodle pidió iniciar sesión en los dos intentos (11:19 hs de París). Séptimo día seguido sin datos de Moodle: quedaron sin hacer las descargas, las correcciones nuevas y el cotejo de devoluciones. Las carpetas siguen sin cambios en las últimas 25 horas.',
      classes: { C02: { devuelta: 22 }, C03: { revision: 16, devuelta: 3 }, C04: { revision: 15, devuelta: 2 }, C05: { revision: 13, devuelta: 1, problema: 1 }, C06: { revision: 14 }, C07: { revision: 12 }, C08: { revision: 7 } },
      problems: ['Clase 05: una entrega sin el Tema 3'],
      todos: [{ text: 'Abrir Chrome', done: false }, { text: 'Iniciar sesión en prepdiplomacia.moodlecloud.com', done: false }, { text: 'Escribir en Claude "corre el agente de correcciones"', done: false }, { text: 'Reconectar Gmail con permiso de envío para recibir el informe por correo', done: false }],
      pendingNotes: ['Clase 03 · Tarea 3 (Nacionalidad y ciudadanía) sin leer todavía', 'Clases 09 en adelante sin descubrir hasta leer Moodle'],
      raw: '',
    };
  }

  /* ================= Esquemas de formularios ================= */
  const brandOpts = () => BRANDS.map((b) => [b.id, b.name]);
  const brandOptsAll = () => [['all', 'Ambas marcas']].concat(brandOpts());
  const projectOpts = () => [['', 'Sin proyecto']].concat(S.projects.map((p) => [p.id, p.name]));
  const contactOpts = () => [['', 'Sin persona']].concat(S.contacts.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map((c) => [c.id, c.name]));
  const wfOpts = () => S.workflows.map((w) => [w.id, w.name]);
  const stageOpts = (wfId) => ((S.workflows.find((w) => w.id === wfId) || S.workflows[0] || { stages: [] }).stages).map((s) => [s.id, s.name]);
  const SCHEMAS = {
    tasks: { title: 'Tarea', fields: [
      { k: 'title', l: 'Título', t: 'text', req: true, full: true },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'project', l: 'Proyecto', t: 'select', o: projectOpts },
      { k: 'contact', l: 'Persona', t: 'select', o: () => contactOpts() },
      { k: 'due', l: 'Fecha', t: 'date' }, { k: 'time', l: 'Hora', t: 'time' },
      { k: 'priority', l: 'Prioridad', t: 'select', o: () => [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']] },
      { k: 'status', l: 'Estado', t: 'select', o: () => TASK_STATUS },
      { k: 'repeat', l: 'Repetición', t: 'select', o: () => [['none', 'No se repite'], ['weekly', 'Cada semana'], ['biweekly', 'Cada dos semanas'], ['monthly', 'Cada mes']], full: true },
      { k: 'notes', l: 'Notas', t: 'textarea', full: true },
    ], defaults: () => ({ brand: defBrand(), priority: 'media', status: 'pendiente', repeat: 'none', due: today() }) },
    items: { title: 'Ítem de workflow', fields: [
      { k: 'title', l: 'Título', t: 'text', req: true, full: true },
      { k: 'wf', l: 'Workflow', t: 'select', o: wfOpts },
      { k: 'stage', l: 'Etapa', t: 'select', o: (obj) => stageOpts(obj.wf) },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'owner', l: 'Responsable', t: 'select', o: () => OWNERS.map((o) => [o, o]) },
      { k: 'due', l: 'Fecha límite', t: 'date' },
      { k: 'count', l: 'Cantidad (si agrupa varias)', t: 'number', min: 1 },
      { k: 'contact', l: 'Persona', t: 'select', o: () => contactOpts() },
      { k: 'link', l: 'Enlace (Moodle, Drive, Canva…)', t: 'url', full: true },
      { k: 'notes', l: 'Notas', t: 'textarea', full: true },
    ], defaults: () => ({ wf: (ui.route === 'workflow' && ui.param) || S.workflows[0]?.id, brand: defBrand(), owner: 'Carolina' }) },
    workflows: { title: 'Workflow', fields: [
      { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOptsAll },
      { k: 'color', l: 'Color', t: 'color' },
      { k: 'desc', l: 'Descripción', t: 'textarea', full: true },
      { k: 'stagesText', l: 'Etapas (una por línea, en orden)', t: 'textarea', full: true, req: true, hint: 'Al renombrar una etapa, los ítems que estaban en ella pasan a la primera.' },
    ], defaults: () => ({ brand: defBrand(), color: '#153D63', stagesText: 'Por hacer\nEn curso\nEn revisión\nHecho' }) },
    agents: { title: 'Agente programado', fields: [
      { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'wf', l: 'Workflow que alimenta', t: 'select', o: () => [['', 'Ninguno']].concat(wfOpts()) },
      { k: 'time', l: 'Hora diaria', t: 'time' }, { k: 'tz', l: 'Zona horaria', t: 'text' },
      { k: 'desc', l: 'Qué hace', t: 'textarea', full: true },
      { k: 'lastRun', l: 'Última corrida', t: 'date' },
      { k: 'lastStatus', l: 'Resultado', t: 'select', o: () => [['ok', 'Correcta'], ['aviso', 'Con avisos'], ['falla', 'Falla']] },
      { k: 'lastNote', l: 'Nota de la última corrida', t: 'textarea', full: true },
      { k: 'link', l: 'Enlace', t: 'url', full: true },
    ], defaults: () => ({ brand: defBrand(), tz: 'Casablanca', lastStatus: 'ok', link: 'https://claude.ai/code' }) },
    posts: { title: 'Publicación', fields: [
      { k: 'title', l: 'Título o tema', t: 'text', req: true, full: true },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'channel', l: 'Canal', t: 'select', o: () => CHANNELS.map((c) => [c, c]) },
      { k: 'format', l: 'Formato', t: 'select', o: () => ['Carrusel', 'Reel', 'Historia', 'Post', 'Artículo', 'Video', 'Correo'].map((c) => [c, c]) },
      { k: 'status', l: 'Estado', t: 'select', o: () => POST_STATUS },
      { k: 'date', l: 'Fecha de publicación', t: 'date' }, { k: 'time', l: 'Hora', t: 'time' },
      { k: 'copy', l: 'Texto o guion', t: 'textarea', full: true },
      { k: 'link', l: 'Enlace (Canva, publicación…)', t: 'url', full: true },
      { k: 'reach', l: 'Alcance', t: 'number' }, { k: 'interactions', l: 'Interacciones', t: 'number' },
      { k: 'saves', l: 'Guardados', t: 'number' }, { k: 'clicks', l: 'Clics o mensajes', t: 'number' },
    ], defaults: () => ({ brand: defBrand(), channel: 'Instagram', format: 'Carrusel', status: 'idea', date: today() }) },
    transactions: { title: 'Movimiento contable', fields: [
      { k: 'type', l: 'Tipo', t: 'select', o: () => [['ingreso', 'Ingreso'], ['gasto', 'Gasto']] },
      { k: 'date', l: 'Fecha', t: 'date', req: true },
      { k: 'desc', l: 'Concepto', t: 'text', req: true, full: true },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'category', l: 'Categoría', t: 'select', o: () => INCOME_CATS.concat(EXPENSE_CATS).map((c) => [c, c]) },
      { k: 'amount', l: 'Importe', t: 'number', req: true, step: '0.01' },
      { k: 'currency', l: 'Moneda', t: 'select', o: () => [['UYU', 'Pesos uruguayos'], ['USD', 'Dólares'], ['EUR', 'Euros']] },
      { k: 'project', l: 'Proyecto', t: 'select', o: projectOpts },
      { k: 'contact', l: 'Persona', t: 'select', o: () => contactOpts() },
      { k: 'status', l: 'Estado', t: 'select', o: () => [['cobrado', 'Cobrado o pagado'], ['pendiente', 'Pendiente']] },
      { k: 'notes', l: 'Notas (factura, medio de pago…)', t: 'textarea', full: true },
    ], defaults: () => ({ type: 'ingreso', date: today(), brand: defBrand(), currency: 'UYU', status: 'cobrado', category: INCOME_CATS[0] }) },
    projects: { title: 'Proyecto', fields: [
      { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'status', l: 'Estado', t: 'select', o: () => PROJ_STATUS },
      { k: 'start', l: 'Inicio', t: 'date' }, { k: 'end', l: 'Fin previsto', t: 'date' },
      { k: 'budget', l: 'Presupuesto (UYU)', t: 'number' }, { k: 'progress', l: 'Avance manual (%)', t: 'number', min: 0, max: 100 },
      { k: 'desc', l: 'Descripción y objetivos', t: 'textarea', full: true },
    ], defaults: () => ({ brand: defBrand(), status: 'activo', start: today(), progress: 0 }) },
    metrics: { title: 'Registro de métrica', fields: [
      { k: 'key', l: 'Métrica', t: 'select', o: () => METRIC_KEYS },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'date', l: 'Fecha', t: 'date', req: true },
      { k: 'value', l: 'Valor', t: 'number', req: true, step: 'any' },
      { k: 'notes', l: 'Nota', t: 'text', full: true },
    ], defaults: () => ({ key: ui.metricKey || 'ig_seguidores', brand: defBrand(), date: today() }) },
    contacts: { title: 'Persona', fields: [
      { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
      { k: 'type', l: 'Tipo', t: 'select', o: () => CONTACT_TYPES.map((c) => [c, c]) },
      { k: 'stage', l: 'Etapa', t: 'select', o: () => CRM_STAGES },
      { k: 'email', l: 'Correo', t: 'email' }, { k: 'phone', l: 'Teléfono o WhatsApp', t: 'text' },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'source', l: 'Origen', t: 'select', o: () => [['', 'Sin dato']].concat(SOURCES.map((x) => [x, x])) },
      { k: 'country', l: 'País', t: 'text' }, { k: 'tags', l: 'Etiquetas (separadas por comas)', t: 'text' },
      { k: 'followup', l: 'Próximo seguimiento', t: 'date' }, { k: 'value', l: 'Valor estimado (UYU)', t: 'number' },
      { k: 'nextAction', l: 'Próxima acción', t: 'text', full: true },
      { k: 'project', l: 'Proyecto', t: 'select', o: projectOpts },
      { k: 'notes', l: 'Notas', t: 'textarea', full: true },
    ], defaults: () => ({ type: 'Interesado/a', stage: 'nuevo', brand: defBrand(), created: today() }) },
    interactions: { title: 'Contacto registrado', fields: [
      { k: 'contact', l: 'Persona', t: 'select', o: () => contactOpts(), req: true, full: true },
      { k: 'type', l: 'Tipo', t: 'select', o: () => INTER_TYPES },
      { k: 'date', l: 'Fecha', t: 'date', req: true },
      { k: 'summary', l: 'Qué pasó', t: 'textarea', req: true, full: true },
      { k: 'nextFollowup', l: 'Próximo seguimiento', t: 'date' },
      { k: 'nextAction', l: 'Próxima acción', t: 'text' },
    ], defaults: () => ({ type: 'llamada', date: today() }) },
    resources: { title: 'Recurso o enlace', fields: [
      { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
      { k: 'url', l: 'Enlace', t: 'text', req: true, full: true },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'category', l: 'Categoría', t: 'select', o: () => ['Plataformas', 'Curso', 'Redes', 'Correo', 'Documentos', 'Finanzas', 'Otros'].map((c) => [c, c]) },
      { k: 'notes', l: 'Nota', t: 'text', full: true },
    ], defaults: () => ({ brand: defBrand(), category: 'Plataformas' }) },
  };

  /* ================= Datos iniciales ================= */
  function seed() {
    const t = new Date();
    const d = (n) => iso(addDays(t, n));
    const m = (n, day) => { const x = addMonths(new Date(t.getFullYear(), t.getMonth(), 1), n); x.setDate(day); return iso(x); };
    const thu = iso(nextDow(4)), sat = iso(nextDow(6));
    const p1 = uid(), p2 = uid(), p3 = uid(), p4 = uid(), p5 = uid();
    const tx = [];
    for (let i = -5; i <= 0; i++) {
      tx.push({ id: uid(), demo: true, type: 'ingreso', date: m(i, 5), desc: 'Cuotas del curso MRREE 2027 (ejemplo)', brand: 'pd', category: 'Cuotas del curso', amount: 150000 + (i + 5) * 6000, currency: 'UYU', project: p1, status: i === 0 ? 'pendiente' : 'cobrado' });
      tx.push({ id: uid(), demo: true, type: 'gasto', date: m(i, 10), desc: 'Zoom, MoodleCloud y Canva (ejemplo)', brand: 'pd', category: 'Plataformas y software', amount: 95, currency: 'USD', project: p2, status: 'cobrado' });
      tx.push({ id: uid(), demo: true, type: 'gasto', date: m(i, 15), desc: 'Publicidad en Instagram (ejemplo)', brand: 'pd', category: 'Publicidad y marketing', amount: 6000 + (i + 5) * 500, currency: 'UYU', status: 'cobrado' });
      if (i % 2 === 0) tx.push({ id: uid(), demo: true, type: 'ingreso', date: m(i, 20), desc: 'Informe de consultoría (ejemplo)', brand: 'ct', category: 'Consultoría e investigación', amount: 600, currency: 'USD', project: p4, status: 'cobrado' });
      tx.push({ id: uid(), demo: true, type: 'gasto', date: m(i, 25), desc: 'Aportes e impuestos (ejemplo)', brand: 'ct', category: 'Impuestos y aportes', amount: 9000, currency: 'UYU', status: 'cobrado' });
    }
    const mt = [];
    for (let i = -5; i <= 0; i++) {
      const date = m(i, 1);
      mt.push({ id: uid(), demo: true, key: 'ig_seguidores', brand: 'pd', date, value: 2400 + (i + 5) * 180 });
      mt.push({ id: uid(), demo: true, key: 'li_seguidores', brand: 'ct', date, value: 1100 + (i + 5) * 75 });
      mt.push({ id: uid(), demo: true, key: 'web_visitas', brand: 'pd', date, value: 900 + (i + 5) * 140 + (i % 2 ? 80 : 0) });
      mt.push({ id: uid(), demo: true, key: 'consultas', brand: 'pd', date, value: 18 + (i + 5) * 3 });
    }
    mt.push({ id: uid(), key: 'alumnos', brand: 'pd', date: '2026-08-01', value: 25, notes: 'Matriculados al inicio del curso 2027' });
    const base = {
      version: 2,
      settings: defaultSettings(),
      projects: [
        { id: p1, name: 'Curso de Preparación del Concurso MRREE 2027', brand: 'pd', status: 'activo', start: '2026-08-01', end: '', progress: 0, desc: 'Clases los sábados de 09:00 a 12:00 hs por Zoom, aula invertida. 25 alumnos matriculados.' },
        { id: p2, name: 'Aula virtual MoodleCloud', brand: 'pd', status: 'activo', start: '2026-08-01', progress: 0, desc: 'Apertura semanal automática de secciones. Materiales publicados el jueves nueve días antes de cada clase.' },
        { id: p3, name: 'Autoevaluaciones online', brand: 'pd', status: 'activo', start: '2026-08-01', progress: 0, desc: 'Motor de autoevaluación publicado en autoevaluaciones.prepdiplomacia.com.' },
        { id: p4, name: 'Consultoría e investigación académica', brand: 'ct', status: 'activo', start: d(-120), progress: 0, desc: 'Servicios de investigación y consultoría en relaciones internacionales.' },
        { id: p5, name: 'Formaciones en RRII y diplomacia', brand: 'ct', status: 'planificado', start: d(30), progress: 0, desc: 'Nuevos cursos y talleres abiertos.' },
      ],
      tasks: [
        { id: uid(), title: 'Publicar los materiales de la semana en Moodle', brand: 'pd', project: p2, due: thu, time: '10:00', priority: 'alta', status: 'pendiente', repeat: 'weekly', notes: 'Jueves, nueve días antes de la clase correspondiente.' },
        { id: uid(), title: 'Clase del sábado por Zoom', brand: 'pd', project: p1, due: sat, time: '09:00', priority: 'alta', status: 'pendiente', repeat: 'weekly', notes: '09:00 a 12:00 hs (Uruguay).' },
        { id: uid(), title: 'Revisar las correcciones listas y subirlas a Moodle', brand: 'pd', project: p1, due: d(0), priority: 'alta', status: 'pendiente', repeat: 'weekly', notes: 'Ver la sección Correcciones del panel.' },
        { id: uid(), title: 'Revisar consultas en contacto@prepdiplomacia.com', brand: 'pd', due: d(0), time: '18:00', priority: 'media', status: 'pendiente', repeat: 'weekly' },
        { id: uid(), title: 'Registrar métricas del mes', brand: 'pd', due: iso(new Date(t.getFullYear(), t.getMonth() + 1, 1)), priority: 'media', status: 'pendiente', repeat: 'monthly', notes: 'Seguidores, visitas web, consultas y alumnos activos.' },
        { id: uid(), demo: true, title: 'Preparar la propuesta de consultoría (ejemplo)', brand: 'ct', project: p4, due: d(-1), priority: 'alta', status: 'en_curso', repeat: 'none' },
        { id: uid(), demo: true, title: 'Actualizar la autoevaluación de Derecho Internacional (ejemplo)', brand: 'pd', project: p3, due: d(3), priority: 'media', status: 'pendiente', repeat: 'none' },
        { id: uid(), demo: true, title: 'Diseñar el programa de la nueva formación (ejemplo)', brand: 'ct', project: p5, due: d(12), priority: 'baja', status: 'pendiente', repeat: 'none' },
      ],
      posts: [
        { id: uid(), demo: true, title: 'Carrusel: las ocho etapas del concurso (ejemplo)', brand: 'pd', channel: 'Instagram', format: 'Carrusel', status: 'publicada', date: d(-9), time: '19:00', reach: 3200, interactions: 410, saves: 260, clicks: 22 },
        { id: uid(), demo: true, title: 'Reel: cómo es una clase de aula invertida (ejemplo)', brand: 'pd', channel: 'Instagram', format: 'Reel', status: 'publicada', date: d(-4), time: '19:00', reach: 5100, interactions: 380, saves: 120, clicks: 15 },
        { id: uid(), demo: true, title: 'Artículo de análisis de coyuntura (ejemplo)', brand: 'ct', channel: 'Substack', format: 'Artículo', status: 'programada', date: d(2), time: '09:00' },
        { id: uid(), demo: true, title: 'Carrusel de noticia internacional (ejemplo)', brand: 'pd', channel: 'Instagram', format: 'Carrusel', status: 'produccion', date: d(5), time: '19:00' },
      ],
      transactions: tx,
      metrics: mt,
      contacts: [{ id: uid(), demo: true, name: 'Persona interesada (ejemplo)', type: 'Interesado/a', brand: 'pd', followup: d(2), notes: 'Consultó por el curso 2027.' }],
      resources: [
        { id: uid(), name: 'Sitio web', url: 'https://www.prepdiplomacia.com', brand: 'pd', category: 'Plataformas' },
        { id: uid(), name: 'Aula virtual MoodleCloud', url: MOODLE + '/course/view.php?id=9', brand: 'pd', category: 'Curso' },
        { id: uid(), name: 'Tareas del curso en Moodle', url: MOODLE + '/mod/assign/index.php?id=9', brand: 'pd', category: 'Curso' },
        { id: uid(), name: 'Autoevaluaciones', url: 'https://autoevaluaciones.prepdiplomacia.com', brand: 'pd', category: 'Curso' },
        { id: uid(), name: 'Google Calendar', url: 'https://calendar.google.com/calendar/u/0/r', brand: 'pd', category: 'Plataformas' },
        { id: uid(), name: 'Agentes programados (Claude)', url: 'https://claude.ai/code', brand: 'pd', category: 'Plataformas' },
        { id: uid(), name: 'Canva', url: 'https://www.canva.com', brand: 'pd', category: 'Plataformas', notes: 'Carruseles y presentaciones' },
        { id: uid(), name: 'Instagram @prepdiplomaciauy', url: 'https://www.instagram.com/prepdiplomaciauy', brand: 'pd', category: 'Redes' },
        { id: uid(), name: 'Instagram @carolina_techera_rrii', url: 'https://www.instagram.com/carolina_techera_rrii', brand: 'ct', category: 'Redes' },
        { id: uid(), name: 'cursos@prepdiplomacia.com', url: 'mailto:cursos@prepdiplomacia.com', brand: 'pd', category: 'Correo', notes: 'Cursos y materiales de estudiantes' },
        { id: uid(), name: 'contacto@prepdiplomacia.com', url: 'mailto:contacto@prepdiplomacia.com', brand: 'pd', category: 'Correo', notes: 'Consultas generales y marketing' },
        { id: uid(), name: 'carolina@prepdiplomacia.com', url: 'mailto:carolina@prepdiplomacia.com', brand: 'ct', category: 'Correo', notes: 'Correo personal' },
      ],
    };
    return normalize(Object.assign(base, seedWorkflowPart()));
  }
  function seedWorkflowPart() {
    const t = new Date(); const d = (n) => iso(addDays(t, n));
    const part = { workflows: defaultWorkflows(), agents: defaultAgents(), reports: [defaultReport()], items: [] };
    part.items.push(
      { id: uid(), demo: true, wf: 'wf-carrusel', stage: 'propuesta', title: 'Tres noticias propuestas para hoy (ejemplo)', brand: 'pd', owner: 'Agente IA', due: d(0) },
      { id: uid(), demo: true, wf: 'wf-carrusel', stage: 'canva', title: 'Carrusel sobre un acuerdo comercial regional (ejemplo)', brand: 'ct', owner: 'Carolina', due: d(1) },
      { id: uid(), demo: true, wf: 'wf-blog', stage: 'propuesta', title: 'Temas del día para el blog (ejemplo)', brand: 'pd', owner: 'Agente IA', due: d(0) },
      { id: uid(), demo: true, wf: 'wf-materiales', stage: 'prep', title: 'Materiales de la próxima clase (ejemplo)', brand: 'pd', owner: 'Carolina', due: iso(nextDow(4)) },
      { id: uid(), demo: true, wf: 'wf-captacion', stage: 'consulta', title: 'Consulta por el curso 2027 (ejemplo)', brand: 'pd', owner: 'Carolina', due: d(1) },
      { id: uid(), demo: true, wf: 'wf-consultoria', stage: 'propuesta', title: 'Propuesta de investigación (ejemplo)', brand: 'ct', owner: 'Carolina', due: d(4) },
    );
    syncCorrections(part.reports[0], part.items);
    return part;
  }
  function defaultSettings() {
    return {
      usdRate: 40, eurRate: 44, owner: 'Carolina', tz: 'Africa/Casablanca', gcalMode: 'WEEK',
      mailEnabled: true, mailAccount: 'contacto@prepdiplomacia.com', mailQuery: 'to:contacto@prepdiplomacia.com in:inbox is:unread -category:promotions -category:social newer_than:7d',
      calendars: [
        { id: 'contacto@prepdiplomacia.com', name: 'Agenda principal', color: '#153D63', on: true },
        { id: 'c_classroomaa005f5c@group.calendar.google.com', name: 'Prep Diplomacia Uy · Curso 2027', color: '#B2914A', on: true },
      ],
    };
  }

  /* ================= Estado ================= */
  function normalize(d) {
    const out = Object.assign({ projects: [], tasks: [], posts: [], transactions: [], metrics: [], contacts: [], resources: [] }, d || {});
    out.settings = Object.assign(defaultSettings(), out.settings || {});
    if (!Array.isArray(out.workflows) || !Array.isArray(out.items) || !Array.isArray(out.agents) || !Array.isArray(out.reports)) {
      const wp = seedWorkflowPart();
      ['workflows', 'items', 'agents', 'reports'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = wp[k]; });
    }
    Object.keys(SCHEMAS).forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    if (!Array.isArray(out.activity)) out.activity = [];
    if (!Array.isArray(out.interactions)) out.interactions = [];
    out.contacts.forEach((c) => { if (!c.stage) c.stage = /alumno|cliente/i.test(c.type || '') ? 'activo' : 'nuevo'; });
    out.meta = Object.assign({ lastEventId: 0 }, out.meta || {});
    out.version = 2;
    return out;
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* sin almacenamiento */ }
    return seed();
  }
  let S = REMOTE ? null : load();
  function save() {
    if (REMOTE) return queueRemoteSave();
    if (LIVE.on) return dbSave();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador'); }
  }

  /* ================= Sincronización con el servidor de la web ================= */
  const sync = { rev: 0, state: 'idle', at: null, timer: null, inflight: false, again: false, msg: '' };
  const api = (path, opts = {}) => fetch(CFG.apiBase.replace(/\/$/, '') + path, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }, opts));
  function needLogin(res) {
    if (res.status === 401 || res.status === 403) {
      const login = CFG.loginUrl || '/cuenta/login';
      location.href = login + (login.includes('?') ? '&' : '?') + 'ReturnUrl=' + encodeURIComponent(location.pathname + location.search + location.hash);
      return true;
    }
    return false;
  }
  function setSync(state, msg) { sync.state = state; sync.msg = msg || ''; if (state === 'ok') sync.at = new Date(); const el = $('#sideFoot'); if (el && S) el.innerHTML = footHtml(); }
  function queueRemoteSave() { setSync('saving'); clearTimeout(sync.timer); sync.timer = setTimeout(flushRemote, 600); }
  async function flushRemote() {
    if (sync.inflight) { sync.again = true; return; }
    sync.inflight = true;
    try {
      const res = await api('/state', { method: 'PUT', body: JSON.stringify({ rev: sync.rev, data: S }) });
      if (needLogin(res)) return;
      if (res.status === 409) {
        const body = await res.json(); S = normalize(body.data); sync.rev = body.rev;
        render(); toast('Se cargaron cambios hechos en otro dispositivo. Revisa tu último cambio.');
      } else if (!res.ok) throw new Error('HTTP ' + res.status);
      else { const body = await res.json(); sync.rev = body.rev; setSync('ok'); }
    } catch (e) { setSync('error', 'Sin conexión con la web, reintentando…'); setTimeout(queueRemoteSave, 5000); }
    finally { sync.inflight = false; if (sync.again) { sync.again = false; flushRemote(); } }
  }
  async function pullRemote() {
    if (!REMOTE || !S || sync.inflight || sync.state === 'saving') return;
    try {
      const res = await api('/state?since=' + sync.rev);
      if (needLogin(res)) return;
      if (res.ok && res.status !== 204) {
        const body = await res.json();
        if (body && body.rev > sync.rev && body.data) {
          sync.rev = body.rev; S = normalize(body.data);
          if ($('#drawer').hidden && $('#palette').hidden) render();
        }
      }
      const ev = await api('/events?after=' + (S.meta.lastEventId || 0));
      if (ev.ok) { const list = await ev.json(); if (Array.isArray(list) && list.length) ingestEvents(list); }
      setSync('ok');
    } catch (e) { setSync('error', 'Sin conexión con la web, reintentando…'); }
  }
  function footHtml() {
    if (LIVE.on) {
      const err = Object.values(LIVE.src).some((x) => x.state === 'error' || x.state === 'blocked');
      const saving = LIVE.queue.size || LIVE.writing;
      return `<span class="row" style="gap:6px"><span class="dot" style="background:${saving ? 'var(--warn)' : err ? 'var(--bad)' : 'var(--ok)'}"></span>${saving ? 'Guardando…' : LIVE.busy ? 'Actualizando…' : 'Sincronizado' + (LIVE.at ? ' · ' + hhmm(LIVE.at) + ' hs' : '')}</span><div style="margin-top:4px"><a href="#ajustes">Conexiones</a> · <a href="#" data-action="live-refresh">Actualizar</a></div>`;
    }
    if (!REMOTE) return 'Datos guardados en este navegador · <a href="#ajustes">Copia de seguridad</a>';
    const t = sync.at ? `${pad(sync.at.getHours())}:${pad(sync.at.getMinutes())} hs` : '';
    const dot = sync.state === 'error' ? 'var(--bad)' : sync.state === 'saving' ? 'var(--warn)' : 'var(--ok)';
    const txt = sync.state === 'error' ? sync.msg : sync.state === 'saving' ? 'Guardando en tu web…' : `Sincronizado con tu web${t ? ' · ' + t : ''}`;
    return `<span class="row" style="gap:6px"><span class="dot" style="background:${dot}"></span>${esc(txt)}</span>${CFG.user ? `<div style="margin-top:4px">Conectada como ${esc(CFG.user)}${CFG.logoutUrl ? ` · <a href="${esc(CFG.logoutUrl)}">Salir</a>` : ''}</div>` : ''}`;
  }

  /* ================= Novedades enviadas por los agentes (Claude) ================= */
  const findBy = (arr, v) => arr.find((x) => x.id === v) || arr.find((x) => String(x.name || x.title || '').toLowerCase() === String(v || '').toLowerCase());
  const brandOf = (b) => (b === 'ct' || /techera|carolina/i.test(b || '') ? 'ct' : 'pd');
  function logActivity(source, text, kind) {
    S.activity.unshift({ id: uid(), at: new Date().toISOString(), source: source || 'Claude', text, kind: kind || 'info' });
    if (S.activity.length > 200) S.activity.length = 200;
  }
  function applyEvent(ev) {
    const p = ev.payload || {}; const src = ev.source || p.agente || 'Claude';
    switch (ev.type) {
      case 'correcciones.informe': {
        let r;
        if (p.texto) r = parseReport(String(p.texto));
        else {
          r = { id: uid(), date: p.fecha || today(), time: p.hora || '', status: p.estado || 'ok', summary: p.resumen || '', classes: {}, problems: (p.problemas || []).map(String), todos: (p.acciones || []).map((t) => ({ text: String(t), done: false })), pendingNotes: (p.notas || []).map(String), raw: '' };
          Object.entries(p.clases || {}).forEach(([k, c]) => { r.classes[k] = {}; CORR_STAGES.forEach((st2) => { if (c[st2] != null) r.classes[k][st2] = Number(c[st2]); }); });
        }
        ingestReport(r);
        logActivity(src, `Informe de correcciones del ${fmtDate(r.date)}: ${num(reportTotals(r).revision)} en tu revisión${r.status === 'falla' ? ' · con falla' : ''}`, r.status === 'falla' ? 'bad' : 'ok');
        return true;
      }
      case 'agente.corrida': {
        let a = findBy(S.agents, p.agente);
        if (!a) { a = { id: 'ag-' + uid(), name: String(p.agente || 'Agente'), brand: brandOf(p.marca), time: p.hora || '', tz: p.zona || '', desc: p.descripcion || '', wf: '', link: 'https://claude.ai/code' }; S.agents.push(a); }
        a.lastRun = p.fecha || today(); a.lastStatus = ['ok', 'aviso', 'falla'].includes(p.estado) ? p.estado : 'ok'; a.lastNote = String(p.nota || '').slice(0, 300);
        if (p.enlace) a.link = p.enlace;
        logActivity(a.name, p.nota || (a.lastStatus === 'falla' ? 'Corrida con falla' : 'Corrida completada'), a.lastStatus === 'falla' ? 'bad' : 'ok');
        return true;
      }
      case 'workflow.item': {
        const w = findBy(S.workflows, p.workflow) || S.workflows[0]; if (!w) return false;
        const stg = w.stages.find((x) => x.id === p.etapa || x.name.toLowerCase() === String(p.etapa || '').toLowerCase()) || w.stages[0];
        let it = p.clave ? S.items.find((x) => x.key === p.clave) : null;
        const isNew = !it;
        if (!it) { it = { id: uid(), wf: w.id, key: p.clave || '' }; S.items.push(it); }
        Object.assign(it, { wf: w.id, stage: stg.id, title: p.titulo || it.title || 'Sin título', brand: brandOf(p.marca || it.brand), owner: p.responsable || it.owner || 'Agente IA', due: p.fecha || it.due || '', link: p.enlace || it.link || '', notes: p.notas || it.notes || '', updated: today() });
        if (p.cantidad) it.count = Number(p.cantidad);
        logActivity(src, `${isNew ? 'Nuevo en' : 'Actualizado en'} ${w.name}: ${it.title} (${stg.name})`, 'ia');
        return true;
      }
      case 'tarea.nueva': {
        if (p.clave && S.tasks.some((t) => t.key === p.clave)) return false;
        S.tasks.push({ id: uid(), key: p.clave || '', title: p.titulo || 'Tarea', brand: brandOf(p.marca), due: p.fecha || today(), time: p.hora || '', priority: p.prioridad || 'media', status: 'pendiente', repeat: 'none', notes: p.notas || '' });
        logActivity(src, `Nueva tarea: ${p.titulo}`, 'info'); return true;
      }
      case 'metrica': {
        const key = (METRIC_KEYS.find((m) => m[0] === p.metrica || m[1].toLowerCase() === String(p.metrica || '').toLowerCase()) || [p.metrica])[0];
        if (!key || p.valor == null) return false;
        S.metrics.push({ id: uid(), key, brand: brandOf(p.marca), date: p.fecha || today(), value: Number(p.valor), notes: p.nota || '' });
        logActivity(src, `${metricLabel(key)}: ${num(p.valor)}`, 'info'); return true;
      }
      case 'movimiento': {
        if (p.importe == null) return false;
        S.transactions.push({ id: uid(), type: p.tipo === 'gasto' ? 'gasto' : 'ingreso', date: p.fecha || today(), desc: p.concepto || 'Movimiento', brand: brandOf(p.marca), category: p.categoria || (p.tipo === 'gasto' ? 'Otros gastos' : 'Otros ingresos'), amount: Number(p.importe), currency: ['USD', 'EUR'].includes(p.moneda) ? p.moneda : 'UYU', status: p.estado === 'pendiente' ? 'pendiente' : 'cobrado', notes: p.notas || '' });
        logActivity(src, `${p.tipo === 'gasto' ? 'Gasto' : 'Ingreso'} registrado: ${p.concepto} (${money(p.importe, p.moneda)})`, 'info'); return true;
      }
      case 'publicacion': {
        let po = p.clave ? S.posts.find((x) => x.key === p.clave) : null;
        if (!po) { po = { id: uid(), key: p.clave || '' }; S.posts.push(po); }
        Object.assign(po, { title: p.titulo || po.title, brand: brandOf(p.marca || po.brand), channel: p.canal || po.channel || 'Instagram', format: p.formato || po.format || 'Carrusel', status: p.estado || po.status || 'idea', date: p.fecha || po.date || today(), time: p.hora || po.time || '', link: p.enlace || po.link || '' });
        ['alcance:reach', 'interacciones:interactions', 'guardados:saves'].forEach((m) => { const [a, b] = m.split(':'); if (p[a] != null) po[b] = Number(p[a]); });
        logActivity(src, `Publicación: ${po.title} (${label(POST_STATUS, po.status)})`, 'info'); return true;
      }
      case 'nota': logActivity(src, String(p.texto || ''), p.nivel || 'info'); return true;
      default: return false;
    }
  }
  function ingestEvents(list) {
    let n = 0;
    list.sort((a, b) => Number(a.id) - Number(b.id)).forEach((ev) => {
      if (Number(ev.id) <= Number(S.meta.lastEventId || 0)) return;
      try { if (applyEvent(ev)) n++; } catch (e) { logActivity('Panel', `No se pudo aplicar una novedad (${ev.type})`, 'bad'); }
      S.meta.lastEventId = Number(ev.id);
    });
    save();
    if (n) { if ($('#drawer').hidden && $('#palette').hidden) render(); toast(n === 1 ? '1 novedad de tus agentes' : `${n} novedades de tus agentes`); }
  }

  const ui = { route: 'inicio', param: '', brand: 'all', taskView: 'tablero', taskFilter: 'abiertas', calMonth: new Date(), finMonth: ym(today()), finType: 'todos', metricKey: 'ig_seguidores', postView: 'tablero', agendaTab: 'google' };
  try { const p = JSON.parse(localStorage.getItem(KEY + '-ui') || '{}'); ['brand', 'taskView', 'taskFilter', 'metricKey', 'postView', 'agendaTab'].forEach((k) => { if (p[k]) ui[k] = p[k]; }); } catch (e) { /* sin preferencias */ }
  const saveUi = () => { try { const { brand, taskView, taskFilter, metricKey, postView, agendaTab } = ui; localStorage.setItem(KEY + '-ui', JSON.stringify({ brand, taskView, taskFilter, metricKey, postView, agendaTab })); } catch (e) { /* ignorar */ } };

  const defBrand = () => (ui.brand === 'all' ? 'pd' : ui.brand);
  const byBrand = (arr) => (ui.brand === 'all' ? arr : arr.filter((x) => x.brand === ui.brand || x.brand === 'all'));
  const rate = (cur) => (cur === 'USD' ? Number(S.settings.usdRate || 1) : cur === 'EUR' ? Number(S.settings.eurRate || 1) : 1);
  const toUYU = (t) => Number(t.amount || 0) * rate(t.currency);
  const projName = (id) => (S.projects.find((p) => p.id === id) || {}).name || '';
  const wfById = (id) => S.workflows.find((w) => w.id === id);
  const isLate = (t) => t.status !== 'hecha' && t.due && t.due < today();
  const latestReport = () => S.reports.slice().sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))[0];
  const itemWeight = (it) => Math.max(1, Number(it.count) || 1);

  /* ================= Correcciones: informe del agente ================= */
  function reportTotals(r) {
    const tot = { nueva: 0, descargada: 0, revision: 0, devuelta: 0, problema: 0 };
    if (!r) return tot;
    Object.values(r.classes || {}).forEach((c) => CORR_STAGES.forEach((k) => { tot[k] += Number(c[k] || 0); }));
    return tot;
  }
  function syncCorrections(r, items) {
    const list = items || S.items;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].wf === 'wf-corr' && list[i].auto) list.splice(i, 1);
    const order = (k) => { const i = CLASSES.findIndex((c) => c.key === k); return i < 0 ? 99 : i; };
    Object.keys(r.classes || {}).sort((a, b) => order(a) - order(b)).forEach((k) => {
      const c = r.classes[k]; const meta = classMeta(k);
      ['nueva', 'descargada', 'revision', 'devuelta'].forEach((stage) => {
        const n = Number(c[stage] || 0);
        if (n > 0) list.push({ id: uid(), auto: true, wf: 'wf-corr', stage, title: meta.label, count: n, brand: 'pd', owner: stage === 'revision' || stage === 'devuelta' ? 'Carolina' : 'Agente IA', link: gradingUrl(k), notes: `Según el informe del agente del ${fmtDate(r.date)}.` });
      });
    });
    (r.problems || []).forEach((p) => list.push({ id: uid(), auto: true, wf: 'wf-corr', stage: 'problema', title: p, count: 1, brand: 'pd', owner: 'Carolina', notes: `Según el informe del agente del ${fmtDate(r.date)}.` }));
  }
  function parseReport(text) {
    const r = { id: uid(), date: today(), time: '', status: 'ok', summary: '', classes: {}, problems: [], todos: [], pendingNotes: [], raw: text };
    const dm = text.match(/(20\d{2})-(\d{2})-(\d{2})/); if (dm) r.date = dm[0];
    const tm = text.match(/(\d{2}:\d{2})\s*hs/); if (tm) r.time = tm[1];
    if (/FALLA|Se connecter|sin datos de Moodle|no corri[oó]|SIN SEÑAL/i.test(text)) r.status = 'falla';
    else if (/CORREO NO ENVIADO|problema/i.test(text)) r.status = 'aviso';
    let section = null;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sec = (l) => {
      const s = l.toLowerCase();
      if (/lo que tienes que hacer/.test(s)) return 'todo';
      if (/decisiones/.test(s)) return 'decisiones';
      if (/pendientes? de (tu|su) revisi|listas pendientes|corregidas? pendiente/.test(s)) return 'revision';
      if (/subido a moodle|devueltas?( en moodle)?/.test(s)) return 'devuelta';
      if (/con problema/.test(s)) return 'problema';
      if (/entregas? nuevas?/.test(s)) return 'nueva';
      if (/descargadas? sin corregir/.test(s)) return 'descargada';
      if (/qu[eé] fall[oó]/.test(s)) return 'falla';
      if (/^\*\*.*\*\*$|^#+\s/.test(l)) return 'otro';
      return null;
    };
    const failLines = [];
    lines.forEach((l) => {
      const ns = sec(l);
      const isHeader = ns && (/^\*\*|^#|:$/.test(l) || l.length < 70) && !/^\d+\./.test(l);
      if (isHeader) { section = ns; return; }
      const item = l.replace(/^\d+[.)]\s*/, '').replace(/^[-*•]\s*/, '');
      const cm = item.match(/^Clase\s*(\d{1,2})(?:\s*[·-]?\s*(?:T|Tarea)\s*(\d))?\s*:\s*(\d+)\.?$/i);
      if (cm && CORR_STAGES.includes(section)) {
        const k = 'C' + pad(cm[1]) + (cm[2] && cm[2] !== '1' ? '-T' + cm[2] : '');
        r.classes[k] = r.classes[k] || {};
        r.classes[k][section] = Number(cm[3]);
        return;
      }
      if (section === 'problema' && /^Clase/i.test(item)) {
        const pm = item.match(/^Clase\s*(\d{1,2})/i);
        const k = pm ? 'C' + pad(pm[1]) : null;
        // se omite el nombre del alumno al guardar el resumen
        r.problems.push(item.replace(/:\s*[^,]+,\s*/, ': '));
        if (k) { r.classes[k] = r.classes[k] || {}; r.classes[k].problema = (r.classes[k].problema || 0) + 1; }
        return;
      }
      if (section === 'todo' && /^\d+[.)]/.test(l)) { r.todos.push({ text: item, done: false }); return; }
      if (section === 'falla' && /^\d+[.)]/.test(l)) failLines.push(item);
    });
    r.summary = failLines.slice(0, 3).join(' ') || (r.status === 'ok' ? 'Corrida correcta.' : '');
    return r;
  }

  /* ================= Google Calendar ================= */
  function gcalEmbed(mode) {
    const p = new URLSearchParams();
    (S.settings.calendars || []).filter((c) => c.on !== false && c.id).forEach((c) => { p.append('src', c.id); p.append('color', c.color || '#153D63'); });
    p.set('ctz', S.settings.tz || 'Africa/Casablanca'); p.set('mode', mode || 'WEEK'); p.set('hl', 'es'); p.set('wkst', '2');
    p.set('showTitle', '0'); p.set('showPrint', '0'); p.set('showTz', '1'); p.set('showCalendars', '1');
    return 'https://calendar.google.com/calendar/embed?' + p.toString();
  }
  function gcalTemplate(o) {
    const title = o.title || o.name || '';
    const p = new URLSearchParams({ action: 'TEMPLATE', text: title, details: (o.notes || '') + '\n\nCreado desde el Panel Central.', ctz: S.settings.tz || 'Africa/Casablanca' });
    const date = o.due || o.date;
    if (date) {
      const ds = date.replace(/-/g, '');
      if (o.time) { const [h, mi] = o.time.split(':').map(Number); const end = new Date(2000, 0, 1, h + 1, mi); p.set('dates', `${ds}T${pad(h)}${pad(mi)}00/${ds}T${pad(end.getHours())}${pad(end.getMinutes())}00`); }
      else { p.set('dates', `${ds}/${iso(addDays(parse(date), 1)).replace(/-/g, '')}`); }
    }
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }

  /* ================= Iconos ================= */
  const P = {
    inicio: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    tareas: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h9"/>',
    workflows: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="3" width="6" height="6" rx="1.5"/><rect x="9" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v2a2 2 0 002 2h8a2 2 0 002-2V9M12 13v2"/>',
    correcciones: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-4-4L4 16z"/><path d="M13.5 6.5l4 4M14 20h6"/>',
    agentes: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6"/><circle cx="12" cy="3.5" r="1"/>',
    proyectos: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    marketing: '<path d="M3 11v2a1 1 0 001 1h3l5 4V6L7 10H4a1 1 0 00-1 1zM16 8a5 5 0 010 8M19 5a9 9 0 010 14"/>',
    contabilidad: '<rect x="2" y="6" width="20" height="13" rx="3"/><path d="M2 10h20M6 15h4"/>',
    metricas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    contactos: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-4-5.6"/>',
    recursos: '<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',
    ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-4-4L4 16z"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', chev: '<path d="M9 6l6 6-6 6"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>', paste: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', inbox: '<path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z"/>',
    gcal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M9 15h2v2H9z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  };
  P.personas = P.contactos; P.seguimientos = P.clock;
  const icon = (k, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[k] || ''}</svg>`;

  const NAV = [
    ['General', [['inicio', 'Inicio'], ['agenda', 'Agenda'], ['tareas', 'Tareas']]],
    ['Workflows', [['workflows', 'Workflows'], ['correcciones', 'Correcciones'], ['agentes', 'Agentes IA']]],
    ['CRM', [['personas', 'Personas'], ['seguimientos', 'Seguimientos']]],
    ['Negocio', [['proyectos', 'Proyectos'], ['marketing', 'Marketing'], ['contabilidad', 'Contabilidad'], ['metricas', 'Métricas']]],
    ['Sistema', [['recursos', 'Recursos'], ['ajustes', 'Ajustes y respaldo']]],
  ];
  const ROUTE_NAMES = Object.fromEntries(NAV.flatMap((g) => g[1]));

  /* ================= Gráficos ================= */
  function barChart(groups, series, opts = {}) {
    if (!groups.length || groups.every((g) => g.values.every((v) => !v))) return '<div class="empty">Sin datos todavía</div>';
    const W = 640, H = opts.h || 230, Pd = { l: 52, r: 8, t: 10, b: 26 };
    const max = Math.max(1, ...groups.flatMap((g) => g.values)) * 1.1;
    const iw = W - Pd.l - Pd.r, ih = H - Pd.t - Pd.b, gw = iw / groups.length, bw = Math.min(22, (gw * 0.66) / series.length);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Gráfico de barras')}">`;
    for (let i = 0; i <= 4; i++) { const y = Pd.t + ih - (ih * i) / 4; s += `<line class="grid" x1="${Pd.l}" x2="${W - Pd.r}" y1="${y}" y2="${y}"/><text x="${Pd.l - 6}" y="${y + 4}" text-anchor="end">${short(max * i / 4)}</text>`; }
    groups.forEach((g, gi) => {
      const x0 = Pd.l + gi * gw + (gw - bw * series.length) / 2;
      g.values.forEach((v, si) => { const h = (v / max) * ih; s += `<rect x="${x0 + si * bw}" y="${Pd.t + ih - h}" width="${bw - 3}" height="${Math.max(h, 0)}" rx="4" fill="${series[si].color}"><title>${esc(g.label)} · ${esc(series[si].name)}: ${esc(opts.fmt ? opts.fmt(v) : num(v))}</title></rect>`; });
      s += `<text x="${Pd.l + gi * gw + gw / 2}" y="${H - 7}" text-anchor="middle">${esc(g.label)}</text>`;
    });
    return s + '</svg>';
  }
  function lineChart(seriesList) {
    const all = seriesList.flatMap((s) => s.points);
    if (!all.length) return '<div class="empty">Sin registros para esta métrica. Agrega el primero con “Registrar”.</div>';
    const W = 640, H = 240, Pd = { l: 52, r: 14, t: 14, b: 26 };
    const xs = all.map((p) => parse(p.date).getTime());
    let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5 * 15; x1 += 864e5 * 15; }
    const vs = all.map((p) => Number(p.value)); let y0 = Math.min(...vs), y1 = Math.max(...vs);
    const pp = (y1 - y0) * 0.15 || Math.abs(y1) * 0.1 || 1; y0 = Math.max(0, y0 - pp); y1 += pp;
    const iw = W - Pd.l - Pd.r, ih = H - Pd.t - Pd.b;
    const X = (d) => Pd.l + ((parse(d).getTime() - x0) / (x1 - x0)) * iw, Y = (v) => Pd.t + ih - ((v - y0) / (y1 - y0)) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de la métrica">`;
    for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4, y = Y(v); s += `<line class="grid" x1="${Pd.l}" x2="${W - Pd.r}" y1="${y}" y2="${y}"/><text x="${Pd.l - 6}" y="${y + 4}" text-anchor="end">${short(v)}</text>`; }
    for (let i = 0; i <= 5; i++) { const t = new Date(x0 + (x1 - x0) * i / 5); s += `<text x="${Pd.l + iw * i / 5}" y="${H - 7}" text-anchor="middle">${pad(t.getDate())} ${MONTHS_S[t.getMonth()]}</text>`; }
    seriesList.forEach((se) => {
      const pts = se.points.slice().sort((a, b) => a.date.localeCompare(b.date));
      if (pts.length > 1) s += `<polyline fill="none" stroke="${se.color}" stroke-width="2.5" stroke-linejoin="round" points="${pts.map((p) => `${X(p.date)},${Y(p.value)}`).join(' ')}"/>`;
      pts.forEach((p) => { s += `<circle cx="${X(p.date)}" cy="${Y(p.value)}" r="4" fill="var(--surface)" stroke="${se.color}" stroke-width="2"><title>${esc(se.name)} · ${fmtDate(p.date)}: ${num(p.value)}</title></circle>`; });
    });
    return s + '</svg>';
  }
  function hbars(rows, fmt) {
    if (!rows.length) return '<div class="empty">Sin datos en este período</div>';
    const max = Math.max(...rows.map((r) => r[1]), 1);
    return '<div class="bars-h">' + rows.map(([l, v]) => `<div class="r"><span class="l" title="${esc(l)}">${esc(l)}</span><span class="b"><span style="width:${(v / max) * 100}%"></span></span><span class="v">${fmt(v)}</span></div>`).join('') + '</div>';
  }

  /* ================= Cálculos ================= */
  function finance(month) {
    const tx = byBrand(S.transactions).filter((t) => !month || ym(t.date) === month);
    const sum = (f) => tx.filter(f).reduce((a, t) => a + toUYU(t), 0);
    const inc = sum((t) => t.type === 'ingreso'), exp = sum((t) => t.type === 'gasto');
    return { inc, exp, net: inc - exp, pend: sum((t) => t.status === 'pendiente' && t.type === 'ingreso'), tx };
  }
  function last12() { const out = []; const b = new Date(); b.setDate(1); for (let i = 11; i >= 0; i--) { const d = addMonths(b, -i); out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); } return out; }
  function projectProgress(p) {
    const ts = S.tasks.filter((t) => t.project === p.id && t.repeat === 'none');
    if (ts.length) return { pct: Math.round((ts.filter((t) => t.status === 'hecha').length / ts.length) * 100), auto: true, n: ts.length };
    return { pct: Number(p.progress || 0), auto: false, n: 0 };
  }
  function latestMetric(key) {
    const arr = byBrand(S.metrics).filter((m) => m.key === key).sort((a, b) => a.date.localeCompare(b.date));
    return { last: arr[arr.length - 1], prev: arr[arr.length - 2] };
  }
  const wfItems = (wf) => byBrand(S.items).filter((i) => i.wf === wf.id);
  const stageCount = (wf, sid) => wfItems(wf).filter((i) => i.stage === sid).reduce((a, i) => a + itemWeight(i), 0);

  /* ================= Componentes ================= */
  const brandDot = (b) => `<span class="dot" style="background:${b === 'all' ? 'linear-gradient(90deg,#153D63 50%,#C6A75E 50%)' : brandColor(b)}" title="${esc(brandName(b))}"></span>`;
  const statusPill = (s) => s === 'falla' ? `<span class="pill bad">${icon('alert')}Falla</span>` : s === 'aviso' ? '<span class="pill warn">Con avisos</span>' : `<span class="pill ok">${icon('ok')}Correcta</span>`;
  const ownerPill = (o) => o === 'Agente IA' ? `<span class="pill ia">${icon('agentes')}IA</span>` : o ? `<span class="pill">${esc(o)}</span>` : '';
  function head(title, sub, actions = '', eyebrow = '') {
    return `<div class="ph"><div>${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ''}<h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="row">${actions}</div></div>`;
  }
  function taskItem(t) {
    const late = isLate(t);
    return `<li class="${t.status === 'hecha' ? 'done' : ''}">
      <button class="check ${t.status === 'hecha' ? 'on' : ''}" data-action="toggle-task" data-id="${t.id}" aria-label="Marcar como hecha">${t.status === 'hecha' ? '✓' : ''}</button>
      <div class="grow"><div class="t">${esc(t.title)}</div>
      <div class="m one">${brandDot(t.brand)}<span>${t.due ? (t.due === today() ? 'Hoy' : fmtDate(t.due)) : 'Sin fecha'}${t.time ? ' · ' + esc(t.time) + ' hs' : ''}${t.repeat && t.repeat !== 'none' ? ' · ↻' : ''}${t.project ? ' · ' + esc(projName(t.project)) : ''}</span></div></div>
      ${late ? '<span class="pill solid-bad">Vencida</span>' : `<span class="pill ${t.priority}">${esc(t.priority || '')}</span>`}
      <button class="iconbtn" data-action="edit" data-entity="tasks" data-id="${t.id}" aria-label="Editar">${icon('edit')}</button></li>`;
  }
  function pipeline(wf, mini) {
    const counts = wf.stages.map((s) => stageCount(wf, s.id));
    return `<div class="pipeline ${mini ? 'mini' : ''}">${wf.stages.map((s, i) => {
      const n = counts[i];
      const cls = n === 0 ? 'zero' : (s.id === 'problema' ? 'problem' : (s.id === 'revision' && wf.id === 'wf-corr' ? 'hot' : ''));
      return `${i ? `<span class="link">${icon('chev')}</span>` : ''}<div class="node ${cls}" title="${esc(s.name)}"><div class="n">${num(n)}</div><div class="nl">${esc(s.name)}</div><span class="bar" style="background:${s.color}"></span></div>`;
    }).join('')}</div>`;
  }
  function board(entity, columns, cardHtml) {
    return `<div class="board">${columns.map((c) => `<div class="col" data-drop="${entity}" data-status="${esc(c.id)}"${c.wf ? ` data-wf="${c.wf}"` : ''}>
      <div class="colh"><span><span class="dot" style="background:${c.color || '#94A3B8'}"></span>${esc(c.name)}</span><span>${num(c.count ?? c.items.length)}</span></div>
      ${c.items.map((o) => `<div class="kc" draggable="true" data-drag="${o.id}" data-entity="${entity}"><span class="brandbar" style="background:${o.brand === 'all' ? '#94A3B8' : brandColor(o.brand)}"></span><span class="acts">${c.next ? `<button class="iconbtn" data-action="advance" data-id="${o.id}" title="Pasar a ${esc(c.next.name)}">${icon('arrow')}</button>` : ''}<button class="iconbtn" data-action="edit" data-entity="${entity}" data-id="${o.id}" aria-label="Editar">${icon('edit')}</button></span>${cardHtml(o)}</div>`).join('') || '<div class="empty" style="padding:14px 6px">Vacío</div>'}
    </div>`).join('')}</div>`;
  }
  const wfCard = (i) => `<div class="t">${esc(i.title)}</div><div class="meta">${(i.count > 1 || (i.auto && i.count)) ? `<span class="count-badge">${num(i.count)}</span>` : ''}${ownerPill(i.owner)}${i.due ? `<span class="${i.due < today() ? 'down' : ''}">${fmtDate(i.due)}</span>` : ''}${i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener" class="pill info" onclick="event.stopPropagation()">${icon('ext')}Abrir</a>` : ''}${i.demo ? '<span class="pill">ejemplo</span>' : ''}</div>`;
  function wfBoard(wf) {
    const items = wfItems(wf);
    return board('items', wf.stages.map((s, idx) => ({ id: s.id, name: s.name, color: s.color, wf: wf.id, next: wf.stages[idx + 1], items: items.filter((i) => i.stage === s.id), count: items.filter((i) => i.stage === s.id).reduce((a, i) => a + itemWeight(i), 0) })), wfCard);
  }

  /* ================= Vistas ================= */
  const VIEWS = {};

  /* ================= Inicio: "¿qué hago ahora?" ================= */
  const SKIP_LINE = /^(CORREO NO ENVIADO|Este texto reemplaza|Qu[eé] fall[oó]|Estado de las carpetas|Lo que tienes que hacer|Decisiones)/i;
  function cleanText(s, max = 160) {
    const lines = String(s || '').split('\n').map((l) => l.replace(/[*#>`]/g, '').replace(/^\s*\d+[.)]\s*/, '').trim()).filter((l) => l.length > 12 && !SKIP_LINE.test(l));
    const first = (lines[0] || String(s || '').replace(/[*#>`]/g, '').trim()).split(/(?<=[.!?])\s/)[0];
    return first.length > max ? first.slice(0, max - 1) + '…' : first;
  }
  const shortName = (n) => String(n || '').replace(/\s*[-·]\s*(Prep Diplomacia Uy|Carolina Techera RRII)$/i, '');
  function relTime(d) {
    const min = Math.round((d - new Date()) / 60000);
    if (min <= 0) return 'Ahora';
    if (min < 60) return `En ${min} min`;
    return `A las ${hhmm(d)} hs`;
  }
  const isDismissed = (key) => { const d = S.meta.dismissed || {}; return d[key] && d[key] > today(); };
  function focusItems() {
    const out = []; const now = new Date(); const td = today(); const pd = ui.brand !== 'ct';
    const push = (o) => { if (!o.key || !isDismissed(o.key)) out.push(o); };
    const rep = latestReport(); const tot = reportTotals(rep);
    const corrAgent = S.agents.find((a) => /correcciones diarias/i.test(a.name || ''));
    if (pd && ((rep && rep.status === 'falla') || (corrAgent && corrAgent.lastStatus === 'falla'))) {
      push({ key: 'corr-fail:' + ((corrAgent && corrAgent.lastRun) || (rep && rep.date) || td), level: 'bad', ic: 'alert', title: 'El agente de correcciones no pudo leer Moodle', sub: 'Moodle pidió iniciar sesión. Entra a Moodle y vuelve a correr el agente.', dismiss: true,
        actions: [{ label: 'Iniciar sesión en Moodle', href: MOODLE + '/login/index.php', primary: true }, { label: 'Copiar la orden para Claude', action: 'copy', text: 'corre el agente de correcciones' }] });
    }
    byBrand(S.agents).filter((a) => a.lastStatus === 'falla' && a !== corrAgent).forEach((a) => push({ key: 'ag-fail:' + a.id + ':' + (a.lastRun || ''), level: 'bad', ic: 'agentes', title: `Falló: ${shortName(a.name)}`, sub: cleanText(a.lastNote), dismiss: true, actions: [{ label: 'Ver la corrida', href: a.sessionId ? a.link : '#agentes', primary: true }] }));
    if (LIVE.mcp) {
      LIVE.sessions.filter((x) => x.needs || /BLOCKED/.test(x.bucket)).slice(0, 3).forEach((x) => push({ key: 'ses:' + x.id + ':' + x.updated, level: 'ia', ic: 'agentes', title: `Claude espera tu respuesta: ${x.title}`, sub: cleanText(x.needs), dismiss: true, actions: [{ label: 'Responder', href: sessionUrl(x.id), primary: true }] }));
      const next = LIVE.events.find((e) => e.start && e.start.dateTime && evStart(e) >= new Date(now - 15 * 60e3));
      if (next && evStart(next) - now < 3 * 3600e3) push({ key: 'ev:' + next.id, level: 'info', ic: 'agenda', title: `${relTime(evStart(next))}: ${next.summary || 'evento'}`, sub: `${hhmm(evStart(next))} hs · ${evKind(next) === 'devolucion' ? 'Devolución con un alumno' : evKind(next) === 'consulta' ? 'Sesión de consultas' : 'Google Calendar'}`,
        actions: next.conferenceUrl ? [{ label: 'Unirse a Meet', href: next.conferenceUrl, primary: true }, { label: 'Ver evento', href: next.htmlLink }] : [{ label: 'Ver evento', href: next.htmlLink, primary: true }] });
    }
    byBrand(S.tasks).filter((t) => t.status !== 'hecha' && t.due && t.due <= td).sort((a, b) => (a.due + (a.time || '')).localeCompare(b.due + (b.time || ''))).slice(0, 5)
      .forEach((t) => push({ level: t.due < td ? 'bad' : 'warn', ic: 'tareas', title: t.title, sub: (t.due < td ? `Vencida el ${fmtDate(t.due)}` : 'Para hoy') + (t.time ? ` · ${t.time} hs` : ''), task: t.id,
        actions: [{ label: 'Listo', action: 'toggle-task', id: t.id, primary: true }, { label: 'Pasar a mañana', action: 'snooze-task', id: t.id }, { label: 'Editar', action: 'edit', entity: 'tasks', id: t.id }] }));
    if (pd && tot.revision) {
      const cls = Object.entries(rep.classes).filter(([, c]) => c.revision).map(([k, c]) => `${classMeta(k).label.replace(' · Tarea 1', '')}: ${c.revision}`);
      const corrTask = out.find((o) => o.task && /correcci/i.test(o.title));
      if (corrTask) { corrTask.title = `${corrTask.title} (${num(tot.revision)})`; corrTask.sub += ' · ' + cls.slice(0, 3).join(' · '); corrTask.actions.splice(1, 0, { label: 'Ver por clase', href: '#correcciones' }); }
      else push({ key: 'corr-rev:' + (rep.date || '') + ':' + tot.revision, level: 'warn', ic: 'correcciones', title: `Revisar ${plural(tot.revision, 'corrección', 'correcciones')} y subirlas a Moodle`, sub: cls.slice(0, 4).join(' · ') + (cls.length > 4 ? ' …' : ''), dismiss: true, actions: [{ label: 'Ver por clase', href: '#correcciones', primary: true }] });
    }
    if (S.settings.mailEnabled && LIVE.mail.length) push({ key: 'mail:' + LIVE.mail[0].id, level: 'info', ic: 'inbox', title: `${plural(LIVE.mail.length, 'correo sin leer', 'correos sin leer')}`, sub: LIVE.mail.slice(0, 2).map((m) => m.subject).join(' · '), dismiss: true, actions: [{ label: 'Abrir Gmail', href: `https://mail.google.com/mail/?authuser=${encodeURIComponent(S.settings.mailAccount || '')}#inbox`, primary: true }] });
    Object.entries(LIVE.src).filter(([, v]) => v.state === 'blocked' || v.state === 'error').forEach(([k, v]) => push({ key: 'conn:' + k + ':' + (v.code || ''), level: v.state === 'blocked' ? 'warn' : 'bad', ic: 'ajustes', title: v.state === 'blocked' ? 'Falta un permiso para conectar' : 'Una conexión necesita atención', sub: v.msg, dismiss: true, actions: v.state === 'blocked' ? [{ label: 'Permitir', action: 'live-refresh', primary: true }] : [{ label: 'Ver conexiones', href: '#ajustes', primary: true }] }));
    const fus = byBrand(S.contacts).filter((c) => c.followup && c.followup <= td).sort((a, b) => a.followup.localeCompare(b.followup));
    fus.slice(0, 3).forEach((c) => push({ key: 'fu:' + c.id + ':' + c.followup, level: c.followup < td ? 'warn' : 'info', ic: 'contactos', title: `Seguimiento: ${c.name}`, sub: `${c.nextAction || c.type}${c.followup < td ? ` · desde el ${fmtDate(c.followup)}` : ''}`,
      actions: [{ label: 'Registrar contacto', action: 'log', id: c.id, primary: true }, c.email ? { label: 'Correo', href: `mailto:${c.email}` } : null, waLink(c.phone) ? { label: 'WhatsApp', href: waLink(c.phone) } : null, { label: 'Mañana', action: 'fu-snooze', id: c.id }, { label: 'Ficha', href: '#persona/' + c.id }].filter(Boolean) }));
    if (fus.length > 3) push({ key: 'fu-more:' + td + ':' + fus.length, level: 'info', ic: 'seguimientos', title: `${fus.length - 3} seguimientos más para hoy`, sub: fus.slice(3, 6).map((c) => c.name).join(' · '), dismiss: true, actions: [{ label: 'Ver seguimientos', href: '#seguimientos', primary: true }] });
    const f = finance(ym(td)); if (f.pend > 0) push({ key: 'cobro:' + ym(td) + ':' + Math.round(f.pend), level: 'info', ic: 'contabilidad', title: `${money(f.pend)} por cobrar este mes`, sub: 'Ingresos marcados como pendientes.', dismiss: true, actions: [{ label: 'Ver movimientos', href: '#contabilidad', primary: true }] });
    const order = { bad: 0, ia: 1, warn: 2, info: 3 };
    return out.map((o, i) => Object.assign(o, { i })).sort((a, b) => order[a.level] - order[b.level] || a.i - b.i);
  }
  function actionBtn(a) {
    const cls = `btn sm ${a.primary ? 'primary' : ''}`;
    if (a.href) { const ext = /^https?:|^mailto:/.test(a.href); return `<a class="${cls}" href="${esc(a.href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(a.label)}${ext && !/^mailto:/.test(a.href) ? ' ' + icon('ext') : ''}</a>`; }
    return `<button class="${cls}" data-action="${esc(a.action)}"${a.id ? ` data-id="${esc(a.id)}"` : ''}${a.entity ? ` data-entity="${esc(a.entity)}"` : ''}${a.text ? ` data-text="${esc(a.text)}"` : ''}>${esc(a.label)}</button>`;
  }
  function focusRow(o) {
    return `<li class="focus"><span class="fic ${o.level}">${icon(o.ic)}</span><div class="grow"><div class="t">${esc(o.title)}</div>${o.sub ? `<div class="m">${esc(o.sub)}</div>` : ''}<div class="facts">${o.actions.map(actionBtn).join('')}</div></div>${o.dismiss ? `<button class="iconbtn" data-action="dismiss" data-key="${esc(o.key)}" title="Ocultar hasta mañana" aria-label="Ocultar hasta mañana">✕</button>` : ''}</li>`;
  }

  VIEWS.inicio = () => {
    const now = new Date(); const h = now.getHours();
    const saludo = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
    const items = focusItems();
    const urgent = items.filter((o) => o.level === 'bad').length;
    const evToday = LIVE.events.filter((e) => iso(evStart(e)) === today() && (!e.end || !e.end.dateTime || new Date(e.end.dateTime) > now));
    const next = LIVE.events.find((e) => e.start && e.start.dateTime && evStart(e) > now);
    const parts = [];
    if (items.length) parts.push(`${plural(items.length, 'cosa', 'cosas')} en tu foco${urgent ? `, ${urgent} ${urgent === 1 ? 'urgente' : 'urgentes'}` : ''}`);
    if (LIVE.mcp) parts.push(evToday.length ? `${plural(evToday.length, 'evento')} hoy` : 'agenda libre por hoy');
    const summary = parts.length ? 'Tienes ' + parts.join(' y ') + '.' : 'Todo en orden por ahora.';
    const shown = ui.focusAll ? items : items.slice(0, 5);
    const open = byBrand(S.tasks).filter((t) => t.status !== 'hecha');
    const rep = latestReport(); const tot = reportTotals(rep); const al = latestMetric('alumnos'); const f = finance(ym(today()));
    const hasMoney = f.tx.length > 0;
    const week = byBrand(S.tasks).filter((t) => t.status !== 'hecha' && t.due && t.due > today() && t.due <= iso(addDays(now, 7))).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
    const running = byBrand(S.workflows).map((w) => ({ w, chips: w.stages.map((s) => [s, stageCount(w, s.id)]).filter(([, n]) => n > 0) })).filter((x) => x.chips.length);
    const acts = S.activity.slice(0, 4);
    return `<section class="hero compact">
        <div class="row between" style="align-items:flex-start;gap:12px"><div><h1>${saludo}, ${esc(S.settings.owner || 'Carolina')}</h1>
        <p>${DOW_L[now.getDay()].replace(/^./, (c) => c.toUpperCase())} ${now.getDate()} de ${MONTHS[now.getMonth()]} · ${esc(summary)}</p></div>
        ${next ? `<a class="hchip next" href="${esc(next.conferenceUrl || next.htmlLink || '#agenda')}" ${next.conferenceUrl || next.htmlLink ? 'target="_blank" rel="noopener"' : ''}>${icon('clock')}<span><strong>${iso(evStart(next)) === today() ? hhmm(evStart(next)) + ' hs' : DOW[(evStart(next).getDay() + 6) % 7] + ' ' + hhmm(evStart(next))}</strong> ${esc(cleanText(next.summary, 48))}</span></a>` : ''}</div>
      </section>
      <div class="grid g-main">
        <div class="stack">
          <div class="card"><div class="ch"><h2>Tu foco ahora</h2>${items.length > 5 ? `<button class="btn sm ghost" data-action="set" data-k="focusAll" data-v="${ui.focusAll ? '' : '1'}">${ui.focusAll ? 'Ver menos' : `Ver ${items.length - 5} más`}</button>` : ''}</div>
            ${items.length ? `<ul class="list">${shown.map(focusRow).join('')}</ul>` : `<div class="empty big">${icon('ok')}<div><strong>Nada pendiente para hoy.</strong><br>Cuando tus agentes, tu agenda o tu correo traigan algo, aparece aquí.</div></div>`}
          </div>
          ${running.length ? `<div class="card"><div class="ch"><h2>En marcha</h2><a class="btn sm ghost" href="#workflows">Workflows</a></div><ul class="list">${running.map(({ w, chips }) => `<li><a class="grow" href="#workflow/${w.id}" style="text-decoration:none;color:inherit"><div class="t">${esc(w.name)}</div><div class="m">${chips.map(([s, n]) => `<span class="pill" style="background:color-mix(in srgb, ${s.color} 14%, transparent);color:var(--text)"><span class="dot" style="background:${s.color}"></span>${num(n)} ${esc(s.name.toLowerCase())}</span>`).join('')}</div></a><span class="muted">${icon('chev')}</span></li>`).join('')}</ul></div>` : ''}
          <div class="grid stats">
            <a class="card kpi mini" href="#tareas"><div class="l">Tareas abiertas</div><div class="v">${open.length}</div></a>
            ${ui.brand !== 'ct' ? `<a class="card kpi mini" href="#correcciones"><div class="l">En tu revisión</div><div class="v">${num(tot.revision)}</div></a>` : ''}
            ${al.last ? `<a class="card kpi mini" href="#metricas"><div class="l">Alumnos activos</div><div class="v">${num(al.last.value)}</div></a>` : ''}
            ${hasMoney ? `<a class="card kpi mini" href="#contabilidad"><div class="l">Resultado del mes</div><div class="v ${f.net < 0 ? 'down' : ''}">${money(f.net)}</div></a>` : ''}
          </div>
        </div>
        <div class="stack">
          <div class="card"><div class="ch"><h2>${icon('agenda')}Hoy y mañana</h2><a class="btn sm ghost" href="#agenda">Agenda</a></div>
            ${LIVE.mcp ? liveAgendaHtml(2) : `<iframe class="gcal" src="${esc(gcalEmbed('AGENDA'))}" height="320" loading="lazy" title="Google Calendar"></iframe>`}
          </div>
          ${LIVE.mcp && S.settings.mailEnabled ? `<div class="card"><div class="ch"><h2>${icon('inbox')}Correo</h2><span class="small muted">${esc(S.settings.mailAccount || '')}</span></div>${liveMailHtml(4)}</div>` : ''}
          ${week.length ? `<div class="card"><div class="ch"><h2>Esta semana</h2><a class="btn sm ghost" href="#tareas">Tareas</a></div><ul class="list">${week.map(taskItem).join('')}</ul></div>` : ''}
          ${acts.length ? `<div class="card"><div class="ch"><h2>Lo último</h2>${LIVE.mcp ? '<span class="pill ok">En vivo</span>' : ''}</div><ul class="list compact">${acts.map((a) => { const d = new Date(a.at); return `<li><span class="dot" style="background:${a.kind === 'bad' ? 'var(--bad)' : a.kind === 'ia' ? 'var(--ia)' : 'var(--ok)'}"></span><div class="grow"><div class="t">${esc(cleanText(a.text, 110))}</div><div class="m">${esc(shortName(a.source))} · ${iso(d) === today() ? 'hoy' : fmtDate(iso(d))} ${hhmm(d)} hs</div></div></li>`; }).join('')}</ul></div>` : ''}
        </div>
      </div>`;
  };

  VIEWS.agenda = () => {
    const tab = ui.agendaTab;
    const tabs = `<div class="seg">${LIVE.mcp ? `<button class="${tab === 'lista' ? 'active' : ''}" data-action="set" data-k="agendaTab" data-v="lista">${icon('agenda')}Próximos eventos</button>` : ''}<button class="${tab === 'google' ? 'active' : ''}" data-action="set" data-k="agendaTab" data-v="google">${icon('gcal')}Google Calendar</button><button class="${tab === 'panel' ? 'active' : ''}" data-action="set" data-k="agendaTab" data-v="panel">${icon('workflows')}Tareas y workflows</button></div>`;
    if (LIVE.mcp && tab === 'lista') {
      return head('Agenda', 'Tus próximos eventos de Google Calendar, leídos en vivo. Las sesiones de consulta entran solas en Captación y en Contactos.', tabs) + `<div class="card">${liveAgendaHtml(21)}</div>`;
    }
    if (tab === 'google') {
      const mode = S.settings.gcalMode || 'WEEK';
      return head('Agenda', 'Tu Google Calendar dentro del panel. Los eventos se crean y se editan en Google; las tareas del panel se pueden enviar a Google con un clic desde cada tarea.', `${tabs}`) +
        `<div class="card"><div class="ch"><div class="seg">${[['WEEK', 'Semana'], ['MONTH', 'Mes'], ['AGENDA', 'Lista']].map(([k, l]) => `<button class="${mode === k ? 'active' : ''}" data-action="gcal-mode" data-v="${k}">${l}</button>`).join('')}</div>
          <div class="row"><span class="small muted hide-m">${(S.settings.calendars || []).filter((c) => c.on !== false).map((c) => `<span class="row" style="display:inline-flex;gap:5px;margin-right:10px"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</span>`).join('')}</span>
          <a class="btn sm" href="${esc(gcalTemplate({ title: '', date: today() }))}" target="_blank" rel="noopener">${icon('plus')}Evento</a><a class="btn sm" href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener">${icon('ext')}Abrir Google Calendar</a></div></div>
          <iframe class="gcal" src="${esc(gcalEmbed(mode))}" height="720" title="Google Calendar"></iframe>
          <div class="small muted" style="margin-top:8px">Si aparece un aviso de permisos, inicia sesión en Google con contacto@prepdiplomacia.com en este navegador. Calendarios y zona horaria (${esc(S.settings.tz)}) se ajustan en <a href="#ajustes">Ajustes</a>.</div>
        </div>`;
    }
    const m = ui.calMonth; const y = m.getFullYear(), mo = m.getMonth();
    const first = new Date(y, mo, 1); const start = addDays(first, -((first.getDay() + 6) % 7));
    const cells = []; for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    if (cells[35].getMonth() !== mo) cells.length = 35;
    const end = iso(cells[cells.length - 1]);
    const evs = {}; const push = (d, html) => { (evs[d] = evs[d] || []).push(html); };
    byBrand(S.tasks).forEach((t) => { if (t.due) push(t.due, `<button class="ev task ${t.status === 'hecha' ? 'done' : ''}" data-action="edit" data-entity="tasks" data-id="${t.id}">${t.time ? esc(t.time) + ' ' : ''}${esc(t.title)}</button>`); });
    byBrand(S.tasks).filter((t) => t.repeat && t.repeat !== 'none' && t.status !== 'hecha' && t.due).forEach((t) => { let d = nextDate(t.due, t.repeat); while (d <= end) { push(d, `<button class="ev task" style="opacity:.55" data-action="edit" data-entity="tasks" data-id="${t.id}" title="Repetición prevista">↻ ${esc(t.title)}</button>`); d = nextDate(d, t.repeat); } });
    byBrand(S.posts).forEach((p) => { if (p.date) push(p.date, `<button class="ev post ${p.status === 'publicada' ? 'done' : ''}" data-action="edit" data-entity="posts" data-id="${p.id}">${esc(p.channel)}: ${esc(p.title)}</button>`); });
    byBrand(S.items).forEach((i) => { if (i.due) push(i.due, `<button class="ev wf" data-action="edit" data-entity="items" data-id="${i.id}">${esc(i.title)}</button>`); });
    byBrand(S.projects).forEach((p) => { if (p.end) push(p.end, `<button class="ev proj" data-action="edit" data-entity="projects" data-id="${p.id}">Cierre: ${esc(p.name)}</button>`); });
    return head('Agenda', 'Tareas, publicaciones e ítems de workflows del panel. Haz clic en un día para crear una tarea en esa fecha.', tabs) +
      `<div class="ch"><div class="row"><button class="btn sm" data-action="cal" data-v="-1">‹</button><button class="btn sm" data-action="cal" data-v="0">Hoy</button><button class="btn sm" data-action="cal" data-v="1">›</button><h2 style="text-transform:capitalize;margin-left:6px">${MONTHS[mo]} ${y}</h2></div>
       <div class="legend"><span><i style="background:var(--accent-soft)"></i>Tarea</span><span><i style="background:var(--gold-soft)"></i>Publicación</span><span><i style="background:var(--ia-soft)"></i>Workflow</span><span><i style="background:var(--ok-soft)"></i>Proyecto</span></div></div>
      <div class="cal">${DOW.map((d) => `<div class="dow">${d}</div>`).join('')}
      ${cells.map((d) => { const k = iso(d); const list = evs[k] || []; return `<div class="day ${d.getMonth() !== mo ? 'other' : ''} ${k === today() ? 'today' : ''}" data-action="day" data-date="${k}"><div class="n">${d.getDate()}</div>${list.slice(0, 4).join('')}${list.length > 4 ? `<div class="small muted">+${list.length - 4} más</div>` : ''}</div>`; }).join('')}</div>`;
  };

  VIEWS.tareas = () => {
    let list = byBrand(S.tasks); const f = ui.taskFilter;
    if (f === 'abiertas') list = list.filter((t) => t.status !== 'hecha');
    if (f === 'hoy') list = list.filter((t) => t.status !== 'hecha' && t.due && t.due <= today());
    if (f === 'semana') list = list.filter((t) => t.status !== 'hecha' && t.due && t.due <= iso(addDays(new Date(), 7)));
    if (f === 'programadas') list = list.filter((t) => t.repeat && t.repeat !== 'none');
    if (f === 'vencidas') list = list.filter(isLate);
    const sorted = list.slice().sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    const filt = [['abiertas', 'Abiertas'], ['hoy', 'Hoy y atrasadas'], ['semana', 'Próximos 7 días'], ['programadas', 'Recurrentes'], ['vencidas', 'Vencidas'], ['todas', 'Todas']];
    const body = ui.taskView === 'lista'
      ? `<div class="card">${sorted.length ? '<ul class="list">' + sorted.map(taskItem).join('') + '</ul>' : '<div class="empty">Sin tareas con este filtro</div>'}</div>`
      : board('tasks', TASK_STATUS.map(([s, l, c], i) => ({ id: s, name: l, color: c, next: TASK_STATUS[i + 1] ? { name: TASK_STATUS[i + 1][1] } : null, items: s === 'hecha' && f === 'abiertas' ? byBrand(S.tasks).filter((t) => t.status === 'hecha').slice(-8) : sorted.filter((t) => t.status === s) })),
        (t) => `<div class="t">${esc(t.title)}</div><div class="meta">${t.due ? `<span>${fmtDate(t.due)}${t.time ? ' ' + esc(t.time) + ' hs' : ''}</span>` : ''}${isLate(t) ? '<span class="pill solid-bad">Vencida</span>' : `<span class="pill ${t.priority}">${esc(t.priority)}</span>`}${t.repeat !== 'none' ? '<span title="Recurrente">↻</span>' : ''}</div>${t.project ? `<div class="meta" style="margin-top:4px">${esc(projName(t.project))}</div>` : ''}`);
    return head('Tareas', 'Arrastra las tarjetas o usa la flecha para avanzar. Las tareas recurrentes generan la siguiente al completarse.',
      `<div class="seg"><button class="${ui.taskView === 'tablero' ? 'active' : ''}" data-action="set" data-k="taskView" data-v="tablero">Tablero</button><button class="${ui.taskView === 'lista' ? 'active' : ''}" data-action="set" data-k="taskView" data-v="lista">Lista</button></div><button class="btn primary" data-action="new" data-entity="tasks">${icon('plus')}Tarea</button>`) +
      `<div class="filters">${filt.map(([k, l]) => `<button class="chip ${ui.taskFilter === k ? 'active' : ''}" data-action="set" data-k="taskFilter" data-v="${k}">${l}</button>`).join('')}</div>` + body;
  };

  VIEWS.workflows = () => {
    const wfs = byBrand(S.workflows);
    return head('Workflows', 'Cada proceso del negocio como un flujo de etapas. Los agentes IA alimentan algunos de ellos; tú avanzas el resto con un clic.', `<button class="btn" data-action="new" data-entity="items">${icon('plus')}Ítem</button><button class="btn primary" data-action="new" data-entity="workflows">${icon('plus')}Workflow</button>`, 'Operación') +
      `<div class="grid g-3">${wfs.map((w) => {
        const items = wfItems(w); const agents = S.agents.filter((a) => a.wf === w.id);
        return `<div class="card wfcard" data-action="go" data-href="#workflow/${w.id}">
          <div class="top"><span class="ico" style="background:${esc(w.color || '#153D63')}">${icon(w.id === 'wf-corr' ? 'correcciones' : 'workflows')}</span><div style="min-width:0"><h3>${esc(w.name)}</h3><p>${esc(w.desc || '')}</p></div></div>
          ${pipeline(w, true)}
          <div class="row between small muted"><span>${brandDot(w.brand)} ${esc(brandName(w.brand))} · ${plural(items.length, 'ítem')}</span><span>${agents.length ? `<span class="pill ia">${icon('agentes')}${agents.length} agente${agents.length > 1 ? 's' : ''}</span>` : ''}</span></div>
        </div>`;
      }).join('')}</div>`;
  };

  VIEWS.workflow = () => {
    const w = wfById(ui.param);
    if (!w) return head('Workflow no encontrado', '<a href="#workflows">Volver a workflows</a>');
    const agents = S.agents.filter((a) => a.wf === w.id);
    return `<div class="small" style="margin-bottom:8px"><a href="#workflows">Workflows</a> <span class="muted">/ ${esc(w.name)}</span></div>` +
      head(w.name, esc(w.desc || ''), `${w.id === 'wf-corr' ? `<a class="btn" href="#correcciones">${icon('correcciones')}Panel de correcciones</a>` : ''}<button class="btn" data-action="edit" data-entity="workflows" data-id="${w.id}">${icon('edit')}Editar etapas</button><button class="btn primary" data-action="new" data-entity="items" data-wf="${w.id}">${icon('plus')}Ítem</button>`) +
      (agents.length ? `<div class="row" style="margin-bottom:12px"><span class="small muted">Automatizado por</span>${agents.map((a) => `<a class="pill ia" href="#agentes">${icon('agentes')}${esc(a.name)} · ${esc(a.time)} hs</a>`).join('')}</div>` : '') +
      `<div class="card" style="margin-bottom:16px">${pipeline(w)}</div>` + wfBoard(w);
  };

  VIEWS.correcciones = () => {
    const rep = latestReport(); const tot = reportTotals(rep);
    const wf = wfById('wf-corr');
    const keys = rep ? Object.keys(rep.classes).sort((a, b) => { const o = (k) => { const i = CLASSES.findIndex((c) => c.key === k); return i < 0 ? 99 : i; }; return o(a) - o(b); }) : [];
    const knownMissing = CLASSES.filter((c) => !keys.includes(c.key));
    const maxRow = Math.max(1, ...keys.map((k) => CORR_STAGES.reduce((a, s) => a + Number(rep.classes[k][s] || 0), 0)));
    const banner = rep ? `<div class="banner ${rep.status}"><span class="ic">${icon(rep.status === 'ok' ? 'ok' : 'alert')}</span><div style="flex:1;min-width:0">
        <div class="row between"><h3>${rep.status === 'falla' ? 'El agente no pudo leer Moodle' : rep.status === 'aviso' ? 'Informe con avisos' : 'Corrida correcta'}</h3><span class="small muted">Informe del ${fmtDate(rep.date)}${rep.time ? ' · ' + esc(rep.time) + ' hs' : ''}</span></div>
        ${rep.summary ? `<p style="margin:6px 0 0">${esc(rep.summary)}</p>` : ''}
        ${rep.todos && rep.todos.length ? `<div class="small" style="margin-top:10px;font-weight:700">Lo que tienes que hacer tú</div><ul class="todo">${rep.todos.map((t, i) => `<li class="${t.done ? 'done' : ''}"><button class="check ${t.done ? 'on' : ''}" data-action="todo" data-i="${i}">${t.done ? '✓' : ''}</button><span>${esc(t.text)}</span></li>`).join('')}</ul>` : ''}
        ${rep.status === 'falla' ? `<div class="row" style="margin-top:10px"><a class="btn sm" href="${MOODLE}/login/index.php" target="_blank" rel="noopener">${icon('ext')}Iniciar sesión en Moodle</a><button class="btn sm" data-action="copy" data-text="corre el agente de correcciones">Copiar la orden para Claude</button></div>` : ''}
      </div></div>` : '';
    return head('Correcciones', 'Las tareas de redacción de tus alumnos según el último informe del agente diario de correcciones (11:18 hs de París). ' + (LIVE.mcp ? 'Se actualiza solo con cada corrida del agente; también puedes pegar un informe a mano.' : 'Pega cada informe nuevo para actualizar el panel y el workflow.'),
      `<a class="btn" href="${MOODLE}/mod/assign/index.php?id=9" target="_blank" rel="noopener">${icon('ext')}Tareas en Moodle</a><a class="btn" href="#workflow/wf-corr">${icon('workflows')}Ver flujo</a><button class="btn primary" data-action="report">${icon('paste')}Pegar informe del agente</button>`, 'Curso 2027') +
      banner +
      `<div class="grid g-kpi" style="margin-bottom:16px">
        <div class="card kpi accent"><div class="l">En tu revisión</div><div class="v">${num(tot.revision)}</div><div class="s">corregidas por el agente, listas para revisar y subir</div></div>
        <div class="card kpi"><div class="l">Devueltas en Moodle</div><div class="v up">${num(tot.devuelta)}</div><div class="s">con marca “subido a Moodle”</div></div>
        <div class="card kpi"><div class="l">Nuevas o sin corregir</div><div class="v">${num(tot.nueva + tot.descargada)}</div><div class="s">${rep && rep.status === 'falla' ? 'sin datos de Moodle hoy' : 'esperando al agente'}</div></div>
        <div class="card kpi"><div class="l">Con problema</div><div class="v ${tot.problema ? 'down' : ''}">${num(tot.problema)}</div><div class="s">${tot.problema ? 'requieren una decisión tuya' : 'sin problemas'}</div></div>
      </div>
      <div class="grid g-main">
        <div class="card pad0"><div class="ch" style="padding:16px 18px 0"><h2>Por clase</h2><div class="legend"><span><i style="background:#C6A75E"></i>En tu revisión</span><span><i style="background:#1F8A5B"></i>Devueltas</span><span><i style="background:#C2413A"></i>Problema</span></div></div>
          <div class="tw"><table><thead><tr><th>Clase</th><th class="num">Revisión</th><th class="num">Devueltas</th><th class="num">Problemas</th><th class="hide-m">Avance</th><th></th></tr></thead><tbody>
          ${keys.map((k) => { const c = rep.classes[k]; const seg = (v, col) => v ? `<span style="width:${(v / maxRow) * 100}%;background:${col}"></span>` : ''; return `<tr><td><strong>${esc(classMeta(k).label)}</strong></td><td class="num">${c.revision ? `<span class="pill gold">${num(c.revision)}</span>` : '–'}</td><td class="num">${num(c.devuelta || 0)}</td><td class="num ${c.problema ? 'down' : ''}">${num(c.problema || 0)}</td><td class="hide-m"><div class="hbar">${seg(c.devuelta, '#1F8A5B')}${seg(c.revision, '#C6A75E')}${seg(c.problema, '#C2413A')}</div></td><td class="act"><a class="btn sm" href="${esc(gradingUrl(k))}" target="_blank" rel="noopener">Moodle ${icon('ext')}</a></td></tr>`; }).join('')}
          ${knownMissing.map((c) => `<tr><td><strong>${esc(c.label)}</strong></td><td colspan="4" class="muted small">Sin datos en el último informe</td><td class="act"><a class="btn sm" href="${esc(gradingUrl(c.key))}" target="_blank" rel="noopener">Moodle ${icon('ext')}</a></td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="stack">
          ${LIVE.mcp ? `<div class="card"><h2 style="margin-bottom:6px">Devoluciones agendadas</h2>${(() => { const dv = LIVE.events.filter((e) => evKind(e) === 'devolucion' && evStart(e) >= addDays(new Date(), -0.05)); return dv.length ? '<ul class="list">' + dv.slice(0, 8).map((e) => { const d = evStart(e); return `<li><div class="grow"><div class="t">${esc(e.summary)}</div><div class="m">${fmtDate(iso(d))} · ${hhmm(d)} hs</div></div>${e.conferenceUrl ? `<a class="btn sm" href="${esc(e.conferenceUrl)}" target="_blank" rel="noopener">Meet</a>` : ''}</li>`; }).join('') + '</ul>' : '<div class="empty">Sin devoluciones agendadas</div>'; })()}</div>` : ''}
          <div class="card"><h2 style="margin-bottom:10px">Pendientes del agente</h2>
            ${rep && ((rep.problems || []).length || (rep.pendingNotes || []).length) ? `<ul class="list">${(rep.problems || []).map((p) => `<li><span class="pill bad">Problema</span><span class="grow">${esc(p)}</span></li>`).join('')}${(rep.pendingNotes || []).map((p) => `<li><span class="pill">Nota</span><span class="grow">${esc(p)}</span></li>`).join('')}</ul>` : '<div class="empty">Sin pendientes</div>'}
          </div>
          <div class="card"><h2 style="margin-bottom:10px">Historial de informes</h2>
            <ul class="list">${S.reports.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((r) => { const t = reportTotals(r); return `<li><div class="grow"><div class="t">${fmtDate(r.date)}${r.time ? ' · ' + esc(r.time) + ' hs' : ''}</div><div class="m">${num(t.revision)} en revisión · ${num(t.devuelta)} devueltas</div></div>${statusPill(r.status)}</li>`; }).join('')}</ul>
            ${rep && rep.raw ? `<details class="raw" style="margin-top:8px"><summary>Ver el texto del último informe</summary><pre>${esc(rep.raw)}</pre></details>` : ''}
          </div>
        </div>
      </div>
      ${wf ? `<div class="ch" style="margin-top:22px"><h2>Workflow de correcciones</h2><button class="btn sm" data-action="new" data-entity="items" data-wf="wf-corr">${icon('plus')}Ítem manual</button></div><div class="card" style="margin-bottom:12px">${pipeline(wf)}</div>${wfBoard(wf)}` : ''}`;
  };

  VIEWS.agentes = () => {
    const ags = byBrand(S.agents).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const fails = ags.filter((a) => a.lastStatus === 'falla').length;
    return head('Agentes IA', (LIVE.mcp ? 'Tus tareas programadas de Claude, leídas en vivo: horario, resultado de la última corrida y conversaciones que esperan tu respuesta.' : 'Las tareas programadas que trabajan para ti todos los días en Claude.'), `<a class="btn" href="https://claude.ai/code" target="_blank" rel="noopener">${icon('ext')}Abrir Claude</a><button class="btn primary" data-action="new" data-entity="agents">${icon('plus')}Agente</button>`, 'Automatizaciones') +
      `<div class="grid g-kpi" style="margin-bottom:16px"><div class="card kpi accent"><div class="l">Agentes activos</div><div class="v">${ags.length}</div></div><div class="card kpi"><div class="l">Con falla</div><div class="v ${fails ? 'down' : 'up'}">${fails}</div></div><div class="card kpi"><div class="l">Workflows automatizados</div><div class="v">${new Set(ags.map((a) => a.wf).filter(Boolean)).size}</div></div></div>
      <div class="grid g-main"><div class="grid g-2">${ags.map((a) => { const w = wfById(a.wf); return `<div class="card agent">
        <div class="top"><span class="av">${icon('agentes')}</span><div style="flex:1;min-width:0"><h3>${esc(a.name)}</h3><div class="small muted">${brandDot(a.brand)} ${esc(brandName(a.brand))}</div></div><button class="iconbtn" data-action="edit" data-entity="agents" data-id="${a.id}" aria-label="Editar">${icon('edit')}</button></div>
        <div class="row"><span class="pill info">${icon('clock')}${esc(a.rule || 'Todos los días')}${a.time ? ' · ' + esc(a.time) + ' hs ' + esc(a.tz || '') : ''}</span>${a.enabled === false ? '<span class="pill">Pausado</span>' : a.lastStatus === 'curso' ? '<span class="pill ia">Corriendo</span>' : statusPill(a.lastStatus)}</div>
        <div class="small">${esc(a.desc)}</div>
        ${a.lastNote ? `<div class="small ${a.lastStatus === 'falla' ? 'down' : 'muted'}">${esc(a.lastNote)}</div>` : ''}
        <div class="row between small muted"><span>Última corrida: ${fmtDate(a.lastRun) || 'sin dato'}${a.nextRun ? ' · próxima ' + fmtDate(iso(new Date(a.nextRun))) + ' ' + hhmm(new Date(a.nextRun)) + ' hs' : ''}</span>${w ? `<a href="#workflow/${w.id}">${esc(w.name)} →</a>` : ''}</div>
        ${a.sessionId && LIVE.results[a.sessionId] ? `<details class="raw"><summary>Ver la respuesta de la última corrida</summary><pre>${esc(LIVE.results[a.sessionId])}</pre></details>` : ''}
        ${a.sessionId ? `<a class="btn sm" href="${esc(a.link)}" target="_blank" rel="noopener" style="align-self:flex-start">${icon('ext')}Abrir la corrida en Claude</a>` : ''}
      </div>`; }).join('')}</div>
      <div class="stack" style="align-self:start"><div class="card"><div class="ch"><h2>Tus conversaciones con Claude</h2>${LIVE.mcp ? '<button class="btn sm" data-action="live-refresh">Actualizar</button>' : ''}</div>${liveSessionsHtml(10)}</div>
      ${LIVE.mcp && S.settings.mailEnabled ? `<div class="card"><h2 style="margin-bottom:6px">Correo pendiente</h2>${liveMailHtml(10)}</div>` : ''}
      <div class="card"><h2 style="margin-bottom:12px">Línea del día</h2><div class="timeline">${ags.map((a) => `<div class="tl ${a.lastStatus}"><div class="h">${esc(a.time)} hs · ${esc(a.tz)}</div><div class="small">${esc(a.name)}</div></div>`).join('')}</div>
        <div class="note" style="margin:8px 0 0">En noviembre París y Casablanca comparten hora (UTC+1); 12:00 UTC equivale a 13:00 hs en ambas.</div></div></div></div>`;
  };

  VIEWS.proyectos = () => {
    const order = { activo: 0, planificado: 1, pausado: 2, cerrado: 3 };
    const sorted = byBrand(S.projects).slice().sort((a, b) => order[a.status] - order[b.status]);
    return head('Proyectos', 'Cada proyecto reúne sus tareas, movimientos contables y contactos.', `<button class="btn primary" data-action="new" data-entity="projects">${icon('plus')}Proyecto</button>`) +
      (sorted.length ? `<div class="grid g-2">${sorted.map((p) => {
        const pr = projectProgress(p); const ts = S.tasks.filter((t) => t.project === p.id); const open = ts.filter((t) => t.status !== 'hecha');
        const tx = S.transactions.filter((t) => t.project === p.id);
        const inc = tx.filter((t) => t.type === 'ingreso').reduce((a, t) => a + toUYU(t), 0), exp = tx.filter((t) => t.type === 'gasto').reduce((a, t) => a + toUYU(t), 0);
        const stat = (v, l, c) => `<div><div style="font-family:Montserrat;font-weight:700;font-size:18px;${c ? 'color:' + c : ''}">${v}</div><div class="small muted">${l}</div></div>`;
        return `<div class="card"><div class="ch"><h3>${brandDot(p.brand)} ${esc(p.name)}</h3><span class="row"><span class="pill ${p.status === 'activo' ? 'ok' : ''}">${esc(label(PROJ_STATUS, p.status))}</span><button class="iconbtn" data-action="edit" data-entity="projects" data-id="${p.id}">${icon('edit')}</button></span></div>
          <div class="small muted" style="margin-bottom:8px">${esc(brandName(p.brand))}${p.start ? ' · desde ' + fmtDate(p.start) : ''}${p.end ? ' · hasta ' + fmtDate(p.end) : ''}</div>
          ${p.desc ? `<p style="margin:0 0 12px">${esc(p.desc)}</p>` : ''}
          <div class="row between small muted"><span>Avance ${pr.auto ? `según ${pr.n} tareas` : 'manual'}</span><strong>${pr.pct}%</strong></div>
          <div class="progress" style="margin:4px 0 14px"><span style="width:${pr.pct}%"></span></div>
          <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px">${stat(open.length, 'tareas abiertas')}${stat(short(inc), 'ingresos', 'var(--ok)')}${stat(short(exp), 'gastos', 'var(--bad)')}${stat(S.contacts.filter((c) => c.project === p.id).length, 'contactos')}</div>
          ${p.budget ? `<div class="small muted" style="margin-top:8px">Presupuesto ${money(p.budget)} · ejecutado ${Math.round((exp / p.budget) * 100)}%</div>` : ''}
          ${open.length ? '<ul class="list" style="margin-top:10px">' + open.slice(0, 4).map(taskItem).join('') + '</ul>' : ''}
          <div class="row" style="margin-top:12px"><button class="btn sm" data-action="new" data-entity="tasks" data-project="${p.id}" data-brand="${p.brand}">${icon('plus')}Tarea</button><button class="btn sm" data-action="new" data-entity="transactions" data-project="${p.id}" data-brand="${p.brand}">${icon('plus')}Movimiento</button></div>
        </div>`; }).join('')}</div>` : '<div class="card empty">Todavía no hay proyectos</div>');
  };

  VIEWS.marketing = () => {
    const posts = byBrand(S.posts); const pub = posts.filter((p) => p.status === 'publicada');
    const sum = (k) => pub.reduce((a, p) => a + Number(p[k] || 0), 0);
    const reach = sum('reach'), inter = sum('interactions');
    const byCh = {}; pub.forEach((p) => { byCh[p.channel] = (byCh[p.channel] || 0) + Number(p.reach || 0); });
    const top = pub.slice().sort((a, b) => (Number(b.interactions || 0) + Number(b.saves || 0)) - (Number(a.interactions || 0) + Number(a.saves || 0))).slice(0, 5);
    const sorted = posts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const body = ui.postView === 'tabla'
      ? `<div class="card pad0 tw"><table><thead><tr><th>Fecha</th><th>Título</th><th>Canal</th><th>Estado</th><th class="num">Alcance</th><th class="num">Interacc.</th><th class="num">Guardados</th><th></th></tr></thead><tbody>
        ${sorted.map((p) => `<tr><td>${fmtDate(p.date)}</td><td>${brandDot(p.brand)} ${esc(p.title)}</td><td>${esc(p.channel)} · ${esc(p.format || '')}</td><td><span class="pill">${esc(label(POST_STATUS, p.status))}</span></td><td class="num">${p.reach ? num(p.reach) : ''}</td><td class="num">${p.interactions ? num(p.interactions) : ''}</td><td class="num">${p.saves ? num(p.saves) : ''}</td><td class="act"><button class="iconbtn" data-action="edit" data-entity="posts" data-id="${p.id}">${icon('edit')}</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin publicaciones</td></tr>'}
        </tbody></table></div>`
      : board('posts', POST_STATUS.map(([s, l, c], i) => ({ id: s, name: l, color: c, next: POST_STATUS[i + 1] ? { name: POST_STATUS[i + 1][1] } : null, items: sorted.filter((p) => p.status === s) })), (p) => `<div class="t">${esc(p.title)}</div><div class="meta"><span class="pill gold">${esc(p.channel)}</span><span>${esc(p.format || '')}</span>${p.date ? `<span>${fmtDate(p.date)}</span>` : ''}</div>${p.status === 'publicada' && p.reach ? `<div class="meta" style="margin-top:4px">Alcance ${num(p.reach)} · ${num(p.interactions)} interacc.</div>` : ''}`);
    return head('Marketing y publicaciones', 'Calendario editorial y resultados por pieza. La producción de carruseles y artículos se sigue en sus workflows.',
      `<a class="btn" href="#workflow/wf-carrusel">${icon('workflows')}Carruseles</a><a class="btn" href="#workflow/wf-blog">${icon('workflows')}Blog</a><div class="seg"><button class="${ui.postView === 'tablero' ? 'active' : ''}" data-action="set" data-k="postView" data-v="tablero">Tablero</button><button class="${ui.postView === 'tabla' ? 'active' : ''}" data-action="set" data-k="postView" data-v="tabla">Tabla</button></div><button class="btn primary" data-action="new" data-entity="posts">${icon('plus')}Publicación</button>`) +
      `<div class="grid g-kpi" style="margin-bottom:16px">
        <div class="card kpi accent"><div class="l">Publicadas</div><div class="v">${pub.length}</div><div class="s">${posts.filter((p) => p.status === 'programada').length} programadas</div></div>
        <div class="card kpi accent"><div class="l">Alcance total</div><div class="v">${num(reach)}</div></div>
        <div class="card kpi accent"><div class="l">Interacciones</div><div class="v">${num(inter)}</div><div class="s">${num(sum('saves'))} guardados</div></div>
        <div class="card kpi accent"><div class="l">Tasa de interacción</div><div class="v">${reach ? ((inter / reach) * 100).toFixed(1) : '0'}%</div></div>
      </div>${body}
      <div class="grid g-2" style="margin-top:16px"><div class="card"><h2 style="margin-bottom:12px">Alcance por canal</h2>${hbars(Object.entries(byCh).sort((a, b) => b[1] - a[1]), num)}</div>
      <div class="card"><h2 style="margin-bottom:6px">Mejor rendimiento</h2>${top.length ? '<ul class="list">' + top.map((p) => `<li><div class="grow"><div class="t">${esc(p.title)}</div><div class="m">${esc(p.channel)} · ${fmtDate(p.date)}</div></div><span class="pill gold">${num(Number(p.interactions || 0) + Number(p.saves || 0))}</span></li>`).join('') + '</ul>' : '<div class="empty">Carga resultados para ver el ranking</div>'}</div></div>`;
  };

  VIEWS.contabilidad = () => {
    const month = ui.finMonth; const f = finance(month); const yearKey = month.slice(0, 4);
    const yTx = byBrand(S.transactions).filter((t) => t.date.startsWith(yearKey));
    const yInc = yTx.filter((t) => t.type === 'ingreso').reduce((a, t) => a + toUYU(t), 0), yExp = yTx.filter((t) => t.type === 'gasto').reduce((a, t) => a + toUYU(t), 0);
    const groups = last12().map((k) => { const x = finance(k); return { label: MONTHS_S[Number(k.slice(5)) - 1], values: [x.inc, x.exp] }; });
    const cat = (type) => { const o = {}; f.tx.filter((t) => t.type === type).forEach((t) => { o[t.category] = (o[t.category] || 0) + toUYU(t); }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
    let rows = f.tx.slice().sort((a, b) => b.date.localeCompare(a.date));
    if (ui.finType !== 'todos') rows = rows.filter((t) => (ui.finType === 'pendiente' ? t.status === 'pendiente' : t.type === ui.finType));
    return head('Contabilidad', `Montos consolidados en pesos uruguayos (US$ 1 = $ ${esc(S.settings.usdRate)} · € 1 = $ ${esc(S.settings.eurRate)}, ajustable en Ajustes).`,
      `<div class="seg"><button data-action="fin" data-v="-1">‹</button><button class="active" style="text-transform:capitalize;min-width:128px">${ymLabel(month)}</button><button data-action="fin" data-v="1">›</button></div><button class="btn" data-action="csv">Exportar CSV</button><button class="btn primary" data-action="new" data-entity="transactions">${icon('plus')}Movimiento</button>`) +
      `<div class="grid g-kpi" style="margin-bottom:16px">
        <div class="card kpi accent"><div class="l">Ingresos del mes</div><div class="v up">${money(f.inc)}</div></div>
        <div class="card kpi accent"><div class="l">Gastos del mes</div><div class="v down">${money(f.exp)}</div></div>
        <div class="card kpi accent"><div class="l">Resultado del mes</div><div class="v ${f.net < 0 ? 'down' : ''}">${money(f.net)}</div><div class="s">margen ${f.inc ? Math.round((f.net / f.inc) * 100) : 0}%</div></div>
        <div class="card kpi accent"><div class="l">Pendiente de cobro</div><div class="v">${money(f.pend)}</div></div>
        <div class="card kpi accent"><div class="l">Resultado ${yearKey}</div><div class="v ${yInc - yExp < 0 ? 'down' : ''}">${money(yInc - yExp)}</div><div class="s">Ingresos ${money(yInc)}</div></div>
      </div>
      <div class="grid g-main"><div class="card"><div class="ch"><h2>Últimos 12 meses</h2><div class="legend"><span><i style="background:#153D63"></i>Ingresos</span><span><i style="background:#C6A75E"></i>Gastos</span></div></div><div class="chart">${barChart(groups, [{ name: 'Ingresos', color: '#153D63' }, { name: 'Gastos', color: '#C6A75E' }], { fmt: money })}</div></div>
      <div class="stack"><div class="card"><h3 style="margin-bottom:10px">Ingresos por categoría</h3>${hbars(cat('ingreso'), money)}</div><div class="card"><h3 style="margin-bottom:10px">Gastos por categoría</h3>${hbars(cat('gasto'), money)}</div></div></div>
      <div class="card pad0" style="margin-top:16px"><div class="ch" style="padding:16px 18px 4px"><h2 style="text-transform:none">Movimientos de ${ymLabel(month)}</h2><div class="row">${[['todos', 'Todos'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos'], ['pendiente', 'Pendientes']].map(([k, l]) => `<button class="chip ${ui.finType === k ? 'active' : ''}" data-action="set" data-k="finType" data-v="${k}">${l}</button>`).join('')}</div></div>
        <div class="tw"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Marca</th><th>Estado</th><th class="num">Importe</th><th class="num">En pesos</th><th></th></tr></thead><tbody>
        ${rows.map((t) => `<tr><td>${fmtDate(t.date)}</td><td>${esc(t.desc)}${t.project ? `<div class="small muted">${esc(projName(t.project))}</div>` : ''}</td><td>${esc(t.category)}</td><td>${brandDot(t.brand)}</td><td>${t.status === 'pendiente' ? '<span class="pill warn">Pendiente</span>' : '<span class="pill ok">OK</span>'}</td><td class="num ${t.type === 'gasto' ? 'down' : 'up'}">${t.type === 'gasto' ? '−' : '+'} ${t.currency === 'EUR' ? '€ ' + num(t.amount) : money(t.amount, t.currency)}</td><td class="num">${money(toUYU(t))}</td><td class="act"><button class="iconbtn" data-action="edit" data-entity="transactions" data-id="${t.id}">${icon('edit')}</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin movimientos en este mes</td></tr>'}
        </tbody></table></div></div>`;
  };

  VIEWS.metricas = () => {
    const key = ui.metricKey; const brands = ui.brand === 'all' ? BRANDS : BRANDS.filter((b) => b.id === ui.brand);
    const series = brands.map((b) => ({ name: b.name, color: b.color, points: S.metrics.filter((m) => m.key === key && m.brand === b.id) })).filter((s) => s.points.length);
    const cards = METRIC_KEYS.map(([k, l]) => { const { last, prev } = latestMetric(k); if (!last) return ''; const dl = prev ? last.value - prev.value : null;
      return `<button class="card kpi" style="text-align:left;${k === key ? 'border-color:var(--gold);box-shadow:0 0 0 2px var(--gold-soft)' : ''}" data-action="set" data-k="metricKey" data-v="${k}"><div class="l">${esc(l)}</div><div class="v">${num(last.value)}</div><div class="s">${dl === null ? fmtDate(last.date) : `<span class="${dl >= 0 ? 'up' : 'down'}">${dl >= 0 ? '▲' : '▼'} ${num(Math.abs(dl))}</span> vs. anterior`}</div></button>`; }).join('');
    const rows = byBrand(S.metrics).filter((m) => m.key === key).sort((a, b) => b.date.localeCompare(a.date));
    return head('Métricas', 'Indicadores de crecimiento. Registra los valores una vez al mes para ver la evolución.', `<button class="btn primary" data-action="new" data-entity="metrics">${icon('plus')}Registrar</button>`) +
      `<div class="grid g-kpi" style="margin-bottom:16px">${cards || '<div class="card empty">Sin métricas registradas</div>'}</div>
      <div class="grid g-main"><div class="card"><div class="ch"><h2>${esc(metricLabel(key))}</h2><div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div></div><div class="chart">${lineChart(series)}</div></div>
      <div class="card pad0"><h3 style="padding:16px 18px 8px">Registros</h3>${rows.length ? `<div class="tw"><table><thead><tr><th>Fecha</th><th>Marca</th><th class="num">Valor</th><th></th></tr></thead><tbody>${rows.map((m) => `<tr><td>${fmtDate(m.date)}</td><td>${brandDot(m.brand)}</td><td class="num">${num(m.value)}</td><td class="act"><button class="iconbtn" data-action="edit" data-entity="metrics" data-id="${m.id}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Sin registros</div>'}</div></div>`;
  };

  VIEWS.contactos = () => {
    const rows = byBrand(S.contacts).slice().sort((a, b) => (a.followup || '9999').localeCompare(b.followup || '9999'));
    const counts = {}; byBrand(S.contacts).forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
    return head('Contactos', 'Alumnos, interesados, clientes y aliados, con fecha de próximo seguimiento.', `<a class="btn" href="#workflow/wf-captacion">${icon('workflows')}Captación</a><button class="btn primary" data-action="new" data-entity="contacts">${icon('plus')}Contacto</button>`) +
      `<div class="filters">${Object.entries(counts).map(([k, v]) => `<span class="pill">${esc(k)} · ${v}</span>`).join('')}</div>
      <div class="card pad0 tw"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Marca</th><th>Correo</th><th>Teléfono</th><th>Proyecto</th><th>Seguimiento</th><th></th></tr></thead><tbody>
      ${rows.map((c) => `<tr><td><strong>${esc(c.name)}</strong>${c.notes ? `<div class="small muted">${esc(c.notes)}</div>` : ''}</td><td>${esc(c.type)}</td><td>${brandDot(c.brand)}</td><td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</td><td>${esc(c.phone || '')}</td><td>${esc(projName(c.project))}</td><td>${c.followup ? `<span class="pill ${c.followup < today() ? 'solid-bad' : 'info'}">${fmtDate(c.followup)}</span>` : ''}</td><td class="act"><button class="iconbtn" data-action="edit" data-entity="contacts" data-id="${c.id}">${icon('edit')}</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin contactos</td></tr>'}
      </tbody></table></div>`;
  };

  /* ================= CRM: personas, seguimientos y embudo ================= */
  const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const stageOf = (c) => CRM_STAGES.find((s) => s[0] === c.stage) || CRM_STAGES[0];
  const stagePill = (c) => { const s = stageOf(c); return `<span class="pill" style="background:color-mix(in srgb, ${s[2]} 15%, transparent);color:var(--text)"><span class="dot" style="background:${s[2]}"></span>${esc(s[1])}</span>`; };
  const waLink = (phone) => { const d = String(phone || '').replace(/[^\d]/g, ''); return d.length >= 8 ? `https://wa.me/${d}` : ''; };
  const contactName = (id) => (S.contacts.find((c) => c.id === id) || {}).name || '';
  const lastTouch = (c) => { const ds = S.interactions.filter((i) => i.contact === c.id).map((i) => i.date).sort(); return ds[ds.length - 1] || c.lastContact || ''; };
  function fuPill(c) {
    if (!c.followup) return '<span class="small muted">Sin seguimiento</span>';
    const td = today(); const cls = c.followup < td ? 'solid-bad' : c.followup === td ? 'warn' : 'info';
    return `<span class="pill ${cls}">${c.followup === td ? 'Hoy' : fmtDate(c.followup)}</span>`;
  }
  function crmFiltered() {
    const q = String(ui.crmQ || '').toLowerCase().trim();
    return byBrand(S.contacts).filter((c) => (!ui.crmType || c.type === ui.crmType) && (!ui.crmLate || (c.followup && c.followup <= today())) &&
      (!q || [c.name, c.email, c.phone, c.tags, c.notes, c.nextAction, c.country, c.source].some((v) => String(v || '').toLowerCase().includes(q))));
  }

  VIEWS.personas = () => {
    const all = byBrand(S.contacts); const list = crmFiltered();
    const late = all.filter((c) => c.followup && c.followup <= today()).length;
    const counts = {}; all.forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
    const view = ui.crmView || 'lista';
    const filters = `<div class="filters"><input id="crmSearch" class="crm-search" type="search" placeholder="Buscar por nombre, correo, etiqueta…" value="${esc(ui.crmQ || '')}" aria-label="Buscar personas">
      <button class="chip ${!ui.crmType ? 'active' : ''}" data-action="set" data-k="crmType" data-v="">Todas · ${all.length}</button>
      ${CONTACT_TYPES.filter((t) => counts[t]).map((t) => `<button class="chip ${ui.crmType === t ? 'active' : ''}" data-action="set" data-k="crmType" data-v="${esc(t)}">${esc(t)} · ${counts[t]}</button>`).join('')}
      <button class="chip ${ui.crmLate ? 'active' : ''}" data-action="set" data-k="crmLate" data-v="${ui.crmLate ? '' : '1'}">Seguimiento pendiente · ${late}</button></div>`;
    let body;
    if (view === 'embudo') {
      body = board('contacts', CRM_STAGES.map(([id, name, color], i) => ({ id, name, color, next: CRM_STAGES[i + 1] ? { name: CRM_STAGES[i + 1][1] } : null, items: list.filter((c) => (c.stage || 'nuevo') === id) })),
        (c) => `<div class="t"><a href="#persona/${c.id}" style="color:inherit;text-decoration:none">${esc(c.name)}</a></div><div class="meta"><span>${esc(c.type)}</span>${c.followup ? fuPill(c) : ''}${c.value ? `<span>${money(c.value)}</span>` : ''}</div>${c.nextAction ? `<div class="meta" style="margin-top:4px">${esc(c.nextAction)}</div>` : ''}`);
    } else {
      body = `<div class="card pad0 tw"><table><thead><tr><th>Persona</th><th>Tipo</th><th>Etapa</th><th>Próximo seguimiento</th><th class="hide-m">Último contacto</th><th class="hide-m">Etiquetas</th><th></th></tr></thead><tbody>
        ${list.slice().sort((a, b) => (a.followup || '9999').localeCompare(b.followup || '9999') || a.name.localeCompare(b.name)).map((c) => `<tr class="rowlink" data-action="go" data-href="#persona/${c.id}">
          <td><div class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar sm" style="background:${brandColor(c.brand)}">${esc(initials(c.name))}</span><div style="min-width:0"><strong>${esc(c.name)}</strong>${c.email ? `<div class="small muted">${esc(c.email)}</div>` : ''}</div></div></td>
          <td>${esc(c.type)}</td><td>${stagePill(c)}</td><td>${fuPill(c)}${c.nextAction ? `<div class="small muted">${esc(c.nextAction)}</div>` : ''}</td>
          <td class="hide-m">${lastTouch(c) ? fmtDate(lastTouch(c)) : '<span class="muted">–</span>'}</td>
          <td class="hide-m">${String(c.tags || '').split(',').map((t) => t.trim()).filter(Boolean).map((t) => `<span class="pill">${esc(t)}</span>`).join(' ')}</td>
          <td class="act"><button class="btn sm" data-action="log" data-id="${c.id}">Registrar</button></td></tr>`).join('') || `<tr><td colspan="7" class="empty">${all.length ? 'Nadie coincide con el filtro' : 'Todavía no hay personas. Las sesiones de tu agenda se agregan solas, o puedes importar una lista.'}</td></tr>`}
        </tbody></table></div>`;
    }
    return head('Personas', 'Alumnos, interesados, clientes y aliados, con toda su historia en una ficha. Las sesiones de consulta y de devolución de tu agenda se agregan solas.',
      `<div class="seg"><button class="${view === 'lista' ? 'active' : ''}" data-action="set" data-k="crmView" data-v="lista">Lista</button><button class="${view === 'embudo' ? 'active' : ''}" data-action="set" data-k="crmView" data-v="embudo">Embudo</button></div>
       <button class="btn" data-action="crm-import">Importar</button><button class="btn primary" data-action="new" data-entity="contacts">${icon('plus')}Persona</button>`, 'CRM') + filters + body;
  };
  VIEWS.contactos = VIEWS.personas;

  function timelineFor(c) {
    const ev = [];
    const typeLabel = (t) => label(INTER_TYPES, t);
    S.interactions.filter((i) => i.contact === c.id).forEach((i) => ev.push({ date: i.date, time: i.time || '', ic: 'contactos', kind: typeLabel(i.type), text: i.summary, edit: ['interactions', i.id], color: 'var(--accent)' }));
    S.tasks.filter((t) => t.contact === c.id).forEach((t) => ev.push({ date: t.due || '', ic: 'tareas', kind: t.status === 'hecha' ? 'Tarea hecha' : 'Tarea', text: t.title, edit: ['tasks', t.id], color: t.status === 'hecha' ? 'var(--ok)' : 'var(--warn)', future: t.status !== 'hecha' }));
    S.items.filter((i) => i.contact === c.id).forEach((i) => { const w = wfById(i.wf); const st = w && w.stages.find((s) => s.id === i.stage); ev.push({ date: i.due || i.updated || '', ic: 'workflows', kind: w ? w.name : 'Workflow', text: `${i.title}${st ? ' · ' + st.name : ''}`, edit: ['items', i.id], color: 'var(--ia)' }); });
    S.transactions.filter((t) => t.contact === c.id).forEach((t) => ev.push({ date: t.date, ic: 'contabilidad', kind: t.type === 'ingreso' ? (t.status === 'pendiente' ? 'Pago pendiente' : 'Pago') : 'Gasto', text: `${t.desc} · ${t.currency === 'EUR' ? '€ ' + num(t.amount) : money(t.amount, t.currency)}`, edit: ['transactions', t.id], color: 'var(--ok)' }));
    const em = String(c.email || '').toLowerCase();
    if (em) {
      LIVE.events.filter((e) => (e.attendees || []).some((a) => String(a.email || '').toLowerCase() === em)).forEach((e) => { const d = evStart(e); ev.push({ date: iso(d), time: hhmm(d), ic: 'agenda', kind: d > new Date() ? 'Próxima reunión' : 'Reunión', text: e.summary || '', href: e.conferenceUrl || e.htmlLink, color: 'var(--gold-d)', future: d > new Date(), live: true }); });
      LIVE.mail.filter((m) => String(m.fromEmail || '').toLowerCase() === em).forEach((m) => ev.push({ date: m.date ? iso(new Date(m.date)) : '', ic: 'inbox', kind: 'Correo sin leer', text: m.subject, href: m.url, color: 'var(--info)', live: true }));
    }
    const seen = new Set();
    return ev.filter((x) => { const k = x.kind + x.date + x.text; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }

  VIEWS.persona = () => {
    const c = S.contacts.find((x) => x.id === ui.param);
    if (!c) return head('Persona no encontrada', '<a href="#personas">Volver a Personas</a>');
    const tl = timelineFor(c); const wa = waLink(c.phone);
    const paid = S.transactions.filter((t) => t.contact === c.id && t.type === 'ingreso' && t.status !== 'pendiente').reduce((a, t) => a + toUYU(t), 0);
    const pend = S.transactions.filter((t) => t.contact === c.id && t.type === 'ingreso' && t.status === 'pendiente').reduce((a, t) => a + toUYU(t), 0);
    const openT = S.tasks.filter((t) => t.contact === c.id && t.status !== 'hecha').length;
    const tags = String(c.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const agendaUrl = (() => { const u = new URL(gcalTemplate({ title: `Reunión con ${c.name}`, date: today() })); if (c.email) u.searchParams.set('add', c.email); return u.toString(); })();
    return `<div class="small" style="margin-bottom:8px"><a href="#personas">Personas</a> <span class="muted">/ ${esc(c.name)}</span></div>
      <div class="card person-head">
        <span class="avatar" style="background:${brandColor(c.brand)}">${esc(initials(c.name))}</span>
        <div class="grow" style="min-width:0"><h1 style="font-size:22px">${esc(c.name)}</h1>
          <div class="row" style="margin-top:6px"><span class="pill">${esc(c.type)}</span>${stagePill(c)}<span class="small muted">${brandDot(c.brand)} ${esc(brandName(c.brand))}</span>${tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
          <div class="row small muted" style="margin-top:8px;gap:14px">${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}${c.phone ? `<span>${esc(c.phone)}</span>` : ''}${c.country ? `<span>${esc(c.country)}</span>` : ''}${c.source ? `<span>Origen: ${esc(c.source)}</span>` : ''}${c.created ? `<span>Desde ${fmtDate(c.created)}</span>` : ''}</div>
        </div>
        <div class="row person-acts"><button class="btn primary" data-action="log" data-id="${c.id}">${icon('plus')}Registrar contacto</button>${c.email ? `<a class="btn" href="mailto:${esc(c.email)}">Correo</a>` : ''}${wa ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}<a class="btn" href="${esc(agendaUrl)}" target="_blank" rel="noopener">${icon('gcal')}Agendar</a><button class="btn" data-action="new" data-entity="tasks" data-contact="${c.id}" data-brand="${c.brand}">Tarea</button><button class="iconbtn" data-action="edit" data-entity="contacts" data-id="${c.id}" aria-label="Editar">${icon('edit')}</button></div>
      </div>
      <div class="grid g-main" style="margin-top:16px">
        <div class="card"><div class="ch"><h2>Historia</h2><span class="small muted">${plural(tl.length, 'registro')}</span></div>
          ${tl.length ? `<div class="timeline tl-person">${tl.map((x) => `<div class="tl" style="--c:${x.color}"><div class="row between" style="gap:8px"><span class="small" style="font-weight:700;color:${x.color}">${esc(x.kind)}${x.future ? ' · próximo' : ''}</span><span class="small muted">${x.date ? (x.date === today() ? 'Hoy' : fmtDate(x.date)) : ''}${x.time ? ' · ' + esc(x.time) + ' hs' : ''}${x.edit ? ` <button class="iconbtn" data-action="edit" data-entity="${x.edit[0]}" data-id="${x.edit[1]}" aria-label="Editar">${icon('edit')}</button>` : ''}${x.href ? ` <a class="iconbtn" href="${esc(x.href)}" target="_blank" rel="noopener" aria-label="Abrir">${icon('ext')}</a>` : ''}</span></div><div>${esc(x.text || '')}</div></div>`).join('')}</div>` : '<div class="empty">Sin historia todavía. Registra el primer contacto o agenda una reunión.</div>'}
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:10px">Próximo seguimiento</h2>
            ${c.followup ? `<div class="row between"><div>${fuPill(c)}<div style="margin-top:6px">${esc(c.nextAction || 'Sin acción definida')}</div></div></div>
              <div class="facts"><button class="btn sm primary" data-action="log" data-id="${c.id}">Hecho</button><button class="btn sm" data-action="fu-snooze" data-id="${c.id}" data-days="1">Mañana</button><button class="btn sm" data-action="fu-snooze" data-id="${c.id}" data-days="7">En una semana</button></div>`
              : `<div class="empty" style="padding:10px">Sin seguimiento agendado.<div class="facts" style="justify-content:center"><button class="btn sm" data-action="fu-snooze" data-id="${c.id}" data-days="3">En 3 días</button><button class="btn sm" data-action="fu-snooze" data-id="${c.id}" data-days="7">En una semana</button></div></div>`}
          </div>
          <div class="card"><h2 style="margin-bottom:6px">Resumen</h2><ul class="list">
            <li><span class="grow">Pagado</span><strong>${money(paid)}</strong></li>
            ${pend ? `<li><span class="grow">Pendiente de cobro</span><strong class="down">${money(pend)}</strong></li>` : ''}
            ${c.value ? `<li><span class="grow">Valor estimado</span><strong>${money(c.value)}</strong></li>` : ''}
            <li><span class="grow">Tareas abiertas</span><strong>${openT}</strong></li>
            <li><span class="grow">Último contacto</span><strong>${lastTouch(c) ? fmtDate(lastTouch(c)) : '–'}</strong></li>
            ${c.project ? `<li><span class="grow">Proyecto</span><strong style="text-align:right">${esc(projName(c.project))}</strong></li>` : ''}
          </ul><div class="facts"><button class="btn sm" data-action="new" data-entity="transactions" data-contact="${c.id}" data-brand="${c.brand}">Registrar pago</button><button class="btn sm" data-action="new" data-entity="items" data-contact="${c.id}" data-brand="${c.brand}">Agregar a un workflow</button></div></div>
          ${c.notes ? `<div class="card"><h2 style="margin-bottom:6px">Notas</h2><p style="margin:0;white-space:pre-wrap">${esc(c.notes)}</p></div>` : ''}
        </div>
      </div>`;
  };

  VIEWS.seguimientos = () => {
    const td = today(); const wk = iso(addDays(new Date(), 7));
    const all = byBrand(S.contacts);
    const withFu = all.filter((c) => c.followup).sort((a, b) => a.followup.localeCompare(b.followup));
    const groups = [['Vencidos', withFu.filter((c) => c.followup < td), 'bad'], ['Hoy', withFu.filter((c) => c.followup === td), 'warn'], ['Próximos 7 días', withFu.filter((c) => c.followup > td && c.followup <= wk), 'info'], ['Más adelante', withFu.filter((c) => c.followup > wk), '']];
    const without = all.filter((c) => !c.followup && !['perdido', 'inactivo'].includes(c.stage || 'nuevo') && c.type !== 'Proveedor');
    const row = (c) => { const wa = waLink(c.phone); return `<li><span class="avatar sm" style="background:${brandColor(c.brand)}">${esc(initials(c.name))}</span><div class="grow"><a class="t" href="#persona/${c.id}" style="color:inherit;text-decoration:none">${esc(c.name)}</a><div class="m"><span>${esc(c.type)}</span>${stagePill(c)}${fuPill(c)}</div>${c.nextAction ? `<div class="small" style="margin-top:3px">${esc(c.nextAction)}</div>` : ''}
      <div class="facts"><button class="btn sm primary" data-action="log" data-id="${c.id}">Registrar contacto</button><button class="btn sm" data-action="fu-snooze" data-id="${c.id}" data-days="1">Mañana</button><button class="btn sm" data-action="fu-snooze" data-id="${c.id}" data-days="7">+1 semana</button>${c.email ? `<a class="btn sm" href="mailto:${esc(c.email)}">Correo</a>` : ''}${wa ? `<a class="btn sm" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div></div></li>`; };
    return head('Seguimientos', 'A quién tienes que contactar y cuándo. Al registrar cada contacto defines el próximo, así nadie queda olvidado.', `<a class="btn" href="#personas">Personas</a><button class="btn primary" data-action="new" data-entity="interactions">${icon('plus')}Registrar contacto</button>`, 'CRM') +
      `<div class="grid stats" style="margin-bottom:16px">${groups.slice(0, 3).map(([l, xs, lv]) => `<div class="card kpi mini"><div class="l">${l}</div><div class="v ${lv === 'bad' && xs.length ? 'down' : ''}">${xs.length}</div></div>`).join('')}<div class="card kpi mini"><div class="l">Sin seguimiento</div><div class="v">${without.length}</div></div></div>
      <div class="grid g-main"><div class="stack">${groups.filter(([, xs]) => xs.length).map(([l, xs]) => `<div class="card"><div class="ch"><h2>${l}</h2><span class="pill">${xs.length}</span></div><ul class="list">${xs.map(row).join('')}</ul></div>`).join('') || '<div class="card empty big">' + icon('ok') + '<div><strong>Sin seguimientos pendientes.</strong><br>Cuando registres un contacto con fecha de seguimiento, aparece aquí.</div></div>'}</div>
      <div class="card" style="align-self:start"><div class="ch"><h2>Sin próximo paso</h2><span class="pill">${without.length}</span></div>${without.length ? `<ul class="list compact">${without.slice(0, 12).map((c) => `<li><div class="grow"><a class="t" href="#persona/${c.id}" style="color:inherit;text-decoration:none">${esc(c.name)}</a><div class="m">${esc(c.type)}</div></div><button class="btn sm" data-action="fu-snooze" data-id="${c.id}" data-days="3">En 3 días</button></li>`).join('')}</ul>` : '<div class="empty">Todos tienen un próximo paso.</div>'}</div></div>`;
  };

  /* Importar personas desde una lista pegada (Excel, Google Sheets o CSV) */
  function openImportDrawer() {
    openDrawer(`<header><div><div class="small muted">CRM</div><h2>Importar personas</h2></div><button class="iconbtn" data-action="close" aria-label="Cerrar">✕</button></header>
      <div class="body"><p class="muted" style="margin-top:0">Copia las filas desde Excel o Google Sheets y pégalas aquí. Si la primera fila tiene títulos (nombre, correo, teléfono, tipo, etiquetas, país, origen), se usan para ubicar cada dato; si no, se lee nombre, correo y teléfono en ese orden. Las personas que ya existen (mismo correo) se actualizan.</p>
      <div class="fgrid"><div class="field"><label>Tipo por defecto</label><select id="impType">${CONTACT_TYPES.map((t) => `<option ${t === 'Alumno/a' ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
      <div class="field"><label>Etiqueta para todas (opcional)</label><input id="impTag" placeholder="Curso 2027"></div>
      <div class="field full"><textarea id="impText" rows="12" placeholder="Nombre	Correo	Teléfono"></textarea></div></div></div>
      <footer><button class="btn" data-action="close">Cancelar</button><button class="btn primary" data-action="crm-import-run">Importar</button></footer>`);
    $('#impText').focus();
  }
  function runImport() {
    const txt = $('#impText').value.trim(); if (!txt) { toast('Pega primero la lista'); return; }
    const lines = txt.split(/\r?\n/).filter((l) => l.trim());
    const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    const cells = (l) => l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ''));
    const hdr = cells(lines[0]).map((h) => h.toLowerCase());
    const hasHdr = hdr.some((h) => /nombre|name|correo|e-?mail|tel|tipo|etiqueta/.test(h));
    const idx = (re, def) => { const i = hdr.findIndex((h) => re.test(h)); return hasHdr ? i : def; };
    const col = { name: idx(/nombre|name/, 0), email: idx(/correo|e-?mail|mail/, 1), phone: idx(/tel|phone|celular|whats/, 2), type: idx(/tipo|type/, -1), tags: idx(/etiqueta|tag/, -1), country: idx(/pa[ií]s|country/, -1), source: idx(/origen|fuente|source/, -1), notes: idx(/nota|note/, -1) };
    const defType = $('#impType').value; const tag = $('#impTag').value.trim();
    let added = 0, updated = 0;
    withUndo(['contacts'], () => {
      lines.slice(hasHdr ? 1 : 0).forEach((l) => {
        const r = cells(l); const g = (k) => (col[k] >= 0 ? r[col[k]] || '' : '');
        const name = g('name'); const email = g('email').toLowerCase(); if (!name && !email) return;
        let c = email ? S.contacts.find((x) => String(x.email || '').toLowerCase() === email) : S.contacts.find((x) => x.name.toLowerCase() === name.toLowerCase());
        const type = CONTACT_TYPES.find((t) => t.toLowerCase().startsWith(g('type').toLowerCase().slice(0, 5)) && g('type')) || defType;
        const tags = [g('tags'), tag].filter(Boolean).join(', ');
        if (c) { Object.assign(c, { name: name || c.name, phone: g('phone') || c.phone, country: g('country') || c.country, source: g('source') || c.source, tags: [c.tags, tags].filter(Boolean).join(', ') }); updated++; }
        else { S.contacts.push({ id: uid(), name: name || email, email, phone: g('phone'), type, stage: /alumno|cliente/i.test(type) ? 'activo' : 'nuevo', brand: defBrand(), country: g('country'), source: g('source') || 'Importación', tags, notes: g('notes'), created: today() }); added++; }
      });
    }, () => `${plural(added, 'persona importada', 'personas importadas')}${updated ? `, ${updated} ${updated === 1 ? 'actualizada' : 'actualizadas'}` : ''}`);
    closeDrawer();
  }

  VIEWS.recursos = () => {
    const list = byBrand(S.resources); const cats = [...new Set(list.map((r) => r.category))];
    return head('Recursos y enlaces', 'Plataformas, cuentas y documentos clave a un clic.', `<button class="btn primary" data-action="new" data-entity="resources">${icon('plus')}Recurso</button>`) +
      (cats.map((c) => `<h2 style="margin:20px 0 10px">${esc(c)}</h2><div class="res-grid">${list.filter((r) => r.category === c).map((r) => `<div class="res"><div class="row between"><a class="t" href="${esc(r.url)}" target="_blank" rel="noopener">${brandDot(r.brand)} ${esc(r.name)}</a><button class="iconbtn" data-action="edit" data-entity="resources" data-id="${r.id}">${icon('edit')}</button></div><div class="u">${esc(r.url)}</div>${r.notes ? `<div class="u">${esc(r.notes)}</div>` : ''}</div>`).join('')}</div>`).join('') || '<div class="card empty">Sin recursos</div>');
  };

  VIEWS.ajustes = () => {
    const demo = Object.keys(SCHEMAS).reduce((a, k) => a + S[k].filter((x) => x.demo).length, 0);
    const calText = (S.settings.calendars || []).map((c) => `${c.id} | ${c.name} | ${c.color}${c.on === false ? ' | oculto' : ''}`).join('\n');
    return head('Ajustes y respaldo', LIVE.on ? 'Tus datos se guardan en la base del panel y se sincronizan entre tus dispositivos.' : 'Los datos se guardan en este navegador. Descarga una copia con regularidad para no perderlos y para usarlos en otro equipo.') +
      `<div class="grid g-2" style="margin-bottom:16px"><div class="card"><h2 style="margin-bottom:6px">Conexiones automáticas</h2>${connectionsHtml()}</div>
       <div class="card"><h2 style="margin-bottom:6px">Correo</h2><p class="muted" style="margin-top:0">El panel lee el Gmail conectado a Claude y solo muestra correo si la cuenta conectada coincide con la indicada aquí. Con cualquier otra cuenta, no muestra nada.</p>
       <form id="mailForm" class="fgrid"><div class="field full"><label><input type="checkbox" name="mailEnabled" ${S.settings.mailEnabled ? 'checked' : ''}> Mostrar el correo pendiente en el panel</label></div>
       <div class="field full"><label>Cuenta de correo del panel</label><input name="mailAccount" type="email" value="${esc(S.settings.mailAccount || '')}"></div>
       <div class="field full"><label>Filtro de búsqueda de Gmail</label><input name="mailQuery" value="${esc(S.settings.mailQuery || 'to:contacto@prepdiplomacia.com in:inbox is:unread -category:promotions -category:social newer_than:7d')}"></div>
       <div class="field full"><button class="btn primary" type="submit" style="justify-self:start">Guardar</button></div></form></div></div>` +
      `${demo ? `<div class="note">Hay <strong>${demo}</strong> registros de ejemplo (marcados “ejemplo”). Cuando cargues tus datos reales, elimínalos con el botón de abajo.</div>` : ''}
      <div class="grid g-2">
        <div class="card"><h2 style="margin-bottom:12px">Preferencias</h2><form id="settingsForm" class="fgrid">
          <div class="field"><label>Tu nombre (saludo)</label><input name="owner" value="${esc(S.settings.owner || '')}"></div>
          <div class="field"><label>Zona horaria de la agenda</label><input name="tz" value="${esc(S.settings.tz || '')}"><span class="hint">Por ejemplo Africa/Casablanca, Europe/Paris o America/Montevideo</span></div>
          <div class="field"><label>Pesos por dólar</label><input name="usdRate" type="number" step="0.01" min="0" value="${esc(S.settings.usdRate)}"></div>
          <div class="field"><label>Pesos por euro</label><input name="eurRate" type="number" step="0.01" min="0" value="${esc(S.settings.eurRate)}"></div>
          <div class="field full"><label>Calendarios de Google (uno por línea: id | nombre | color)</label><textarea name="calendars" rows="4">${esc(calText)}</textarea><span class="hint">Agrega “| oculto” al final de una línea para no mostrar ese calendario.</span></div>
          <div class="field full"><button class="btn primary" type="submit" style="justify-self:start">Guardar preferencias</button></div></form></div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:8px">Copia de seguridad</h2><p class="muted" style="margin-top:0">Descarga todos tus datos en un archivo JSON o restaura una copia anterior.</p><div class="row"><button class="btn primary" data-action="export">Descargar copia</button><button class="btn" data-action="import">Restaurar copia</button></div></div>
          <div class="card"><h2 style="margin-bottom:8px">Limpieza</h2><div class="row"><button class="btn" data-action="clear-demo" ${demo ? '' : 'disabled'}>Eliminar datos de ejemplo</button><button class="btn" data-action="reset">Restaurar datos iniciales</button><button class="btn danger" data-action="wipe">Borrar todo</button></div></div>
          <div class="card"><h2 style="margin-bottom:4px">Resumen</h2><ul class="list">${[['projects', 'Proyectos'], ['tasks', 'Tareas'], ['workflows', 'Workflows'], ['items', 'Ítems de workflows'], ['agents', 'Agentes'], ['reports', 'Informes de correcciones'], ['posts', 'Publicaciones'], ['transactions', 'Movimientos'], ['metrics', 'Registros de métricas'], ['contacts', 'Personas'], ['interactions', 'Contactos registrados'], ['resources', 'Recursos']].map(([k, l]) => `<li><span class="grow">${l}</span><strong>${S[k].length}</strong></li>`).join('')}</ul></div>
        </div>
      </div>`;
  };

  /* ================= Modo conectado (página publicada en Claude) =================
     db: datos sincronizados entre dispositivos (solo la dueña lee y escribe).
     mcp: lectura en vivo de Google Calendar, agentes y sesiones de Claude y, si se activa, Gmail. */
  const DB_KEYS = ['settings', 'projects', 'tasks', 'posts', 'transactions', 'metrics', 'contacts', 'interactions', 'resources', 'workflows', 'items', 'agents', 'reports', 'activity', 'meta'];
  const LIVE = { on: false, db: null, mcp: null, written: {}, queue: new Set(), writing: false, at: null, busy: false,
    src: { cal: { state: 'idle' }, ccr: { state: 'idle' }, ses: { state: 'idle' }, mail: { state: 'off' } },
    events: [], sessions: [], results: {}, mail: [] };
  const CCR = 'Claude Code Remote', GCAL = 'Google Calendar', GMAIL = 'Gmail';

  function dbSave() {
    DB_KEYS.forEach((k) => { const j = JSON.stringify(S[k] ?? null); if (j !== LIVE.written[k]) LIVE.queue.add(k); });
    if (LIVE.queue.size) { setLiveFoot('saving'); flushDb(); }
  }
  async function flushDb() {
    if (LIVE.writing) return; LIVE.writing = true;
    try {
      while (LIVE.queue.size) {
        const k = LIVE.queue.values().next().value; LIVE.queue.delete(k);
        const j = JSON.stringify(S[k] ?? null); if (j === LIVE.written[k]) continue;
        try { await LIVE.db.doc('panel/' + k).set({ v: S[k] ?? null, at: new Date().toISOString() }); LIVE.written[k] = j; }
        catch (e) {
          if (e && e.code === 'quota_exceeded') toast('La base del panel está llena: borra informes o actividad antigua.');
          else if (e && e.code === 'unavailable') { LIVE.queue.add(k); await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500)); }
          else toast('No se pudo guardar: ' + (e && e.code || 'error'));
        }
      }
    } finally { LIVE.writing = false; setLiveFoot(); }
  }
  function setLiveFoot() { const el = $('#sideFoot'); if (el && S) el.innerHTML = footHtml(); }

  const unwrap = (p) => {
    if (p && typeof p === 'object') return p;
    if (typeof p === 'string') { const i = p.indexOf('{'), j = p.lastIndexOf('}'); if (i >= 0 && j > i) { try { return JSON.parse(p.slice(i, j + 1)); } catch (e) { /* texto */ } } }
    return null;
  };
  const ccrData = (o) => (o && (o.ccr && o.ccr.data || o.data)) || [];
  const sessionUrl = (id) => id ? 'https://claude.ai/code/' + String(id).replace(/^cse_/, 'session_') : 'https://claude.ai/code';
  const decodeEnt = (s) => String(s || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[͏‌​\s]+/g, ' ').trim();
  function findResultText(ev) {
    if (!ev || typeof ev !== 'object') return '';
    const r = ev.result || ev;
    if (r.internal_anthropic_catchall && typeof r.internal_anthropic_catchall.result === 'string') return r.internal_anthropic_catchall.result;
    if (typeof r.result === 'string') return r.result;
    let best = '';
    (function walk(o, d) { if (!o || typeof o !== 'object' || d > 5) return; for (const [k, v] of Object.entries(o)) { if (k === 'result' && typeof v === 'string' && v.length > best.length) best = v; else if (v && typeof v === 'object') walk(v, d + 1); } })(r, 0);
    return best;
  }
  function mcpMessage(e, server) {
    const c = e && e.code;
    if (c === 'needs_reauth') return `Vuelve a conectar ${server} en claude.ai › Configuración › Conectores.`;
    if (c === 'server_not_connected' || c === 'selection_required' || c === 'server_not_found') return `Agrega o elige ${server} en claude.ai › Configuración › Conectores.`;
    if (c === 'not_in_manifest' || c === 'approval_required' || c === 'consent_required') return `Falta tu permiso para usar ${server} en este panel.`;
    if (c === 'blocked_by_policy') return `Tu organización bloquea ${server} para este panel.`;
    if (c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed') return 'Las conexiones no están disponibles en esta vista.';
    if (c === 'wrong_account') return `El Gmail conectado a Claude es ${e.account}. Para ver tu correo, conecta ${e.want} en claude.ai › Configuración › Conectores y elígelo para este panel.`;
    if (c === 'tool_error') return `${server} respondió con un error.`;
    return `${server} no respondió (${c || 'error'}). Se reintenta en la próxima actualización.`;
  }
  async function call(server, tool, input) {
    try { return unwrap((await LIVE.mcp.callTool(server, tool, input)).payload); }
    catch (e) {
      if (e && e.retryable) { await new Promise((r) => setTimeout(r, Math.min(e.retryAfterMs || 1500, 8000) + Math.random() * 800)); return unwrap((await LIVE.mcp.callTool(server, tool, input)).payload); }
      throw e;
    }
  }
  const needsClick = (e) => e && ['not_in_manifest', 'approval_required', 'consent_required'].includes(e.code);

  /* --- Agentes y sesiones de Claude --- */
  const tzLabel = (tz) => ({ 'Europe/Paris': 'París', 'Africa/Casablanca': 'Casablanca', 'America/Montevideo': 'Montevideo' }[tz] || (tz ? tz.split('/').pop().replace(/_/g, ' ') : 'UTC'));
  function parseCron(c) {
    const m = /^(?:CRON_TZ=(\S+)\s+)?(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/.exec(String(c || '').trim());
    if (!m) return { time: '', tz: '', rule: '' };
    const [, tz, mi, h, dom, , dow] = m;
    const time = /^\d+$/.test(mi) && /^\d+$/.test(h) ? `${pad(h)}:${pad(mi)}` : '';
    const rule = dow === '1-5' ? 'De lunes a viernes' : dow !== '*' ? 'Algunos días' : dom !== '*' ? 'Algunos días del mes' : /^\*\/|,/.test(h) ? 'Varias veces al día' : 'Todos los días';
    return { time, tz: tzLabel(tz), rule };
  }
  const wfFor = (name) => /correcci/i.test(name) ? 'wf-corr' : /carrusel|noticia|reel/i.test(name) ? 'wf-carrusel' : /art[ií]culo|blog|panorama/i.test(name) ? 'wf-blog' : '';
  const statusFrom = (run, text) => {
    if (!run) return 'ok';
    if (/RUNNING|PENDING/.test(run.status || '')) return 'curso';
    if (/FAIL|ABANDON|ERROR/.test(run.status || '')) return 'falla';
    if (/\bFALLA\b|SIN SEÑAL|Se connecter|no pudo (leer|correr)|no corri[oó]/i.test(text || '')) return 'falla';
    if (/CORREO NO ENVIADO|PENDIENTE DE PEGAR|con avisos/i.test(text || '')) return 'aviso';
    return 'ok';
  };
  async function syncClaude() {
    const triggers = []; let cursor; let pages = 0;
    do { const o = await call(CCR, 'list_triggers', cursor ? { limit: 100, cursor } : { limit: 100 }); triggers.push(...(o && o.data || [])); cursor = o && o.has_more ? o.next_cursor : null; } while (cursor && ++pages < 6);
    const runs = await Promise.all(triggers.map(async (t) => {
      const sid = t.last_run && t.last_run.session_id; if (!sid) return [t, ''];
      if (LIVE.results[sid] != null) return [t, LIVE.results[sid]];
      try { const o = await call(CCR, 'list_events', { session_id: sid, kinds: ['result'], limit: 100 }); const evs = ccrData(o).filter((e) => e.result); const last = evs.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).pop(); LIVE.results[sid] = findResultText(last); }
      catch (e) { LIVE.results[sid] = ''; }
      return [t, LIVE.results[sid]];
    }));
    // los agentes cargados a mano sin vínculo se reemplazan por los reales
    if (triggers.length) S.agents = S.agents.filter((a) => a.triggerId || a.manual);
    let changed = false;
    runs.forEach(([t, text]) => {
      const cron = parseCron(t.cron_expression || ''); const run = t.last_run || null;
      let a = S.agents.find((x) => x.triggerId === t.id);
      if (!a) { a = { id: 'ag-' + uid(), triggerId: t.id, wf: wfFor(t.name), brand: /carolina techera/i.test(t.name) ? 'ct' : 'pd', desc: '' }; S.agents.push(a); }
      const status = statusFrom(run, text);
      const firstLine = cleanText(text, 220);
      Object.assign(a, { name: t.name, time: cron.time, tz: cron.tz, rule: cron.rule, enabled: t.enabled !== false, nextRun: t.next_run_at || '', lastRun: run && run.fired_at ? iso(new Date(run.fired_at)) : a.lastRun || '', lastRunAt: run && run.fired_at || '', lastStatus: status, lastNote: firstLine.slice(0, 220), sessionId: run && run.session_id || '', link: sessionUrl(run && run.session_id) });
      if (!a.desc) a.desc = String((t.derived_state && t.derived_state.prompt) || '').split(/(?<=\.)\s/)[0].slice(0, 200);
      if (!run || !run.session_id || !text) return;
      // Correcciones: el informe de la última corrida actualiza la sección y su workflow
      if (a.wf === 'wf-corr' && /correcciones diarias/i.test(t.name) && !S.reports.some((r) => r.sourceSession === run.session_id)) {
        const r = parseReport(text); r.sourceSession = run.session_id; r.raw = ''; if (!/\d{4}-\d{2}-\d{2}/.test(text)) r.date = a.lastRun;
        ingestReport(r); logActivity(t.name, `Informe de correcciones: ${num(reportTotals(r).revision)} en tu revisión${r.status === 'falla' ? ' · con falla' : ''}`, r.status === 'falla' ? 'bad' : 'ok'); changed = true;
      }
      // Carruseles y blog: la propuesta del día entra como ítem del workflow
      if ((a.wf === 'wf-carrusel' || a.wf === 'wf-blog') && !S.items.some((i) => i.key === 'run:' + run.session_id)) {
        const w = wfById(a.wf); if (!w) return;
        S.items.push({ id: uid(), key: 'run:' + run.session_id, wf: w.id, stage: w.stages[0].id, title: `${t.name.replace(/\s*[-·]\s*Prep Diplomacia Uy$/i, '')} · ${fmtDate(a.lastRun)}`, brand: a.brand, owner: 'Agente IA', due: a.lastRun, link: sessionUrl(run.session_id), notes: String(text).slice(0, 1500), auto: false, fromAgent: true });
        logActivity(t.name, `Nueva propuesta en ${w.name}`, 'ia'); changed = true;
      }
      // Agente que falla por primera vez en esta corrida
      if (status === 'falla' && a.notifiedRun !== run.session_id) { a.notifiedRun = run.session_id; logActivity(t.name, firstLine || 'Corrida con falla', 'bad'); changed = true; }
    });
    return changed;
  }
  async function syncSessions() {
    const o = await call(CCR, 'list_sessions', { limit: 30 });
    LIVE.sessions = ccrData(o).filter((s) => s && s.id).map((s) => ({ id: s.id, title: s.title || 'Sesión sin título', bucket: String(s.status_bucket || s.session_status || ''), updated: s.updated_at || s.created_at || '', needs: s.post_turn_summary && s.post_turn_summary.needs_action || '', recent: s.post_turn_summary && s.post_turn_summary.recent_action || '' }));
  }

  /* --- Google Calendar --- */
  const evStart = (e) => e.start && e.start.dateTime ? new Date(e.start.dateTime) : e.start && e.start.date ? parse(e.start.date) : null;
  const evKind = (e) => { const t = String(e.summary || ''); return /devoluci/i.test(t) ? 'devolucion' : /consulta/i.test(t) ? 'consulta' : /clase|zoom/i.test(t) ? 'clase' : 'otro'; };
  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  async function syncCalendar() {
    const from = iso(addDays(new Date(), -1)) + 'T00:00:00', to = iso(addDays(new Date(), 21)) + 'T23:59:59';
    const cals = (S.settings.calendars || []).filter((c) => c.on !== false && c.id);
    const all = [];
    for (const c of cals) {
      let token; let pages = 0;
      do { const o = await call(GCAL, 'list_events', Object.assign({ calendarId: c.id, startTime: from, endTime: to, pageSize: 100 }, token ? { pageToken: token } : {})); (o && o.events || []).forEach((e) => all.push(Object.assign({}, e, { _cal: c }))); token = o && o.nextPageToken; } while (token && ++pages < 4);
    }
    LIVE.events = all.filter((e) => e.status !== 'cancelled' && evStart(e)).sort((a, b) => evStart(a) - evStart(b));
    // Sesiones de consulta: entran solas en Captación y en Contactos
    let changed = false;
    const upsertPerson = (email, name, type, stage, d) => {
      const em = String(email || '').toLowerCase(); const key = 'gcal:' + (em || name).toLowerCase();
      let c = S.contacts.find((x) => (em && String(x.email || '').toLowerCase() === em) || x.key === key);
      if (!c) { c = { id: uid(), key, name, type, stage, brand: 'pd', email: em, source: 'Google Calendar', created: today(), followup: type === 'Interesado/a' ? iso(addDays(d, 1)) : '', nextAction: type === 'Interesado/a' ? 'Enviar la propuesta después de la sesión de consultas' : '' }; S.contacts.push(c); changed = true; }
      else if (type === 'Alumno/a' && c.type === 'Interesado/a') { c.type = 'Alumno/a'; c.stage = 'activo'; changed = true; }
      return c;
    };
    LIVE.events.filter((e) => ['consulta', 'devolucion'].includes(evKind(e))).forEach((e) => {
      const d = evStart(e); const day = iso(d); const key = 'gcal:' + e.id; const kind = evKind(e);
      const guest = (e.attendees || []).find((a) => !a.self && !a.organizer) || {};
      const nameM = /\(([^)]+)\)\s*$/.exec(e.summary || ''); const who = nameM ? nameM[1] : (guest.displayName || guest.email || (kind === 'consulta' ? 'Consulta' : 'Alumno/a'));
      const c = upsertPerson(guest.email, who, kind === 'consulta' ? 'Interesado/a' : 'Alumno/a', kind === 'consulta' ? 'reunion' : 'activo', d);
      if (kind === 'consulta' && !S.items.some((i) => i.key === key)) {
        S.items.push({ id: uid(), key, wf: 'wf-captacion', stage: 'reunion', title: `Sesión de consultas · ${who}`, brand: 'pd', owner: 'Carolina', due: day, contact: c.id, link: e.htmlLink || '', notes: `Agendada en Google Calendar para el ${fmtDate(day)} a las ${hhmm(d)} hs.` });
        logActivity('Google Calendar', `Nueva sesión de consultas: ${who} (${fmtDate(day)})`, 'info'); changed = true;
      }
      // cuando la reunión ya ocurrió, queda en la historia de la persona
      if (d <= new Date() && !S.interactions.some((i) => i.key === key)) {
        S.interactions.push({ id: uid(), key, contact: c.id, type: kind === 'consulta' ? 'reunion' : 'clase', date: day, time: hhmm(d), summary: kind === 'consulta' ? 'Sesión de consultas por Google Meet' : 'Devolución y consultas de ejercicios' });
        if (!c.lastContact || c.lastContact < day) c.lastContact = day; changed = true;
      }
    });
    return changed;
  }

  /* --- Gmail (apagado hasta que se confirme la cuenta) --- */
  // Comprueba qué cuenta tiene conectada el Gmail de Claude antes de mostrar nada
  const accountOf = (t) => { const m = /authuser=([^&#|]+)/.exec((t && (t.viewUrl || (t.messages && t.messages[0] && t.messages[0].viewUrl))) || ''); return m ? decodeURIComponent(m[1]).toLowerCase() : ''; };
  async function syncMail() {
    const want = String(S.settings.mailAccount || 'contacto@prepdiplomacia.com').toLowerCase();
    if (LIVE.mailAccount === undefined) {
      const probe = await call(GMAIL, 'search_threads', { query: 'in:inbox', pageSize: 1, view: 'THREAD_VIEW_METADATA_ONLY' });
      LIVE.mailAccount = accountOf((probe && probe.threads || [])[0]);
    }
    if (LIVE.mailAccount && LIVE.mailAccount !== want) { LIVE.mail = []; throw Object.assign(new Error('cuenta'), { code: 'wrong_account', account: LIVE.mailAccount, want }); }
    const q = S.settings.mailQuery || 'to:contacto@prepdiplomacia.com in:inbox is:unread -category:promotions -category:social newer_than:7d';
    const o = await call(GMAIL, 'search_threads', { query: q, pageSize: 25, view: 'THREAD_VIEW_SUMMARY' });
    LIVE.mail = (o && o.threads || []).map((t) => { const m = (t.messages || [])[0] || {}; const from = (m.addressDisplayNames || []).find((x) => x.emailAddress === m.sender) || {}; return { id: t.id, subject: decodeEnt(m.subject) || '(sin asunto)', fromEmail: String(m.sender || '').toLowerCase(), from: from.displayName || m.sender || '', date: m.date || '', snippet: decodeEnt(m.snippet).slice(0, 160), url: t.viewUrl || m.viewUrl || '' }; });
  }

  async function refreshLive(fromClick) {
    if (!LIVE.mcp || LIVE.busy) return; LIVE.busy = true; setLiveFoot();
    const run = async (key, fn, server) => {
      if (LIVE.src[key].state === 'blocked' && !fromClick) return false;
      try { const ch = await fn(); LIVE.src[key] = { state: 'ok', at: new Date() }; return ch; }
      catch (e) { LIVE.src[key] = { state: needsClick(e) ? 'blocked' : 'error', code: e && e.code, msg: mcpMessage(e, server), at: LIVE.src[key].at }; return false; }
    };
    const c1 = await run('ccr', syncClaude, CCR);
    await run('ses', syncSessions, CCR);
    const c2 = await run('cal', syncCalendar, GCAL);
    if (S.settings.mailEnabled) await run('mail', syncMail, GMAIL); else LIVE.src.mail = { state: 'off' };
    LIVE.at = new Date(); LIVE.busy = false;
    if (c1 || c2) save();
    if ($('#drawer').hidden && $('#palette').hidden) render(); else setLiveFoot();
  }

  async function bootLive() {
    if (!window.claude || typeof window.claude.use !== 'function') return false;
    $('#main').innerHTML = '<div class="empty" style="padding:80px 10px">Conectando con tus datos…</div>';
    const db = await window.claude.use('db').catch(() => null);
    if (!db) return false;
    LIVE.on = true; LIVE.db = db;
    LIVE.mcp = await window.claude.use('mcp').catch(() => null);
    await new Promise((resolve) => {
      let first = true;
      const timer = setTimeout(() => { if (first) { first = false; toast('Los datos tardan en llegar; se muestra lo último guardado en este dispositivo.'); S = S || normalize(loadLocal() || seedClean()); route(); resolve(); } }, 10000);
      db.collection('panel').onSnapshot((snap) => {
        if (snap.metadata.fromCache && first && snap.empty) return; // esperar la respuesta del servidor
        const docs = {}; snap.docs.forEach((d) => { if (d.exists) docs[d.id] = d.data(); });
        if (first) {
          first = false; clearTimeout(timer);
          if (Object.keys(docs).length) { const o = {}; DB_KEYS.forEach((k) => { if (docs[k]) { o[k] = docs[k].v; LIVE.written[k] = JSON.stringify(docs[k].v ?? null); } }); S = normalize(o); }
          else { S = normalize(loadLocal() || seedClean()); logActivity('Panel', 'Panel conectado: tus datos quedan sincronizados entre dispositivos.', 'ok'); }
          save(); route(); resolve();
          return;
        }
        // cambios hechos en otro dispositivo
        let ch = false;
        DB_KEYS.forEach((k) => { if (!docs[k]) return; const j = JSON.stringify(docs[k].v ?? null); if (j !== LIVE.written[k] && !LIVE.queue.has(k)) { LIVE.written[k] = j; S[k] = docs[k].v; ch = true; } });
        if (ch) { S = normalize(S); if ($('#drawer').hidden && $('#palette').hidden) render(); }
      }, (e) => { if (first) { first = false; clearTimeout(timer); S = normalize(loadLocal() || seedClean()); route(); resolve(); } toast('Se perdió la conexión con la base del panel (' + (e && e.code) + '). Recarga la página.'); });
    });
    if (LIVE.mcp) { refreshLive(); setInterval(() => { if (!document.hidden) refreshLive(); }, 5 * 60e3); document.addEventListener('visibilitychange', () => { if (!document.hidden && LIVE.at && Date.now() - LIVE.at > 60e3) refreshLive(); }); }
    return true;
  }
  function loadLocal() { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function seedClean() { const s = seed(); Object.keys(SCHEMAS).forEach((k) => { s[k] = (s[k] || []).filter((x) => !x.demo); }); return s; }

  /* --- Piezas de interfaz del modo conectado --- */
  function liveAgendaHtml(days) {
    const st = LIVE.src.cal;
    if (!LIVE.mcp) return '';
    if (st.state === 'blocked') return `<div class="empty">${esc(st.msg)}<br><button class="btn sm primary" data-action="live-refresh" style="margin-top:8px">Permitir y cargar</button></div>`;
    if (st.state === 'error' && !LIVE.events.length) return `<div class="empty">${esc(st.msg)}</div>`;
    if (st.state === 'idle') return '<div class="empty">Cargando tu agenda…</div>';
    const now = new Date(); const lim = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), days);
    const list = LIVE.events.filter((e) => { const s = evStart(e); const en = e.end && e.end.dateTime ? new Date(e.end.dateTime) : addDays(s, 1); return en >= now && s < lim; });
    if (!list.length) return `<div class="empty">Sin eventos ${days <= 1 ? 'hoy' : 'en estos días'}.</div>`;
    let last = '';
    return '<ul class="list">' + list.map((e) => {
      const s = evStart(e); const day = iso(s); const k = evKind(e);
      const hdr = day !== last ? (last = day, `<li style="border:0;padding:10px 0 2px"><span class="small muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.05em">${day === today() ? 'Hoy' : day === iso(addDays(now, 1)) ? 'Mañana' : DOW_L[s.getDay()] + ' ' + fmtDate(day)}</span></li>`) : '';
      const pill = k === 'devolucion' ? '<span class="pill gold">Devolución</span>' : k === 'consulta' ? '<span class="pill ok">Consulta</span>' : k === 'clase' ? '<span class="pill info">Clase</span>' : '';
      return hdr + `<li><span class="dot" style="background:${esc(e._cal && e._cal.color || '#153D63')}"></span><div class="grow"><div class="t">${esc(e.summary || '(sin título)')}</div><div class="m">${e.start && e.start.dateTime ? hhmm(s) + ' hs' : 'Todo el día'}${pill ? ' ' + pill : ''}</div></div>${e.conferenceUrl ? `<a class="btn sm" href="${esc(e.conferenceUrl)}" target="_blank" rel="noopener">Meet</a>` : ''}${e.htmlLink ? `<a class="iconbtn" href="${esc(e.htmlLink)}" target="_blank" rel="noopener" aria-label="Abrir en Google Calendar">${icon('ext')}</a>` : ''}</li>`;
    }).join('') + '</ul>';
  }
  function liveSessionsHtml(max) {
    const st = LIVE.src.ses;
    if (!LIVE.mcp) return '<div class="empty">Disponible en la versión publicada en Claude.</div>';
    if (st.state === 'blocked') return `<div class="empty">${esc(st.msg)}<br><button class="btn sm primary" data-action="live-refresh" style="margin-top:8px">Permitir y cargar</button></div>`;
    if (st.state !== 'ok' && !LIVE.sessions.length) return `<div class="empty">${esc(st.msg || 'Cargando…')}</div>`;
    const list = LIVE.sessions.slice().sort((a, b) => (b.needs ? 1 : 0) - (a.needs ? 1 : 0) || String(b.updated).localeCompare(String(a.updated))).slice(0, max);
    return '<ul class="list">' + list.map((s) => { const d = s.updated ? new Date(s.updated) : null; const waiting = !!s.needs || /BLOCKED/.test(s.bucket); const working = /WORKING|RUNNING/.test(s.bucket);
      return `<li><span class="dot" style="background:${waiting ? 'var(--warn)' : working ? 'var(--ia)' : 'var(--ok)'}"></span><div class="grow"><div class="t">${esc(s.title)}</div><div class="m">${waiting ? '<span class="pill warn">Espera tu respuesta</span>' : working ? '<span class="pill ia">Trabajando</span>' : ''}${d ? `<span>${fmtDate(iso(d))} ${hhmm(d)} hs</span>` : ''}</div>${s.needs || s.recent ? `<div class="small muted" style="margin-top:2px">${esc(String(s.needs || s.recent).slice(0, 180))}</div>` : ''}</div><a class="btn sm" href="${esc(sessionUrl(s.id))}" target="_blank" rel="noopener">Abrir</a></li>`; }).join('') + '</ul>';
  }
  function liveMailHtml(max) {
    if (!S.settings.mailEnabled) return `<div class="empty">El correo está desactivado. Actívalo en <a href="#ajustes">Ajustes</a>.</div>`;
    const st = LIVE.src.mail;
    if (st.state === 'blocked') return `<div class="empty">${esc(st.msg)}<br><button class="btn sm primary" data-action="live-refresh" style="margin-top:8px">Permitir y cargar</button></div>`;
    if (st.state !== 'ok' && !LIVE.mail.length) return `<div class="empty">${esc(st.msg || 'Cargando…')}</div>`;
    if (!LIVE.mail.length) return '<div class="empty">Sin correos pendientes con el filtro actual.</div>';
    return '<ul class="list">' + LIVE.mail.slice(0, max).map((m, i) => `<li><div class="grow"><div class="t">${esc(m.subject)}</div><div class="m"><span>${esc(m.from)}</span>${m.date ? `<span>· ${fmtDate(iso(new Date(m.date)))}</span>` : ''}</div><div class="small muted">${esc(m.snippet)}</div></div><button class="btn sm" data-action="mail-task" data-i="${i}">Crear tarea</button>${m.url ? `<a class="iconbtn" href="${esc(m.url)}" target="_blank" rel="noopener" aria-label="Abrir en Gmail">${icon('ext')}</a>` : ''}</li>`).join('') + '</ul>';
  }
  function connectionsHtml() {
    if (!LIVE.mcp) return `<div class="empty">${LIVE.on ? 'Las conexiones no están disponibles en esta vista.' : 'Las conexiones funcionan en la versión publicada en Claude.'}</div>`;
    const row = (label, key) => { const s = LIVE.src[key]; const pill = s.state === 'ok' ? '<span class="pill ok">Conectado</span>' : s.state === 'off' ? '<span class="pill">Desactivado</span>' : s.state === 'idle' ? '<span class="pill">Cargando</span>' : s.state === 'blocked' ? '<span class="pill warn">Falta permiso</span>' : '<span class="pill bad">Error</span>';
      return `<li><div class="grow"><div class="t">${label}</div><div class="m">${s.msg ? esc(s.msg) : s.at ? 'Actualizado ' + hhmm(s.at) + ' hs' : ''}</div></div>${pill}</li>`; };
    return `<ul class="list">${row('Agentes programados de Claude', 'ccr')}${row('Sesiones de Claude', 'ses')}${row('Google Calendar', 'cal')}${row('Gmail', 'mail')}</ul><div class="row" style="margin-top:10px"><button class="btn sm primary" data-action="live-refresh">Actualizar ahora</button>${LIVE.at ? `<span class="small muted">Última actualización ${hhmm(LIVE.at)} hs</span>` : ''}</div>`;
  }

  /* ================= Render y navegación ================= */
  function render() {
    const rep = latestReport(); const tot = reportTotals(rep);
    const counts = { seguimientos: [byBrand(S.contacts).filter((c) => c.followup && c.followup <= today()).length, true], personas: [byBrand(S.contacts).length, false], tareas: [byBrand(S.tasks).filter(isLate).length, true], correcciones: [ui.brand === 'ct' ? 0 : tot.revision, rep && rep.status === 'falla'], agentes: [byBrand(S.agents).filter((a) => a.lastStatus === 'falla').length, true], workflows: [byBrand(S.workflows).length, false] };
    const active = ui.route === 'workflow' ? (ui.param === 'wf-corr' ? 'correcciones' : 'workflows') : ui.route === 'persona' || ui.route === 'contactos' ? 'personas' : ui.route;
    $('#nav').innerHTML = NAV.map(([g, items]) => `<div class="grp">${g}</div>` + items.map(([k, l]) => { const c = counts[k]; return `<a href="#${k}" class="${active === k ? 'active' : ''}">${icon(k)}<span>${l}</span>${c && c[0] ? `<span class="count ${c[1] ? 'alert' : ''}">${c[0]}</span>` : ''}</a>`; }).join('')).join('');
    $('#brandFilter').innerHTML = [['all', 'Ambas']].concat(BRANDS.map((b) => [b.id, b.short])).map(([id, n]) => `<button class="${ui.brand === id ? 'active' : ''}" data-action="brand" data-v="${id}">${id === 'all' ? '' : brandDot(id)}${esc(n)}</button>`).join('');
    $('#themeBtn').innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon');
    $('#brandFilterSide').innerHTML = $('#brandFilter').innerHTML;
    const tabs = [['inicio', 'Hoy', 'inicio'], ['agenda', 'Agenda', 'agenda'], ['seguimientos', 'Seguimientos', 'seguimientos'], ['correcciones', 'Correcciones', 'correcciones']];
    $('#tabbar').innerHTML = tabs.map(([k, l, ic]) => { const c = counts[k]; return `<a href="#${k}" class="${active === k ? 'active' : ''}">${icon(ic)}<span>${l}</span>${c && c[0] ? `<b class="${c[1] ? 'alert' : ''}">${c[0] > 99 ? '99+' : c[0]}</b>` : ''}</a>`; }).join('') + `<button data-action="menu">${icon('workflows')}<span>Más</span></button>`;
    $('#sideFoot').innerHTML = footHtml();
    $('#main').innerHTML = (VIEWS[ui.route] || VIEWS.inicio)();
    document.title = `${ui.route === 'workflow' ? (wfById(ui.param) || {}).name || 'Workflow' : ROUTE_NAMES[ui.route] || 'Inicio'} · Panel Central`;
  }
  function route() {
    if (!S) return;
    const h = decodeURIComponent(location.hash.slice(1));
    const [r, p] = h.split('/');
    ui.route = VIEWS[r] ? r : 'inicio'; ui.param = p || '';
    $('#sidebar').classList.remove('open'); render(); window.scrollTo(0, 0);
  }

  /* ================= Drawer y formularios ================= */
  function openDrawer(html) { const d = $('#drawer'); d.innerHTML = html; d.hidden = false; $('#scrim').hidden = false; }
  function closeDrawer() { $('#drawer').hidden = true; $('#drawer').innerHTML = ''; if ($('#palette').hidden) $('#scrim').hidden = true; }

  function openForm(entity, id, preset = {}) {
    const sch = SCHEMAS[entity]; let obj = id ? S[entity].find((x) => x.id === id) : Object.assign(sch.defaults(), preset);
    if (!obj) return;
    if (entity === 'workflows') obj = Object.assign({}, obj, { stagesText: obj.stagesText || (obj.stages || []).map((s) => s.name).join('\n') });
    if (entity === 'items' && !obj.stage) obj.stage = (stageOpts(obj.wf)[0] || [])[0];
    const field = (f) => {
      const v = obj[f.k] ?? ''; let input;
      if (f.t === 'select') input = `<select name="${f.k}">${f.o(obj).map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`;
      else if (f.t === 'textarea') input = `<textarea name="${f.k}" ${f.req ? 'required' : ''}>${esc(v)}</textarea>`;
      else input = `<input name="${f.k}" type="${f.t}" value="${esc(v)}" ${f.req ? 'required' : ''} ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''}>`;
      return `<div class="field ${f.full ? 'full' : ''}"><label>${esc(f.l)}${f.req ? ' *' : ''}</label>${input}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
    };
    const extra = [];
    if (id && (entity === 'tasks' || entity === 'items' || entity === 'posts') && (obj.due || obj.date)) extra.push(`<a class="btn" href="${esc(gcalTemplate(obj))}" target="_blank" rel="noopener">${icon('gcal')}Agregar a Google Calendar</a>`);
    if (id && obj.auto) extra.push('<span class="small muted" style="align-self:center">Generado por el informe del agente: se actualiza con el próximo informe.</span>');
    openDrawer(`<header><div><div class="small muted">${id ? 'Editar' : 'Nuevo'}</div><h2>${esc(sch.title)}</h2></div><button class="iconbtn" data-action="close" aria-label="Cerrar">✕</button></header>
      <form id="entityForm" data-entity="${entity}" data-id="${id || ''}" style="display:contents"><div class="body"><div class="fgrid">${sch.fields.map(field).join('')}</div>${extra.length ? `<div class="row" style="margin-top:16px">${extra.join('')}</div>` : ''}</div>
      <footer>${id && !(entity === 'workflows' && obj.id === 'wf-corr') ? `<button type="button" class="btn danger" data-action="del" data-entity="${entity}" data-id="${id}" style="margin-right:auto">${icon('trash')}Eliminar</button>` : ''}<button type="button" class="btn" data-action="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></footer></form>`);
    const first = $('#entityForm input:not([type=color]), #entityForm select'); if (first) first.focus();
    if (entity === 'transactions') {
      const ty = $('#entityForm [name=type]'), cs = $('#entityForm [name=category]');
      const sync = () => { const cats = ty.value === 'ingreso' ? INCOME_CATS : EXPENSE_CATS; const cur = cs.value; cs.innerHTML = cats.map((c) => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join(''); };
      ty.addEventListener('change', sync); sync();
    }
    if (entity === 'items') {
      const w = $('#entityForm [name=wf]'), s = $('#entityForm [name=stage]');
      w.addEventListener('change', () => { s.innerHTML = stageOpts(w.value).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(''); });
    }
  }

  function submitForm(form) {
    const entity = form.dataset.entity, id = form.dataset.id; const sch = SCHEMAS[entity]; const data = {};
    sch.fields.forEach((f) => { const el = form.elements[f.k]; if (!el) return; let v = el.value.trim(); if (f.t === 'number') v = v === '' ? '' : Number(v); data[f.k] = v; });
    if (entity === 'workflows') {
      const names = data.stagesText.split('\n').map((s) => s.trim()).filter(Boolean);
      const prev = id ? (S.workflows.find((w) => w.id === id) || {}).stages || [] : [];
      const palette = ['#94A3B8', '#5B8FC7', '#6B4FBB', '#C6A75E', '#B7700B', '#1F8A5B', '#2F6FB0', '#C2413A'];
      data.stages = names.map((n, i) => prev.find((p) => p.name === n) || { id: 's' + uid().slice(0, 6), name: n, color: palette[Math.min(i, palette.length - 1)] });
      delete data.stagesText;
      if (id) { const ids = data.stages.map((s) => s.id); S.items.forEach((it) => { if (it.wf === id && !ids.includes(it.stage)) it.stage = ids[0]; }); }
    }
    if (id) {
      const o = S[entity].find((x) => x.id === id); const was = o.status;
      Object.assign(o, data); delete o.demo;
      if (entity === 'tasks' && was !== 'hecha' && o.status === 'hecha') spawnNext(o);
    } else {
      const o = Object.assign({ id: (entity === 'workflows' ? 'wf-' : '') + uid() }, data, entity === 'agents' ? { manual: true } : {}); S[entity].push(o);
      if (entity === 'tasks' && o.status === 'hecha') spawnNext(o);
    }
    if (entity === 'interactions') {
      const c = S.contacts.find((x) => x.id === data.contact);
      if (c) {
        if (!c.lastContact || data.date > c.lastContact) c.lastContact = data.date;
        c.followup = data.nextFollowup || (c.followup && c.followup <= today() ? '' : c.followup);
        if (data.nextFollowup) c.nextAction = data.nextAction || ''; else if (!c.followup) c.nextAction = '';
        if ((c.stage || 'nuevo') === 'nuevo') c.stage = 'contactado';
      }
    }
    save(); closeDrawer(); render(); toast(entity === 'interactions' ? 'Contacto registrado' : 'Guardado');
  }

  /* Informe del agente de correcciones */
  function openReportDrawer() {
    openDrawer(`<header><div><div class="small muted">Agente de correcciones</div><h2>Pegar informe</h2></div><button class="iconbtn" data-action="close" aria-label="Cerrar">✕</button></header>
      <div class="body"><p class="muted" style="margin-top:0">Copia el informe diario (de la notificación de Claude o del correo) y pégalo aquí. El panel detecta la fecha, el estado, las cantidades por clase y la lista de lo que tienes que hacer. Los nombres de alumnos se omiten en el resumen.</p>
      <div class="field"><textarea id="reportText" rows="12" placeholder="Pega aquí el informe completo…"></textarea></div>
      <div id="reportPreview" style="margin-top:14px"></div></div>
      <footer><button class="btn" data-action="close">Cancelar</button><button class="btn" data-action="report-parse">Analizar</button><button class="btn primary" data-action="report-save" disabled id="reportSave">Guardar y actualizar</button></footer>`);
    $('#reportText').focus();
  }
  let pendingReport = null;
  function previewReport() {
    const txt = $('#reportText').value.trim();
    if (!txt) { toast('Pega primero el informe'); return; }
    pendingReport = parseReport(txt);
    const r = pendingReport; const t = reportTotals(r); const keys = Object.keys(r.classes);
    $('#reportPreview').innerHTML = `<div class="card flat"><div class="row between"><strong>Informe del ${fmtDate(r.date)}</strong>${statusPill(r.status)}</div>
      ${keys.length ? `<table style="margin-top:10px"><thead><tr><th>Clase</th><th class="num">Revisión</th><th class="num">Devueltas</th><th class="num">Problemas</th></tr></thead><tbody>${keys.map((k) => `<tr><td>${esc(classMeta(k).label)}</td><td class="num">${num(r.classes[k].revision || 0)}</td><td class="num">${num(r.classes[k].devuelta || 0)}</td><td class="num">${num(r.classes[k].problema || 0)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Sin cantidades por clase detectadas. Se guarda igual el estado y el texto.</p>'}
      <p class="small muted">Totales: ${num(t.revision)} en revisión · ${num(t.devuelta)} devueltas · ${num(t.problema)} con problema · ${plural(r.todos.length, 'acción', 'acciones')} para ti.</p></div>`;
    $('#reportSave').disabled = false;
  }
  function saveReport() {
    if (!pendingReport) return;
    ingestReport(pendingReport);
    logActivity('Tú', `Informe de correcciones del ${fmtDate(pendingReport.date)} cargado a mano`, 'info');
    pendingReport = null; save(); closeDrawer(); render(); toast('Informe guardado y workflow actualizado');
  }
  function ingestReport(r) {
    const prev = latestReport();
    if (!Object.keys(r.classes).length && prev) { r.classes = JSON.parse(JSON.stringify(prev.classes)); r.pendingNotes = ['Cantidades sin cambios: se mantienen las del informe anterior']; }
    S.reports = S.reports.filter((x) => !(x.date === r.date && x.time === r.time));
    if (r.sourceSession) S.reports = S.reports.filter((x) => !(x.date === r.date && !x.sourceSession));
    S.reports.push(r);
    if (S.reports.length > 60) S.reports = S.reports.slice(-60);
    syncCorrections(r);
    const ag = S.agents.find((a) => a.id === 'ag-corr') || S.agents.find((a) => /correcciones diarias/i.test(a.name || '')) || S.agents.find((a) => a.wf === 'wf-corr');
    if (ag) { ag.lastRun = r.date; ag.lastStatus = r.status; ag.lastNote = String(r.summary || '').slice(0, 220); }
  }

  /* ================= Paleta de comandos ================= */
  let palItems = [], palSel = 0;
  function commands() {
    const go = (h, l, ic) => ({ g: 'Ir a', l, ic, run: () => { location.hash = h; } });
    const nw = (e, l, extra) => ({ g: 'Crear', l, ic: 'plus', run: () => openForm(e, null, extra || {}) });
    return [
      ...NAV.flatMap(([, items]) => items.map(([k, l]) => go('#' + k, l, k))),
      ...S.workflows.map((w) => go('#workflow/' + w.id, 'Workflow · ' + w.name, 'workflows')),
      nw('tasks', 'Nueva tarea'), nw('items', 'Nuevo ítem de workflow'), nw('posts', 'Nueva publicación'), nw('transactions', 'Nuevo movimiento contable'),
      nw('projects', 'Nuevo proyecto'), nw('contacts', 'Nueva persona'), nw('interactions', 'Registrar un contacto con una persona'), { g: 'Crear', l: 'Importar personas desde una lista', ic: 'personas', run: openImportDrawer }, nw('metrics', 'Registrar métrica'), nw('resources', 'Nuevo recurso'), nw('workflows', 'Nuevo workflow'), nw('agents', 'Nuevo agente'),
      { g: 'Crear', l: 'Pegar informe del agente de correcciones', ic: 'paste', run: openReportDrawer },
      { g: 'Acciones', l: 'Cambiar tema claro u oscuro', ic: 'moon', run: toggleTheme },
      { g: 'Acciones', l: 'Actualizar conexiones (agenda, agentes, sesiones)', ic: 'agentes', run: () => refreshLive(true) },
      { g: 'Acciones', l: 'Descargar copia de seguridad', ic: 'inbox', run: exportJson },
      { g: 'Acciones', l: 'Crear evento en Google Calendar', ic: 'gcal', run: () => window.open(gcalTemplate({ title: '', date: today() }), '_blank', 'noopener') },
    ];
  }
  function entityHits(q) {
    const defs = [['tasks', 'Tareas', 'title', 'tareas'], ['items', 'Workflows', 'title', 'workflows'], ['projects', 'Proyectos', 'name', 'proyectos'], ['contacts', 'Personas', 'name', 'personas'], ['interactions', 'Historia', 'summary', 'contactos'], ['posts', 'Publicaciones', 'title', 'marketing'], ['transactions', 'Movimientos', 'desc', 'contabilidad'], ['resources', 'Recursos', 'name', 'recursos'], ['agents', 'Agentes', 'name', 'agentes']];
    const out = [];
    defs.forEach(([e, g, k, ic]) => byBrand(S[e]).filter((o) => [o[k], o.notes, o.desc, o.email, o.url].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 5)
      .forEach((o) => out.push({ g, l: o[k], ic, k: e === 'tasks' && o.due ? fmtDate(o.due) : e === 'transactions' ? money(o.amount, o.currency) : e === 'contacts' ? o.type : '', run: () => (e === 'contacts' ? (location.hash = '#persona/' + o.id) : openForm(e, o.id)) })));
    return out;
  }
  function openPalette(mode) {
    $('#palette').hidden = false; $('#scrim').hidden = false;
    const inp = $('#paletteInput'); inp.value = ''; inp.dataset.mode = mode || ''; inp.focus(); renderPalette();
  }
  function closePalette() { $('#palette').hidden = true; if ($('#drawer').hidden) $('#scrim').hidden = true; }
  function renderPalette() {
    const inp = $('#paletteInput'); const q = inp.value.trim().toLowerCase();
    let cmds = commands(); if (inp.dataset.mode === 'new' && !q) cmds = cmds.filter((c) => c.g === 'Crear');
    palItems = cmds.filter((c) => !q || c.l.toLowerCase().includes(q));
    if (q.length >= 2) palItems = palItems.concat(entityHits(q));
    if (!q && inp.dataset.mode !== 'new') palItems = palItems.slice(0, 40);
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    let lastG = ''; let html = '';
    palItems.forEach((c, i) => { if (c.g !== lastG) { html += `<div class="sec">${esc(c.g)}</div>`; lastG = c.g; } html += `<button class="it ${i === palSel ? 'sel' : ''}" data-pi="${i}">${icon(c.ic)}<span>${esc(c.l)}</span>${c.k ? `<span class="k">${esc(c.k)}</span>` : ''}</button>`; });
    $('#paletteRes').innerHTML = html || '<div class="empty">Sin resultados</div>';
    const sel = $('#paletteRes .it.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function runPalette(i) { const c = palItems[i]; if (!c) return; closePalette(); c.run(); }

  /* ================= Tareas recurrentes ================= */
  function nextDate(d, rep) { const x = parse(d); if (rep === 'weekly') return iso(addDays(x, 7)); if (rep === 'biweekly') return iso(addDays(x, 14)); if (rep === 'monthly') return iso(addMonths(x, 1)); return d; }
  function spawnNext(t) {
    if (!t.repeat || t.repeat === 'none' || !t.due) return;
    const copy = Object.assign({}, t, { id: uid(), status: 'pendiente', due: nextDate(t.due, t.repeat) }); delete copy.demo;
    t.repeat = 'none'; S.tasks.push(copy); toast(`Próxima repetición creada para el ${fmtDate(copy.due)}`);
  }
  function setTaskStatus(id, status) { const t = S.tasks.find((x) => x.id === id); if (!t) return; const was = t.status; t.status = status; if (was !== 'hecha' && status === 'hecha') spawnNext(t); save(); render(); }
  function moveTo(entity, id, status) {
    if (entity === 'tasks') return setTaskStatus(id, status);
    const o = S[entity].find((x) => x.id === id); if (!o) return;
    if (entity === 'items' || entity === 'contacts') o.stage = status; else o.status = status;
    o.updated = today(); save(); render();
  }
  function advance(id) {
    const it = S.items.find((x) => x.id === id);
    if (it) { const w = wfById(it.wf); const i = w.stages.findIndex((s) => s.id === it.stage); if (w.stages[i + 1]) { moveTo('items', id, w.stages[i + 1].id); toast(`Pasó a “${w.stages[i + 1].name}”`); } return; }
    const ct = S.contacts.find((x) => x.id === id); if (ct) { const i = CRM_STAGES.findIndex((s2) => s2[0] === (ct.stage || 'nuevo')); if (CRM_STAGES[i + 1]) moveTo('contacts', id, CRM_STAGES[i + 1][0]); return; }
    const t = S.tasks.find((x) => x.id === id); if (t) { const i = TASK_STATUS.findIndex((s) => s[0] === t.status); if (TASK_STATUS[i + 1]) setTaskStatus(id, TASK_STATUS[i + 1][0]); return; }
    const p = S.posts.find((x) => x.id === id); if (p) { const i = POST_STATUS.findIndex((s) => s[0] === p.status); if (POST_STATUS[i + 1]) moveTo('posts', id, POST_STATUS[i + 1][0]); }
  }

  /* ================= Exportaciones y tema ================= */
  function download(name, content, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  function exportJson() { download(`panel-central-respaldo-${today()}.json`, JSON.stringify(S, null, 2), 'application/json'); toast('Copia descargada'); }
  function exportCsv() {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['Fecha;Tipo;Concepto;Categoría;Marca;Proyecto;Estado;Importe;Moneda;En pesos'].concat(finance(ui.finMonth).tx.map((t) => [fmtDate(t.date), t.type, t.desc, t.category, brandName(t.brand), projName(t.project), t.status, t.amount, t.currency, Math.round(toUYU(t))].map(q).join(';'))).join('\n');
    download(`contabilidad-${ui.finMonth}.csv`, '﻿' + csv, 'text/csv');
  }
  function toggleTheme() {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { /* ignorar */ }
    render();
  }
  let toastT;
  let undoFn = null;
  function toast(msg, undo) {
    const el = $('#toast'); undoFn = typeof undo === 'function' ? undo : null;
    el.innerHTML = `<span>${esc(msg)}</span>${undoFn ? '<button class="toast-undo" data-action="undo">Deshacer</button>' : ''}`;
    el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; undoFn = null; }, undoFn ? 6000 : 2600);
  }
  function withUndo(keys, fn, msg) {
    const snap = {}; keys.forEach((k) => { snap[k] = JSON.stringify(S[k]); });
    fn(); save(); render();
    toast(typeof msg === 'function' ? msg() : msg, () => { keys.forEach((k) => { S[k] = JSON.parse(snap[k]); }); save(); render(); toast('Cambio deshecho'); });
  }

  /* ================= Eventos ================= */
  document.addEventListener('click', (e) => {
    if (e.target === $('#scrim')) { closeDrawer(); closePalette(); return; }
    const pi = e.target.closest('[data-pi]'); if (pi) { runPalette(Number(pi.dataset.pi)); return; }
    const el = e.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action;
    if (a === 'day' && e.target.closest('.ev')) return;
    if (a === 'go' && e.target.closest('a,button:not([data-action=go])')) return;
    switch (a) {
      case 'menu': $('#sidebar').classList.toggle('open'); break;
      case 'palette': openPalette(el.dataset.mode); break;
      case 'theme': toggleTheme(); break;
      case 'go': location.hash = el.dataset.href; break;
      case 'brand': ui.brand = el.dataset.v; saveUi(); render(); break;
      case 'set': ui[el.dataset.k] = el.dataset.v; saveUi(); render(); break;
      case 'new': openForm(el.dataset.entity, null, Object.assign({}, el.dataset.project ? { project: el.dataset.project } : {}, el.dataset.brand ? { brand: el.dataset.brand } : {}, el.dataset.wf ? { wf: el.dataset.wf } : {}, el.dataset.contact ? { contact: el.dataset.contact } : {})); break;
      case 'log': e.stopPropagation(); openForm('interactions', null, { contact: el.dataset.id, date: today(), type: 'llamada' }); break;
      case 'fu-snooze': { e.stopPropagation(); const c = S.contacts.find((x) => x.id === el.dataset.id); const n = Number(el.dataset.days || 1); if (c) withUndo(['contacts'], () => { c.followup = iso(addDays(new Date(), n)); }, n === 1 ? 'Seguimiento para mañana' : `Seguimiento en ${n} días`); break; }
      case 'crm-import': openImportDrawer(); break;
      case 'crm-import-run': runImport(); break;
      case 'edit': e.stopPropagation(); openForm(el.dataset.entity, el.dataset.id); break;
      case 'advance': { e.stopPropagation(); const snap = { items: JSON.stringify(S.items), tasks: JSON.stringify(S.tasks), posts: JSON.stringify(S.posts) }; advance(el.dataset.id); toast('Avanzó a la etapa siguiente', () => { Object.keys(snap).forEach((k) => { S[k] = JSON.parse(snap[k]); }); save(); render(); }); break; }
      case 'del': {
        const ent = el.dataset.entity; const o = S[ent].find((x) => x.id === el.dataset.id);
        if (o && (ent !== 'workflows' || confirm('¿Eliminar este workflow y todos sus ítems?'))) {
          closeDrawer();
          withUndo([ent, 'tasks', 'transactions', 'contacts', 'items'].filter((v, i, a) => a.indexOf(v) === i), () => {
            S[ent] = S[ent].filter((x) => x.id !== o.id);
            if (ent === 'projects') ['tasks', 'transactions', 'contacts'].forEach((k) => S[k].forEach((x) => { if (x.project === o.id) x.project = ''; }));
            if (ent === 'workflows') { S.items = S.items.filter((i) => i.wf !== o.id); if (ui.route === 'workflow') location.hash = '#workflows'; }
          }, 'Eliminado');
        }
        break;
      }
      case 'close': closeDrawer(); break;
      case 'toggle-task': { const t = S.tasks.find((x) => x.id === el.dataset.id); if (t) { const done = t.status !== 'hecha'; withUndo(['tasks'], () => { const was = t.status; t.status = done ? 'hecha' : 'pendiente'; if (was !== 'hecha' && done) spawnNext(t); }, done ? 'Tarea completada' : 'Tarea reabierta'); } break; }
      case 'snooze-task': { const t = S.tasks.find((x) => x.id === el.dataset.id); if (t) withUndo(['tasks'], () => { t.due = iso(addDays(new Date(), 1)); }, 'Pasada a mañana'); break; }
      case 'followup-done': { const c = S.contacts.find((x) => x.id === el.dataset.id); if (c) withUndo(['contacts'], () => { c.followup = ''; }, 'Seguimiento hecho'); break; }
      case 'dismiss': { const k = el.dataset.key; withUndo(['meta'], () => { const d = S.meta.dismissed = S.meta.dismissed || {}; Object.keys(d).forEach((x) => { if (d[x] <= today()) delete d[x]; }); d[k] = iso(addDays(new Date(), 1)); }, 'Oculto hasta mañana'); break; }
      case 'undo': if (undoFn) { const f = undoFn; undoFn = null; f(); } break;
      case 'todo': { const r = latestReport(); const t = r && r.todos[Number(el.dataset.i)]; if (t) { t.done = !t.done; save(); render(); } break; }
      case 'copy': { const txt = el.dataset.text; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copiado: ' + txt), () => toast(txt)); break; }
      case 'report': openReportDrawer(); break;
      case 'live-refresh': e.preventDefault(); if (LIVE.mcp) { refreshLive(true); toast('Actualizando conexiones…'); } break;
      case 'mail-task': { const m = LIVE.mail[Number(el.dataset.i)]; if (m) openForm('tasks', null, { title: 'Responder: ' + m.subject, notes: `${m.from}\n${m.url}`, due: today(), priority: 'media' }); break; }
      case 'report-parse': previewReport(); break;
      case 'report-save': saveReport(); break;
      case 'gcal-mode': S.settings.gcalMode = el.dataset.v; save(); render(); break;
      case 'cal': { const v = Number(el.dataset.v); ui.calMonth = v === 0 ? new Date() : addMonths(new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth(), 1), v); render(); break; }
      case 'day': openForm('tasks', null, { due: el.dataset.date }); break;
      case 'fin': ui.finMonth = ym(iso(addMonths(parse(ui.finMonth + '-01'), Number(el.dataset.v)))); render(); break;
      case 'csv': exportCsv(); break;
      case 'export': exportJson(); break;
      case 'import': $('#importFile').click(); break;
      case 'clear-demo': if (confirm('¿Eliminar todos los registros de ejemplo?')) { Object.keys(SCHEMAS).forEach((k) => { S[k] = S[k].filter((x) => !x.demo); }); save(); render(); toast('Datos de ejemplo eliminados'); } break;
      case 'reset': if (confirm('Esto reemplaza todos tus datos por los iniciales. ¿Continuar? Te conviene descargar una copia antes.')) { S = seed(); save(); render(); toast('Datos iniciales restaurados'); } break;
      case 'wipe': if (confirm('¿Borrar TODOS los datos del panel? Te conviene descargar una copia antes.')) { const keep = S.settings; S = normalize({ settings: keep, workflows: defaultWorkflows(), items: [], agents: [], reports: [] }); save(); render(); toast('Panel vacío'); } break;
      default: break;
    }
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'entityForm') submitForm(e.target);
    if (e.target.id === 'mailForm') { const f = e.target; S.settings.mailEnabled = f.mailEnabled.checked; S.settings.mailQuery = f.mailQuery.value.trim(); S.settings.mailAccount = f.mailAccount.value.trim().toLowerCase() || 'contacto@prepdiplomacia.com'; LIVE.mailAccount = undefined; save(); if (S.settings.mailEnabled) refreshLive(true); else { LIVE.mail = []; LIVE.src.mail = { state: 'off' }; render(); } toast('Preferencias de correo guardadas'); }
    if (e.target.id === 'settingsForm') {
      const f = e.target;
      S.settings.owner = f.owner.value.trim(); S.settings.tz = f.tz.value.trim() || 'Africa/Casablanca';
      S.settings.usdRate = Number(f.usdRate.value) || 1; S.settings.eurRate = Number(f.eurRate.value) || 1;
      S.settings.calendars = f.calendars.value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p[0]).map((p) => ({ id: p[0], name: p[1] || p[0], color: /^#[0-9a-f]{6}$/i.test(p[2] || '') ? p[2] : '#153D63', on: !/oculto/i.test(p[3] || '') }));
      save(); render(); toast('Preferencias guardadas');
    }
  });

  $('#importFile').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (!d || typeof d !== 'object' || !Array.isArray(d.tasks)) throw new Error('formato'); S = normalize(d); save(); render(); toast('Copia restaurada'); } catch (err) { toast('El archivo no es una copia válida del panel'); } e.target.value = ''; };
    r.readAsText(file);
  });

  let crmT;
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'crmSearch') { clearTimeout(crmT); const v = e.target.value; crmT = setTimeout(() => { ui.crmQ = v; render(); const el = $('#crmSearch'); if (el) { el.focus(); el.setSelectionRange(v.length, v.length); } }, 180); }
  });
  $('#paletteInput').addEventListener('input', () => { palSel = 0; renderPalette(); });
  $('#paletteInput').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palSel + 1, palItems.length - 1); renderPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(palSel - 1, 0); renderPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPalette(palSel); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#palette').hidden ? openPalette() : closePalette(); return; }
    if (e.key === 'Escape') { if (!$('#palette').hidden) closePalette(); else if (!$('#drawer').hidden) closeDrawer(); return; }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (!typing && e.key === '/') { e.preventDefault(); openPalette(); }
    if (!typing && e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openPalette('new'); }
  });

  // Arrastrar y soltar entre columnas
  let drag = null;
  document.addEventListener('dragstart', (e) => { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) { drag = { id: c.dataset.drag, entity: c.dataset.entity }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag.id); } });
  document.addEventListener('dragover', (e) => { const col = e.target.closest && e.target.closest('[data-drop]'); if (col && drag && col.dataset.drop === drag.entity) { e.preventDefault(); document.querySelectorAll('.col.over').forEach((x) => x !== col && x.classList.remove('over')); col.classList.add('over'); } });
  document.addEventListener('dragleave', (e) => { const col = e.target.closest && e.target.closest('[data-drop]'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('over'); });
  document.addEventListener('drop', (e) => { const col = e.target.closest && e.target.closest('[data-drop]'); if (!col || !drag) return; e.preventDefault(); moveTo(col.dataset.drop, drag.id, col.dataset.status); drag = null; });
  document.addEventListener('dragend', () => { drag = null; document.querySelectorAll('.col.over').forEach((x) => x.classList.remove('over')); });

  window.addEventListener('hashchange', route);
  async function boot() {
    if (!REMOTE) { if (await bootLive()) return; S = S || load(); save(); route(); return; }
    $('#main').innerHTML = '<div class="empty" style="padding:80px 10px">Conectando con tu web…</div>';
    try {
      const res = await api('/state');
      if (needLogin(res)) return;
      if (!res.ok && res.status !== 404) throw new Error('HTTP ' + res.status);
      const body = res.status === 404 ? null : await res.json();
      if (body && body.data) { S = normalize(body.data); sync.rev = body.rev || 0; setSync('ok'); }
      else { S = seed(); sync.rev = body ? body.rev || 0 : 0; save(); }
      route();
      pullRemote();
      setInterval(pullRemote, Math.max(10, Number(CFG.pollSeconds) || 30) * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) pullRemote(); });
    } catch (e) {
      $('#main').innerHTML = `<div class="card" style="max-width:560px;margin:60px auto;text-align:center"><h2>No se pudo conectar con tu web</h2><p class="muted">${esc(e.message)}. Revisa tu conexión y vuelve a cargar la página.</p><button class="btn primary" onclick="location.reload()">Reintentar</button></div>`;
    }
  }
  boot();
})();
