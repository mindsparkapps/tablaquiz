// TablaQuiz: quizzes de la tabla periódica. Funciona solo o como plugin de ZenBan (estado dentro del objeto).
const APP_VERSION = '1.4';
const IN_ZENBAN = !!(window.ZenBanPlugin && ZenBanPlugin.inZenBan);
const $ = (s, r = document) => r.querySelector(s);
const hoyStr = () => new Date().toISOString().slice(0, 10);
const alAzar = (a) => a[Math.floor(Math.random() * a.length)];
const barajar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const RANGOS = [[10, 'Los primeros 10'], [20, 'Los primeros 20'], [36, 'Hasta el kriptón (36)'], [54, 'Hasta el xenón (54)'], [86, 'Hasta el radón (86)'], [118, 'Los 118']];
const MODOS = [
  { id: 'sim2nom', ic: 'Fe', nombre: 'Símbolo → nombre', d: 'Ves «Fe» y eliges Hierro' },
  { id: 'nom2sim', ic: 'Au', nombre: 'Nombre → símbolo', d: 'Ves Oro y eliges Au' },
  { id: 'num2nom', ic: '#8', nombre: 'Número → elemento', d: 'Ves 8 y eliges Oxígeno' },
  { id: 'nom2num', ic: '🔢', nombre: 'Elemento → número', d: 'Ves Carbono y eliges 6' },
  { id: 'ubicar', ic: '📍', nombre: 'Ubícalo en la tabla', d: 'Toca el casillero del elemento' },
  { id: 'escribir', ic: '⌨️', nombre: 'Escribe el nombre', d: 'Ves «Na» y escribes sodio' },
  { id: 'categoria', ic: '🎨', nombre: '¿Qué tipo es?', d: 'Alcalino, halógeno, noble…' }
];
const NOMBRE_MODO = Object.fromEntries(MODOS.map(m => [m.id, m.nombre]));
const ALIAS = { Zn: ['cinc'], W: ['tungsteno'], I: ['iodo'], Kr: ['criptón'], Es: ['einsteinio'], S: ['sulfuro'] };

let temaHost = null;
let readOnly = false, pluginReady = !IN_ZENBAN;
let estado = estadoInicial();
let juego = null, vista = 'tabla', catFiltro = null, selZ = null, tAuto = null;

function estadoInicial() {
  return { v: 1, stats: {}, best: {}, total: { ok: 0, n: 0 }, dias: {}, ajustes: { rango: 20, largo: 10, sonido: true, estilo: IN_ZENBAN ? 'zenban' : 'propio' } };
}

// ---------- almacenamiento ----------
function cargarLocal() {
  try { const t = localStorage.getItem('tablaquiz'); if (t) return JSON.parse(t); } catch (e) {}
  return null;
}
function fusionar(guardado) {
  const base = estadoInicial();
  if (!guardado || typeof guardado !== 'object') return base;
  return { ...base, ...guardado, ajustes: { ...base.ajustes, ...(guardado.ajustes || {}) }, total: { ...base.total, ...(guardado.total || {}) } };
}
function dominados() { return ELEMENTOS.filter(e => nivel(e.z) >= 4).length; }
function guardar() {
  if (readOnly) return;
  if (IN_ZENBAN) {
    if (!pluginReady) return;
    ZenBanPlugin.setState(estado);
    ZenBanPlugin.setTitle(`TablaQuiz · ${dominados()}/118`);
  } else {
    try { localStorage.setItem('tablaquiz', JSON.stringify(estado)); } catch (e) {}
  }
}

