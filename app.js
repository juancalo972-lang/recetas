'use strict';
/* ¿Qué cocino hoy? — recetas, menú de la semana y lista de mercado.
   Todo se guarda en el celular (localStorage); no hay servidor ni cuentas. */

const VERSION = '1.0';
const CLAVE = 'que-cocino-hoy-v1';

const MOMENTOS = {
  desayuno: { t: 'Desayuno', e: '🌅' },
  almuerzo: { t: 'Almuerzo', e: '☀️' },
  comida: { t: 'Comida', e: '🌙' },
};
const ORDEN = ['desayuno', 'almuerzo', 'comida'];
const APARATOS = {
  estufa: ['Estufa', '🔥'],
  horno: ['Horno', '♨️'],
  freidora: ['Freidora de aire', '💨'],
  olla: ['Olla de cocción lenta', '🍲'],
  licuadora: ['Licuadora', '🥤'],
};
const PROTEINAS = {
  pollo: 'Pollo', res: 'Res', cerdo: 'Cerdo', pescado: 'Pescado', huevo: 'Huevo',
  granos: 'Granos', lacteo: 'Lácteos', vegetal: 'Verduras',
};
const PASILLOS = [
  ['car', '🥩 Carnes, pollo y pescado'],
  ['ver', '🥬 Frutas y verduras'],
  ['lac', '🥚 Huevos y lácteos'],
  ['pan', '🫓 Arepas, pan y tortillas'],
  ['gra', '🍚 Arroz, granos y harinas'],
  ['otr', '🥫 Enlatados y otros'],
  ['sal', '🧂 Salsas y especias'],
  ['bas', '✔️ Revisa que tengas en la cocina'],
];
const UNIDADES = {
  taza: ['taza', 'tazas'],
  cda: ['cucharada', 'cucharadas'],
  cdta: ['cucharadita', 'cucharaditas'],
};
// Cosas que se compran o se usan enteras (no "¾ de huevo").
const ENTEROS = /^(huevo|tortilla|arepa|tajada|filete|muslo|lata|hoja|pepinillo|chile|diente)/;

// Chips de "¿Qué tengo en casa?": [texto, palabras que busca en los ingredientes]
const CASA = [
  ['Proteínas', [
    ['Pollo', 'pollo'], ['Carne molida', 'carne molida'], ['Carne de res', 'res para bistec|falda'],
    ['Cerdo', 'cerdo'], ['Pescado', 'tilapia|pescado'], ['Atún', 'atun'], ['Huevos', 'huevo'],
    ['Jamón', 'jamon'], ['Frijoles', 'frijol'], ['Lentejas', 'lenteja'], ['Yogur griego', 'yogur'], ['Queso', 'queso'],
  ]],
  ['Verduras y frutas', [
    ['Papa', 'papa pastusa|papa sabanera'], ['Papa criolla', 'papa criolla'], ['Batata', 'batata'], ['Yuca', 'yuca'],
    ['Plátano verde', 'platano verde'], ['Ahuyama', 'ahuyama'], ['Tomate', 'tomate'],
    ['Cebolla cabezona', 'cebolla cabezona'], ['Cebolla larga', 'cebolla larga'], ['Cebolla morada', 'cebolla morada'],
    ['Pimentón', 'pimenton rojo|pimenton verde'], ['Ajo', 'diente de ajo'], ['Aguacate', 'aguacate'], ['Limón', 'limon'],
    ['Lechuga', 'lechuga'], ['Espinaca', 'espinaca'], ['Brócoli', 'brocoli'], ['Zanahoria', 'zanahoria'],
    ['Mazorca o maíz', 'mazorca|maiz tierno'], ['Repollo', 'repollo'], ['Pepino', 'pepino cohombro'], ['Apio', 'apio'],
    ['Manzana', 'manzana'], ['Arveja', 'arveja'], ['Banano', 'banano'], ['Fruta', 'fruta'],
    ['Cilantro', 'cilantro'], ['Perejil', 'perejil fresco'],
  ]],
  ['Despensa', [
    ['Arroz', 'arroz'], ['Tortillas', 'tortilla'], ['Arepas', 'arepa'], ['Pan', 'pan integral|miga de pan'],
    ['Avena', 'avena'], ['Harina', 'harina'], ['Corn Flakes', 'corn flakes'], ['Leche', 'leche'], ['Granola', 'granola'],
  ]],
];

const CONSEJOS = [
  'Un vaso grande de agua antes de cada comida ayuda a llenarse. La gaseosa normal tiene mucha azúcar: si les gusta lo burbujeante, mejor agua con gas o gaseosa cero.',
  'Plato más pequeño: la mitad verduras, un cuarto proteína (del tamaño de la palma de la mano) y un cuarto de arroz, papa o arepa.',
  'Proteína en cada comida (huevo, pollo, carne, pescado o frijoles): llena más y por más tiempo.',
  'Coman despacio: el cuerpo tarda unos 20 minutos en sentirse lleno.',
  'Mejor la fruta entera que en jugo. Un jugo con azúcar es casi como una gaseosa.',
  'La comida de la noche, más liviana: crema de verduras, ensalada con proteína u omelette.',
  'Una caminata de 20 a 30 minutos después del almuerzo ayuda más que una dieta muy estricta.',
  'Si toman medicamentos o tienen diabetes o presión alta, hablen con el médico antes de cambiar mucho la comida.',
];

const DEF = {
  v: 1,
  personas: 2,
  comidas: { desayuno: true, almuerzo: true, comida: true },
  aparatos: { estufa: true, horno: true, freidora: true, olla: true, licuadora: true },
  letra: 'grande',
  dieta: [{ nombre: 'Mamá', on: false }, { nombre: 'Papá', on: false }],
  plan: {},     // 'AAAA-MM-DD': { desayuno: id, almuerzo: id, comida: id }
  hist: {},     // id: { veces, ultima }
  fav: {},      // recetas de siempre
  oculta: {},   // "no me la vuelvas a sugerir"
  casa: [],     // chips marcados en "¿Qué tengo en casa?"
  mercado: { semana: '', marcado: {}, extra: [] },
  nuevo: { fecha: '', id: '' },
};

const R = Object.fromEntries(RECETAS.map(r => [r.id, r]));
let S = cargar();
let tab = 'hoy';
let semanaVista = '';          // lunes de la semana que se ve en Semana y Mercado
let filtro = { q: '', f: 'todas' };
let detalle = null;            // { id, k, paso }
let promptInstalar = null;
let wakeLock = null;

/* ───────────── Guardar y cargar ───────────── */

function cargar() {
  let datos = {};
  try { datos = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { datos = {}; }
  return mezclar(datos);
}
function mezclar(datos) {
  const base = JSON.parse(JSON.stringify(DEF));
  for (const k of Object.keys(base)) {
    if (!(k in datos)) continue;
    const v = datos[k];
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && v && typeof v === 'object' && !Array.isArray(v)) {
      base[k] = Object.assign(base[k], v);
    } else {
      base[k] = v;
    }
  }
  return base;
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) { /* sin espacio o modo privado: la app sigue funcionando */ }
}

