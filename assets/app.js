/* Panel Central · Prep Diplomacia Uy y Carolina Techera RRII
   Aplicación de una sola página, sin dependencias. Los datos viven en localStorage
   y se exportan o importan como JSON desde Ajustes. */
(function () {
  'use strict';

  const KEY = 'panel-central-pd-v1';
  const THEME_KEY = 'panel-central-theme';

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
  const wfOpts = () => S.workflows.map((w) => [w.id, w.name]);
  const stageOpts = (wfId) => ((S.workflows.find((w) => w.id === wfId) || S.workflows[0] || { stages: [] }).stages).map((s) => [s.id, s.name]);
  const SCHEMAS = {
    tasks: { title: 'Tarea', fields: [
      { k: 'title', l: 'Título', t: 'text', req: true, full: true },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'project', l: 'Proyecto', t: 'select', o: projectOpts },
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
    contacts: { title: 'Contacto', fields: [
      { k: 'name', l: 'Nombre', t: 'text', req: true, full: true },
      { k: 'type', l: 'Tipo', t: 'select', o: () => CONTACT_TYPES.map((c) => [c, c]) },
      { k: 'brand', l: 'Marca', t: 'select', o: brandOpts },
      { k: 'email', l: 'Correo', t: 'email' }, { k: 'phone', l: 'Teléfono', t: 'text' },
      { k: 'project', l: 'Proyecto', t: 'select', o: projectOpts },
      { k: 'followup', l: 'Próximo seguimiento', t: 'date' },
      { k: 'notes', l: 'Notas', t: 'textarea', full: true },
    ], defaults: () => ({ type: 'Interesado/a', brand: defBrand() }) },
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
    return Object.assign(base, seedWorkflowPart());
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
    out.version = 2;
    return out;
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* sin almacenamiento */ }
    return seed();
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador'); } }

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
  const icon = (k, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[k] || ''}</svg>`;

  const NAV = [
    ['General', [['inicio', 'Inicio'], ['agenda', 'Agenda'], ['tareas', 'Tareas']]],
    ['Workflows', [['workflows', 'Workflows'], ['correcciones', 'Correcciones'], ['agentes', 'Agentes IA']]],
    ['Negocio', [['proyectos', 'Proyectos'], ['marketing', 'Marketing'], ['contabilidad', 'Contabilidad'], ['metricas', 'Métricas'], ['contactos', 'Contactos']]],
    ['Sistema', [['recursos', 'Recursos'], ['ajustes', 'Ajustes y respaldo']]],
  ];
  const ROUTE_NAMES = Object.fromEntries(NAV.flatMap((g) => g[1]));

  /* ================= Gráficos ================= */
  function barChart(groups, series, opts = {}) {
    if (!groups.length) return '<div class="empty">Sin datos todavía</div>';
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
      <div class="m">${brandDot(t.brand)}<span>${t.due ? fmtDate(t.due) : 'Sin fecha'}${t.time ? ' · ' + esc(t.time) + ' hs' : ''}</span>${t.project ? `<span>· ${esc(projName(t.project))}</span>` : ''}${t.repeat && t.repeat !== 'none' ? '<span title="Recurrente">· ↻</span>' : ''}</div></div>
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

  VIEWS.inicio = () => {
    const now = new Date(); const h = now.getHours();
    const saludo = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
    const open = byBrand(S.tasks).filter((t) => t.status !== 'hecha');
    const late = open.filter(isLate);
    const todayTasks = open.filter((t) => t.due && t.due <= today());
    const rep = latestReport(); const tot = reportTotals(rep);
    const f = finance(ym(today()));
    const al = latestMetric('alumnos');
    const ags = byBrand(S.agents); const agFail = ags.filter((a) => a.lastStatus === 'falla');
    const week = iso(addDays(now, 7));
    const postsWeek = byBrand(S.posts).filter((p) => p.status === 'programada' && p.date >= today() && p.date <= week);
    const fu = byBrand(S.contacts).filter((c) => c.followup && c.followup <= today());

    const attn = [];
    if (rep && rep.status === 'falla' && (ui.brand !== 'ct')) attn.push(['bad', 'alert', 'El agente de correcciones no pudo leer Moodle', `Informe del ${fmtDate(rep.date)}. Inicia sesión en Moodle y vuelve a correrlo.`, '#correcciones']);
    if (tot.revision && ui.brand !== 'ct') attn.push(['warn', 'correcciones', `${plural(tot.revision, 'corrección', 'correcciones')} esperan tu revisión`, `${plural(Object.values(rep.classes).filter((c) => c.revision).length, 'clase')} con correcciones listas para subir a Moodle.`, '#correcciones']);
    agFail.filter((a) => a.id !== 'ag-corr').forEach((a) => attn.push(['bad', 'agentes', `Falla en ${a.name}`, a.lastNote || 'Revisa la última corrida.', '#agentes']));
    if (late.length) attn.push(['bad', 'tareas', `${plural(late.length, 'tarea vencida', 'tareas vencidas')}`, late.slice(0, 2).map((t) => t.title).join(' · '), '#tareas']);
    if (fu.length) attn.push(['info', 'contactos', `${plural(fu.length, 'seguimiento pendiente', 'seguimientos pendientes')}`, fu.slice(0, 2).map((c) => c.name).join(' · '), '#contactos']);
    if (f.pend > 0) attn.push(['info', 'contabilidad', `${money(f.pend)} por cobrar este mes`, 'Ingresos marcados como pendientes.', '#contabilidad']);
    const wfAgenda = byBrand(S.items).filter((i) => i.due === today() && i.owner === 'Agente IA');
    if (wfAgenda.length) attn.push(['ia', 'agentes', `${plural(wfAgenda.length, 'propuesta', 'propuestas')} de los agentes para elegir hoy`, wfAgenda.map((i) => i.title).slice(0, 2).join(' · '), '#workflows']);

    const months = last12().slice(-6);
    const groups = months.map((k) => { const x = finance(k); return { label: MONTHS_S[Number(k.slice(5)) - 1], values: [x.inc, x.exp] }; });
    const wfs = byBrand(S.workflows).map((w) => ({ w, n: wfItems(w).length })).sort((a, b) => b.n - a.n).slice(0, 4);
    const agToday = ags.slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const upcoming = open.filter((t) => t.due && t.due <= week).sort((a, b) => (a.due + (a.time || '')).localeCompare(b.due + (b.time || ''))).slice(0, 6);

    return `<section class="hero">
        <h1>${saludo}, ${esc(S.settings.owner || 'Carolina')}</h1>
        <p>Hoy es ${DOW_L[now.getDay()]} ${now.getDate()} de ${MONTHS[now.getMonth()]} · ${ui.brand === 'all' ? 'ambas marcas' : esc(brandName(ui.brand))}</p>
        <div class="chips">
          ${ui.brand !== 'ct' ? `<a class="hchip" href="#correcciones">${icon('correcciones')}${plural(tot.revision, 'corrección', 'correcciones')} en tu revisión</a>` : ''}
          <a class="hchip" href="#tareas">${icon('tareas')}${plural(todayTasks.length, 'tarea')} para hoy</a>
          <a class="hchip" href="#agentes">${icon('agentes')}${ags.length - agFail.length} de ${ags.length} agentes sin fallas</a>
          <a class="hchip" href="#agenda">${icon('agenda')}Ver agenda</a>
        </div>
      </section>
      <div class="grid g-kpi" style="margin-bottom:16px">
        <div class="card kpi accent"><div class="l">${icon('tareas')}Tareas abiertas</div><div class="v">${open.length}</div><div class="s ${late.length ? 'down' : ''}">${plural(late.length, 'vencida')}</div></div>
        <div class="card kpi accent"><div class="l">${icon('correcciones')}En tu revisión</div><div class="v">${num(tot.revision)}</div><div class="s">${num(tot.devuelta)} ya devueltas</div></div>
        <div class="card kpi accent"><div class="l">${icon('contabilidad')}Resultado del mes</div><div class="v ${f.net < 0 ? 'down' : ''}">${money(f.net)}</div><div class="s">Ingresos ${money(f.inc)}</div></div>
        <div class="card kpi accent"><div class="l">${icon('user')}Alumnos activos</div><div class="v">${al.last ? num(al.last.value) : '–'}</div><div class="s">${al.last ? 'al ' + fmtDate(al.last.date) : 'registrar en Métricas'}</div></div>
        <div class="card kpi accent"><div class="l">${icon('marketing')}Programadas (7 días)</div><div class="v">${postsWeek.length}</div><div class="s">publicaciones</div></div>
      </div>
      <div class="grid g-main">
        <div class="stack">
          <div class="card"><div class="ch"><h2>Requiere tu atención</h2><span class="pill">${attn.length}</span></div>
            ${attn.length ? `<div class="attn">${attn.map(([lvl, ic, t, m, href]) => `<a href="${href}"><span class="ic ${lvl}">${icon(ic)}</span><span style="min-width:0"><div class="t">${esc(t)}</div><div class="m">${esc(m)}</div></span><span class="go">${icon('chev')}</span></a>`).join('')}</div>` : '<div class="empty">Todo en orden. Nada urgente por ahora.</div>'}
          </div>
          <div class="card"><div class="ch"><h2>Workflows</h2><a class="btn sm" href="#workflows">Ver todos</a></div>
            <div class="stack" style="gap:14px">${wfs.map(({ w }) => `<div data-action="go" data-href="#workflow/${w.id}" style="cursor:pointer"><div class="row between" style="margin-bottom:6px"><strong>${esc(w.name)}</strong><span class="muted small">${brandDot(w.brand)} ${esc(brandName(w.brand))}</span></div>${pipeline(w, true)}</div>`).join('')}</div>
          </div>
          <div class="card"><div class="ch"><h2>Ingresos y gastos · 6 meses</h2><div class="legend"><span><i style="background:#153D63"></i>Ingresos</span><span><i style="background:#C6A75E"></i>Gastos</span></div></div>
            <div class="chart">${barChart(groups, [{ name: 'Ingresos', color: '#153D63' }, { name: 'Gastos', color: '#C6A75E' }], { fmt: money })}</div>
          </div>
        </div>
        <div class="stack">
          <div class="card"><div class="ch"><h2>${icon('gcal')}Tu agenda</h2><a class="btn sm" href="#agenda">Abrir</a></div>
            <iframe class="gcal" src="${esc(gcalEmbed('AGENDA'))}" height="340" loading="lazy" title="Google Calendar"></iframe>
            <div class="small muted" style="margin-top:6px">Desde Google Calendar. Si no ves tus eventos, inicia sesión en Google en este navegador.</div>
          </div>
          <div class="card"><div class="ch"><h2>${icon('agentes')}Agentes de hoy</h2><a class="btn sm" href="#agentes">Ver</a></div>
            <div class="timeline">${agToday.map((a) => `<div class="tl ${a.lastStatus}"><div class="row between"><span class="h">${esc(a.time)} hs <span class="muted small" style="font-weight:600">${esc(a.tz)}</span></span>${a.lastStatus === 'falla' ? '<span class="pill bad">Falla</span>' : ''}</div><div class="small">${esc(a.name)}</div></div>`).join('') || '<div class="empty">Sin agentes</div>'}</div>
          </div>
          <div class="card"><div class="ch"><h2>Próximas tareas</h2><a class="btn sm" href="#tareas">Todas</a></div>
            ${upcoming.length ? '<ul class="list">' + upcoming.map(taskItem).join('') + '</ul>' : '<div class="empty">Sin tareas esta semana</div>'}
          </div>
        </div>
      </div>`;
  };

  VIEWS.agenda = () => {
    const tab = ui.agendaTab;
    const tabs = `<div class="seg"><button class="${tab === 'google' ? 'active' : ''}" data-action="set" data-k="agendaTab" data-v="google">${icon('gcal')}Google Calendar</button><button class="${tab === 'panel' ? 'active' : ''}" data-action="set" data-k="agendaTab" data-v="panel">${icon('workflows')}Tareas y workflows</button></div>`;
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
    return head('Correcciones', 'Las tareas de redacción de tus alumnos según el último informe del agente diario de correcciones (11:18 hs de París). Pega cada informe nuevo para actualizar el panel y el workflow.',
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
    return head('Agentes IA', 'Las tareas programadas que trabajan para ti todos los días en Claude. Actualiza el resultado de cada corrida desde su ficha o, para correcciones, pegando el informe.', `<a class="btn" href="https://claude.ai/code" target="_blank" rel="noopener">${icon('ext')}Abrir Claude</a><button class="btn primary" data-action="new" data-entity="agents">${icon('plus')}Agente</button>`, 'Automatizaciones') +
      `<div class="grid g-kpi" style="margin-bottom:16px"><div class="card kpi accent"><div class="l">Agentes activos</div><div class="v">${ags.length}</div></div><div class="card kpi"><div class="l">Con falla</div><div class="v ${fails ? 'down' : 'up'}">${fails}</div></div><div class="card kpi"><div class="l">Workflows automatizados</div><div class="v">${new Set(ags.map((a) => a.wf).filter(Boolean)).size}</div></div></div>
      <div class="grid g-main"><div class="grid g-2">${ags.map((a) => { const w = wfById(a.wf); return `<div class="card agent">
        <div class="top"><span class="av">${icon('agentes')}</span><div style="flex:1;min-width:0"><h3>${esc(a.name)}</h3><div class="small muted">${brandDot(a.brand)} ${esc(brandName(a.brand))}</div></div><button class="iconbtn" data-action="edit" data-entity="agents" data-id="${a.id}" aria-label="Editar">${icon('edit')}</button></div>
        <div class="row"><span class="pill info">${icon('clock')}Todos los días · ${esc(a.time)} hs ${esc(a.tz)}</span>${statusPill(a.lastStatus)}</div>
        <div class="small">${esc(a.desc)}</div>
        ${a.lastNote ? `<div class="small ${a.lastStatus === 'falla' ? 'down' : 'muted'}">${esc(a.lastNote)}</div>` : ''}
        <div class="row between small muted"><span>Última corrida: ${fmtDate(a.lastRun) || 'sin dato'}</span>${w ? `<a href="#workflow/${w.id}">${esc(w.name)} →</a>` : ''}</div>
      </div>`; }).join('')}</div>
      <div class="card" style="align-self:start"><h2 style="margin-bottom:12px">Línea del día</h2><div class="timeline">${ags.map((a) => `<div class="tl ${a.lastStatus}"><div class="h">${esc(a.time)} hs · ${esc(a.tz)}</div><div class="small">${esc(a.name)}</div></div>`).join('')}</div>
        <div class="note" style="margin:8px 0 0">En noviembre París y Casablanca comparten hora (UTC+1); 12:00 UTC equivale a 13:00 hs en ambas.</div></div></div>`;
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

  VIEWS.recursos = () => {
    const list = byBrand(S.resources); const cats = [...new Set(list.map((r) => r.category))];
    return head('Recursos y enlaces', 'Plataformas, cuentas y documentos clave a un clic.', `<button class="btn primary" data-action="new" data-entity="resources">${icon('plus')}Recurso</button>`) +
      (cats.map((c) => `<h2 style="margin:20px 0 10px">${esc(c)}</h2><div class="res-grid">${list.filter((r) => r.category === c).map((r) => `<div class="res"><div class="row between"><a class="t" href="${esc(r.url)}" target="_blank" rel="noopener">${brandDot(r.brand)} ${esc(r.name)}</a><button class="iconbtn" data-action="edit" data-entity="resources" data-id="${r.id}">${icon('edit')}</button></div><div class="u">${esc(r.url)}</div>${r.notes ? `<div class="u">${esc(r.notes)}</div>` : ''}</div>`).join('')}</div>`).join('') || '<div class="card empty">Sin recursos</div>');
  };

  VIEWS.ajustes = () => {
    const demo = Object.keys(SCHEMAS).reduce((a, k) => a + S[k].filter((x) => x.demo).length, 0);
    const calText = (S.settings.calendars || []).map((c) => `${c.id} | ${c.name} | ${c.color}${c.on === false ? ' | oculto' : ''}`).join('\n');
    return head('Ajustes y respaldo', 'Los datos se guardan en este navegador. Descarga una copia con regularidad para no perderlos y para usarlos en otro equipo.') +
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
          <div class="card"><h2 style="margin-bottom:4px">Resumen</h2><ul class="list">${[['projects', 'Proyectos'], ['tasks', 'Tareas'], ['workflows', 'Workflows'], ['items', 'Ítems de workflows'], ['agents', 'Agentes'], ['reports', 'Informes de correcciones'], ['posts', 'Publicaciones'], ['transactions', 'Movimientos'], ['metrics', 'Registros de métricas'], ['contacts', 'Contactos'], ['resources', 'Recursos']].map(([k, l]) => `<li><span class="grow">${l}</span><strong>${S[k].length}</strong></li>`).join('')}</ul></div>
        </div>
      </div>`;
  };

  /* ================= Render y navegación ================= */
  function render() {
    const rep = latestReport(); const tot = reportTotals(rep);
    const counts = { tareas: [byBrand(S.tasks).filter(isLate).length, true], correcciones: [ui.brand === 'ct' ? 0 : tot.revision, rep && rep.status === 'falla'], agentes: [byBrand(S.agents).filter((a) => a.lastStatus === 'falla').length, true], workflows: [byBrand(S.workflows).length, false] };
    const active = ui.route === 'workflow' ? (ui.param === 'wf-corr' ? 'correcciones' : 'workflows') : ui.route;
    $('#nav').innerHTML = NAV.map(([g, items]) => `<div class="grp">${g}</div>` + items.map(([k, l]) => { const c = counts[k]; return `<a href="#${k}" class="${active === k ? 'active' : ''}">${icon(k)}<span>${l}</span>${c && c[0] ? `<span class="count ${c[1] ? 'alert' : ''}">${c[0]}</span>` : ''}</a>`; }).join('')).join('');
    $('#brandFilter').innerHTML = [['all', 'Ambas']].concat(BRANDS.map((b) => [b.id, b.short])).map(([id, n]) => `<button class="${ui.brand === id ? 'active' : ''}" data-action="brand" data-v="${id}">${id === 'all' ? '' : brandDot(id)}${esc(n)}</button>`).join('');
    $('#themeBtn').innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon');
    $('#sideFoot').innerHTML = `Datos guardados en este navegador · <a href="#ajustes">Copia de seguridad</a>`;
    $('#main').innerHTML = (VIEWS[ui.route] || VIEWS.inicio)();
    document.title = `${ui.route === 'workflow' ? (wfById(ui.param) || {}).name || 'Workflow' : ROUTE_NAMES[ui.route] || 'Inicio'} · Panel Central`;
  }
  function route() {
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
      const o = Object.assign({ id: (entity === 'workflows' ? 'wf-' : '') + uid() }, data); S[entity].push(o);
      if (entity === 'tasks' && o.status === 'hecha') spawnNext(o);
    }
    save(); closeDrawer(); render(); toast('Guardado');
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
    const r = pendingReport; const prev = latestReport();
    if (!Object.keys(r.classes).length && prev) { r.classes = JSON.parse(JSON.stringify(prev.classes)); r.pendingNotes = ['Cantidades sin cambios: se mantienen las del informe anterior']; }
    S.reports = S.reports.filter((x) => !(x.date === r.date && x.time === r.time));
    S.reports.push(r);
    if (S.reports.length > 60) S.reports = S.reports.slice(-60);
    syncCorrections(r);
    const ag = S.agents.find((a) => a.id === 'ag-corr' || a.wf === 'wf-corr');
    if (ag) { ag.lastRun = r.date; ag.lastStatus = r.status; ag.lastNote = r.summary.slice(0, 220); }
    pendingReport = null; save(); closeDrawer(); render(); toast('Informe guardado y workflow actualizado');
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
      nw('projects', 'Nuevo proyecto'), nw('contacts', 'Nuevo contacto'), nw('metrics', 'Registrar métrica'), nw('resources', 'Nuevo recurso'), nw('workflows', 'Nuevo workflow'), nw('agents', 'Nuevo agente'),
      { g: 'Crear', l: 'Pegar informe del agente de correcciones', ic: 'paste', run: openReportDrawer },
      { g: 'Acciones', l: 'Cambiar tema claro u oscuro', ic: 'moon', run: toggleTheme },
      { g: 'Acciones', l: 'Descargar copia de seguridad', ic: 'inbox', run: exportJson },
      { g: 'Acciones', l: 'Crear evento en Google Calendar', ic: 'gcal', run: () => window.open(gcalTemplate({ title: '', date: today() }), '_blank', 'noopener') },
    ];
  }
  function entityHits(q) {
    const defs = [['tasks', 'Tareas', 'title', 'tareas'], ['items', 'Workflows', 'title', 'workflows'], ['projects', 'Proyectos', 'name', 'proyectos'], ['contacts', 'Contactos', 'name', 'contactos'], ['posts', 'Publicaciones', 'title', 'marketing'], ['transactions', 'Movimientos', 'desc', 'contabilidad'], ['resources', 'Recursos', 'name', 'recursos'], ['agents', 'Agentes', 'name', 'agentes']];
    const out = [];
    defs.forEach(([e, g, k, ic]) => byBrand(S[e]).filter((o) => [o[k], o.notes, o.desc, o.email, o.url].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 5)
      .forEach((o) => out.push({ g, l: o[k], ic, k: e === 'tasks' && o.due ? fmtDate(o.due) : e === 'transactions' ? money(o.amount, o.currency) : '', run: () => openForm(e, o.id) })));
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
    if (entity === 'items') o.stage = status; else o.status = status;
    o.updated = today(); save(); render();
  }
  function advance(id) {
    const it = S.items.find((x) => x.id === id);
    if (it) { const w = wfById(it.wf); const i = w.stages.findIndex((s) => s.id === it.stage); if (w.stages[i + 1]) { moveTo('items', id, w.stages[i + 1].id); toast(`Pasó a “${w.stages[i + 1].name}”`); } return; }
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
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

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
      case 'new': openForm(el.dataset.entity, null, Object.assign({}, el.dataset.project ? { project: el.dataset.project } : {}, el.dataset.brand ? { brand: el.dataset.brand } : {}, el.dataset.wf ? { wf: el.dataset.wf } : {})); break;
      case 'edit': e.stopPropagation(); openForm(el.dataset.entity, el.dataset.id); break;
      case 'advance': e.stopPropagation(); advance(el.dataset.id); break;
      case 'del': {
        const ent = el.dataset.entity; const o = S[ent].find((x) => x.id === el.dataset.id);
        if (o && confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) {
          S[ent] = S[ent].filter((x) => x.id !== o.id);
          if (ent === 'projects') ['tasks', 'transactions', 'contacts'].forEach((k) => S[k].forEach((x) => { if (x.project === o.id) x.project = ''; }));
          if (ent === 'workflows') { S.items = S.items.filter((i) => i.wf !== o.id); if (ui.route === 'workflow') location.hash = '#workflows'; }
          save(); closeDrawer(); render(); toast('Eliminado');
        }
        break;
      }
      case 'close': closeDrawer(); break;
      case 'toggle-task': { const t = S.tasks.find((x) => x.id === el.dataset.id); if (t) setTaskStatus(t.id, t.status === 'hecha' ? 'pendiente' : 'hecha'); break; }
      case 'todo': { const r = latestReport(); const t = r && r.todos[Number(el.dataset.i)]; if (t) { t.done = !t.done; save(); render(); } break; }
      case 'copy': { const txt = el.dataset.text; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copiado: ' + txt), () => toast(txt)); break; }
      case 'report': openReportDrawer(); break;
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
  save();
  route();
})();