// ---------- progreso por elemento ----------
function tasa(z) { const s = estado.stats[z]; return s && s.n ? s.ok / s.n : null; }
function nivel(z) { // 0 sin ver · 1 flojo · 2 regular · 3 bien · 4 dominado
  const s = estado.stats[z]; if (!s || !s.n) return 0;
  const t = s.ok / s.n;
  if (t < .5) return 1; if (t < .75) return 2; if (t < .9 || s.n < 3) return 3; return 4;
}
function registrar(e, acierto) {
  const s = estado.stats[e.z] || (estado.stats[e.z] = { ok: 0, n: 0 });
  s.n++; if (acierto) s.ok++;
  estado.total.n++; if (acierto) estado.total.ok++;
  const h = hoyStr();
  estado.dias[h] = (estado.dias[h] || 0) + 1;
  const claves = Object.keys(estado.dias).sort();
  while (claves.length > 60) delete estado.dias[claves.shift()];
}

// ---------- sonido ----------
let audio = null;
function tono(ok) {
  if (!estado.ajustes.sonido) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notas = ok ? [660, 880] : [300, 200];
    notas.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(audio.destination);
      const t = audio.currentTime + i * .11;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .14);
      o.start(t); o.stop(t + .16);
    });
  } catch (e) {}
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- estilo: ZenBan (sigue su tema) o propio ----------
function aplicarEstilo() {
  const r = document.documentElement, z = estado.ajustes.estilo === 'zenban';
  r.dataset.estilo = z ? 'zenban' : 'propio';
  const tema = temaHost || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  r.dataset.theme = z ? tema : 'light'; // el estilo propio es el claro de siempre, no sigue el tema de ZenBan ni del sistema
  const label = z ? '🎨 ZenBan' : '🎨 Propio';
  const title = z ? 'Estilo de ZenBan. Toca para usar el estilo propio de TablaQuiz' : 'Estilo propio de TablaQuiz. Toca para usar el de ZenBan';
  document.querySelectorAll('.estilo').forEach(b => { b.textContent = label; b.title = title; });
  if (IN_ZENBAN && ZenBanPlugin.setBarButton) ZenBanPlugin.setBarButton(label, title); // también en la barra de la ventana, junto a ⟳
}

// ---------- navegación ----------
function ir(v) {
  vista = v;
  clearTimeout(tAuto);
  for (const id of ['tabla', 'jugar', 'juego', 'progreso']) $('#v-' + id).hidden = id !== v;
  const pestana = v === 'juego' ? 'jugar' : v;
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === pestana)));
  if (v === 'tabla') pintarTabla();
  if (v === 'jugar') pintarMenu();
  if (v === 'progreso') pintarProgreso();
}

// ---------- tabla (reutilizable) ----------
function construirTabla(cont, { alClick, estilo, vacia, fuera } = {}) {
  cont.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const e of ELEMENTOS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'el' + (vacia ? ' vacio' : ''); b.dataset.z = e.z;
    b.style.gridRow = e.fila; b.style.gridColumn = e.col;
    if (!vacia) {
      b.style.background = estilo ? estilo(e) : `var(--c-${e.cat})`;
      // los nombres largos se achican para caber en el casillero (el nombre completo está en el título)
      const fs = Math.max(1.05, Math.min(1.45, 4.9 / (e.nombre.length * 0.56)));
      b.innerHTML = `<span class="n">${e.z}</span><span class="s">${e.simbolo}</span><span class="nm" style="font-size:${fs.toFixed(2)}cqw">${e.nombre}</span>`;
      b.title = `${e.nombre} (${e.z})`;
    } else {
      b.setAttribute('aria-label', `Fila ${e.fila > 7 ? e.fila - 3 : e.fila}, columna ${e.col}`);
    }
    if (fuera && fuera(e)) { b.classList.add('dim'); b.disabled = true; }
    if (alClick) b.addEventListener('click', () => alClick(e, b));
    frag.appendChild(b);
  }
  for (const [fila, txt] of [[6, '57-71'], [7, '89-103']]) {
    const h = document.createElement('div');
    h.className = 'hueco'; h.textContent = txt; h.style.gridRow = fila; h.style.gridColumn = 3;
    frag.appendChild(h);
  }
  cont.appendChild(frag);
}