/* ───────────── Fechas ───────────── */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dos = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const parse = s => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
const hoy = () => iso(new Date());
const sumar = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const lunesDe = s => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
const diasEntre = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fechaLarga = s => { const d = parse(s); return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const diaCorto = s => { const d = parse(s); return `${cap(DIAS[d.getDay()])} ${d.getDate()}`; };
function rango(desde, hasta) {
  const a = parse(desde), b = parse(hasta);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} al ${b.getDate()} de ${MESES[b.getMonth()]}`;
  return `${a.getDate()} de ${MESES[a.getMonth()]} al ${b.getDate()} de ${MESES[b.getMonth()]}`;
}
function semanaDe(lunes) { return [...Array(7)].map((_, i) => sumar(lunes, i)); }

/* ───────────── Utilidades ───────────── */

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const slots = () => ORDEN.filter(s => S.comidas[s]);
const dietaOn = () => S.dieta.some(p => p.on);
const quienesDieta = () => S.dieta.filter(p => p.on).map(p => p.nombre || 'Alguien');
const y = lista => lista.length > 1 ? lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1] : (lista[0] || '');

function puede(r) {
  return r.a.every(req => req.split('|').some(x => S.aparatos[x]));
}
function aparatosTexto(r) {
  if (!r.a.length) return '🥄 No necesita estufa';
  return r.a.map(req => req.split('|').map(x => APARATOS[x][1] + ' ' + APARATOS[x][0]).join(' o ')).join(' + ');
}
function aparatosCorto(r) {
  if (!r.a.length) return '🥄';
  return r.a.map(req => req.split('|').map(x => APARATOS[x][1]).join('/')).join(' ');
}
function falta(r) {
  return r.a.filter(req => !req.split('|').some(x => S.aparatos[x]))
    .map(req => req.split('|').map(x => APARATOS[x][0].toLowerCase()).join(' u ')).join(' y ');
}
function tiempo(r) { return r.lento ? `${r.t} min + olla lenta` : `${r.t} min`; }

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('ver'), 2600);
}

function sortear(lista, peso) {
  const ws = lista.map(peso);
  let x = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lista.length; i++) { x -= ws[i]; if (x <= 0) return lista[i]; }
  return lista[lista.length - 1];
}

/* ───────────── Cantidades ───────────── */

function num(x) {
  if (x >= 10) return String(Math.round(x));
  const pasos = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
  let ent = Math.floor(x);
  const r = x - ent;
  let mejor = pasos[0];
  for (const p of pasos) if (Math.abs(r - p[0]) < Math.abs(r - mejor[0])) mejor = p;
  if (mejor[0] === 1) { ent++; mejor = pasos[0]; }
  if (!ent && !mejor[1]) return '¼';
  return (ent ? String(ent) : '') + mejor[1];
}
function gramos(x) {
  if (x >= 1000) return (x / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' kg';
  return x + ' g';
}
function nombres(nombre) { const [s, p] = nombre.split('|'); return [s, p || s]; }

function lineaIng(q, u, nombre, k) {
  const [sing, plur] = nombres(nombre);
  if (q == null || u === 'gusto') return cap(sing) + (sing.includes('(') ? ', al gusto' : ' (al gusto)');
  let x = q * k;
  if (u === 'g') {
    x = x >= 200 ? Math.round(x / 50) * 50 : Math.max(10, Math.round(x / 10) * 10);
    return `${gramos(x)} de ${sing}`;
  }
  if (u === 'u') {
    if (ENTEROS.test(sing)) x = Math.max(1, Math.round(x));
    const n = x >= 2 ? String(Math.round(x)) : num(x);
    return `${n} ${x > 1.01 ? plur : sing}`;
  }
  const [us, up] = UNIDADES[u];
  return `${num(x)} ${x > 1.01 ? up : us} de ${sing}`;
}

/* ───────────── El menú (planeador) ───────────── */

function candidatos(slot) {
  return RECETAS.filter(r => r.m.includes(slot) && puede(r) && !S.oculta[r.id]);
}

function vecinos(fecha, slot) {
  const seq = [];
  for (const d of [-1, 0, 1]) {
    const f = sumar(fecha, d);
    for (const s of ['almuerzo', 'comida']) if (S.comidas[s]) seq.push([f, s]);
  }
  const i = seq.findIndex(([f, s]) => f === fecha && s === slot);
  return [seq[i - 1], seq[i + 1]].filter(Boolean)
    .map(([f, s]) => R[(S.plan[f] || {})[s]]).filter(Boolean);
}

function huboFrijoles(fecha) {
  for (const d of [-1, -2]) {
    const dia = S.plan[sumar(fecha, d)] || {};
    if (Object.values(dia).includes('frijoles-olla-lenta')) return true;
  }
  return false;
}

function elegir(fecha, slot, excluir = []) {
  // El calentado solo tiene sentido si hubo frijoles el día anterior o antier.
  const pool = candidatos(slot).filter(r => !excluir.includes(r.id) && (r.id !== 'calentado-paisa' || huboFrijoles(fecha)));
  if (!pool.length) return null;

  const usadas = {}, prot = {};
  for (const f of semanaDe(lunesDe(fecha))) {
    const dia = S.plan[f];
    if (!dia) continue;
    for (const s of Object.keys(dia)) {
      if ((f === fecha && s === slot) || !S.comidas[s]) continue;
      const r = R[dia[s]];
      if (!r) continue;
      usadas[r.id] = (usadas[r.id] || 0) + 1;
      if (s !== 'desayuno') prot[r.p] = (prot[r.p] || 0) + 1;
    }
  }
  const principales = 7 * ['almuerzo', 'comida'].filter(s => S.comidas[s]).length;
  const maxProt = Math.max(2, Math.ceil(principales * 0.4));
  const cerca = slot === 'desayuno' ? [] : vecinos(fecha, slot);

  // Reglas, de la más importante a la menos. Si ninguna receta cumple todas, se van soltando desde el final.
  const reglas = [
    r => !usadas[r.id],
    r => !cerca.some(v => v.p === r.p),
    r => slot === 'desayuno' || (prot[r.p] || 0) < maxProt,
    r => !(slot === 'comida' && dietaOn() && r.kcal > 480),
  ];
  let opciones = pool;
  for (let n = reglas.length; n >= 0; n--) {
    const ok = pool.filter(r => reglas.slice(0, n).every(fn => fn(r)));
    if (ok.length) { opciones = ok; break; }
  }
  return sortear(opciones, r => {
    let w = 1;
    if (S.fav[r.id]) w *= 3;
    const h = S.hist[r.id];
    if (h && h.ultima && Math.abs(diasEntre(h.ultima, fecha)) < 10) w *= 0.5;
    if (r.id === 'calentado-paisa') w *= 6;
    return w;
  });
}

function asegurarDia(fecha) {
  const dia = S.plan[fecha] || (S.plan[fecha] = {});
  let cambio = false;
  for (const s of slots()) {
    if (!dia[s] || !R[dia[s]]) {
      const r = elegir(fecha, s);
      if (r) { dia[s] = r.id; cambio = true; }
    }
  }
  return cambio;
}

function asegurarSemana(lunes) {
  let cambio = false;
  for (const f of semanaDe(lunes)) if (f >= hoy()) cambio = asegurarDia(f) || cambio;
  if (cambio) guardar();
}

function hacerMenu(lunes) {
  const dias = semanaDe(lunes).filter(f => f >= hoy());
  for (const f of dias) delete S.plan[f];
  for (const f of dias) asegurarDia(f);
  guardar();
}

function semanaTienePlan(lunes) {
  return semanaDe(lunes).some(f => f >= hoy() && S.plan[f] && slots().some(s => S.plan[f][s]));
}

function podarPlan() {
  const limite = sumar(hoy(), -45);
  for (const f of Object.keys(S.plan)) if (f < limite) delete S.plan[f];
}

function ideaNueva(excluir = []) {
  const base = RECETAS.filter(r => (r.m.includes('almuerzo') || r.m.includes('comida')) && puede(r) && !S.oculta[r.id] && !excluir.includes(r.id));
  const nuevas = base.filter(r => !(S.hist[r.id] && S.hist[r.id].veces));
  const lista = nuevas.length ? nuevas : base.filter(r => !S.fav[r.id]);
  if (!lista.length) return null;
  return lista[Math.floor(Math.random() * lista.length)];
}

/* ───────────── Lista de mercado ───────────── */

function listaMercado(desde, hasta) {
  const items = {};
  const k = S.personas / 4;
  for (let f = desde; f <= hasta; f = sumar(f, 1)) {
    const dia = S.plan[f];
    if (!dia) continue;
    for (const s of slots()) {
      const r = R[dia[s]];
      if (!r) continue;
      for (const it of r.ing) {
        if (it.length === 1) continue;
        const [q, u, nombre, pasillo] = it;
        const [sing, plur] = nombres(nombre);
        const p = pasillo === 'sob' ? 'bas' : pasillo;
        const sinCant = p === 'sal' || p === 'bas' || q == null || u === 'gusto';
        const clave = `${p}|${norm(sing)}|${sinCant ? '' : u}`;
        const item = items[clave] || (items[clave] = { clave, sing, plur, u, p, q: 0, sinCant });
        if (!sinCant) item.q += q * k;
      }
    }
  }
  const grupos = {};
  for (const it of Object.values(items)) {
    it.texto = textoMercado(it);
    (grupos[it.p] || (grupos[it.p] = [])).push(it);
  }
  for (const g of Object.values(grupos)) g.sort((a, b) => a.sing.localeCompare(b.sing, 'es'));
  return grupos;
}

function textoMercado(it) {
  if (it.sinCant) return cap(it.sing);
  let x = it.q;
  if (it.u === 'g') {
    x = Math.ceil(x / 50) * 50;
    const libras = Math.round(x / 250) / 2;
    const lb = (it.p === 'car' || it.p === 'ver') && x >= 250 ? ` (≈ ${num(libras)} ${libras > 1 ? 'libras' : 'libra'})` : '';
    return `${gramos(x)} de ${it.sing}${lb}`;
  }
  if (it.u === 'u') {
    x = Math.max(1, Math.ceil(x - 0.01));
    return `${x} ${x > 1 ? it.plur : it.sing}`;
  }
  x = Math.ceil(x * 2) / 2;
  const [us, up] = UNIDADES[it.u];
  return `${num(x)} ${x > 1 ? up : us} de ${it.sing}`;
}

function rangoMercado() {
  const lunes = semanaVista || lunesDe(hoy());
  const desde = lunes > hoy() ? lunes : hoy();
  return [desde, sumar(lunes, 6)];
}

/* ───────────── Pantallas ───────────── */

function render() {
  document.documentElement.dataset.letra = S.letra;
  $('#hoyFecha').textContent = fechaLarga(hoy());
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === tab);
  const vistas = { hoy: vistaHoy, semana: vistaSemana, mercado: vistaMercado, recetas: vistaRecetas, ajustes: vistaAjustes };
  $('#vista').innerHTML = vistas[tab]();
}

function ir(t) {
  tab = t;
  if (t === 'semana' || t === 'mercado') {
    if (!semanaVista || semanaVista < lunesDe(hoy())) semanaVista = lunesDe(hoy());
  }
  render();
  window.scrollTo(0, 0);
}

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function tarjetaComida(fecha, slot) {
  const r = R[(S.plan[fecha] || {})[slot]];
  const m = MOMENTOS[slot];
  if (!r) {
    return `<article class="card"><div class="mom">${m.e} ${m.t}</div>
      <p>No hay recetas para esta comida con los aparatos que marcaste.</p></article>`;
  }
  const hecha = S.hist[r.id] && S.hist[r.id].ultima === fecha;
  return `<article class="card">
    <div class="mom">${m.e} ${m.t}</div>
    <button class="cc-main" data-act="ver" data-id="${r.id}">
      <span class="cc-emoji">${r.e}</span>
      <span><span class="cc-nombre">${esc(r.n)}</span><span class="meta">⏱ ${tiempo(r)} · ${aparatosCorto(r)}</span></span>
    </button>
    <div class="fila2">
      <button class="btn pri" data-act="ver" data-id="${r.id}">Ver receta</button>
      <button class="btn" data-act="otra" data-fecha="${fecha}" data-slot="${slot}">🔄 Dame otra</button>
    </div>
    ${hecha ? '<p class="hecha-hoy">✅ Ya la cocinaste hoy</p>'
      : `<button class="btn claro" data-act="hecha" data-id="${r.id}">✅ Ya la cociné</button>`}
  </article>`;
}

function vistaHoy() {
  const f = hoy();
  if (!slots().length) {
    return `<p class="saludo">${saludo()} 👋</p>
      <div class="card aviso"><p>No hay comidas activadas. Ve a <b>Ajustes</b> y activa desayuno, almuerzo o comida.</p></div>`;
  }
  if (asegurarDia(f)) guardar();
  let html = `<p class="saludo">${saludo()} 👋</p>`;

  if (promptInstalar && !standalone()) {
    html += `<div class="card aviso"><p><b>📲 Pon la app en la pantalla de tu celular</b><br>Así la abres con un solo toque, como WhatsApp.</p>
      <button class="btn pri" data-act="instalar">Instalar</button></div>`;
  }

  html += slots().map(s => tarjetaComida(f, s)).join('');
  html += `<button class="btn wa grande" data-act="waHoy">📤 Enviar el menú de hoy por WhatsApp</button>`;

  // Algo nuevo hoy
  if (S.nuevo.fecha !== f || !R[S.nuevo.id] || (S.hist[S.nuevo.id] && S.hist[S.nuevo.id].veces && S.hist[S.nuevo.id].ultima !== f)) {
    const r = ideaNueva();
    S.nuevo = { fecha: f, id: r ? r.id : '' };
    guardar();
  }
  const n = R[S.nuevo.id];
  if (n) {
    html += `<section class="card nuevo" style="margin-top:1rem">
      <h3 style="margin:0">✨ ¿Algo nuevo hoy?</h3>
      <button class="cc-main" data-act="ver" data-id="${n.id}">
        <span class="cc-emoji">${n.e}</span>
        <span><span class="cc-nombre">${esc(n.n)}</span><span class="meta">⏱ ${tiempo(n)} · ${aparatosCorto(n)}</span></span>
      </button>
      <div class="fila2">
        <button class="btn pri" data-act="ver" data-id="${n.id}">Ver receta</button>
        <button class="btn" data-act="nuevoOtra">Otra idea</button>
      </div>
      <button class="btn suave" style="margin-top:.6rem" data-act="planear" data-id="${n.id}">📅 Cocinarla hoy o mañana</button>
    </section>`;
  }

  html += `<button class="btn grande suave" data-act="casa" style="margin-bottom:1rem">🥕 ¿Qué tengo en casa?</button>`;

  // Fin de semana: recordar el menú de la próxima semana
  const dow = parse(f).getDay();
  const proxLunes = sumar(lunesDe(f), 7);
  if ((dow === 6 || dow === 0) && !semanaTienePlan(proxLunes)) {
    html += `<div class="card aviso"><p><b>🗓️ ¿Hacemos el menú de la próxima semana?</b><br>Así ya sabes qué comprar en el mercado.</p>
      <button class="btn pri" data-act="menuProxima">Hacer el menú de la próxima semana</button></div>`;
  }

  if (dietaOn()) {
    const i = Math.floor(parse(f).getTime() / 86400000) % CONSEJOS.length;
    html += `<div class="card consejo"><p><b>🥗 Consejo del día</b></p><p>${CONSEJOS[i]}</p></div>`;
  }
  return html;
}

function vistaSemana() {
  const lunes = semanaVista;
  const actual = lunes === lunesDe(hoy());
  if (actual) asegurarSemana(lunes);
  const titulo = actual ? 'Esta semana' : lunes === sumar(lunesDe(hoy()), 7) ? 'Próxima semana' : 'Semana';
  let html = `<div class="semana-nav">
    <button class="btn" data-act="semana" data-d="-7" ${actual ? 'disabled' : ''} aria-label="Semana anterior">◀</button>
    <div><b>${titulo}</b><span class="meta">${rango(lunes, sumar(lunes, 6))}</span></div>
    <button class="btn" data-act="semana" data-d="7" aria-label="Semana siguiente">▶</button>
  </div>`;

  if (!semanaTienePlan(lunes)) {
    return html + `<div class="card"><p>Todavía no hay menú para esta semana.</p>
      <button class="btn pri grande" data-act="hacerMenu">✨ Hacer el menú</button></div>`;
  }

  for (const f of semanaDe(lunes)) {
    const pasado = f < hoy();
    const dia = S.plan[f] || {};
    if (pasado && !slots().some(s => R[dia[s]])) continue;
    html += `<section class="dia ${f === hoy() ? 'hoy' : ''} ${pasado ? 'pasado' : ''}">
      <h3>${diaCorto(f)}${f === hoy() ? '<span class="tag">HOY</span>' : ''}</h3>`;
    for (const s of slots()) {
      const r = R[dia[s]];
      const m = MOMENTOS[s];
      html += `<div class="fila-plan">
        ${r ? `<button class="ver" data-act="ver" data-id="${r.id}"><span class="m">${r.e}</span><span><em>${m.t}</em><b>${esc(r.n)}</b></span></button>`
          : `<span class="ver"><span class="m">${m.e}</span><span><em>${m.t}</em>—</span></span>`}
        ${pasado ? '' : `<button class="mini" data-act="otra" data-fecha="${f}" data-slot="${s}" aria-label="Cambiar">🔄</button>`}
      </div>`;
    }
    html += `</section>`;
  }
  html += `<div class="pila" style="margin-top:1rem">
    <button class="btn pri grande" data-act="tab" data-tab="mercado">🛒 Lista de mercado</button>
    <button class="btn wa" data-act="waSemana">📤 Enviar el menú por WhatsApp</button>
    <button class="btn" data-act="imprimir">🖨️ Imprimir para la nevera</button>
    <button class="btn" data-act="prep">🍱 Domingo de preparación</button>
    <button class="btn claro" data-act="hacerMenu">✨ Hacer un menú nuevo</button>
  </div>`;
  return html;
}

function vistaMercado() {
  const lunes = semanaVista;
  const actual = lunes === lunesDe(hoy());
  if (actual) asegurarSemana(lunes);
  const [desde, hasta] = rangoMercado();
  if (S.mercado.semana !== lunes) S.mercado = { semana: lunes, marcado: {}, extra: S.mercado.extra || [] };

  let html = `<div class="semana-nav">
    <button class="btn" data-act="semana" data-d="-7" ${actual ? 'disabled' : ''} aria-label="Semana anterior">◀</button>
    <div><b>🛒 Mercado</b><span class="meta">Para el menú del ${rango(desde, hasta)}</span></div>
    <button class="btn" data-act="semana" data-d="7" aria-label="Semana siguiente">▶</button>
  </div>`;

  if (!semanaTienePlan(lunes)) {
    return html + `<div class="card"><p>Primero hay que hacer el menú de esa semana.</p>
      <button class="btn pri grande" data-act="hacerMenu">✨ Hacer el menú</button></div>`;
  }

  const grupos = listaMercado(desde, hasta);
  html += `<p class="ayuda">Marca lo que ya tienes o ya compraste. Lo que quede sin marcar es lo que se envía por WhatsApp.</p>`;
  for (const [p, titulo] of PASILLOS) {
    const g = grupos[p];
    if (!g || !g.length) continue;
    html += `<div class="grupo"><h3>${titulo}</h3>`;
    for (const it of g) {
      const ok = !!S.mercado.marcado[it.clave];
      const [principal, lb] = it.texto.split(' (≈');
      html += `<label class="item ${ok ? 'hecho' : ''}">
        <input type="checkbox" data-cambio="marcar" data-k="${esc(it.clave)}" ${ok ? 'checked' : ''}>
        <span>${esc(principal)}${lb ? `<small>≈${esc(lb.slice(0, -1))}</small>` : ''}</span></label>`;
    }
    html += `</div>`;
  }
  html += `<div class="grupo"><h3>📝 Otras cosas</h3>`;
  S.mercado.extra.forEach((e, i) => {
    html += `<label class="item ${e.ok ? 'hecho' : ''}">
      <input type="checkbox" data-cambio="extra" data-i="${i}" ${e.ok ? 'checked' : ''}>
      <span>${esc(e.t)}</span>
      <button class="quitar" data-act="quitarExtra" data-i="${i}" aria-label="Quitar">✕</button></label>`;
  });
  html += `<div class="agregar"><input class="campo" id="nuevoExtra" placeholder="Ej: papel higiénico, café…" enterkeyhint="done">
    <button class="btn suave" data-act="agregarExtra">Agregar</button></div></div>`;
  html += `<div class="pila" style="margin-top:1.2rem">
    <button class="btn wa grande" data-act="waMercado">📤 Enviar la lista por WhatsApp</button>
    <button class="btn" data-act="imprimir">🖨️ Imprimir menú y lista</button>
    <button class="btn claro" data-act="desmarcar">Desmarcar todo</button>
  </div>`;
  return html;
}

const FILTROS = [
  ['todas', 'Todas'], ['fav', '⭐ De siempre'], ['nuevas', '✨ Sin probar'],
  ['desayuno', '🌅 Desayunos'], ['almuerzo', '🍽️ Almuerzos y comidas'],
  ['pollo', '🐔 Pollo'], ['res', '🐄 Res'], ['cerdo', '🐖 Cerdo'], ['pescado', '🐟 Pescado'],
  ['granos', '🫘 Granos'], ['huevo', '🥚 Huevo'], ['olla', '🍲 Olla lenta'], ['freidora', '💨 Freidora'],
];

function vistaRecetas() {
  return `<button class="btn grande suave" data-act="casa">🥕 ¿Qué tengo en casa?</button>
    <input class="campo" type="search" id="buscar" data-in="buscar" placeholder="🔎 Buscar receta…" value="${esc(filtro.q)}" style="margin-top:.8rem">
    <div class="chips">${FILTROS.map(([k, t]) => `<button class="chip ${filtro.f === k ? 'on' : ''}" data-act="filtro" data-f="${k}">${t}</button>`).join('')}</div>
    <div id="listaRecetas">${listaRecetas()}</div>`;
}

function listaRecetas() {
  const q = norm(filtro.q.trim());
  const f = filtro.f;
  const lista = RECETAS.filter(r => {
    if (S.oculta[r.id]) return false;
    if (q && !norm(r.n + ' ' + r.ing.map(i => i[2] || '').join(' ')).includes(q)) return false;
    if (f === 'fav') return !!S.fav[r.id];
    if (f === 'nuevas') return !(S.hist[r.id] && S.hist[r.id].veces);
    if (f === 'desayuno') return r.m.includes('desayuno');
    if (f === 'almuerzo') return r.m.includes('almuerzo') || r.m.includes('comida') || r.m.includes('acompañante');
    if (PROTEINAS[f]) return r.p === f;
    if (APARATOS[f]) return r.a.some(req => req.split('|').includes(f));
    return true;
  });
  if (!lista.length) {
    return `<p class="ayuda">${f === 'fav' ? 'Todavía no hay recetas de siempre. Cuando cocines una y te guste, toca ⭐ en la receta.' : 'No encontré recetas con eso.'}</p>`;
  }
  return `<p class="ayuda">${lista.length} receta${lista.length > 1 ? 's' : ''}</p>` + lista.map(r => filaReceta(r)).join('');
}

function filaReceta(r, extra = '') {
  const ok = puede(r);
  const badge = S.fav[r.id] ? '⭐' : !(S.hist[r.id] && S.hist[r.id].veces) ? '✨' : '';
  return `<button class="fila-receta ${ok ? '' : 'no-puede'}" data-act="ver" data-id="${r.id}">
    <span class="e">${r.e}</span>
    <span><b>${esc(r.n)}</b><small>⏱ ${tiempo(r)} · ${aparatosCorto(r)} · ${PROTEINAS[r.p]}</small>
    ${ok ? '' : `<span class="falta">Necesita ${falta(r)}</span>`}${extra}</span>
    <span class="badge">${badge}</span></button>`;
}

function vistaAjustes() {
  const toggle = (txt, cambio, k, on) => `<label class="toggle"><span>${txt}</span>
    <input type="checkbox" data-cambio="${cambio}" data-k="${k}" ${on ? 'checked' : ''}></label>`;
  let html = `<section class="card"><h3>👥 ¿Para cuántas personas cocinas?</h3>
    <div class="contador"><button class="btn" data-act="personas" data-d="-1" aria-label="Menos">−</button>
    <b>${S.personas}</b><button class="btn" data-act="personas" data-d="1" aria-label="Más">+</button></div>
    <p class="ayuda">Las cantidades de las recetas y del mercado se ajustan solas.</p></section>`;

  html += `<section class="card"><h3>🍽️ ¿Qué comidas quieres en el menú?</h3>
    ${ORDEN.map(s => toggle(`${MOMENTOS[s].e} ${MOMENTOS[s].t}`, 'comida', s, S.comidas[s])).join('')}</section>`;

  html += `<section class="card"><h3>🔌 ¿Qué aparatos tienes?</h3>
    ${Object.entries(APARATOS).map(([k, [t, e]]) => toggle(`${e} ${t}`, 'aparato', k, S.aparatos[k])).join('')}
    <p class="ayuda">Solo te sugiero recetas que puedas hacer con lo que tienes.</p></section>`;

  html += `<section class="card"><h3>🔠 Tamaño de la letra</h3><div class="segmentos">
    ${[['normal', 'Normal'], ['grande', 'Grande'], ['muy', 'Muy grande']].map(([k, t]) =>
      `<button class="btn ${S.letra === k ? 'on' : ''}" data-act="letra" data-k="${k}">${t}</button>`).join('')}
    </div></section>`;

  html += `<section class="card"><h3>🥗 Bajar de peso (opcional)</h3>
    <p class="ayuda">Si alguien lo activa, las recetas muestran cómo servir su plato más liviano y las comidas de la noche salen más livianas.</p>
    ${S.dieta.map((p, i) => `<div class="persona-dieta">
      <input class="campo" data-in="nombreDieta" data-i="${i}" value="${esc(p.nombre)}" aria-label="Nombre">
      <label class="toggle"><input type="checkbox" data-cambio="dieta" data-i="${i}" ${p.on ? 'checked' : ''} aria-label="Activar para ${esc(p.nombre)}"></label>
    </div>`).join('')}
    ${dietaOn() ? `<h3>Consejos</h3><ul class="lista-consejos">${CONSEJOS.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
  </section>`;

  const ocultas = RECETAS.filter(r => S.oculta[r.id]);
  if (ocultas.length) {
    html += `<section class="card"><h3>🙈 Recetas que no te gustaron</h3><p class="ayuda">No salen en el menú. Tócalas para volver a mostrarlas.</p>
      ${ocultas.map(r => `<button class="btn" style="margin-top:.5rem" data-act="mostrar" data-id="${r.id}">${r.e} ${esc(r.n)}</button>`).join('')}</section>`;
  }

  html += `<section class="card"><h3>💾 Copia de seguridad</h3>
    <p class="ayuda">Todo se guarda en este celular. Si cambias de celular, guarda una copia y recupérala en el nuevo.</p>
    <div class="fila2"><button class="btn" data-act="exportar">Guardar copia</button>
    <button class="btn" data-act="importar">Recuperar copia</button></div></section>`;

  html += `<section class="card"><h3>📲 La app</h3><div class="pila">
    ${promptInstalar && !standalone() ? '<button class="btn pri" data-act="instalar">Instalar en la pantalla del celular</button>' : ''}
    ${!standalone() && !promptInstalar ? '<p class="ayuda">Para tenerla en la pantalla: abre el menú del navegador (⋮ arriba a la derecha) y toca <b>Agregar a la pantalla principal</b> o <b>Instalar app</b>.</p>' : ''}
    <button class="btn wa" data-act="compartirApp">Mandar la app a alguien por WhatsApp</button></div></section>`;

  html += `<p class="pie">¿Qué cocino hoy? · versión ${VERSION}<br>Hecha con cariño por Juan 💛</p>`;
  return html;
}

/* ───────────── Receta (pantalla completa) ───────────── */

function abrirReceta(id) {
  const r = R[id];
  if (!r) return;
  detalle = { id, k: S.personas, paso: -1 };
  const el = abrirHoja(htmlReceta(r), { alCerrar: () => { pararVoz(); soltarPantalla(); detalle = null; } });
  el.dataset.receta = id;
  pedirPantalla();
}

function htmlReceta(r) {
  const nueva = !(S.hist[r.id] && S.hist[r.id].veces);
  let video;
  if (r.v) {
    video = `<a class="video" href="https://www.youtube.com/watch?v=${r.v}" target="_blank" rel="noopener">
      <img src="https://i.ytimg.com/vi/${r.v}/hqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">
      <span>▶️ Ver el video<small>Está en inglés: mira las manos, la receta en español está aquí abajo.</small></span></a>`;
  } else {
    const q = r.vq || `receta ${r.n} colombiana`;
    video = `<a class="btn suave" style="margin:1rem 0" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener">▶️ Buscar videos de esta receta</a>`;
  }
  const dieta = dietaOn() ? `<div class="caja dieta"><h3>🥗 Para bajar de peso (${esc(y(quienesDieta()))})</h3>
      <p>${r.liv}</p>
      <p class="ayuda">Plato: la mitad verduras, un cuarto proteína y un cuarto de arroz, papa o arepa.</p></div>` : '';
  const voz = 'speechSynthesis' in window;

  return `<div class="hoja-top">
      <button class="btn volver" data-act="cerrar">← Volver</button>
      <button class="btn ${S.fav[r.id] ? 'suave' : ''}" data-act="favorito" data-id="${r.id}" id="btnFav">${S.fav[r.id] ? '⭐ De siempre' : '☆ Me gusta'}</button>
    </div>
    <div class="hoja-in">
      <div class="det-cab">
        <div class="det-emoji">${r.e}</div>
        <h2>${esc(r.n)}</h2>
        <div class="etiquetas">
          <span class="etq">⏱ ${r.t} min</span><span class="etq">${r.d}</span><span class="etq">${PROTEINAS[r.p]}</span>
          ${S.fav[r.id] ? '<span class="etq fav">⭐ De siempre</span>' : ''}${nueva ? '<span class="etq nueva">✨ Sin probar</span>' : ''}
        </div>
        <p class="meta">${aparatosTexto(r)}</p>
        <p class="meta">Aprox. ${r.kcal} calorías y ${r.prot} g de proteína por porción</p>
      </div>
      ${r.lento ? `<div class="caja lento"><b>🍲 Olla lenta:</b> ${r.lento}. Empiézala con tiempo.</div>` : ''}
      ${puede(r) ? '' : `<div class="caja lento">Esta receta necesita ${falta(r)}.</div>`}
      ${video}
      <h3>🛒 Ingredientes</h3>
      <div class="porciones">
        <button class="btn" data-act="porciones" data-d="-1" aria-label="Menos personas">−</button>
        <b id="porcTxt">${textoPorciones()}</b>
        <button class="btn" data-act="porciones" data-d="1" aria-label="Más personas">+</button>
      </div>
      <ul class="ings" id="ings">${htmlIngredientes(r)}</ul>
      ${voz ? `<button class="btn suave" style="margin-top:.8rem" data-act="vozIng">🔊 Escuchar los ingredientes</button>` : ''}
      <h3>👩‍🍳 Preparación</h3>
      ${voz ? '<p class="ayuda">Toca un paso para escucharlo.</p>' : ''}
      <ol class="pasos" id="pasos">${r.pasos.map((p, i) => `<li data-act="vozPaso" data-i="${i}">${esc(p)}</li>`).join('')}</ol>
      ${voz ? `<div class="voz">
        <button class="btn" data-act="vozMover" data-d="-1">⏮ Atrás</button>
        <button class="btn pri" data-act="vozMover" data-d="0" id="btnLeer">🔊 Leer paso 1</button>
        <button class="btn" data-act="vozMover" data-d="1">Siguiente ⏭</button>
      </div>` : ''}
      ${dieta}
      ${r.adel ? `<div class="caja"><h3>📦 Para adelantar</h3><p>${r.adel}</p></div>` : ''}
      ${r.con ? `<div class="caja"><h3>🍽️ Acompáñala con</h3><p>${r.con}</p></div>` : ''}
      <div class="pila" style="margin-top:1.2rem">
        <button class="btn ok grande" data-act="hecha" data-id="${r.id}">✅ Ya la cociné</button>
        <button class="btn" data-act="planear" data-id="${r.id}">📅 Ponerla en el menú</button>
        <button class="btn wa" data-act="waReceta" data-id="${r.id}">📤 Enviar la receta por WhatsApp</button>
      </div>
    </div>`;
}

function textoPorciones() {
  return `Para ${detalle.k} persona${detalle.k > 1 ? 's' : ''}`;
}

function htmlIngredientes(r) {
  const k = detalle.k / 4;
  return r.ing.map(it => it.length === 1
    ? `<li class="sub">${esc(it[0])}</li>`
    : `<li><label><input type="checkbox"><span>${esc(lineaIng(it[0], it[1], it[2], k))}</span></label></li>`).join('');
}

function pedirPantalla() {
  if (!('wakeLock' in navigator)) return;
  navigator.wakeLock.request('screen').then(l => { wakeLock = l; }).catch(() => {});
}
function soltarPantalla() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

/* ───────────── Voz ───────────── */

function vozEs() {
  const vs = speechSynthesis.getVoices();
  for (const p of ['es-co', 'es-us', 'es-mx', 'es-419', 'es-es']) {
    const v = vs.find(v => v.lang.replace('_', '-').toLowerCase() === p);
    if (v) return v;
  }
  return vs.find(v => v.lang.toLowerCase().startsWith('es')) || null;
}
function paraVoz(t) {
  return t
    .replace(/(\d+(?:,\d)?) kg/g, '$1 kilos').replace(/(\d+) g /g, '$1 gramos ').replace(/°C/g, ' grados')
    .replace(/(\d)½/g, '$1 y media').replace(/½/g, 'media')
    .replace(/(\d)¼/g, '$1 y un cuarto').replace(/¼/g, 'un cuarto de')
    .replace(/(\d)¾/g, '$1 y tres cuartos').replace(/¾/g, 'tres cuartos de')
    .replace(/⅓/g, 'un tercio de').replace(/⅔/g, 'dos tercios de');
}
function hablar(texto) {
  if (!('speechSynthesis' in window)) { toast('Este celular no puede leer en voz alta'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(paraVoz(texto));
  const v = vozEs();
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'es-CO'; }
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
function pararVoz() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

function leerPaso(i) {
  const r = R[detalle.id];
  if (i < 0 || i >= r.pasos.length) return;
  detalle.paso = i;
  const hoja = document.querySelector(`.hoja[data-receta="${detalle.id}"]`);
  if (hoja) {
    hoja.querySelectorAll('#pasos li').forEach((li, j) => li.classList.toggle('actual', j === i));
    const li = hoja.querySelectorAll('#pasos li')[i];
    if (li) li.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const b = hoja.querySelector('#btnLeer');
    if (b) b.textContent = `🔊 Repetir paso ${i + 1}`;
  }
  hablar(`Paso ${i + 1}. ${r.pasos[i]}`);
}

/* ───────────── Hojas (pantallas encima) y ventanas ───────────── */

const pila = [];
let modalAbierto = false;
let despuesModal = null;

function abrirHoja(html, opciones = {}) {
  const el = document.createElement('section');
  el.className = 'hoja';
  el.innerHTML = html;
  $('#hojas').append(el);
  pila.push({ el, alCerrar: opciones.alCerrar });
  document.body.classList.add('con-hoja');
  history.pushState({ capa: pila.length }, '');
  return el;
}
function cerrarHoja() {
  const h = pila.pop();
  if (!h) return;
  if (h.alCerrar) h.alCerrar();
  h.el.remove();
  if (!pila.length) document.body.classList.remove('con-hoja');
}

function preguntar(titulo, texto, botones) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-caja" role="dialog" aria-modal="true">
    <h2>${titulo}</h2>${texto ? `<p>${texto}</p>` : ''}
    <div class="pila">${botones.map((b, i) => `<button class="btn ${b.clase || ''}" data-modal="${i}">${b.t}</button>`).join('')}</div></div>`;
  m.hidden = false;
  modalAbierto = true;
  m.onclick = e => {
    const b = e.target.closest('[data-modal]');
    if (!b && e.target !== m) return;
    despuesModal = b ? botones[+b.dataset.modal].fn : null;
    history.back();
  };
  history.pushState({ modal: true }, '');
}
function cerrarModal() {
  const m = $('#modal');
  m.hidden = true;
  m.innerHTML = '';
  modalAbierto = false;
  const fn = despuesModal;
  despuesModal = null;
  if (fn) fn();
}

window.addEventListener('popstate', () => {
  if (modalAbierto) cerrarModal();
  else cerrarHoja();
});

/* ───────────── ¿Qué tengo en casa? ───────────── */

function abrirCasa() {
  abrirHoja(`<div class="hoja-top"><button class="btn volver" data-act="cerrar">← Volver</button>
      <button class="btn" data-act="casaLimpiar">Borrar</button></div>
    <div class="hoja-in"><h2>🥕 ¿Qué tengo en casa?</h2>
      <p class="ayuda">Toca lo que tienes en la nevera y la despensa. Abajo salen las recetas que puedes hacer.</p>
      <div id="casaChips">${htmlCasaChips()}</div>
      <h3>🍳 Puedes cocinar</h3>
      <div id="casaRes">${htmlCasaRes()}</div>
    </div>`);
}
function htmlCasaChips() {
  return CASA.map(([grupo, chips]) => `<h3>${grupo}</h3><div class="chips">${chips.map(([t]) =>
    `<button class="chip ${S.casa.includes(t) ? 'on' : ''}" data-act="chipCasa" data-k="${esc(t)}">${t}</button>`).join('')}</div>`).join('');
}
function principales(r) {
  const claves = CASA.flatMap(([, c]) => c);
  const out = [];
  for (const it of r.ing) {
    if (it.length === 1 || it[3] === 'bas' || it[3] === 'sal') continue;
    const n = norm(nombres(it[2])[0]);
    if (n.includes('opcional')) continue;
    const chips = claves.filter(([, kw]) => kw.split('|').some(w => n.includes(w))).map(([t]) => t);
    if (chips.length) out.push({ nombre: nombres(it[2])[0].replace(/\s*\(.*\)/, ''), chips });
  }
  return out;
}
function htmlCasaRes() {
  if (!S.casa.length) return '<p class="ayuda">Todavía no has marcado nada.</p>';
  const res = [];
  for (const r of RECETAS) {
    if (S.oculta[r.id] || !puede(r) || r.m.includes('acompañante')) continue;
    const ps = principales(r);
    const tiene = ps.filter(p => p.chips.some(c => S.casa.includes(c)));
    if (!tiene.length) continue;
    const faltan = ps.filter(p => !p.chips.some(c => S.casa.includes(c))).map(p => p.nombre);
    res.push({ r, tiene: tiene.length, faltan: [...new Set(faltan)] });
  }
  res.sort((a, b) => a.faltan.length - b.faltan.length || b.tiene - a.tiene);
  if (!res.length) return '<p class="ayuda">No encontré recetas con eso. Marca más cosas.</p>';
  return res.slice(0, 15).map(({ r, faltan }) => filaReceta(r, faltan.length
    ? `<span class="falta">Te falta: ${esc(faltan.join(', '))}</span>`
    : '<span class="tiene">✅ Tienes todo lo principal</span>')).join('');
}

/* ───────────── Domingo de preparación ───────────── */

function abrirPrep() {
  const [desde, hasta] = rangoMercado();
  const grupos = listaMercado(desde, hasta);
  const vistos = new Set();
  const adelantar = [];
  for (let f = desde; f <= hasta; f = sumar(f, 1)) {
    for (const s of slots()) {
      const r = R[(S.plan[f] || {})[s]];
      if (!r || vistos.has(r.id)) continue;
      vistos.add(r.id);
      if (r.adel) adelantar.push({ f, s, r });
    }
  }
  const proteinas = (grupos.car || []).map(it => `<li>${esc(it.texto)}</li>`).join('');
  abrirHoja(`<div class="hoja-top"><button class="btn volver" data-act="cerrar">← Volver</button></div>
    <div class="hoja-in"><h2>🍱 Domingo de preparación</h2>
      <p class="ayuda">Una o dos horas el domingo y la semana sale mucho más fácil. Menú del ${rango(desde, hasta)}.</p>
      <div class="caja"><h3>1. Las proteínas de la semana</h3><ul class="lista-consejos">${proteinas || '<li>No hay carnes esta semana.</li>'}</ul>
        <p class="ayuda">Divide en bolsas por receta, marca la bolsa con el día y congela lo de jueves en adelante.</p></div>
      <div class="caja"><h3>2. Adelanta esto</h3><ul class="lista-consejos">
        ${adelantar.map(a => `<li><b>${diaCorto(a.f)} · ${esc(a.r.n)}:</b> ${a.r.adel}</li>`).join('') || '<li>Nada especial esta semana.</li>'}</ul></div>
      <div class="caja"><h3>3. Siempre ayuda</h3><ul class="lista-consejos">
        <li>Cocina arroz para 2 o 3 días y guárdalo en la nevera en recipiente con tapa.</li>
        <li>Lava y pica cebolla, tomate y pimentón para 3 días.</li>
        <li>Marina el pollo en bolsas (mira la receta <b>Pollo con 3 marinadas</b>).</li>
        <li>Pon la fecha en cada recipiente. Lo cocinado dura 3 a 4 días en la nevera.</li>
      </ul></div>
    </div>`);
}

/* ───────────── WhatsApp, imprimir, copia ───────────── */

function whatsapp(texto) {
  const url = 'https://wa.me/?text=' + encodeURIComponent(texto);
  const w = window.open(url, '_blank');
  if (!w) location.href = url;
}

function textoMenuDia(f) {
  const dia = S.plan[f] || {};
  return slots().map(s => {
    const r = R[dia[s]];
    return `${MOMENTOS[s].e} ${MOMENTOS[s].t}: ${r ? r.n : '—'}`;
  }).join('\n');
}

function textoLista(desde, hasta, soloPendiente) {
  const grupos = listaMercado(desde, hasta);
  let t = '';
  for (const [p, titulo] of PASILLOS) {
    const g = (grupos[p] || []).filter(it => !soloPendiente || !S.mercado.marcado[it.clave]);
    if (!g.length) continue;
    t += `\n*${titulo}*\n` + g.map(it => `• ${it.texto}`).join('\n') + '\n';
  }
  const ex = (S.mercado.extra || []).filter(e => !soloPendiente || !e.ok);
  if (ex.length) t += `\n*📝 Otras cosas*\n` + ex.map(e => `• ${e.t}`).join('\n') + '\n';
  return t;
}

function textoReceta(r, k) {
  const ings = r.ing.map(it => it.length === 1 ? `\n_${it[0]}_` : `• ${lineaIng(it[0], it[1], it[2], k / 4)}`).join('\n');
  const pasos = r.pasos.map((p, i) => `${i + 1}. ${p}`).join('\n');
  const video = r.v ? `\n▶️ Video: https://www.youtube.com/watch?v=${r.v}` : '';
  return `${r.e} *${r.n}*\n⏱ ${tiempo(r)} · Para ${k} persona${k > 1 ? 's' : ''}\n\n*Ingredientes*\n${ings}\n\n*Preparación*\n${pasos}${video}`;
}

function imprimir() {
  const lunes = semanaVista || lunesDe(hoy());
  const [desde, hasta] = rangoMercado();
  const cols = slots();
  const filas = semanaDe(lunes).filter(f => cols.some(s => R[(S.plan[f] || {})[s]])).map(f => {
    const dia = S.plan[f] || {};
    return `<tr><td class="dia">${diaCorto(f)}</td>${cols.map(s => `<td>${R[dia[s]] ? esc(R[dia[s]].n) : ''}</td>`).join('')}</tr>`;
  }).join('');
  const grupos = listaMercado(desde, hasta);
  const lista = PASILLOS.filter(([p]) => grupos[p] && grupos[p].length).map(([p, t]) =>
    `<div class="grupo-imp"><h3>${t}</h3>${grupos[p].map(it => `<div>☐ ${esc(it.texto)}</div>`).join('')}</div>`).join('');
  $('#imprimir').innerHTML = `<h1>🍲 Menú de la semana</h1><p class="sub">${rango(lunes, sumar(lunes, 6))} · para ${S.personas} persona${S.personas > 1 ? 's' : ''}</p>
    <table><thead><tr><th>Día</th>${cols.map(s => `<th>${MOMENTOS[s].t}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>
    <div class="salto"><h1>🛒 Lista de mercado</h1><p class="sub">Para el menú del ${rango(desde, hasta)}</p><div class="cols">${lista}</div></div>`;
  setTimeout(() => window.print(), 50);
}

function exportar() {
  const datos = { app: 'que-cocino-hoy', version: VERSION, fecha: hoy(), datos: S };
  const blob = new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `que-cocino-hoy-copia-${hoy()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Copia guardada en Descargas');
}

$('#archivo').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const d = JSON.parse(lector.result);
      if (d.app !== 'que-cocino-hoy' || !d.datos) throw new Error('no es una copia');
      S = mezclar(d.datos);
      guardar();
      render();
      toast('✅ Copia recuperada');
    } catch (err) {
      toast('Ese archivo no es una copia de esta app');
    }
    e.target.value = '';
  };
  lector.readAsText(f);
});

