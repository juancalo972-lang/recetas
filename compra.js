'use strict';
/* Compra grande: escoges el periodo (7 a 30 días) y las recetas, y sale una sola lista de compra.
   Usa las funciones de app.js (sumarReceta, agruparItems, textoMercado…). */

// Cuántas porciones rinde una receta de una sola tanda (las que no cambian con las personas)
const RINDE = { 'brownies-frijol-negro': 16, 'avena-pastel-zanahoria': 8, 'brownie-cheesecake-proteico': 4 };
const DIAS_MES = [7, 14, 20, 30];

const GRUPOS_MES = [
  { g: 'desayuno', t: '🌅 Desayunos',
    pool: () => [...RECETAS.filter(r => r.m.includes('desayuno')), ...IDEAS.filter(r => r.m.includes('desayuno'))] },
  { g: 'principal', t: '🍽️ Platos principales (almuerzo y comida)',
    pool: () => [...RECETAS.filter(r => r.m.some(esPrincipal)), ...IDEAS.filter(r => r.m.some(esPrincipal))] },
  { g: 'bebida', t: '🥤 Sodas y bebidas', pool: () => RECETAS.filter(r => r.m.includes('bebida')) },
  { g: 'salsa', t: '🥣 Salsas', pool: () => RECETAS.filter(r => r.m.includes('salsa')) },
  { g: 'postre', t: '🍮 Postres y snacks', pool: () => RECETAS.filter(r => r.m.includes('postre')) },
];

// Lo fresco no aguanta más de una semana: se compra por separado
const FRESCO_RE = /lechuga|espinaca|br[oó]coli|repollo|apio|pepino|cilantro|perejil fresco|hierbabuena|aguacate|tomate|pimentón|banano|fresa|sandía|piña|lulo|maracuy|manzana|hojas|mazorca|tallo/i;
const esFresco = it => (it.p === 'ver' && FRESCO_RE.test(it.sing)) || (it.p === 'lac' && /cottage|requesón/i.test(it.sing));

function opcionesGrupo(g) {
  const def = GRUPOS_MES.find(x => x.g === g);
  return def.pool().filter(r => !S.oculta[r.id] && (r.casa || puede(r)));
}
function idsGrupo(g) {
  const sel = (S.mes.sel[g] = S.mes.sel[g] || {});
  return Object.keys(sel).filter(id => sel[id] && R[id]);
}
const totalElegidas = () => GRUPOS_MES.reduce((n, { g }) => n + idsGrupo(g).length, 0);

// Cuántas recetas conviene escoger según los días
function recomendado(dias) {
  return {
    desayuno: Math.max(2, Math.round(dias / 5)),
    principal: Math.max(4, Math.round(dias * 0.4)),
    bebida: dias >= 14 ? 3 : 2,
    salsa: dias >= 14 ? 3 : 2,
    postre: Math.max(1, Math.round(dias / 10)),
  };
}

// Cuántas veces se prepara cada receta de un grupo en el periodo
function vecesGrupo(g, n, dias) {
  if (!n) return 0;
  const total = g === 'desayuno' || g === 'bebida' ? dias : g === 'principal' ? dias * 2 : g === 'salsa' ? dias / 4 : dias / 5;
  return total / n;
}

function entradasCompra() {
  const out = [];
  for (const { g } of GRUPOS_MES) {
    const ids = idsGrupo(g);
    const veces = vecesGrupo(g, ids.length, S.mes.dias);
    for (const id of ids) {
      const r = R[id];
      let mult;
      if (r.casa) mult = 1;
      else if (r.fija) mult = Math.max(1, Math.ceil(veces * S.personas / (RINDE[id] || 4)));  // tandas fijas: se cuentan completas
      else mult = veces * S.personas / 4;                                                      // la receta base es para 4
      out.push({ g, r, veces, mult });
    }
  }
  return out;
}

function calcularCompra() {
  const dias = S.mes.dias;
  const entradas = entradasCompra();
  const items = {};
  for (const e of entradas) sumarReceta(items, e.r, e.mult);
  const todo = agruparItems(items);
  const dividir = dias > 7;
  const dur = {}, fre = {};
  for (const [p] of PASILLOS) {
    for (const it of (todo[p] || [])) {
      if (dividir && esFresco(it)) {
        // Para la primera semana: la parte proporcional de los 7 primeros días
        it.texto7 = it.sinCant ? it.texto : textoMercado(Object.assign({}, it, { q: it.q * 7 / dias }));
        (fre[p] = fre[p] || []).push(it);
      } else {
        (dur[p] = dur[p] || []).push(it);
      }
    }
  }
  const cuenta = g => entradas.filter(e => e.g === g).length;
  return { dias, dur, fre, dividir, n: entradas.length, cuenta };
}