function pintarTabla() {
  const leyenda = $('#legend');
  leyenda.innerHTML = Object.entries(CATEGORIAS).map(([k, c]) =>
    `<button type="button" data-cat="${k}" aria-pressed="${catFiltro === k}"><i style="background:var(--c-${k})"></i>${c.nombre}</button>`).join('');
  leyenda.querySelectorAll('button').forEach(b => b.onclick = () => { catFiltro = catFiltro === b.dataset.cat ? null : b.dataset.cat; pintarTabla(); });
  construirTabla($('#tabla'), {
    alClick: (e) => { selZ = e.z; pintarFicha(); marcarSel(); },
    fuera: (e) => catFiltro && e.cat !== catFiltro
  });
  // los atenuados siguen siendo tocables en la tabla de estudio
  $('#tabla').querySelectorAll('.el.dim').forEach(b => { b.disabled = false; });
  marcarSel();
}
function marcarSel() {
  $('#tabla').querySelectorAll('.el').forEach(b => b.classList.toggle('sel', +b.dataset.z === selZ));
}
function pintarFicha() {
  const f = $('#ficha');
  const e = ELEMENTOS.find(x => x.z === selZ);
  if (!e) { f.innerHTML = '<p class="muted">Toca un elemento para ver su ficha.</p>'; return; }
  const masa = e.masa.startsWith('[') ? `${e.masa.slice(1, -1)} (isótopo más estable)` : e.masa;
  const t = tasa(e.z), s = estado.stats[e.z];
  const dato = (k, v) => `<div class="dato"><span>${k}</span><b>${v}</b></div>`;
  f.innerHTML = `<div class="ficha-top">
    <div class="ficha-cuadro" style="background:var(--c-${e.cat})"><span>${e.z}</span><b>${e.simbolo}</b></div>
    <div class="ficha-nombre"><h3>${e.nombre}</h3><span class="muted">${CATEGORIAS[e.cat].nombre}</span></div>
    <div class="datos">${dato('Número atómico', e.z)}${dato('Masa atómica', masa)}
    ${dato('Periodo', e.periodo)}${dato('Grupo', e.grupo ?? (e.cat === 'lantanido' ? 'Lantánidos' : 'Actínidos'))}
    ${dato('Tu acierto', s ? `${Math.round(t * 100)} % (${s.ok}/${s.n})` : 'Sin preguntas')}</div></div>`;
}

// ---------- menú de juegos ----------
function pintarMenu() {
  const r = $('#rango');
  r.innerHTML = RANGOS.map(([n, t]) => `<option value="${n}">${t}</option>`).join('');
  r.value = String(estado.ajustes.rango);
  r.onchange = () => { estado.ajustes.rango = +r.value; guardar(); pintarMenu(); };
  const l = $('#largo'); l.value = String(estado.ajustes.largo);
  l.onchange = () => { estado.ajustes.largo = +l.value; guardar(); };
  $('#modos').innerHTML = MODOS.map(m => {
    const b = estado.best[m.id];
    return `<button class="modo" type="button" data-modo="${m.id}"><span class="ic">${m.ic}</span><span><b>${m.nombre}</b><span class="d">${m.d}</span>${b ? `<br><em>Mejor: ${b.ok}/${b.total}</em>` : ''}</span></button>`;
  }).join('');
  $('#modos').querySelectorAll('.modo').forEach(b => b.onclick = () => empezar(b.dataset.modo));
}