/* ───────────── Acciones (botones) ───────────── */

function marcarHecha(id) {
  const r = R[id];
  const antes = (S.hist[id] && S.hist[id].veces) || 0;
  S.hist[id] = { veces: antes + 1, ultima: hoy() };
  guardar();
  if (!antes && !S.fav[id]) {
    preguntar(`${r.e} ¿Te gustó?`, `¿Agrego <b>${esc(r.n)}</b> a tus recetas de siempre? Así sale más seguido en el menú.`, [
      { t: '⭐ Sí, me encantó', clase: 'ok', fn: () => { S.fav[id] = true; guardar(); refrescar(); toast('⭐ Agregada a tus recetas de siempre'); } },
      { t: '🙂 Más o menos', fn: () => { refrescar(); toast('Listo, anotado'); } },
      { t: '🙅 No, no me la vuelvas a sugerir', fn: () => { S.oculta[id] = true; delete S.fav[id]; guardar(); refrescar(); toast('Listo, no te la vuelvo a sugerir'); } },
    ]);
  } else {
    refrescar();
    toast('✅ ¡Bien! Anotado');
  }
}

function refrescar() {
  render();
  for (const h of pila) {
    const id = h.el.dataset.receta;
    if (id) {
      const b = h.el.querySelector('#btnFav');
      if (b) { b.textContent = S.fav[id] ? '⭐ De siempre' : '☆ Me gusta'; b.classList.toggle('suave', !!S.fav[id]); }
    }
  }
}

