/* Panel Central · Prep Diplomacia Uy y Carolina Techera RRII
   Aplicación de una sola página, sin dependencias. Los datos viven en localStorage
   y se pueden exportar o importar como JSON desde Ajustes. */
(function () {
  'use strict';

  const KEY = 'panel-central-pd-v1';

  /* ---------- Utilidades ---------- */
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
  const ym = (s) => String(s).slice(0, 7);
  const ymLabel = (k) => { const [y, m] = k.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
  const nextDow = (dow) => { const d = new Date(); const diff = (dow - d.getDay() + 7) % 7; return addDays(d, diff); };
  const num = (v) => new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(v || 0);
  const money = (v, cur = 'UYU') => (cur === 'USD' ? 'US$ ' : '$ ') + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(Math.round(v || 0));

  /* ---------- Catálogos ---------- */
  const BRANDS = [
    { id: 'pd', name: 'Prep Diplomacia Uy', color: '#153D63' },
    { id: 'ct', name: 'Carolina Techera RRII', color: '#C6A75E' },
  ];
  const brandName = (id) => (BRANDS.find((b) => b.id === id) || { name: 'Ambas' }).name;
  const brandColor = (id) => (BRANDS.find((b) => b.id === id) || { color: '#4A6076' }).color;

  const TASK_STATUS = [['pendiente', 'Pendiente'], ['en_curso', 'En curso'], ['hecha', 'Hecha']];
  const POST_STATUS = [['idea', 'Idea'], ['produccion', 'En producción'], ['programada', 'Programada'], ['publicada', 'Publicada']];
  const PROJ_STATUS = [['planificado', 'Planificado'], ['activo', 'Activo'], ['pausado', 'Pausado'], ['cerrado', 'Cerrado']];
  const CHANNELS = ['Instagram', 'LinkedIn', 'Web / Blog', 'Newsletter', 'YouTube', 'Facebook', 'WhatsApp', 'Otro'];
  const INCOME_CATS = ['Matrículas del curso', 'Cuotas del curso', 'Formaciones y talleres', 'Consultoría e investigación', 'Clases particulares', 'Otros ingresos'];
  const EXPENSE_CATS = ['Plataformas y software', 'Publicidad y marketing', 'Docentes y colaboradores', 'Diseño y producción', 'Impuestos y aportes', 'Comisiones bancarias', 'Dominio y web', 'Otros gastos'];
  const METRIC_KEYS = [
    ['ig_seguidores', 'Seguidores en Instagram'],
    ['li_seguidores', 'Seguidores en LinkedIn'],
    ['web_visitas', 'Visitas a la web'],
    ['news_suscriptores', 'Suscriptores al newsletter'],
    ['alumnos', 'Alumnos activos'],
    ['consultas', 'Consultas recibidas'],
    ['conversion', 'Conversión de consultas (%)'],
    ['clientes', 'Clientes de consultoría'],
  ];
  const metricLabel = (k) => (METRIC_KEYS.find((m) => m[0] === k) || [k, k])[1];
  const CONTACT_TYPES = ['Alumno/a', 'Interesado/a', 'Cliente', 'Aliado/a', 'Docente', 'Proveedor', 'Otro'];
  const label = (arr, v) => (arr.find((a) => a[0] === v) || [v, v])[1];

  /* ---------- Esquemas de formularios ---------- */
  const brandOpts = () => BRANDS.map((b) => [b.id, b.name]);
  const projectOpts = () => [['', 'Sin proyecto']].concat(S.projects.map((p) => [p.id, p.name]));
  const SCHEMAS = {
    tasks: {
      title: 'Tarea', fields: [
        { k: 'title', l: 'Título', t: 'text', req: true, full: true },
        { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
        { k: 'project', l: 'Proyecto', t: 'select', o: projectOpts },
        { k: 'due', l: 'Fecha', t: 'date' },
        { k: 'time', l: 'Hora', t: 'time' },
        { k: 'priority', l: 'Prioridad', t: 'select', o: () => [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']] },
        { k: 'status', l: 'Estado', t: 'select', o: () => TASK_STATUS },
        { k: 'repeat', l: 'Repetición', t: 'select', o: () => [['none', 'No se repite'], ['weekly', 'Cada semana'], ['biweekly', 'Cada dos semanas'], ['monthly', 'Cada mes']] },
        { k: 'notes', l: 'Notas', t: 'textarea', full: true },
      ], defaults: () => ({ brand: defBrand(), priority: 'media', status: 'pendiente', repeat: 'none', due: today() }),
    },
    posts: {
      title: 'Publicación', fields: [
        { k: 'title', l: 'Título o tema', t: 'text', req: true, full: true },
        { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
        { k: 'channel', l: 'Canal', t: 'select', o: () => CHANNELS.map((c) => [c, c]) },
        { k: 'format', l: 'Formato', t: 'select', o: () => ['Carrusel', 'Reel', 'Historia', 'Post', 'Artículo', 'Video', 'Correo'].map((c) => [c, c]) },
        { k: 'status', l: 'Estado', t: 'select', o: () => POST_STATUS },
        { k: 'date', l: 'Fecha de publicación', t: 'date' },
        { k: 'time', l: 'Hora', t: 'time' },
        { k: 'copy', l: 'Texto / guion', t: 'textarea', full: true },
        { k: 'link', l: 'Enlace (Canva, publicación…)', t: 'url', full: true },
        { k: 'reach', l: 'Alcance', t: 'number' },
        { k: 'interactions', l: 'Interacciones', t: 'number' },
        { k: 'saves', l: 'Guardados', t: 'number' },
        { k: 'clicks', l: 'Clics / mensajes', t: 'number' },
      ], defaults: () => ({ brand: defBrand(), channel: 'Instagram', format: 'Carrusel', status: 'idea', date: today() }),
    },
    transactions: {
      title: 'Movimiento contable', fields: [
        { k: 'type', l: 'Tipo', t: 'select', o: () => [['ingreso', 'Ingreso'], ['gasto', 'Gasto']] },
        { k: 'date', l: 'Fecha', t: 'date', req: true },
        { k: 'desc', l: 'Concepto', t: 'text', req: true, full: true },
        { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
        { k: 'category', l: 'Categoría', t: 'select', o: () => INCOME_CATS.concat(EXPENSE_CATS).map((c) => [c, c]) },
        { k: 'amount', l: 'Importe', t: 'number', req: true, step: '0.01' },
        { k: 'currency', l: 'Moneda', t: 'select', o: () => [['UYU', 'Pesos uruguayos'], ['USD', 'Dólares']] },
        { k: 'project', l: 'Proyecto', t: 'select', o: projectOpts },
        { k: 'status', l: 'Estado', t: 'select', o: () => [['cobrado', 'Cobrado / pagado'], ['pendiente', 'Pendiente']] },
        { k: 'notes', l: 'Notas (factura, medio de pago…)', t: 'textarea', full: true },
      ], defaults: () => ({ type: 'ingreso', date: today(), brand: defBrand(), currency: 'UYU', status: 'cobrado', category: INCOME_CATS[0] }),
    },
    projects: {
      title: 'Proyecto', fields: [
        { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
        { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
        { k: 'status', l: 'Estado', t: 'select', o: () => PROJ_STATUS },
        { k: 'start', l: 'Inicio', t: 'date' },
        { k: 'end', l: 'Fin previsto', t: 'date' },
        { k: 'budget', l: 'Presupuesto (UYU)', t: 'number' },
        { k: 'progress', l: 'Avance manual (%)', t: 'number', min: 0, max: 100 },
        { k: 'desc', l: 'Descripción y objetivos', t: 'textarea', full: true },
      ], defaults: () => ({ brand: defBrand(), status: 'activo', start: today(), progress: 0 }),
    },
    metrics: {
      title: 'Registro de métrica', fields: [
        { k: 'key', l: 'Métrica', t: 'select', o: () => METRIC_KEYS },
        { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
        { k: 'date', l: 'Fecha', t: 'date', req: true },
        { k: 'value', l: 'Valor', t: 'number', req: true, step: 'any' },
        { k: 'notes', l: 'Nota', t: 'text', full: true },
      ], defaults: () => ({ key: ui.metricKey || 'ig_seguidores', brand: defBrand(), date: today() }),
    },
    contacts: {
      title: 'Contacto', fields: [
        { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
        { k: 'type', l: 'Tipo', t: 'select', o: () => CONTACT_TYPES.map((c) => [c, c]) },
        { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
        { k: 'email', l: 'Correo', t: 'email' },
        { k: 'phone', l: 'Teléfono', t: 'text' },
        { k: 'project', l: 'Proyecto', t: 'select', o: projectOpts },
        { k: 'followup', l: 'Próximo seguimiento', t: 'date' },
        { k: 'notes', l: 'Notas', t: 'textarea', full: true },
      ], defaults: () => ({ type: 'Interesado/a', brand: defBrand() }),
    },
    resources: {
      title: 'Recurso o enlace', fields: [
        { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
        { k: 'url', l: 'Enlace', t: 'text', req: true, full: true },
        { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
        { k: 'category', l: 'Categoría', t: 'select', o: () => ['Plataformas', 'Redes', 'Correo', 'Documentos', 'Finanzas', 'Otros'].map((c) => [c, c]) },
        { k: 'notes', l: 'Nota', t: 'text', full: true },
      ], defaults: () => ({ brand: defBrand(), category: 'Plataformas' }),
    },
  };

  /* ---------- Estado ---------- */
  function seed() {
    const t = new Date();
    const d = (n) => iso(addDays(t, n));
    const m = (n, day) => { const x = addMonths(new Date(t.getFullYear(), t.getMonth(), 1), n); x.setDate(day); return iso(x); };
    const thu = iso(nextDow(4)), sat = iso(nextDow(6));
    const p1 = uid(), p2 = uid(), p3 = uid(), p4 = uid(), p5 = uid();
    const demoTx = [];
    for (let i = -5; i <= 0; i++) {
      demoTx.push({ id: uid(), demo: true, type: 'ingreso', date: m(i, 5), desc: 'Cuotas del curso MRREE 2027 (ejemplo)', brand: 'pd', category: 'Cuotas del curso', amount: 150000 + (i + 5) * 6000, currency: 'UYU', project: p1, status: i === 0 ? 'pendiente' : 'cobrado' });
      demoTx.push({ id: uid(), demo: true, type: 'gasto', date: m(i, 10), desc: 'Zoom, MoodleCloud y Canva (ejemplo)', brand: 'pd', category: 'Plataformas y software', amount: 95, currency: 'USD', project: p2, status: 'cobrado' });
      demoTx.push({ id: uid(), demo: true, type: 'gasto', date: m(i, 15), desc: 'Publicidad en Instagram (ejemplo)', brand: 'pd', category: 'Publicidad y marketing', amount: 6000 + (i + 5) * 500, currency: 'UYU', status: 'cobrado' });
      if (i % 2 === 0) demoTx.push({ id: uid(), demo: true, type: 'ingreso', date: m(i, 20), desc: 'Informe de consultoría (ejemplo)', brand: 'ct', category: 'Consultoría e investigación', amount: 600, currency: 'USD', project: p4, status: 'cobrado' });
      demoTx.push({ id: uid(), demo: true, type: 'gasto', date: m(i, 25), desc: 'Aportes e impuestos (ejemplo)', brand: 'ct', category: 'Impuestos y aportes', amount: 9000, currency: 'UYU', status: 'cobrado' });
    }
    const demoMetrics = [];
    for (let i = -5; i <= 0; i++) {
      const date = m(i, 1);
      demoMetrics.push({ id: uid(), demo: true, key: 'ig_seguidores', brand: 'pd', date, value: 2400 + (i + 5) * 180 });
      demoMetrics.push({ id: uid(), demo: true, key: 'li_seguidores', brand: 'ct', date, value: 1100 + (i + 5) * 75 });
      demoMetrics.push({ id: uid(), demo: true, key: 'web_visitas', brand: 'pd', date, value: 900 + (i + 5) * 140 + (i % 2 ? 80 : 0) });
      demoMetrics.push({ id: uid(), demo: true, key: 'consultas', brand: 'pd', date, value: 18 + (i + 5) * 3 });
    }
    demoMetrics.push({ id: uid(), demo: false, key: 'alumnos', brand: 'pd', date: '2026-08-01', value: 25, notes: 'Matriculados al inicio del curso 2027' });

    return {
      version: 1,
      settings: { usdRate: 40, owner: 'Carolina' },
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
        { id: uid(), title: 'Revisar consultas en contacto@prepdiplomacia.com', brand: 'pd', due: d(0), time: '18:00', priority: 'media', status: 'pendiente', repeat: 'weekly' },
        { id: uid(), title: 'Registrar métricas del mes', brand: 'pd', due: iso(new Date(t.getFullYear(), t.getMonth() + 1, 1)), priority: 'media', status: 'pendiente', repeat: 'monthly', notes: 'Seguidores, visitas web, consultas y alumnos activos.' },
        { id: uid(), demo: true, title: 'Preparar la propuesta de consultoría (ejemplo)', brand: 'ct', project: p4, due: d(-1), priority: 'alta', status: 'en_curso', repeat: 'none' },
        { id: uid(), demo: true, title: 'Actualizar la autoevaluación de Derecho Internacional (ejemplo)', brand: 'pd', project: p3, due: d(3), priority: 'media', status: 'pendiente', repeat: 'none' },
        { id: uid(), demo: true, title: 'Diseñar el programa de la nueva formación (ejemplo)', brand: 'ct', project: p5, due: d(12), priority: 'baja', status: 'pendiente', repeat: 'none' },
      ],
      posts: [
        { id: uid(), demo: true, title: 'Carrusel: las ocho etapas del concurso (ejemplo)', brand: 'pd', channel: 'Instagram', format: 'Carrusel', status: 'publicada', date: d(-9), time: '19:00', reach: 3200, interactions: 410, saves: 260, clicks: 22 },
        { id: uid(), demo: true, title: 'Reel: cómo es una clase de aula invertida (ejemplo)', brand: 'pd', channel: 'Instagram', format: 'Reel', status: 'publicada', date: d(-4), time: '19:00', reach: 5100, interactions: 380, saves: 120, clicks: 15 },
        { id: uid(), demo: true, title: 'Artículo de análisis de coyuntura (ejemplo)', brand: 'ct', channel: 'LinkedIn', format: 'Artículo', status: 'programada', date: d(2), time: '09:00' },
        { id: uid(), demo: true, title: 'Carrusel de noticia internacional (ejemplo)', brand: 'pd', channel: 'Instagram', format: 'Carrusel', status: 'produccion', date: d(5), time: '19:00' },
        { id: uid(), demo: true, title: 'Newsletter mensual (ejemplo)', brand: 'pd', channel: 'Newsletter', format: 'Correo', status: 'idea', date: d(15) },
      ],
      transactions: demoTx,
      metrics: demoMetrics,
      contacts: [
        { id: uid(), demo: true, name: 'Persona interesada (ejemplo)', type: 'Interesado/a', brand: 'pd', email: '', followup: d(2), notes: 'Consultó por el curso 2027.' },
      ],
      resources: [
        { id: uid(), name: 'Sitio web', url: 'https://www.prepdiplomacia.com', brand: 'pd', category: 'Plataformas' },
        { id: uid(), name: 'Aula virtual MoodleCloud', url: 'https://prepdiplomacia.moodlecloud.com', brand: 'pd', category: 'Plataformas' },
        { id: uid(), name: 'Autoevaluaciones', url: 'https://autoevaluaciones.prepdiplomacia.com', brand: 'pd', category: 'Plataformas' },
        { id: uid(), name: 'Instagram @prepdiplomaciauy', url: 'https://www.instagram.com/prepdiplomaciauy', brand: 'pd', category: 'Redes' },
        { id: uid(), name: 'cursos@prepdiplomacia.com', url: 'mailto:cursos@prepdiplomacia.com', brand: 'pd', category: 'Correo', notes: 'Cursos y materiales de estudiantes' },
        { id: uid(), name: 'contacto@prepdiplomacia.com', url: 'mailto:contacto@prepdiplomacia.com', brand: 'pd', category: 'Correo', notes: 'Consultas generales y marketing' },
        { id: uid(), name: 'carolina@prepdiplomacia.com', url: 'mailto:carolina@prepdiplomacia.com', brand: 'ct', category: 'Correo', notes: 'Correo personal' },
        { id: uid(), name: 'Canva', url: 'https://www.canva.com', brand: 'pd', category: 'Plataformas', notes: 'Carruseles y presentaciones' },
      ],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const data = JSON.parse(raw); return normalize(data); }
    } catch (e) { /* almacenamiento no disponible */ }
    return seed();
  }
  function normalize(d) {
    const base = { version: 1, settings: { usdRate: 40 }, projects: [], tasks: [], posts: [], transactions: [], metrics: [], contacts: [], resources: [] };
    const out = Object.assign(base, d || {});
    out.settings = Object.assign({ usdRate: 40 }, out.settings || {});
    Object.keys(SCHEMAS).forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    return out;
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador'); } }

  const ui = { route: 'inicio', brand: 'all', search: '', taskView: 'tablero', taskFilter: 'abiertas', calMonth: new Date(), finMonth: ym(today()), finType: 'todos', metricKey: 'ig_seguidores', postView: 'tablero' };
  try { Object.assign(ui, JSON.parse(localStorage.getItem(KEY + '-ui') || '{}'), { calMonth: new Date(), search: '' }); } catch (e) { /* sin preferencias */ }
  const saveUi = () => { try { const { brand, taskView, taskFilter, metricKey, postView } = ui; localStorage.setItem(KEY + '-ui', JSON.stringify({ brand, taskView, taskFilter, metricKey, postView })); } catch (e) { /* ignorar */ } };

  const defBrand = () => (ui.brand === 'all' ? 'pd' : ui.brand);
  const byBrand = (arr) => (ui.brand === 'all' ? arr : arr.filter((x) => x.brand === ui.brand));
  const toUYU = (t) => Number(t.amount || 0) * (t.currency === 'USD' ? Number(S.settings.usdRate || 1) : 1);
  const projName = (id) => (S.projects.find((p) => p.id === id) || {}).name || '';
  const isLate = (t) => t.status !== 'hecha' && t.due && t.due < today();

  /* ---------- Iconos ---------- */
  const IC = {
    inicio: '<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    tareas: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
    proyectos: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    marketing: '<path d="M3 11v2a1 1 0 001 1h3l5 4V6L7 10H4a1 1 0 00-1 1zM16 8a5 5 0 010 8M19 5a9 9 0 010 14"/>',
    contabilidad: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>',
    metricas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    contactos: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-4-5.6"/>',
    recursos: '<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 009 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 14.2H3a2 2 0 110-4h.1A1.6 1.6 0 004.6 9a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 4.6V4.5a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V10a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[k] || ''}</svg>`;
  const ROUTES = [
    ['inicio', 'Inicio'], ['calendario', 'Calendario'], ['tareas', 'Tareas'], ['proyectos', 'Proyectos'],
    ['marketing', 'Marketing y publicaciones'], ['contabilidad', 'Contabilidad'], ['metricas', 'Métricas'],
    ['contactos', 'Contactos'], ['recursos', 'Recursos y enlaces'], ['ajustes', 'Ajustes y respaldo'],
  ];

  /* ---------- Gráficos SVG ---------- */
  function barChart(groups, series, opts = {}) {
    if (!groups.length) return '<div class="empty">Sin datos todavía</div>';
    const W = 640, H = opts.h || 240, P = { l: 56, r: 10, t: 12, b: 28 };
    const max = Math.max(1, ...groups.flatMap((g) => g.values)) * 1.1;
    const iw = W - P.l - P.r, ih = H - P.t - P.b, gw = iw / groups.length, bw = Math.min(26, (gw * 0.7) / series.length);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Gráfico de barras')}">`;
    for (let i = 0; i <= 4; i++) {
      const y = P.t + ih - (ih * i) / 4;
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" stroke="#DCE3EB"/><text x="${P.l - 6}" y="${y + 4}" text-anchor="end">${short(max * i / 4)}</text>`;
    }
    groups.forEach((g, gi) => {
      const x0 = P.l + gi * gw + (gw - bw * series.length) / 2;
      g.values.forEach((v, si) => {
        const h = (v / max) * ih;
        s += `<rect x="${x0 + si * bw}" y="${P.t + ih - h}" width="${bw - 2}" height="${h}" rx="3" fill="${series[si].color}"><title>${esc(g.label)} · ${esc(series[si].name)}: ${esc(opts.fmt ? opts.fmt(v) : num(v))}</title></rect>`;
      });
      s += `<text x="${P.l + gi * gw + gw / 2}" y="${H - 8}" text-anchor="middle">${esc(g.label)}</text>`;
    });
    return s + '</svg>';
  }
  function lineChart(seriesList, opts = {}) {
    const all = seriesList.flatMap((s) => s.points);
    if (!all.length) return '<div class="empty">Sin registros para esta métrica. Agrega el primero con “+ Registrar”.</div>';
    const W = 640, H = opts.h || 240, P = { l: 56, r: 16, t: 14, b: 28 };
    const xs = all.map((p) => parse(p.date).getTime());
    let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5 * 15; x1 += 864e5 * 15; }
    const vs = all.map((p) => p.value); let y0 = Math.min(...vs), y1 = Math.max(...vs);
    const pad_ = (y1 - y0) * 0.15 || Math.abs(y1) * 0.1 || 1; y0 = Math.max(0, y0 - pad_); y1 += pad_;
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const X = (d) => P.l + ((parse(d).getTime() - x0) / (x1 - x0)) * iw, Y = (v) => P.t + ih - ((v - y0) / (y1 - y0)) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de la métrica">`;
    for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4, y = Y(v); s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" stroke="#DCE3EB"/><text x="${P.l - 6}" y="${y + 4}" text-anchor="end">${short(v)}</text>`; }
    const ticks = 5; for (let i = 0; i <= ticks; i++) { const t = new Date(x0 + (x1 - x0) * i / ticks); s += `<text x="${P.l + iw * i / ticks}" y="${H - 8}" text-anchor="middle">${pad(t.getDate())} ${MONTHS_S[t.getMonth()]}</text>`; }
    seriesList.forEach((se) => {
      const pts = se.points.slice().sort((a, b) => a.date.localeCompare(b.date));
      if (pts.length > 1) s += `<polyline fill="none" stroke="${se.color}" stroke-width="2.5" points="${pts.map((p) => `${X(p.date)},${Y(p.value)}`).join(' ')}"/>`;
      pts.forEach((p) => { s += `<circle cx="${X(p.date)}" cy="${Y(p.value)}" r="4" fill="#fff" stroke="${se.color}" stroke-width="2"><title>${esc(se.name)} · ${fmtDate(p.date)}: ${num(p.value)}</title></circle>`; });
    });
    return s + '</svg>';
  }
  function short(v) { const a = Math.abs(v); if (a >= 1e6) return (v / 1e6).toFixed(1) + ' M'; if (a >= 1e3) return Math.round(v / 1e3) + ' k'; return Math.round(v); }
  function hbars(rows, fmt) {
    if (!rows.length) return '<div class="empty">Sin datos en este período</div>';
    const max = Math.max(...rows.map((r) => r[1]), 1);
    return '<div class="bars-h">' + rows.map(([l, v]) => `<div class="r"><span class="l" title="${esc(l)}">${esc(l)}</span><span class="b"><span style="width:${(v / max) * 100}%"></span></span><span class="v">${fmt(v)}</span></div>`).join('') + '</div>';
  }

  /* ---------- Cálculos ---------- */
  function finance(month) {
    const tx = byBrand(S.transactions).filter((t) => !month || ym(t.date) === month);
    const inc = tx.filter((t) => t.type === 'ingreso').reduce((a, t) => a + toUYU(t), 0);
    const exp = tx.filter((t) => t.type === 'gasto').reduce((a, t) => a + toUYU(t), 0);
    const pend = tx.filter((t) => t.status === 'pendiente' && t.type === 'ingreso').reduce((a, t) => a + toUYU(t), 0);
    return { inc, exp, net: inc - exp, pend, tx };
  }
  function last12() {
    const out = []; const base = new Date(); base.setDate(1);
    for (let i = 11; i >= 0; i--) { const d = addMonths(base, -i); out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); }
    return out;
  }
  function projectProgress(p) {
    const ts = S.tasks.filter((t) => t.project === p.id && t.repeat === 'none');
    if (ts.length) return { pct: Math.round((ts.filter((t) => t.status === 'hecha').length / ts.length) * 100), auto: true, n: ts.length };
    return { pct: Number(p.progress || 0), auto: false, n: 0 };
  }
  function latestMetric(key, brand) {
    const arr = S.metrics.filter((m) => m.key === key && (!brand || brand === 'all' || m.brand === brand)).sort((a, b) => a.date.localeCompare(b.date));
    return { last: arr[arr.length - 1], prev: arr[arr.length - 2] };
  }

  /* ---------- Componentes ---------- */
  const brandDot = (b) => `<span class="dot" style="background:${brandColor(b)}" title="${esc(brandName(b))}"></span>`;
  function taskItem(t) {
    const late = isLate(t);
    return `<li class="${t.status === 'hecha' ? 'done' : ''}">
      <button class="check ${t.status === 'hecha' ? 'on' : ''}" data-action="toggle-task" data-id="${t.id}" aria-label="Marcar como hecha">${t.status === 'hecha' ? '✓' : ''}</button>
      <div class="grow"><div class="t">${esc(t.title)}</div>
      <div class="m">${brandDot(t.brand)} ${t.due ? fmtDate(t.due) : 'Sin fecha'}${t.time ? ' · ' + esc(t.time) + ' hs' : ''}${t.project ? ' · ' + esc(projName(t.project)) : ''}${t.repeat && t.repeat !== 'none' ? ' · ↻' : ''}</div></div>
      ${late ? '<span class="tag late">Vencida</span>' : `<span class="tag ${t.priority}">${esc(t.priority || '')}</span>`}
      <button class="icon-btn" data-action="edit" data-entity="tasks" data-id="${t.id}" aria-label="Editar">✎</button></li>`;
  }
  function agendaItems(fromIso, toIso) {
    const items = [];
    byBrand(S.tasks).filter((t) => t.status !== 'hecha' && t.due && t.due >= fromIso && t.due <= toIso).forEach((t) => items.push({ kind: 'task', date: t.due, time: t.time, o: t }));
    byBrand(S.posts).filter((p) => p.status !== 'publicada' && p.date && p.date >= fromIso && p.date <= toIso).forEach((p) => items.push({ kind: 'post', date: p.date, time: p.time, o: p }));
    return items.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  }
  function head(title, sub, actions = '') { return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="row">${actions}</div></div>`; }

  /* ---------- Vistas ---------- */
  const VIEWS = {};

  VIEWS.inicio = () => {
    const now = new Date(); const h = now.getHours();
    const saludo = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
    const tasks = byBrand(S.tasks);
    const open = tasks.filter((t) => t.status !== 'hecha');
    const late = open.filter(isLate);
    const week = iso(addDays(now, 7));
    const postsWeek = byBrand(S.posts).filter((p) => p.status === 'programada' && p.date >= today() && p.date <= week);
    const f = finance(ym(today()));
    const al = latestMetric('alumnos', ui.brand);
    const ag = agendaItems('0000-00-00', iso(addDays(now, 7))).filter((i) => i.date >= today() || (i.kind === 'task'));
    const months = last12().slice(-6);
    const groups = months.map((k) => { const x = finance(k); return { label: MONTHS_S[Number(k.slice(5)) - 1], values: [x.inc, x.exp] }; });
    const projs = byBrand(S.projects).filter((p) => p.status === 'activo');
    const fu = byBrand(S.contacts).filter((c) => c.followup && c.followup <= week).sort((a, b) => a.followup.localeCompare(b.followup));
    return head(`${saludo}, ${S.settings.owner || 'Carolina'}`, `${DOW[(now.getDay() + 6) % 7]} ${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()} · Vista: ${ui.brand === 'all' ? 'ambas marcas' : esc(brandName(ui.brand))}`) +
      `<div class="grid kpis">
        <div class="card kpi"><div class="label">Tareas abiertas</div><div class="value">${open.length}</div><div class="sub ${late.length ? 'down' : ''}">${late.length} vencida${late.length === 1 ? '' : 's'}</div></div>
        <div class="card kpi"><div class="label">Programadas (7 días)</div><div class="value">${postsWeek.length}</div><div class="sub">publicaciones</div></div>
        <div class="card kpi"><div class="label">Resultado del mes</div><div class="value ${f.net < 0 ? 'down' : ''}">${money(f.net)}</div><div class="sub">Ingresos ${money(f.inc)} · Gastos ${money(f.exp)}</div></div>
        <div class="card kpi"><div class="label">Por cobrar</div><div class="value">${money(f.pend)}</div><div class="sub">ingresos pendientes del mes</div></div>
        <div class="card kpi"><div class="label">Alumnos activos</div><div class="value">${al.last ? num(al.last.value) : 'Sin dato'}</div><div class="sub">${al.last ? 'al ' + fmtDate(al.last.date) : 'registrar en Métricas'}</div></div>
      </div>
      <div class="grid cols-3">
        <div class="grid">
          <div class="card"><div class="card-head"><h2>Agenda de los próximos 7 días</h2><a href="#calendario" class="btn sm">Ver calendario</a></div>
            ${ag.length ? '<ul class="list">' + ag.slice(0, 12).map((i) => i.kind === 'task' ? taskItem(i.o) :
              `<li><span class="tag gold">${esc(i.o.channel)}</span><div class="grow"><div class="t">${esc(i.o.title)}</div><div class="m">${brandDot(i.o.brand)} ${fmtDate(i.o.date)}${i.o.time ? ' · ' + esc(i.o.time) + ' hs' : ''} · ${esc(label(POST_STATUS, i.o.status))}</div></div><button class="icon-btn" data-action="edit" data-entity="posts" data-id="${i.o.id}">✎</button></li>`).join('') + '</ul>' : '<div class="empty">Nada agendado. Buen momento para planificar.</div>'}
          </div>
          <div class="card"><div class="card-head"><h2>Ingresos y gastos (6 meses, en pesos)</h2><a href="#contabilidad" class="btn sm">Contabilidad</a></div>
            <div class="chart">${barChart(groups, [{ name: 'Ingresos', color: '#153D63' }, { name: 'Gastos', color: '#C6A75E' }], { fmt: money, label: 'Ingresos y gastos por mes' })}</div>
            <div class="legend"><span><i style="background:#153D63"></i>Ingresos</span><span><i style="background:#C6A75E"></i>Gastos</span></div>
          </div>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card"><div class="card-head"><h2>Proyectos activos</h2><a href="#proyectos" class="btn sm">Ver todos</a></div>
            ${projs.length ? projs.map((p) => { const pr = projectProgress(p); return `<div style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><strong style="font-size:13px">${brandDot(p.brand)} ${esc(p.name)}</strong><span class="m" style="font-size:12px;color:var(--gris)">${pr.pct}%</span></div><div class="progress"><span style="width:${pr.pct}%"></span></div></div>`; }).join('') : '<div class="empty">Sin proyectos activos</div>'}
          </div>
          <div class="card"><div class="card-head"><h2>Seguimientos</h2><a href="#contactos" class="btn sm">Contactos</a></div>
            ${fu.length ? '<ul class="list">' + fu.slice(0, 6).map((c) => `<li><div class="grow"><div class="t">${esc(c.name)}</div><div class="m">${brandDot(c.brand)} ${esc(c.type)} · ${fmtDate(c.followup)}</div></div>${c.followup < today() ? '<span class="tag late">Atrasado</span>' : ''}<button class="icon-btn" data-action="edit" data-entity="contacts" data-id="${c.id}">✎</button></li>`).join('') + '</ul>' : '<div class="empty">Sin seguimientos esta semana</div>'}
          </div>
          <div class="card"><h2>Accesos rápidos</h2><div class="row">
            ${byBrand(S.resources).filter((r) => r.category === 'Plataformas').slice(0, 5).map((r) => `<a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>`).join('')}
          </div></div>
        </div>
      </div>`;
  };

  VIEWS.tareas = () => {
    let list = byBrand(S.tasks);
    const f = ui.taskFilter;
    if (f === 'abiertas') list = list.filter((t) => t.status !== 'hecha');
    if (f === 'hoy') list = list.filter((t) => t.status !== 'hecha' && t.due && t.due <= today());
    if (f === 'semana') list = list.filter((t) => t.status !== 'hecha' && t.due && t.due <= iso(addDays(new Date(), 7)));
    if (f === 'programadas') list = list.filter((t) => t.repeat && t.repeat !== 'none');
    if (f === 'vencidas') list = list.filter(isLate);
    const sorted = list.slice().sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    const filt = [['abiertas', 'Abiertas'], ['hoy', 'Hoy y atrasadas'], ['semana', 'Próximos 7 días'], ['programadas', 'Recurrentes'], ['vencidas', 'Vencidas'], ['todas', 'Todas']];
    let body;
    if (ui.taskView === 'lista') {
      body = `<div class="card">${sorted.length ? '<ul class="list">' + sorted.map(taskItem).join('') + '</ul>' : '<div class="empty">No hay tareas con este filtro</div>'}</div>`;
    } else {
      body = kanban('tasks', TASK_STATUS, (s) => (s === 'hecha' && f === 'abiertas' ? byBrand(S.tasks).filter((t) => t.status === 'hecha').slice(-8) : sorted.filter((t) => t.status === s)), (t) => `
        <div class="t">${esc(t.title)}</div>
        <div class="meta">${brandDot(t.brand)}${t.due ? `<span>${fmtDate(t.due)}${t.time ? ' ' + esc(t.time) + ' hs' : ''}</span>` : ''}${isLate(t) ? '<span class="tag late">Vencida</span>' : `<span class="tag ${t.priority}">${esc(t.priority)}</span>`}${t.repeat !== 'none' ? '<span title="Recurrente">↻</span>' : ''}</div>
        ${t.project ? `<div class="meta" style="margin-top:4px">${esc(projName(t.project))}</div>` : ''}`);
    }
    return head('Tareas', 'Pendientes, en curso y programadas. Arrastra las tarjetas entre columnas para cambiar el estado. Las recurrentes generan la siguiente al completarse.',
      `<div class="seg"><button class="${ui.taskView === 'tablero' ? 'active' : ''}" data-action="set" data-k="taskView" data-v="tablero">Tablero</button><button class="${ui.taskView === 'lista' ? 'active' : ''}" data-action="set" data-k="taskView" data-v="lista">Lista</button></div>
       <button class="btn primary" data-action="new" data-entity="tasks">+ Tarea</button>`) +
      `<div class="filters">${filt.map(([k, l]) => `<button class="chip ${ui.taskFilter === k ? 'active' : ''}" data-action="set" data-k="taskFilter" data-v="${k}">${l}</button>`).join('')}</div>` + body;
  };

  function kanban(entity, statuses, getItems, cardHtml) {
    return `<div class="kanban">${statuses.map(([s, l]) => { const items = getItems(s); return `<div class="col" data-drop="${entity}" data-status="${s}"><h3><span>${esc(l)}</span><span>${items.length}</span></h3>
      ${items.map((o) => `<div class="kcard" draggable="true" data-drag="${o.id}" style="border-left-color:${brandColor(o.brand)}"><span class="acts"><button class="icon-btn" data-action="edit" data-entity="${entity}" data-id="${o.id}" aria-label="Editar">✎</button></span>${cardHtml(o)}</div>`).join('') || '<div class="empty" style="padding:12px">Vacío</div>'}
      </div>`; }).join('')}</div>`;
  }

  VIEWS.calendario = () => {
    const m = ui.calMonth; const y = m.getFullYear(), mo = m.getMonth();
    const first = new Date(y, mo, 1); const start = addDays(first, -((first.getDay() + 6) % 7));
    const cells = []; for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    if (cells[35].getMonth() !== mo) cells.length = 35;
    const evs = {};
    const push = (d, html) => { (evs[d] = evs[d] || []).push(html); };
    byBrand(S.tasks).forEach((t) => { if (t.due) push(t.due, `<button class="ev task ${t.status === 'hecha' ? 'done' : ''}" data-action="edit" data-entity="tasks" data-id="${t.id}" style="border-left:3px solid ${brandColor(t.brand)}">${t.time ? esc(t.time) + ' ' : ''}${esc(t.title)}</button>`); });
    // Proyección de recurrencias dentro del mes visible
    byBrand(S.tasks).filter((t) => t.repeat && t.repeat !== 'none' && t.status !== 'hecha' && t.due).forEach((t) => {
      let d = nextDate(t.due, t.repeat); const end = iso(cells[cells.length - 1]);
      while (d <= end) { push(d, `<button class="ev task" style="opacity:.55;border-left:3px solid ${brandColor(t.brand)}" data-action="edit" data-entity="tasks" data-id="${t.id}" title="Repetición prevista">↻ ${esc(t.title)}</button>`); d = nextDate(d, t.repeat); }
    });
    byBrand(S.posts).forEach((p) => { if (p.date) push(p.date, `<button class="ev post ${p.status === 'publicada' ? 'done' : ''}" data-action="edit" data-entity="posts" data-id="${p.id}">${esc(p.channel)}: ${esc(p.title)}</button>`); });
    byBrand(S.projects).forEach((p) => { if (p.end) push(p.end, `<button class="ev proj" data-action="edit" data-entity="projects" data-id="${p.id}">Cierre: ${esc(p.name)}</button>`); });
    return head('Calendario', 'Tareas, publicaciones y cierres de proyecto. Haz clic en un día para crear una tarea en esa fecha.',
      `<button class="btn" data-action="cal" data-v="-1">‹</button><button class="btn" data-action="cal" data-v="0">Hoy</button><button class="btn" data-action="cal" data-v="1">›</button>`) +
      `<div class="card-head"><h2 style="text-transform:capitalize">${MONTHS[mo]} ${y}</h2><div class="legend"><span><i style="background:var(--azul-claro)"></i>Tarea</span><span><i style="background:#F6EEDC"></i>Publicación</span><span><i style="background:#E7F4EE"></i>Proyecto</span><span>↻ Recurrente</span></div></div>
      <div class="cal">${DOW.map((d) => `<div class="dow">${d}</div>`).join('')}
      ${cells.map((d) => { const k = iso(d); const list = evs[k] || []; return `<div class="day ${d.getMonth() !== mo ? 'other' : ''} ${k === today() ? 'today' : ''}" data-action="day" data-date="${k}"><div class="n">${d.getDate()}</div>${list.slice(0, 4).join('')}${list.length > 4 ? `<div class="m">+${list.length - 4} más</div>` : ''}</div>`; }).join('')}</div>`;
  };

  VIEWS.proyectos = () => {
    const list = byBrand(S.projects);
    const order = { activo: 0, planificado: 1, pausado: 2, cerrado: 3 };
    const sorted = list.slice().sort((a, b) => order[a.status] - order[b.status]);
    return head('Proyectos', 'Cada proyecto reúne sus tareas, movimientos contables y contactos.', '<button class="btn primary" data-action="new" data-entity="projects">+ Proyecto</button>') +
      (sorted.length ? `<div class="grid cols-2">${sorted.map((p) => {
        const pr = projectProgress(p);
        const ts = S.tasks.filter((t) => t.project === p.id);
        const open = ts.filter((t) => t.status !== 'hecha');
        const tx = S.transactions.filter((t) => t.project === p.id);
        const inc = tx.filter((t) => t.type === 'ingreso').reduce((a, t) => a + toUYU(t), 0);
        const exp = tx.filter((t) => t.type === 'gasto').reduce((a, t) => a + toUYU(t), 0);
        const cs = S.contacts.filter((c) => c.project === p.id).length;
        return `<div class="card" style="border-top:3px solid ${brandColor(p.brand)}">
          <div class="card-head"><h3>${esc(p.name)}</h3><span class="row"><span class="tag">${esc(label(PROJ_STATUS, p.status))}</span><button class="icon-btn" data-action="edit" data-entity="projects" data-id="${p.id}">✎</button></span></div>
          <div class="m" style="color:var(--gris);font-size:12px;margin-bottom:8px">${esc(brandName(p.brand))}${p.start ? ' · desde ' + fmtDate(p.start) : ''}${p.end ? ' · hasta ' + fmtDate(p.end) : ''}</div>
          ${p.desc ? `<p style="margin:0 0 10px">${esc(p.desc)}</p>` : ''}
          <div class="row" style="justify-content:space-between;font-size:12px;color:var(--gris)"><span>Avance ${pr.auto ? `(según ${pr.n} tareas)` : '(manual)'}</span><strong>${pr.pct}%</strong></div>
          <div class="progress" style="margin-bottom:12px"><span style="width:${pr.pct}%"></span></div>
          <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;font-size:12px">
            <div><div class="kpi value" style="font-size:18px;font-family:Montserrat;font-weight:700;color:var(--azul)">${open.length}</div>tareas abiertas</div>
            <div><div style="font-size:16px;font-family:Montserrat;font-weight:700;color:var(--ok)">${short(inc)}</div>ingresos</div>
            <div><div style="font-size:16px;font-family:Montserrat;font-weight:700;color:var(--bad)">${short(exp)}</div>gastos</div>
            <div><div style="font-size:18px;font-family:Montserrat;font-weight:700;color:var(--azul)">${cs}</div>contactos</div>
          </div>
          ${p.budget ? `<div class="m" style="font-size:12px;color:var(--gris);margin-top:8px">Presupuesto ${money(p.budget)} · ejecutado ${Math.round((exp / p.budget) * 100)}%</div>` : ''}
          ${open.length ? '<ul class="list" style="margin-top:8px">' + open.slice(0, 4).map(taskItem).join('') + '</ul>' : ''}
          <div class="row" style="margin-top:10px"><button class="btn sm" data-action="new" data-entity="tasks" data-project="${p.id}" data-brand="${p.brand}">+ Tarea</button><button class="btn sm" data-action="new" data-entity="transactions" data-project="${p.id}" data-brand="${p.brand}">+ Movimiento</button></div>
        </div>`; }).join('')}</div>` : '<div class="card empty">Todavía no hay proyectos</div>');
  };

  VIEWS.marketing = () => {
    const posts = byBrand(S.posts);
    const pub = posts.filter((p) => p.status === 'publicada');
    const sum = (k) => pub.reduce((a, p) => a + Number(p[k] || 0), 0);
    const reach = sum('reach'), inter = sum('interactions');
    const eng = reach ? ((inter / reach) * 100).toFixed(1) : '0';
    const byCh = {}; pub.forEach((p) => { byCh[p.channel] = (byCh[p.channel] || 0) + Number(p.reach || 0); });
    const top = pub.slice().sort((a, b) => (Number(b.interactions || 0) + Number(b.saves || 0)) - (Number(a.interactions || 0) + Number(a.saves || 0))).slice(0, 5);
    const sorted = posts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const body = ui.postView === 'tabla'
      ? `<div class="card table-wrap"><table><thead><tr><th>Fecha</th><th>Título</th><th>Canal</th><th>Estado</th><th class="num">Alcance</th><th class="num">Interacc.</th><th class="num">Guardados</th><th></th></tr></thead><tbody>
        ${sorted.map((p) => `<tr><td>${fmtDate(p.date)}</td><td>${brandDot(p.brand)} ${esc(p.title)}</td><td>${esc(p.channel)} · ${esc(p.format || '')}</td><td><span class="tag">${esc(label(POST_STATUS, p.status))}</span></td><td class="num">${p.reach ? num(p.reach) : ''}</td><td class="num">${p.interactions ? num(p.interactions) : ''}</td><td class="num">${p.saves ? num(p.saves) : ''}</td><td class="actions"><button class="icon-btn" data-action="edit" data-entity="posts" data-id="${p.id}">✎</button><button class="icon-btn" data-action="del" data-entity="posts" data-id="${p.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin publicaciones</td></tr>'}
        </tbody></table></div>`
      : kanban('posts', POST_STATUS, (s) => sorted.filter((p) => p.status === s), (p) => `<div class="t">${esc(p.title)}</div><div class="meta"><span class="tag gold">${esc(p.channel)}</span><span>${esc(p.format || '')}</span>${p.date ? `<span>${fmtDate(p.date)}${p.time ? ' ' + esc(p.time) + ' hs' : ''}</span>` : ''}</div>${p.status === 'publicada' && p.reach ? `<div class="meta" style="margin-top:4px">Alcance ${num(p.reach)} · ${num(p.interactions)} interacc.</div>` : ''}`);
    return head('Marketing y publicaciones', 'Planificación editorial desde la idea hasta la publicación, con resultados por pieza.',
      `<div class="seg"><button class="${ui.postView === 'tablero' ? 'active' : ''}" data-action="set" data-k="postView" data-v="tablero">Tablero</button><button class="${ui.postView === 'tabla' ? 'active' : ''}" data-action="set" data-k="postView" data-v="tabla">Tabla</button></div><button class="btn primary" data-action="new" data-entity="posts">+ Publicación</button>`) +
      `<div class="grid kpis">
        <div class="card kpi"><div class="label">Publicadas</div><div class="value">${pub.length}</div><div class="sub">${posts.filter((p) => p.status === 'programada').length} programadas</div></div>
        <div class="card kpi"><div class="label">Alcance total</div><div class="value">${num(reach)}</div></div>
        <div class="card kpi"><div class="label">Interacciones</div><div class="value">${num(inter)}</div><div class="sub">${num(sum('saves'))} guardados</div></div>
        <div class="card kpi"><div class="label">Tasa de interacción</div><div class="value">${eng}%</div><div class="sub">interacciones / alcance</div></div>
      </div>` + body +
      `<div class="grid cols-2" style="margin-top:16px">
        <div class="card"><h2>Alcance por canal</h2>${hbars(Object.entries(byCh).sort((a, b) => b[1] - a[1]), num)}</div>
        <div class="card"><h2>Publicaciones con mejor rendimiento</h2>${top.length ? '<ul class="list">' + top.map((p) => `<li><div class="grow"><div class="t">${esc(p.title)}</div><div class="m">${esc(p.channel)} · ${fmtDate(p.date)}</div></div><span class="tag gold">${num(Number(p.interactions || 0) + Number(p.saves || 0))}</span></li>`).join('') + '</ul>' : '<div class="empty">Carga resultados en las publicaciones para ver el ranking</div>'}</div>
      </div>`;
  };

  VIEWS.contabilidad = () => {
    const month = ui.finMonth;
    const f = finance(month);
    const yearKey = month.slice(0, 4);
    const yearTx = byBrand(S.transactions).filter((t) => t.date.startsWith(yearKey));
    const yInc = yearTx.filter((t) => t.type === 'ingreso').reduce((a, t) => a + toUYU(t), 0);
    const yExp = yearTx.filter((t) => t.type === 'gasto').reduce((a, t) => a + toUYU(t), 0);
    const groups = last12().map((k) => { const x = finance(k); return { label: MONTHS_S[Number(k.slice(5)) - 1], values: [x.inc, x.exp] }; });
    const catAgg = (type) => { const o = {}; f.tx.filter((t) => t.type === type).forEach((t) => { o[t.category] = (o[t.category] || 0) + toUYU(t); }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
    let rows = f.tx.slice().sort((a, b) => b.date.localeCompare(a.date));
    if (ui.finType !== 'todos') rows = rows.filter((t) => (ui.finType === 'pendiente' ? t.status === 'pendiente' : t.type === ui.finType));
    return head('Contabilidad', `Montos consolidados en pesos uruguayos (1 US$ = $ ${esc(S.settings.usdRate)}, ajustable en Ajustes).`,
      `<button class="btn" data-action="fin" data-v="-1">‹</button><strong style="text-transform:capitalize;min-width:130px;text-align:center">${ymLabel(month)}</strong><button class="btn" data-action="fin" data-v="1">›</button>
       <button class="btn" data-action="csv">Exportar CSV</button><button class="btn primary" data-action="new" data-entity="transactions">+ Movimiento</button>`) +
      `<div class="grid kpis">
        <div class="card kpi"><div class="label">Ingresos del mes</div><div class="value up">${money(f.inc)}</div></div>
        <div class="card kpi"><div class="label">Gastos del mes</div><div class="value down">${money(f.exp)}</div></div>
        <div class="card kpi"><div class="label">Resultado del mes</div><div class="value ${f.net < 0 ? 'down' : ''}">${money(f.net)}</div><div class="sub">margen ${f.inc ? Math.round((f.net / f.inc) * 100) : 0}%</div></div>
        <div class="card kpi"><div class="label">Pendiente de cobro</div><div class="value">${money(f.pend)}</div></div>
        <div class="card kpi"><div class="label">Resultado ${yearKey}</div><div class="value ${yInc - yExp < 0 ? 'down' : ''}">${money(yInc - yExp)}</div><div class="sub">Ingresos ${money(yInc)}</div></div>
      </div>
      <div class="grid cols-3">
        <div class="card"><div class="card-head"><h2>Últimos 12 meses</h2><div class="legend"><span><i style="background:#153D63"></i>Ingresos</span><span><i style="background:#C6A75E"></i>Gastos</span></div></div><div class="chart">${barChart(groups, [{ name: 'Ingresos', color: '#153D63' }, { name: 'Gastos', color: '#C6A75E' }], { fmt: money })}</div></div>
        <div class="grid" style="align-content:start">
          <div class="card"><h3>Ingresos por categoría</h3>${hbars(catAgg('ingreso'), money)}</div>
          <div class="card"><h3>Gastos por categoría</h3>${hbars(catAgg('gasto'), money)}</div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-head"><h2>Movimientos de ${ymLabel(month)}</h2><div class="row">${[['todos', 'Todos'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos'], ['pendiente', 'Pendientes']].map(([k, l]) => `<button class="chip ${ui.finType === k ? 'active' : ''}" data-action="set" data-k="finType" data-v="${k}">${l}</button>`).join('')}</div></div>
        <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Marca</th><th>Estado</th><th class="num">Importe</th><th class="num">En pesos</th><th></th></tr></thead><tbody>
        ${rows.map((t) => `<tr><td>${fmtDate(t.date)}</td><td>${esc(t.desc)}${t.project ? `<div class="m" style="font-size:11px;color:var(--gris)">${esc(projName(t.project))}</div>` : ''}</td><td>${esc(t.category)}</td><td>${brandDot(t.brand)} ${esc(brandName(t.brand))}</td><td>${t.status === 'pendiente' ? '<span class="tag media">Pendiente</span>' : '<span class="tag baja">OK</span>'}</td><td class="num ${t.type === 'gasto' ? 'down' : 'up'}">${t.type === 'gasto' ? '−' : '+'} ${money(t.amount, t.currency)}</td><td class="num">${money(toUYU(t))}</td><td class="actions"><button class="icon-btn" data-action="edit" data-entity="transactions" data-id="${t.id}">✎</button><button class="icon-btn" data-action="del" data-entity="transactions" data-id="${t.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin movimientos en este mes</td></tr>'}
        </tbody></table></div></div>`;
  };

  VIEWS.metricas = () => {
    const key = ui.metricKey;
    const brands = ui.brand === 'all' ? BRANDS : BRANDS.filter((b) => b.id === ui.brand);
    const series = brands.map((b) => ({ name: b.name, color: b.color, points: S.metrics.filter((m) => m.key === key && m.brand === b.id) })).filter((s) => s.points.length);
    const cards = METRIC_KEYS.map(([k, l]) => {
      const { last, prev } = latestMetric(k, ui.brand);
      if (!last) return '';
      const delta = prev ? last.value - prev.value : null;
      return `<button class="card kpi" style="text-align:left;cursor:pointer;${k === key ? 'outline:2px solid var(--azul)' : ''}" data-action="set" data-k="metricKey" data-v="${k}"><div class="label">${esc(l)}</div><div class="value">${num(last.value)}</div><div class="sub">${delta === null ? fmtDate(last.date) : `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${num(Math.abs(delta))}</span> vs. registro anterior`}</div></button>`;
    }).join('');
    const rows = byBrand(S.metrics).filter((m) => m.key === key).sort((a, b) => b.date.localeCompare(a.date));
    return head('Métricas', 'Indicadores de crecimiento de ambas marcas. Registra los valores una vez al mes para ver la evolución.',
      `<select class="btn" data-change="metricKey">${METRIC_KEYS.map(([k, l]) => `<option value="${k}" ${k === key ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><button class="btn primary" data-action="new" data-entity="metrics">+ Registrar</button>`) +
      `<div class="grid kpis">${cards || '<div class="card empty">Sin métricas registradas</div>'}</div>
      <div class="grid cols-3">
        <div class="card"><div class="card-head"><h2>${esc(metricLabel(key))}</h2><div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div></div><div class="chart">${lineChart(series)}</div></div>
        <div class="card"><h3>Registros</h3>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Marca</th><th class="num">Valor</th><th></th></tr></thead><tbody>${rows.map((m) => `<tr><td>${fmtDate(m.date)}</td><td>${brandDot(m.brand)}</td><td class="num">${num(m.value)}</td><td class="actions"><button class="icon-btn" data-action="edit" data-entity="metrics" data-id="${m.id}">✎</button><button class="icon-btn" data-action="del" data-entity="metrics" data-id="${m.id}">🗑</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Sin registros</div>'}</div>
      </div>`;
  };

  VIEWS.contactos = () => {
    const rows = byBrand(S.contacts).slice().sort((a, b) => (a.followup || '9999').localeCompare(b.followup || '9999'));
    const counts = {}; byBrand(S.contacts).forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
    return head('Contactos', 'Alumnos, interesados, clientes y aliados, con fecha de próximo seguimiento.', '<button class="btn primary" data-action="new" data-entity="contacts">+ Contacto</button>') +
      `<div class="filters">${Object.entries(counts).map(([k, v]) => `<span class="tag">${esc(k)}: ${v}</span>`).join('') || ''}</div>
      <div class="card table-wrap"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Marca</th><th>Correo</th><th>Teléfono</th><th>Proyecto</th><th>Seguimiento</th><th></th></tr></thead><tbody>
      ${rows.map((c) => `<tr><td><strong>${esc(c.name)}</strong>${c.notes ? `<div style="font-size:11px;color:var(--gris)">${esc(c.notes)}</div>` : ''}</td><td>${esc(c.type)}</td><td>${brandDot(c.brand)}</td><td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</td><td>${esc(c.phone || '')}</td><td>${esc(projName(c.project))}</td><td>${c.followup ? `<span class="${c.followup < today() ? 'tag late' : 'tag'}">${fmtDate(c.followup)}</span>` : ''}</td><td class="actions"><button class="icon-btn" data-action="edit" data-entity="contacts" data-id="${c.id}">✎</button><button class="icon-btn" data-action="del" data-entity="contacts" data-id="${c.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin contactos</td></tr>'}
      </tbody></table></div>`;
  };

  VIEWS.recursos = () => {
    const list = byBrand(S.resources);
    const cats = [...new Set(list.map((r) => r.category))];
    return head('Recursos y enlaces', 'Todas las plataformas, cuentas y documentos clave a un clic.', '<button class="btn primary" data-action="new" data-entity="resources">+ Recurso</button>') +
      (cats.map((c) => `<h2 style="margin:18px 0 10px">${esc(c)}</h2><div class="res-grid">${list.filter((r) => r.category === c).map((r) => `
        <div class="res" style="border-left-color:${brandColor(r.brand)}"><div class="row" style="justify-content:space-between"><a class="t" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a><span><button class="icon-btn" data-action="edit" data-entity="resources" data-id="${r.id}">✎</button><button class="icon-btn" data-action="del" data-entity="resources" data-id="${r.id}">🗑</button></span></div><div class="u">${esc(r.url)}</div>${r.notes ? `<div class="u">${esc(r.notes)}</div>` : ''}</div>`).join('')}</div>`).join('') || '<div class="card empty">Sin recursos</div>');
  };

  VIEWS.ajustes = () => {
    const demo = Object.keys(SCHEMAS).reduce((a, k) => a + S[k].filter((x) => x.demo).length, 0);
    return head('Ajustes y respaldo', 'Los datos se guardan en este navegador. Exporta una copia con regularidad para no perderlos y para usarlos en otro equipo.') +
      `${demo ? `<div class="note">Hay <strong>${demo}</strong> registros de ejemplo (marcados “ejemplo”) para que veas cómo funciona el panel. Cuando empieces a cargar tus datos reales, elimínalos con el botón de abajo.</div>` : ''}
      <div class="grid cols-2">
        <div class="card"><h2>Preferencias</h2><form id="settingsForm" class="fgrid">
          <div class="field"><label>Tu nombre (saludo)</label><input name="owner" value="${esc(S.settings.owner || '')}"></div>
          <div class="field"><label>Tipo de cambio (pesos por dólar)</label><input name="usdRate" type="number" step="0.01" min="0" value="${esc(S.settings.usdRate)}"></div>
          <div class="field full"><button class="btn primary" type="submit">Guardar preferencias</button></div></form></div>
        <div class="card"><h2>Copia de seguridad</h2><p>Descarga todos tus datos en un archivo JSON o restaura una copia anterior.</p>
          <div class="row"><button class="btn primary" data-action="export">Descargar copia</button><button class="btn" data-action="import">Restaurar copia</button></div></div>
        <div class="card"><h2>Limpieza</h2><div class="row">
          <button class="btn" data-action="clear-demo" ${demo ? '' : 'disabled'}>Eliminar datos de ejemplo</button>
          <button class="btn" data-action="reset">Restaurar datos iniciales</button>
          <button class="btn danger" data-action="wipe">Borrar todo</button></div></div>
        <div class="card"><h2>Resumen</h2><ul class="list">${[['projects', 'Proyectos'], ['tasks', 'Tareas'], ['posts', 'Publicaciones'], ['transactions', 'Movimientos'], ['metrics', 'Registros de métricas'], ['contacts', 'Contactos'], ['resources', 'Recursos']].map(([k, l]) => `<li><span class="grow">${l}</span><strong>${S[k].length}</strong></li>`).join('')}</ul></div>
      </div>`;
  };

  VIEWS.buscar = () => {
    const q = ui.search.toLowerCase();
    const hit = (o, keys) => keys.some((k) => String(o[k] || '').toLowerCase().includes(q));
    const groups = [
      ['tasks', 'Tareas', ['title', 'notes'], (o) => o.title, (o) => fmtDate(o.due)],
      ['projects', 'Proyectos', ['name', 'desc'], (o) => o.name, (o) => label(PROJ_STATUS, o.status)],
      ['posts', 'Publicaciones', ['title', 'copy', 'channel'], (o) => o.title, (o) => `${o.channel} · ${fmtDate(o.date)}`],
      ['transactions', 'Movimientos', ['desc', 'category', 'notes'], (o) => o.desc, (o) => `${fmtDate(o.date)} · ${money(o.amount, o.currency)}`],
      ['contacts', 'Contactos', ['name', 'email', 'notes', 'type'], (o) => o.name, (o) => o.type],
      ['resources', 'Recursos', ['name', 'url', 'notes'], (o) => o.name, (o) => o.url],
    ];
    let total = 0;
    const html = groups.map(([ent, l, keys, t, m]) => {
      const r = byBrand(S[ent]).filter((o) => hit(o, keys)); total += r.length;
      return r.length ? `<div class="card"><h3>${l} (${r.length})</h3><ul class="list">${r.map((o) => `<li><div class="grow"><div class="t">${brandDot(o.brand)} ${esc(t(o))}</div><div class="m">${esc(m(o))}</div></div><button class="icon-btn" data-action="edit" data-entity="${ent}" data-id="${o.id}">✎</button></li>`).join('')}</ul></div>` : '';
    }).join('');
    return head(`Resultados para “${ui.search}”`, `${total} coincidencia${total === 1 ? '' : 's'}`) + `<div class="grid cols-2">${html || '<div class="card empty">Sin resultados</div>'}</div>`;
  };

  /* ---------- Render ---------- */
  function render() {
    const counts = { tareas: byBrand(S.tasks).filter(isLate).length };
    $('#nav').innerHTML = ROUTES.map(([k, l]) => `<a href="#${k}" class="${ui.route === k ? 'active' : ''}">${icon(k)}<span>${l}</span>${counts[k] ? `<span class="badge" title="Vencidas">${counts[k]}</span>` : ''}</a>`).join('');
    $('#brandFilter').innerHTML = [['all', 'Ambas marcas', '#4A6076']].concat(BRANDS.map((b) => [b.id, b.name, b.color]))
      .map(([id, n, c]) => `<button class="chip ${ui.brand === id ? 'active' : ''}" data-action="brand" data-v="${id}"><span class="dot" style="background:${id === 'all' ? 'linear-gradient(90deg,#153D63 50%,#C6A75E 50%)' : c}"></span>${esc(n)}</button>`).join('');
    const route = ui.search ? 'buscar' : ui.route;
    $('#main').innerHTML = (VIEWS[route] || VIEWS.inicio)();
    document.title = `${(ROUTES.find((r) => r[0] === ui.route) || ['', 'Inicio'])[1]} · Panel Central`;
  }

  function route() { const h = location.hash.slice(1); ui.route = VIEWS[h] ? h : 'inicio'; ui.search = ''; $('#search').value = ''; $('#sidebar').classList.remove('open'); render(); window.scrollTo(0, 0); }

  /* ---------- Formularios ---------- */
  function openForm(entity, id, preset = {}) {
    const sch = SCHEMAS[entity]; const obj = id ? S[entity].find((x) => x.id === id) : Object.assign(sch.defaults(), preset);
    if (!obj) return;
    const field = (f) => {
      const v = obj[f.k] ?? '';
      let input;
      if (f.t === 'select') input = `<select name="${f.k}">${f.o().map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`;
      else if (f.t === 'textarea') input = `<textarea name="${f.k}">${esc(v)}</textarea>`;
      else input = `<input name="${f.k}" type="${f.t}" value="${esc(v)}" ${f.req ? 'required' : ''} ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''}>`;
      return `<div class="field ${f.full ? 'full' : ''}"><label>${esc(f.l)}${f.req ? ' *' : ''}</label>${input}</div>`;
    };
    $('#modalBox').innerHTML = `<header><h2>${id ? 'Editar' : 'Nuevo registro:'} ${esc(sch.title.toLowerCase())}</h2><button class="icon-btn" data-action="close" aria-label="Cerrar">✕</button></header>
      <form id="entityForm" data-entity="${entity}" data-id="${id || ''}"><div class="fgrid">${sch.fields.map(field).join('')}</div>
      <footer>${id ? `<button type="button" class="btn danger" data-action="del" data-entity="${entity}" data-id="${id}" style="margin-right:auto">Eliminar</button>` : ''}<button type="button" class="btn" data-action="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></footer></form>`;
    $('#modal').hidden = false;
    const first = $('#entityForm input, #entityForm select'); if (first) first.focus();
    if (entity === 'transactions') {
      const typeSel = $('#entityForm [name=type]'), catSel = $('#entityForm [name=category]');
      const sync = () => { const cats = typeSel.value === 'ingreso' ? INCOME_CATS : EXPENSE_CATS; const cur = catSel.value; catSel.innerHTML = cats.map((c) => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join(''); };
      typeSel.addEventListener('change', sync); sync();
    }
  }
  function closeModal() { $('#modal').hidden = true; $('#modalBox').innerHTML = ''; }

  function submitForm(form) {
    const entity = form.dataset.entity, id = form.dataset.id;
    const sch = SCHEMAS[entity]; const data = {};
    sch.fields.forEach((f) => { const el = form.elements[f.k]; let v = el.value.trim(); if (f.t === 'number') v = v === '' ? '' : Number(v); data[f.k] = v; });
    if (id) { const o = S[entity].find((x) => x.id === id); const wasDone = o.status; Object.assign(o, data); delete o.demo; if (entity === 'tasks' && wasDone !== 'hecha' && o.status === 'hecha') spawnNext(o); }
    else { const o = Object.assign({ id: uid() }, data); S[entity].push(o); if (entity === 'tasks' && o.status === 'hecha') spawnNext(o); }
    save(); closeModal(); render(); toast('Guardado');
  }

  /* ---------- Tareas recurrentes ---------- */
  function nextDate(d, rep) {
    const x = parse(d);
    if (rep === 'weekly') return iso(addDays(x, 7));
    if (rep === 'biweekly') return iso(addDays(x, 14));
    if (rep === 'monthly') return iso(addMonths(x, 1));
    return d;
  }
  function spawnNext(t) {
    if (!t.repeat || t.repeat === 'none' || !t.due) return;
    const copy = Object.assign({}, t, { id: uid(), status: 'pendiente', due: nextDate(t.due, t.repeat) });
    delete copy.demo;
    t.repeat = 'none'; // la instancia completada queda como historial
    S.tasks.push(copy);
    toast(`Próxima repetición creada para el ${fmtDate(copy.due)}`);
  }
  function setTaskStatus(id, status) {
    const t = S.tasks.find((x) => x.id === id); if (!t) return;
    const was = t.status; t.status = status;
    if (was !== 'hecha' && status === 'hecha') spawnNext(t);
    save(); render();
  }

  /* ---------- Exportaciones ---------- */
  function download(name, content, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportCsv() {
    const rows = finance(ui.finMonth).tx;
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['Fecha;Tipo;Concepto;Categoría;Marca;Proyecto;Estado;Importe;Moneda;En pesos'].concat(rows.map((t) => [fmtDate(t.date), t.type, t.desc, t.category, brandName(t.brand), projName(t.project), t.status, t.amount, t.currency, Math.round(toUYU(t))].map(q).join(';'))).join('\n');
    download(`contabilidad-${ui.finMonth}.csv`, '﻿' + csv, 'text/csv');
  }

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    const qm = $('#quickMenu');
    if (!e.target.closest('.quick')) qm.hidden = true;
    if (e.target === $('#modal')) return closeModal();
    const el = e.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action;
    if (a === 'day' && e.target.closest('.ev')) return;
    switch (a) {
      case 'menu': $('#sidebar').classList.toggle('open'); break;
      case 'quick': qm.hidden = !qm.hidden; break;
      case 'brand': ui.brand = el.dataset.v; saveUi(); render(); break;
      case 'set': ui[el.dataset.k] = el.dataset.v; saveUi(); render(); break;
      case 'new': qm.hidden = true; openForm(el.dataset.entity, null, Object.assign({}, el.dataset.project ? { project: el.dataset.project } : {}, el.dataset.brand ? { brand: el.dataset.brand } : {})); break;
      case 'edit': e.stopPropagation(); openForm(el.dataset.entity, el.dataset.id); break;
      case 'del': {
        const ent = el.dataset.entity; const o = S[ent].find((x) => x.id === el.dataset.id);
        if (o && confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) {
          S[ent] = S[ent].filter((x) => x.id !== o.id);
          if (ent === 'projects') ['tasks', 'transactions', 'contacts'].forEach((k) => S[k].forEach((x) => { if (x.project === o.id) x.project = ''; }));
          save(); closeModal(); render(); toast('Eliminado');
        }
        break;
      }
      case 'close': closeModal(); break;
      case 'toggle-task': { const t = S.tasks.find((x) => x.id === el.dataset.id); if (t) setTaskStatus(t.id, t.status === 'hecha' ? 'pendiente' : 'hecha'); break; }
      case 'cal': { const v = Number(el.dataset.v); ui.calMonth = v === 0 ? new Date() : addMonths(new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth(), 1), v); render(); break; }
      case 'day': openForm('tasks', null, { due: el.dataset.date }); break;
      case 'fin': { const d = addMonths(parse(ui.finMonth + '-01'), Number(el.dataset.v)); ui.finMonth = ym(iso(d)); render(); break; }
      case 'csv': exportCsv(); break;
      case 'export': download(`panel-central-respaldo-${today()}.json`, JSON.stringify(S, null, 2), 'application/json'); toast('Copia descargada'); break;
      case 'import': $('#importFile').click(); break;
      case 'clear-demo': if (confirm('¿Eliminar todos los registros de ejemplo?')) { Object.keys(SCHEMAS).forEach((k) => { S[k] = S[k].filter((x) => !x.demo); }); save(); render(); toast('Datos de ejemplo eliminados'); } break;
      case 'reset': if (confirm('Esto reemplaza todos tus datos por los iniciales. ¿Continuar? Te conviene descargar una copia antes.')) { S = seed(); save(); render(); toast('Datos iniciales restaurados'); } break;
      case 'wipe': if (confirm('¿Borrar TODOS los datos del panel? Te conviene descargar una copia antes.')) { S = normalize({ settings: S.settings }); save(); render(); toast('Panel vacío'); } break;
      default: break;
    }
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'entityForm') submitForm(e.target);
    if (e.target.id === 'settingsForm') { const f = e.target; S.settings.owner = f.owner.value.trim(); S.settings.usdRate = Number(f.usdRate.value) || 1; save(); render(); toast('Preferencias guardadas'); }
  });

  document.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.change; if (k) { ui[k] = e.target.value; saveUi(); render(); }
  });

  $('#importFile').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (!d || typeof d !== 'object' || !Array.isArray(d.tasks)) throw new Error('formato'); S = normalize(d); save(); render(); toast('Copia restaurada'); } catch (err) { toast('El archivo no es una copia válida del panel'); } e.target.value = ''; };
    r.readAsText(file);
  });

  let searchT;
  $('#search').addEventListener('input', (e) => { clearTimeout(searchT); searchT = setTimeout(() => { ui.search = e.target.value.trim(); render(); }, 200); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#search').focus(); }
  });

  // Arrastrar y soltar en tableros
  let dragId = null;
  document.addEventListener('dragstart', (e) => { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) { dragId = c.dataset.drag; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } });
  document.addEventListener('dragover', (e) => { const col = e.target.closest && e.target.closest('[data-drop]'); if (col && dragId) { e.preventDefault(); document.querySelectorAll('.col.over').forEach((x) => x !== col && x.classList.remove('over')); col.classList.add('over'); } });
  document.addEventListener('dragleave', (e) => { const col = e.target.closest && e.target.closest('[data-drop]'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('over'); });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest && e.target.closest('[data-drop]'); if (!col || !dragId) return; e.preventDefault();
    const ent = col.dataset.drop, st = col.dataset.status;
    if (ent === 'tasks') setTaskStatus(dragId, st);
    else { const o = S[ent].find((x) => x.id === dragId); if (o) { o.status = st; save(); render(); } }
    dragId = null;
  });
  document.addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.col.over').forEach((x) => x.classList.remove('over')); });

  window.addEventListener('hashchange', route);
  if (!localStorage.getItem(KEY)) save();
  route();
})();