// ---------- motor del juego ----------
function empezar(modo, pool) {
  const aparte = !!pool;
  pool = pool || ELEMENTOS.filter(e => e.z <= estado.ajustes.rango);
  const total = aparte ? pool.length : estado.ajustes.largo;
  juego = { modo, pool, total, n: 0, ok: 0, racha: 0, mejor: 0, vistos: new Set(), ultimo: null, fallos: [], resp: false, aparte };
  ir('juego');
  siguiente();
}
function elegirElemento() {
  const j = juego;
  let libres = j.pool.filter(e => !j.vistos.has(e.z) && e.z !== j.ultimo);
  if (!libres.length) { j.vistos.clear(); libres = j.pool.filter(e => e.z !== j.ultimo); }
  if (!libres.length) libres = j.pool;
  // más peso a los que fallas o no has visto
  const pesos = libres.map(e => { const t = tasa(e.z); return t === null ? 3 : 1 + (1 - t) * 4; });
  let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < libres.length; i++) { r -= pesos[i]; if (r <= 0) return libres[i]; }
  return libres[libres.length - 1];
}
function distractores(e, campo, cuantos = 3) {
  const lim = Math.max(estado.ajustes.rango, 20);
  const base = ELEMENTOS.filter(x => x.z !== e.z && (x.z <= lim || juego.aparte));
  const mismos = barajar(base.filter(x => x.cat === e.cat));
  const otros = barajar(base.filter(x => x.cat !== e.cat));
  const out = [], vistos = new Set([e[campo]]);
  for (const x of [...mismos.slice(0, 2), ...otros, ...mismos.slice(2)]) {
    if (out.length >= cuantos) break;
    if (!vistos.has(x[campo])) { vistos.add(x[campo]); out.push(x); }
  }
  return out;
}
function siguiente() {
  clearTimeout(tAuto);
  const j = juego;
  if (j.total && j.n >= j.total) return fin();
  const e = elegirElemento();
  j.actual = e; j.vistos.add(e.z); j.ultimo = e.z; j.resp = false; j.t0 = Date.now();
  marcador();
  const P = $('#pregunta');
  const cont = (enun, grande, cuerpo, txt) => `<div class="q"><div class="enun">${enun}</div><div class="grande${txt ? ' txt' : ''}">${grande}</div>${cuerpo}<div class="resultado" id="res"></div><div class="siguiente" id="sig"></div></div>`;
  const opciones = (items) => `<div class="opciones">${barajar(items).map(o => `<button class="op" type="button" data-ok="${o.ok ? 1 : 0}">${o.t}</button>`).join('')}</div>`;
  const m = j.modo;
  if (m === 'sim2nom') {
    P.innerHTML = cont('¿Qué elemento es?', e.simbolo, opciones([{ t: e.nombre, ok: 1 }, ...distractores(e, 'nombre').map(x => ({ t: x.nombre }))]));
  } else if (m === 'nom2sim') {
    P.innerHTML = cont('¿Cuál es su símbolo?', e.nombre, opciones([{ t: e.simbolo, ok: 1 }, ...distractores(e, 'simbolo').map(x => ({ t: x.simbolo }))]), true);
  } else if (m === 'num2nom') {
    P.innerHTML = cont('Número atómico', e.z, opciones([{ t: e.nombre, ok: 1 }, ...distractores(e, 'nombre').map(x => ({ t: x.nombre }))]));
  } else if (m === 'nom2num') {
    const cerca = ELEMENTOS.filter(x => x.z !== e.z && x.z <= Math.max(estado.ajustes.rango, 10)).sort((a, b) => Math.abs(a.z - e.z) - Math.abs(b.z - e.z)).slice(0, 7);
    const d = barajar(cerca).slice(0, 3);
    P.innerHTML = cont('¿Cuál es su número atómico?', e.nombre, opciones([{ t: e.z, ok: 1 }, ...d.map(x => ({ t: x.z }))]), true);
  } else if (m === 'categoria') {
    const otras = barajar(Object.keys(CATEGORIAS).filter(k => k !== e.cat)).slice(0, 3);
    P.innerHTML = cont('¿Qué tipo de elemento es?', `${e.nombre} <span class="muted">(${e.simbolo})</span>`, opciones([{ t: CATEGORIAS[e.cat].nombre, ok: 1 }, ...otras.map(k => ({ t: CATEGORIAS[k].nombre }))]), true);
  } else if (m === 'escribir') {
    P.innerHTML = cont('Escribe el nombre del elemento', e.simbolo, `<form class="escribir" id="form"><input type="text" id="resp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Nombre…"><button class="btn primary" type="submit">Comprobar</button></form>`);
    $('#form').onsubmit = (ev) => { ev.preventDefault(); if (!juego.resp) comprobarTexto(); };
    setTimeout(() => $('#resp') && $('#resp').focus(), 30);
  } else if (m === 'ubicar') {
    P.innerHTML = cont('¿Dónde va este elemento?', `${e.nombre} <span class="muted">(${e.simbolo})</span>`, `<div class="tabla-wrap mini-tabla"><div class="tabla" id="mt"></div></div>`, true);
    construirTabla($('#mt'), {
      vacia: true,
      fuera: (x) => x.z > estado.ajustes.rango && !juego.aparte,
      alClick: (x, b) => { if (!juego.resp) responder(x.z === e.z, e, { celda: b, z: x.z }); }
    });
  }
  P.querySelectorAll('.op').forEach(b => b.onclick = () => { if (!j.resp) responder(b.dataset.ok === '1', e, { boton: b }); });
}
function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ]/g, ''); }
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function comprobarTexto() {
  const e = juego.actual, inp = $('#resp'), v = norm(inp.value);
  if (!v) return;
  const validas = [e.nombre, ...(ALIAS[e.simbolo] || [])].map(norm);
  const tol = validas[0].length >= 10 ? 2 : validas[0].length >= 5 ? 1 : 0;
  const bien = validas.some(n => lev(v, n) <= tol);
  inp.disabled = true;
  responder(bien, e, { casi: bien && !validas.includes(v) });
}