function planear(id) {
  const r = R[id];
  const opciones = [];
  for (const [f, cuando] of [[hoy(), 'Hoy'], [sumar(hoy(), 1), 'Mañana']]) {
    for (const s of slots()) {
      if (!r.m.includes(s)) continue;
      opciones.push({ t: `${cuando} · ${MOMENTOS[s].e} ${MOMENTOS[s].t}`, fn: () => {
        (S.plan[f] || (S.plan[f] = {}))[s] = id;
        guardar();
        refrescar();
        toast(`📅 Listo: ${cuando.toLowerCase()} en el ${MOMENTOS[s].t.toLowerCase()}`);
      } });
    }
  }
  if (!opciones.length) { toast('Esta receta es un acompañante: úsala con otra receta'); return; }
  opciones.push({ t: 'Cancelar', clase: 'claro', fn: null });
  preguntar('📅 ¿Para cuándo?', esc(r.n), opciones);
}

const ACCIONES = {
  tab: d => ir(d.tab),
  ver: d => abrirReceta(d.id),
  cerrar: () => history.back(),
  otra: d => {
    const actual = (S.plan[d.fecha] || {})[d.slot];
    const r = elegir(d.fecha, d.slot, actual ? [actual] : []);
    if (!r) { toast('No hay otra opción con tus aparatos'); return; }
    (S.plan[d.fecha] || (S.plan[d.fecha] = {}))[d.slot] = r.id;
    guardar();
    render();
    toast(`🔄 ${r.e} ${r.n}`);
  },
  hecha: d => marcarHecha(d.id),
  nuevoOtra: () => {
    const r = ideaNueva([S.nuevo.id]);
    S.nuevo = { fecha: hoy(), id: r ? r.id : '' };
    guardar();
    render();
  },
  planear: d => planear(d.id),
  casa: () => abrirCasa(),
  chipCasa: d => {
    const i = S.casa.indexOf(d.k);
    if (i >= 0) S.casa.splice(i, 1); else S.casa.push(d.k);
    guardar();
    const hoja = pila.length && pila[pila.length - 1].el;
    if (hoja) { hoja.querySelector('#casaChips').innerHTML = htmlCasaChips(); hoja.querySelector('#casaRes').innerHTML = htmlCasaRes(); }
  },
  casaLimpiar: () => {
    S.casa = [];
    guardar();
    const hoja = pila.length && pila[pila.length - 1].el;
    if (hoja) { hoja.querySelector('#casaChips').innerHTML = htmlCasaChips(); hoja.querySelector('#casaRes').innerHTML = htmlCasaRes(); }
  },
  semana: d => {
    const nueva = sumar(semanaVista, +d.d);
    if (nueva < lunesDe(hoy())) return;
    semanaVista = nueva;
    render();
  },
  hacerMenu: () => {
    const lunes = semanaVista;
    if (semanaTienePlan(lunes)) {
      preguntar('✨ ¿Hacer un menú nuevo?', 'Se cambian las comidas de hoy en adelante de esta semana.', [
        { t: 'Sí, hacer menú nuevo', clase: 'pri', fn: () => { hacerMenu(lunes); render(); toast('✨ Menú nuevo listo'); } },
        { t: 'Cancelar', clase: 'claro', fn: null },
      ]);
    } else {
      hacerMenu(lunes);
      render();
      toast('✨ Menú listo');
    }
  },
  menuProxima: () => {
    semanaVista = sumar(lunesDe(hoy()), 7);
    hacerMenu(semanaVista);
    tab = 'semana';
    render();
    window.scrollTo(0, 0);
    toast('✨ Menú de la próxima semana listo');
  },
  prep: () => abrirPrep(),
  imprimir: () => imprimir(),
  waHoy: () => whatsapp(`🍲 *Menú de hoy* — ${fechaLarga(hoy())}\n\n${textoMenuDia(hoy())}`),
  waSemana: () => {
    const lunes = semanaVista;
    const dias = semanaDe(lunes).filter(f => f >= hoy());
    whatsapp(`📅 *Menú de la semana* (${rango(lunes, sumar(lunes, 6))})\n` +
      dias.map(f => `\n*${diaCorto(f)}*\n${textoMenuDia(f)}`).join('\n'));
  },
  waMercado: () => {
    const [desde, hasta] = rangoMercado();
    const t = textoLista(desde, hasta, true);
    if (!t.trim()) { toast('Ya marcaste todo 🎉'); return; }
    whatsapp(`🛒 *Lista de mercado*\nPara el menú del ${rango(desde, hasta)}\n${t}`);
  },
  waReceta: d => whatsapp(textoReceta(R[d.id], detalle ? detalle.k : S.personas)),
  agregarExtra: () => {
    const inp = $('#nuevoExtra');
    const t = inp && inp.value.trim();
    if (!t) { if (inp) inp.focus(); return; }
    S.mercado.extra.push({ t, ok: false });
    guardar();
    render();
    const nuevo = $('#nuevoExtra');
    if (nuevo) nuevo.focus();
  },
  quitarExtra: d => { S.mercado.extra.splice(+d.i, 1); guardar(); render(); },
  desmarcar: () => { S.mercado.marcado = {}; S.mercado.extra.forEach(e => { e.ok = false; }); guardar(); render(); },
  filtro: d => {
    filtro.f = d.f;
    document.querySelectorAll('#vista .chips .chip').forEach(c => c.classList.toggle('on', c.dataset.f === d.f));
    $('#listaRecetas').innerHTML = listaRecetas();
  },
  favorito: d => {
    if (S.fav[d.id]) delete S.fav[d.id]; else { S.fav[d.id] = true; delete S.oculta[d.id]; }
    guardar();
    refrescar();
    toast(S.fav[d.id] ? '⭐ Ahora es de tus recetas de siempre' : 'Quitada de las de siempre');
  },
  porciones: d => {
    detalle.k = Math.min(20, Math.max(1, detalle.k + +d.d));
    const hoja = document.querySelector(`.hoja[data-receta="${detalle.id}"]`);
    hoja.querySelector('#porcTxt').textContent = textoPorciones();
    hoja.querySelector('#ings').innerHTML = htmlIngredientes(R[detalle.id]);
  },
  vozIng: () => {
    const r = R[detalle.id];
    const k = detalle.k / 4;
    hablar(`Ingredientes para ${detalle.k} persona${detalle.k > 1 ? 's' : ''}. ` +
      r.ing.map(it => it.length === 1 ? it[0] + ':' : lineaIng(it[0], it[1], it[2], k)).join('. ') + '.');
  },
  vozPaso: d => leerPaso(+d.i),
  vozMover: d => {
    const n = R[detalle.id].pasos.length;
    const i = detalle.paso < 0 ? 0 : Math.min(n - 1, Math.max(0, detalle.paso + +d.d));
    leerPaso(i);
  },
  personas: d => {
    S.personas = Math.min(20, Math.max(1, S.personas + +d.d));
    guardar();
    render();
  },
  letra: d => { S.letra = d.k; guardar(); render(); },
  mostrar: d => { delete S.oculta[d.id]; guardar(); render(); toast('Listo, vuelve a salir en el menú'); },
  exportar: () => exportar(),
  importar: () => $('#archivo').click(),
  instalar: async () => {
    if (!promptInstalar) return;
    promptInstalar.prompt();
    try { await promptInstalar.userChoice; } catch (e) { /* nada */ }
    promptInstalar = null;
    render();
  },
  compartirApp: () => whatsapp(`🍲 *¿Qué cocino hoy?* — recetas, menú de la semana y lista de mercado.\nÁbrela aquí: ${location.origin}${location.pathname}`),
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const fn = ACCIONES[b.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(b.dataset, b);
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-cambio]');
  if (!el) return;
  const d = el.dataset;
  if (d.cambio === 'marcar') {
    if (el.checked) S.mercado.marcado[d.k] = true; else delete S.mercado.marcado[d.k];
    el.closest('.item').classList.toggle('hecho', el.checked);
  } else if (d.cambio === 'extra') {
    S.mercado.extra[+d.i].ok = el.checked;
    el.closest('.item').classList.toggle('hecho', el.checked);
  } else if (d.cambio === 'comida') {
    S.comidas[d.k] = el.checked;
    if (el.checked) asegurarSemana(lunesDe(hoy()));
  } else if (d.cambio === 'aparato') {
    S.aparatos[d.k] = el.checked;
  } else if (d.cambio === 'dieta') {
    S.dieta[+d.i].on = el.checked;
    guardar();
    render();
    return;
  }
  guardar();
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-in]');
  if (!el) return;
  if (el.dataset.in === 'buscar') {
    filtro.q = el.value;
    $('#listaRecetas').innerHTML = listaRecetas();
  } else if (el.dataset.in === 'nombreDieta') {
    S.dieta[+el.dataset.i].nombre = el.value.slice(0, 20);
    guardar();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'nuevoExtra') { e.preventDefault(); ACCIONES.agregarExtra(); }
});

/* ───────────── Arranque ───────────── */

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  promptInstalar = e;
  if (tab === 'hoy' || tab === 'ajustes') render();
});
window.addEventListener('appinstalled', () => { promptInstalar = null; toast('📲 ¡Lista en tu pantalla!'); render(); });

let diaVisto = hoy();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (detalle) pedirPantalla();
  if (hoy() !== diaVisto) { diaVisto = hoy(); render(); }
});

if ('speechSynthesis' in window) speechSynthesis.getVoices();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

podarPlan();
asegurarSemana(lunesDe(hoy()));
guardar();
render();