/* ───────────── Pantalla ───────────── */

function toggleModoMercado() {
  const m = S.mes.modo;
  return `<div class="modo-mercado">
    <button class="btn ${m === 'sem' ? 'on' : ''}" data-act="mesModo" data-m="sem">📅 Esta semana</button>
    <button class="btn ${m === 'grande' ? 'on' : ''}" data-act="mesModo" data-m="grande">🛒 Compra grande</button>
  </div>`;
}

function vistaCompraGrande() {
  const m = S.mes;
  const rec = recomendado(m.dias);
  let html = toggleModoMercado();
  html += `<section class="card"><h3>📆 ¿Para cuántos días vas a mercar?</h3>
    <div class="segmentos cuatro">${DIAS_MES.map(d => `<button class="btn ${m.dias === d ? 'on' : ''}" data-act="mesDias" data-d="${d}">${d} días</button>`).join('')}</div>
    <div class="contador" style="margin-top:.9rem"><button class="btn" data-act="personas" data-d="-1" aria-label="Menos personas">−</button>
      <b>${S.personas} persona${S.personas > 1 ? 's' : ''}</b><button class="btn" data-act="personas" data-d="1" aria-label="Más personas">+</button></div>
  </section>`;

  html += `<section class="card consejo"><p><b>Para ${m.dias} días te recomiendo escoger:</b><br>
    ${rec.desayuno} desayunos · ${rec.principal} platos principales · ${rec.bebida} sodas · ${rec.salsa} salsas · ${rec.postre} postre${rec.postre > 1 ? 's' : ''}</p>
    <p class="ayuda">Cada receta se repite varias veces en el periodo. Mientras menos recetas distintas, menos ingredientes sueltos que comprar.</p>
    <button class="btn ok" style="margin-top:.6rem" data-act="mesAuto">✨ Escoger por mí (las que más ingredientes comparten)</button></section>`;

  for (const { g, t } of GRUPOS_MES) {
    const n = idsGrupo(g).length;
    const meta = rec[g];
    html += `<div class="grupo-mes"><h3>${t}</h3><span class="cuenta ${n >= meta ? 'ok' : ''}">${n} de ${meta}</span></div>
      <div class="chips">${opcionesGrupo(g).map(r =>
        `<button class="chip ${m.sel[g] && m.sel[g][r.id] ? 'on' : ''}" data-act="mesTog" data-g="${g}" data-id="${r.id}">${r.e} ${esc(r.n)}</button>`).join('')}</div>`;
  }

  const hay = totalElegidas() > 0;
  html += `<div class="pila" style="margin-top:1.2rem">
    <button class="btn pri grande" data-act="mesLista" ${hay ? '' : 'disabled'}>🛒 Ver mi lista de compra (${totalElegidas()} recetas)</button>
    <button class="btn" data-act="mesMenu" ${hay ? '' : 'disabled'}>📅 Usar estas recetas en mi menú</button>
    <button class="btn claro" data-act="mesLimpiar" ${hay ? '' : 'disabled'}>Borrar lo que escogí</button></div>`;
  return html;
}

/* ───────────── Escoger por mí ───────────── */

const SINONIMOS = [
  [/pechuga|muslo.*sin hueso/, 'pollo (pechuga)'], [/carne molida/, 'carne molida'], [/yogur griego/, 'yogur griego'],
  [/cacao/, 'cacao'], [/miel/, 'miel'], [/stevia|endulzante/, 'stevia'], [/avena/, 'avena'], [/limón|limon/, 'limón'],
  [/vainilla/, 'vainilla'], [/proteína en polvo|medida de proteína/, 'proteína en polvo'], [/papa pastusa|papa sabanera/, 'papa'],
  [/cottage|requesón/, 'queso cottage'], [/leche/, 'leche'], [/tortilla/, 'tortillas'], [/huevo/, 'huevos'],
];
function clavesIngredientes(r) {
  const out = {};
  for (const it of r.ing) {
    if (it.length === 1 || it[3] === 'bas') continue;
    let n = norm(nombres(it[2])[0]).replace(/\(.*?\)/g, '').trim();
    for (const [re, a] of SINONIMOS) if (re.test(n)) { n = a; break; }
    out[n] = FRESCO_RE.test(n) ? 2 : it[3] === 'sal' ? 0.5 : 1;
  }
  return out;
}