function marcador() {
  const j = juego;
  $('#marcador').innerHTML = `<span>✔ ${j.ok}/${j.n}</span><span>🔥 ${j.racha}</span>${j.total ? `<span class="muted">${Math.min(j.n + 1, j.total)}/${j.total}</span>` : ''}`;
  $('#barra').style.width = (j.total ? (j.n / j.total) * 100 : 0) + '%';
}
function responder(acierto, e, ctx) {
  const j = juego;
  j.resp = true; j.n++;
  if (acierto) { j.ok++; j.racha++; j.mejor = Math.max(j.mejor, j.racha); } else { j.racha = 0; j.fallos.push(e); }
  registrar(e, acierto);
  guardar();
  tono(acierto);
  if (ctx.boton) {
    document.querySelectorAll('.op').forEach(b => { b.disabled = true; if (b.dataset.ok === '1') b.classList.add('ok'); });
    if (!acierto) ctx.boton.classList.add('mal');
  }
  if (ctx.celda) {
    const mt = $('#mt');
    const buena = [...mt.querySelectorAll('.el')].find(b => +b.dataset.z === e.z);
    mt.querySelectorAll('.el').forEach(b => b.disabled = true);
    buena.classList.remove('vacio'); buena.classList.add('ok');
    buena.innerHTML = `<span class="s">${e.simbolo}</span>`;
    if (!acierto) { ctx.celda.classList.add('mal'); const x = ELEMENTOS.find(y => y.z === ctx.z); ctx.celda.classList.remove('vacio'); ctx.celda.innerHTML = `<span class="s">${x.simbolo}</span>`; }
  }
  const dato = `${e.nombre} (${e.simbolo}) · n.º ${e.z} · ${CATEGORIAS[e.cat].nombre} · periodo ${e.periodo}${e.grupo ? ', grupo ' + e.grupo : ''}`;
  const res = $('#res');
  res.className = 'resultado ' + (acierto ? 'ok' : 'mal');
  res.innerHTML = (acierto ? (ctx.casi ? '¡Correcto! (casi: se escribe ' + e.nombre + ')' : '¡Correcto!') : `Era ${e.nombre}`) + `<span class="sub">${dato}</span>`;
  marcador();
  const sig = $('#sig');
  sig.innerHTML = `<button class="btn primary" type="button" id="btnSig">${j.total && j.n >= j.total ? 'Ver resultado' : 'Siguiente'}</button>`;
  $('#btnSig').onclick = siguiente;
  $('#btnSig').focus({ preventScroll: true });
  if (acierto) tAuto = setTimeout(siguiente, 1100);
}
function fin() {
  const j = juego, pct = Math.round((j.ok / j.n) * 100);
  let nuevo = false;
  if (!j.aparte && j.total) {
    const b = estado.best[j.modo];
    if (!b || j.ok / j.total > b.ok / b.total || (j.ok / j.total === b.ok / b.total && j.total > b.total)) { estado.best[j.modo] = { ok: j.ok, total: j.total }; nuevo = true; }
    guardar();
  }
  const frase = pct === 100 ? '¡Perfecto!' : pct >= 80 ? '¡Muy bien!' : pct >= 50 ? 'Vas bien, sigue practicando' : 'A repasar un poco más';
  $('#barra').style.width = '100%';
  $('#pregunta').innerHTML = `<div class="fin"><div class="puntos">${j.ok}/${j.n}</div><h2>${frase}</h2>
    <p class="muted">${pct} % de acierto · mejor racha ${j.mejor}${nuevo ? ' · 🏆 ¡nuevo récord!' : ''}</p>
    ${j.fallos.length ? `<p>Fallaste: ${[...new Map(j.fallos.map(e => [e.z, e])).values()].map(e => `<b>${e.simbolo}</b> ${e.nombre}`).join(', ')}</p>` : ''}
    <div class="acciones"><button class="btn primary" type="button" data-fin="otra">Jugar otra vez</button>
    ${j.fallos.length ? '<button class="btn" type="button" data-fin="fallos">Repasar mis fallos</button>' : ''}
    <button class="btn ghost" type="button" data-fin="menu">Menú</button></div></div>`;
  $('#pregunta').querySelectorAll('[data-fin]').forEach(b => b.onclick = () => {
    if (b.dataset.fin === 'otra') empezar(j.modo, j.aparte ? j.pool : undefined);
    else if (b.dataset.fin === 'fallos') { const u = [...new Map(j.fallos.map(e => [e.z, e])).values()]; empezar(j.modo, u); }
    else ir('jugar');
  });
}

// ---------- progreso ----------
function pintarProgreso() {
  const t = estado.total, vistos = Object.values(estado.stats).filter(s => s.n).length;
  const pct = t.n ? Math.round((t.ok / t.n) * 100) : 0;
  const color = (e) => ['var(--line)', '#fca5a5', '#fcd34d', '#86efac', '#22c55e'][nivel(e.z)];
  const debiles = ELEMENTOS.filter(e => estado.stats[e.z] && estado.stats[e.z].n >= 1 && tasa(e.z) < 1)
    .sort((a, b) => tasa(a.z) - tasa(b.z) || estado.stats[b.z].n - estado.stats[a.z].n).slice(0, 14);
  const body = $('#progreso-body');
  body.innerHTML = `
    <div class="stats">
      <div class="stat"><b>${dominados()}/118</b><span>Dominados</span></div>
      <div class="stat"><b>${vistos}</b><span>Elementos vistos</span></div>
      <div class="stat"><b>${pct} %</b><span>Acierto total</span></div>
      <div class="stat"><b>${estado.dias[hoyStr()] || 0}</b><span>Respuestas hoy</span></div>
    </div>
    <div class="card"><h3>Mapa de dominio</h3>
      <div class="tabla-wrap"><div class="tabla" id="mapa"></div></div>
      <p class="muted" style="font-size:.8rem;margin:8px 0 0">Gris: sin ver · rojo: flojo · amarillo: regular · verde claro: bien · verde: dominado (3+ respuestas y 90 % o más).</p></div>
    <div class="card"><h3>Los que más te cuestan</h3>
      ${debiles.length ? `<div class="debiles">${debiles.map(e => `<span><b>${e.simbolo}</b>${e.nombre} ${Math.round(tasa(e.z) * 100)} %</span>`).join('')}</div>
      <div style="margin-top:10px"><button class="btn primary" type="button" id="repDebiles">Practicar estos</button></div>` : '<p class="muted">Aún no hay fallos registrados. ¡Juega un rato!</p>'}</div>
    <div class="card"><h3>Mejores marcas</h3>
      ${MODOS.map(m => { const b = estado.best[m.id]; return `<div class="fila-modo"><span>${m.nombre}</span><b>${b ? b.ok + '/' + b.total : '—'}</b></div>`; }).join('')}</div>
    <div class="card"><h3>Ajustes</h3>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="optSonido" ${estado.ajustes.sonido ? 'checked' : ''}> Sonidos al responder</label>
      <div style="margin-top:12px"><button class="btn" type="button" id="reiniciar" ${readOnly ? 'disabled' : ''}>Reiniciar progreso</button></div></div>`;
  construirTabla($('#mapa'), { estilo: color, alClick: null });
  $('#mapa').querySelectorAll('.el').forEach(b => { b.style.color = '#14201e'; });
  $('#optSonido').onchange = (ev) => { estado.ajustes.sonido = ev.target.checked; guardar(); };
  const rd = $('#repDebiles'); if (rd) rd.onclick = () => empezar('sim2nom', debiles);
  const rs = $('#reiniciar');
  rs.onclick = () => {
    if (rs.dataset.seguro) {
      const aj = estado.ajustes; estado = estadoInicial(); estado.ajustes = aj; guardar(); pintarProgreso(); toast('Progreso reiniciado');
    } else { rs.dataset.seguro = '1'; rs.textContent = '¿Seguro? Toca otra vez para borrar todo'; setTimeout(() => { if (rs.isConnected) { delete rs.dataset.seguro; rs.textContent = 'Reiniciar progreso'; } }, 4000); }
  };
}