function escogerPorMi() {
  const dias = S.mes.dias;
  const rec = recomendado(dias);
  const comprado = {};
  const cache = {};
  const claves = r => cache[r.id] || (cache[r.id] = clavesIngredientes(r));
  const nuevo = r => Object.entries(claves(r)).reduce((s, [k, w]) => s + (comprado[k] ? 0 : w), 0);
  const comparte = r => Object.entries(claves(r)).reduce((s, [k, w]) => s + (comprado[k] ? w : 0), 0);

  const orden = ['principal', 'desayuno', 'bebida', 'salsa', 'postre'];
  for (const g of orden) {
    const n = rec[g];
    const pool = opcionesGrupo(g).filter(r => !r.casa);
    const tope = g === 'principal' ? { pollo: Math.ceil(n * 0.5), res: Math.ceil(n * 0.4) } : {};
    const sel = [], porProt = {};
    while (sel.length < n) {
      let mejor = null, mejorPts = -1e9;
      for (const r of pool) {
        if (sel.includes(r) || (porProt[r.p] || 0) >= (tope[r.p] ?? 99)) continue;
        const pts = comparte(r) * 1.5 - nuevo(r);
        if (pts > mejorPts) { mejorPts = pts; mejor = r; }
      }
      if (!mejor) break;
      sel.push(mejor);
      porProt[mejor.p] = (porProt[mejor.p] || 0) + 1;
      for (const k of Object.keys(claves(mejor))) comprado[k] = (comprado[k] || 0) + 1;
    }
    // Si se acabaron las opciones con los topes, completa sin topes y luego con platos de la casa (lentejas, frijoles…)
    for (const r of [...pool, ...opcionesGrupo(g).filter(x => x.casa)]) {
      if (sel.length >= n) break;
      if (sel.includes(r)) continue;
      sel.push(r);
      for (const k of Object.keys(claves(r))) comprado[k] = (comprado[k] || 0) + 1;
    }
    S.mes.sel[g] = Object.fromEntries(sel.map(r => [r.id, true]));
  }
  S.mes.marcado = {};
}

/* ───────────── Menú con lo escogido ───────────── */

function usarEnMenu() {
  const D = idsGrupo('desayuno'), P = idsGrupo('principal'), B = idsGrupo('bebida');
  const dias = S.mes.dias;
  for (let i = 0; i < dias; i++) {
    const f = sumar(hoy(), i);
    const dia = {};
    if (S.comidas.desayuno && D.length) dia.desayuno = D[i % D.length];
    if (P.length) {
      if (S.comidas.almuerzo) dia.almuerzo = P[(2 * i) % P.length];
      if (S.comidas.comida) dia.comida = P[(2 * i + 1) % P.length];
    }
    if (S.comidas.bebida && B.length) dia.bebida = B[i % B.length];
    S.plan[f] = Object.assign(S.plan[f] || {}, dia);
  }
  guardar();
}

/* ───────────── Lista de compra ───────────── */

function filasLista(grupos, usarTexto7) {
  return PASILLOS.filter(([p]) => grupos[p] && grupos[p].length).map(([p, t]) =>
    `<div class="grupo"><h3>${t}</h3>${grupos[p].map(it => {
      const ok = !!S.mes.marcado[it.clave];
      const txt = usarTexto7 ? it.texto7 : it.texto;
      const [pr, lb] = txt.split(' (≈');
      const total = usarTexto7 && !it.sinCant ? `<small class="total">Para los ${S.mes.dias} días: ${esc(it.texto.split(' (≈')[0])}</small>` : '';
      return `<label class="item ${ok ? 'hecho' : ''}">
        <input type="checkbox" data-cambio="mesMarca" data-k="${esc(it.clave)}" ${ok ? 'checked' : ''}>
        <span>${esc(pr)}${lb ? `<small>≈${esc(lb.slice(0, -1))}</small>` : ''}${total}</span></label>`;
    }).join('')}</div>`).join('');
}

function htmlListaCompra() {
  const c = calcularCompra();
  const resumen = GRUPOS_MES.map(({ g, t }) => c.cuenta(g) ? `${c.cuenta(g)} ${t.replace(/^\S+\s/, '').split(' (')[0].toLowerCase()}` : '').filter(Boolean).join(' · ');
  let html = `<div class="hoja-top"><button class="btn volver" data-act="cerrar">← Volver</button></div>
    <div class="hoja-in"><h2>🛒 Lista para ${c.dias} días</h2>
    <p class="meta">Para ${S.personas} persona${S.personas > 1 ? 's' : ''} · ${c.n} recetas: ${esc(resumen)}</p>
    <p class="ayuda">Marca lo que ya tienes o ya compraste.</p>`;
  html += `<div class="caja lento"><b>🥩 Las carnes:</b> compra y congela en bolsas por porción (la de cada receta).</div>`;
  html += c.dividir ? `<h2 style="margin-top:1.2rem">Comprar hoy: lo que dura</h2>` : '';
  html += filasLista(c.dur, false) || '<p class="ayuda">No hay nada que comprar: elige recetas primero.</p>';
  if (c.dividir && Object.keys(c.fre).length) {
    html += `<h2 style="margin-top:1.6rem">🥬 Lo fresco: solo la primera semana</h2>
      <div class="caja lento"><p>Esto no aguanta tantos días. Compra lo de la primera semana y vuelve por ello cada 7 días. Para no volver tanto, corta y congela la fruta de las sodas (sandía, piña, fresa) en bolsas.</p></div>`;
    html += filasLista(c.fre, true);
  }
  html += `<div class="pila" style="margin-top:1.4rem">
    <button class="btn wa grande" data-act="mesWa">📤 Enviar la lista por WhatsApp</button>
    <button class="btn" data-act="mesImprimir">🖨️ Imprimir</button></div></div>`;
  return html;
}

function textoCompra() {
  const c = calcularCompra();
  const sec = (grupos, usarTexto7) => PASILLOS.map(([p, t]) => {
    const g = (grupos[p] || []).filter(it => !S.mes.marcado[it.clave]);
    return g.length ? `\n*${t}*\n` + g.map(it => `• ${usarTexto7 ? it.texto7 : it.texto}`).join('\n') + '\n' : '';
  }).join('');
  let t = `🛒 *Lista de compra para ${c.dias} días* (${S.personas} persona${S.personas > 1 ? 's' : ''})\n`;
  if (c.dividir) t += `\n*COMPRAR HOY — lo que dura*\n`;
  t += sec(c.dur, false);
  if (c.dividir && Object.keys(c.fre).length) t += `\n*🥬 LO FRESCO — para la primera semana*\n(vuelve por esto cada 7 días)\n` + sec(c.fre, true);
  return t;
}

function imprimirCompra() {
  const c = calcularCompra();
  const sec = (grupos, usarTexto7) => PASILLOS.filter(([p]) => grupos[p] && grupos[p].length).map(([p, t]) =>
    `<div class="grupo-imp"><h3>${t}</h3>${grupos[p].map(it => `<div>☐ ${esc(usarTexto7 ? it.texto7 : it.texto)}</div>`).join('')}</div>`).join('');
  $('#imprimir').innerHTML = `<h1>🛒 Lista de compra</h1><p class="sub">Para ${c.dias} días · ${S.personas} persona${S.personas > 1 ? 's' : ''}</p>
    <div class="cols">${sec(c.dur, false)}</div>
    ${c.dividir && Object.keys(c.fre).length ? `<div class="salto"><h1>🥬 Lo fresco</h1><p class="sub">Para la primera semana. Vuelve por esto cada 7 días.</p><div class="cols">${sec(c.fre, true)}</div></div>` : ''}`;
  setTimeout(() => window.print(), 50);
}

/* ───────────── Acciones ───────────── */

Object.assign(ACCIONES, {
  mesModo: d => { S.mes.modo = d.m; guardar(); render(); window.scrollTo(0, 0); },
  mesDias: d => { S.mes.dias = +d.d; guardar(); render(); },
  mesTog: d => {
    const sel = (S.mes.sel[d.g] = S.mes.sel[d.g] || {});
    if (sel[d.id]) delete sel[d.id]; else sel[d.id] = true;
    guardar();
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  },
  mesAuto: () => { escogerPorMi(); guardar(); render(); toast('✨ Listo: escogí las que más comparten'); },
  mesLimpiar: () => {
    for (const { g } of GRUPOS_MES) S.mes.sel[g] = {};
    S.mes.marcado = {};
    guardar();
    render();
  },
  mesLista: () => abrirHoja(htmlListaCompra()),
  mesWa: () => whatsapp(textoCompra()),
  mesImprimir: () => imprimirCompra(),
  mesMenu: () => {
    const P = idsGrupo('principal');
    if (!P.length) { toast('Escoge al menos un plato principal'); return; }
    preguntar('📅 ¿Usar estas recetas en el menú?',
      `Voy a llenar el menú de los próximos ${S.mes.dias} días solo con las recetas que escogiste. Lo que ya tenías en esos días se cambia.`, [
        { t: 'Sí, hacer el menú', clase: 'pri', fn: () => { usarEnMenu(); ir('semana'); toast('📅 Menú listo'); } },
        { t: 'Cancelar', clase: 'claro', fn: null },
      ]);
  },
});