// ---------- eventos globales ----------
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => ir(b.dataset.tab));
function cambiarEstilo() { estado.ajustes.estilo = estado.ajustes.estilo === 'zenban' ? 'propio' : 'zenban'; aplicarEstilo(); guardar(); }
document.querySelectorAll('.estilo').forEach(b => b.onclick = cambiarEstilo);
if (IN_ZENBAN && ZenBanPlugin.onBarClick) ZenBanPlugin.onBarClick(cambiarEstilo);
document.querySelector('[data-act="salir"]').onclick = () => ir('jugar');
document.addEventListener('keydown', (ev) => {
  if (vista !== 'juego' || !juego || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const enCampo = ev.target && ev.target.tagName === 'INPUT';
  if (!juego.resp && !enCampo && /^[1-4]$/.test(ev.key)) {
    const op = document.querySelectorAll('.op')[+ev.key - 1]; if (op) op.click();
  } else if (juego.resp && (ev.key === 'Enter' || ev.key === ' ')) {
    const s = $('#btnSig'); if (s && document.activeElement !== s) { ev.preventDefault(); s.click(); }
  }
});

// ---------- arranque ----------
$('#appVersion').textContent = 'v' + APP_VERSION;
if (IN_ZENBAN) {
  ZenBanPlugin.onInit(({ state, theme, readOnly: ro }) => {
    readOnly = !!ro;
    $('#readonlyBar').hidden = !readOnly;
    if (theme) temaHost = theme === 'light' ? 'light' : 'dark';
    estado = fusionar(state);
    aplicarEstilo();
    pluginReady = true;
    ZenBanPlugin.setTitle(`TablaQuiz · ${dominados()}/118`);
    if (vista !== 'juego') ir(vista);
  });
} else {
  estado = fusionar(cargarLocal());
}
aplicarEstilo();
ir('tabla');
if ('serviceWorker' in navigator && !IN_ZENBAN && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
