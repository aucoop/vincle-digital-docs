'use strict';

// Guía del flujo de reacondicionado. Lee la máquina de estados de flujo.json
// (generado desde flujo/flujo.yaml) y guarda el recorrido de cada móvil en
// este navegador.
//
// Un móvil es {id, creado, historial, marcados}. Cada entrada del historial es
// un paso dado: {t, desde, hacia, opcion, nota?, dhHecho?}. Todo lo demás (paso
// actual, estado de DeviceHub, fecha de entrada en el estado) sale del historial,
// así que deshacer es quitar la última entrada.

const CLAVE = 'vincle.guia.moviles.v1';
const DIGITOS = 6;
const DIA = 24 * 3600 * 1000;

let flujo;
let estados = {};
let moviles = {};
let avisoCarga;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = (t) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' });
const fechaHora = (t) => new Date(t).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// --- Almacenamiento ---------------------------------------------------------

function validarMovil(id, m) {
  if (!/^\d+$/.test(id)) return `identificador «${id}» no numérico`;
  if (!m || typeof m !== 'object' || Array.isArray(m)) return `móvil ${id} no es un objeto`;
  if (m.id !== id) return `móvil ${id}: el identificador interior no coincide`;
  if (!Number.isFinite(m.creado)) return `móvil ${id}: fecha de alta inválida`;
  if (!Array.isArray(m.historial)) return `móvil ${id}: historial inválido`;
  for (const [i, e] of m.historial.entries()) {
    if (!e || typeof e !== 'object' || !Number.isFinite(e.t) ||
        typeof e.desde !== 'string' || typeof e.hacia !== 'string') {
      return `móvil ${id}: paso ${i + 1} del historial inválido`;
    }
  }
  if (m.marcados !== undefined &&
      (!m.marcados || typeof m.marcados !== 'object' || Array.isArray(m.marcados))) {
    return `móvil ${id}: checklist inválido`;
  }
  return null;
}

function leerMoviles(datos, estricto = false) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('la copia no contiene una colección de móviles válida');
  }
  const validos = {};
  const errores = [];
  for (const [id, m] of Object.entries(datos)) {
    const error = validarMovil(id, m);
    if (error) errores.push(error);
    else validos[id] = m;
  }
  if (estricto && errores.length) throw new Error(errores.join('; '));
  return { validos, errores };
}

function cargar() {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE)) || {};
    const { validos, errores } = leerMoviles(guardados);
    moviles = validos;
    if (errores.length) avisoCarga = `Se han ignorado ${errores.length} móviles con datos dañados.`;
  } catch (err) {
    moviles = {};
    avisoCarga = `No se han podido cargar los datos guardados: ${err.message}`;
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(moviles));
  } catch {
    avisar('No se ha podido guardar. Exporta una copia de seguridad.');
  }
}

// --- Modelo -----------------------------------------------------------------

const nodo = (id) => flujo.nodos[id];
const estadoDe = (id) => nodo(id)?.estado;
const ultimo = (m) => m.historial[m.historial.length - 1];
const pasoActual = (m) => (m.historial.length ? ultimo(m).hacia : estados.INBOX.inicio);
const cruza = (e) => estadoDe(e.desde) !== estadoDe(e.hacia);

// Índice de la entrada con la que se entró en el estado actual (-1 si es el inicial).
function indiceEntrada(m) {
  for (let i = m.historial.length - 1; i >= 0; i--) {
    if (cruza(m.historial[i])) return i;
  }
  return -1;
}

function entradaEstado(m) {
  const i = indiceEntrada(m);
  return i >= 0 ? m.historial[i].t : m.creado;
}

function plazoDe(m, n) {
  if (!n?.plazo) return null;
  let inicio = entradaEstado(m);
  if (n.plazo.desde !== 'estado') {
    const e = [...m.historial].reverse().find((e) => e.desde === n.plazo.desde);
    if (e) inicio = e.t;
  }
  const vence = inicio + n.plazo.dias * DIA;
  return { vence, dias: Math.ceil((vence - Date.now()) / DIA) };
}

// Cambio de estado que falta anotar a mano en DeviceHub.
function cambioPendiente(m) {
  const i = indiceEntrada(m);
  if (i < 0) return null;
  const e = m.historial[i];
  if (e.dhHecho || estados[estadoDe(e.hacia)].cambio === 'automatico') return null;
  return e;
}

function actualizado(m) {
  return m.historial.length ? ultimo(m).t : m.creado;
}

function claseEstado(id) {
  if (id === 'DISMANTLE') return 'rej';
  return estados[id]?.nuevo ? 'nuevo' : 'ok';
}

function chipEstado(id) {
  return `<span class="chip ${claseEstado(id)}">${esc(estados[id]?.nombre ?? id)}</span>`;
}

function chipPlazo(p) {
  if (!p) return '';
  if (p.dias < 0) return `<span class="chip plazo-vencido">Vencido hace ${-p.dias} d</span>`;
  if (p.dias === 0) return `<span class="chip plazo-vencido">Vence hoy</span>`;
  return `<span class="chip cp">Quedan ${p.dias} d · ${fecha(p.vence)}</span>`;
}

// --- Navegación -------------------------------------------------------------

function normalizarId(texto) {
  const id = String(texto).trim();
  if (!/^\d+$/.test(id)) return null;
  return id.length < DIGITOS ? id.padStart(DIGITOS, '0') : id;
}

function abrir(texto) {
  const id = normalizarId(texto);
  if (!id) {
    avisar(`«${texto}» no es un número de etiqueta.`);
    return;
  }
  if (!moviles[id]) {
    if (!confirm(`El móvil ${id} no está en este dispositivo. ¿Darlo de alta como recibido?`)) return;
    moviles[id] = { id, creado: Date.now(), historial: [], marcados: {} };
    guardar();
  }
  location.hash = `#/m/${id}`;
}

function ruta() {
  const coincide = location.hash.match(/^#\/m\/(\d+)$/);
  const m = coincide && moviles[coincide[1]];
  $('vista-lista').hidden = !!m;
  $('vista-movil').hidden = !m;
  $('volver').hidden = !m;
  $('titulo').textContent = m ? `Móvil ${m.id}` : 'Guía de reacondicionado';
  if (m) pintarMovil(m);
  else pintarLista();
  window.scrollTo(0, 0);
}

// --- Lista ------------------------------------------------------------------

function pintarLista() {
  const filtro = $('filtro').value;
  const total = Object.keys(moviles).length;
  let lista = Object.values(moviles).map((m) => {
    const n = nodo(pasoActual(m));
    return { m, n, plazo: plazoDe(m, n) };
  });
  if (filtro === 'activos') lista = lista.filter((x) => x.n?.tipo !== 'fin');
  if (filtro === 'plazo') {
    lista = lista.filter((x) => x.plazo).sort((a, b) => a.plazo.vence - b.plazo.vence);
  } else {
    lista.sort((a, b) => actualizado(b.m) - actualizado(a.m));
  }

  $('lista').innerHTML = lista.map(({ m, n, plazo }) => `
    <li><button data-id="${esc(m.id)}">
      <span class="linea"><span class="id">${esc(m.id)}</span>${chipEstado(n?.estado)}</span>
      <span class="donde">${esc(n?.texto ?? 'Paso que ya no existe en el flujo')}</span>
      <span class="linea"><span class="donde">${fecha(actualizado(m))}</span>${chipPlazo(plazo)}</span>
    </button></li>`).join('');
  $('introduccion').hidden = total > 0;
  $('lista-vacia').textContent = total
    ? 'No hay móviles que coincidan con este filtro.'
    : 'No hay móviles guardados en este navegador. Empieza con una etiqueta arriba.';
  $('lista-vacia').hidden = lista.length > 0;
}

// --- Móvil ------------------------------------------------------------------

function pintarMovil(m) {
  const actual = pasoActual(m);
  const n = nodo(actual);
  const est = n?.estado;

  // Mapa de estados: los del camino normal en línea, y aparte los de salida.
  const visitados = new Set([estados.INBOX.id]);
  m.historial.forEach((e) => { visitados.add(estadoDe(e.desde)); visitados.add(estadoDe(e.hacia)); });
  $('mapa').innerHTML = flujo.estados.map((e) => {
    const clases = ['parada'];
    if (e.id === est) clases.push('actual');
    else if (visitados.has(e.id)) clases.push('visitada');
    if (e.nuevo) clases.push('nuevo');
    if (e.salida || e.id === 'REPAIR') clases.push('aparte');
    return `<div class="${clases.join(' ')}"><span class="punto">${visitados.has(e.id) && e.id !== est ? '✓' : ''}</span>${esc(e.nombre)}</div>`;
  }).join('');
  $('mapa').querySelector('.actual')?.scrollIntoView({ inline: 'center', block: 'nearest' });

  const info = estados[est];
  $('estado-info').innerHTML = info
    ? `<span>${chipEstado(est)} <span class="resumen">${esc(info.resumen)}</span></span>`
    : '';
  const panelDiagrama = $('diagrama-estado');
  if (info) {
    const diagramaUrl = `diagramas/${encodeURIComponent(est)}.png`;
    panelDiagrama.hidden = false;
    $('diagrama-titulo').textContent = `Diagrama de ${info.nombre}`;
    $('diagrama-imagen').src = diagramaUrl;
    $('diagrama-imagen').alt = `Diagrama del estado ${info.nombre}`;
    $('visor-diagrama-titulo').textContent = `Diagrama de ${info.nombre}`;
    $('visor-diagrama-imagen').src = diagramaUrl;
    $('visor-diagrama-imagen').alt = `Diagrama ampliado del estado ${info.nombre}`;
    $('diagrama-doc').hidden = !info.doc;
    if (info.doc) $('diagrama-doc').href = `../${info.doc}`;
  } else {
    panelDiagrama.hidden = true;
  }

  // Lo recorrido desde que entró en el estado actual.
  const recorrido = m.historial.slice(indiceEntrada(m) + 1);
  $('recorrido').innerHTML = recorrido.map((e) =>
    `<li>${esc(nodo(e.desde)?.texto ?? e.desde)}${e.opcion ? ` · <b>${esc(e.opcion)}</b>` : ''}</li>`).join('');
  $('recorrido').hidden = recorrido.length === 0;

  $('paso').className = `paso ${n?.marca ?? ''}`;
  $('paso').innerHTML = n ? htmlPaso(m, actual, n) : htmlPerdido();
  enlazarPaso(m, actual, n);

  $('deshacer').disabled = m.historial.length === 0;
  $('historial').innerHTML = m.historial.map((e) =>
    `<li>${fechaHora(e.t)} · ${esc(estados[estadoDe(e.desde)]?.nombre ?? '?')} · ${esc(nodo(e.desde)?.texto ?? e.desde)}${e.opcion ? ` → ${esc(e.opcion)}` : ''}${e.nota ? `<br><i>${esc(e.nota)}</i>` : ''}</li>`).join('')
    || `<li>Alta el ${fechaHora(m.creado)}</li>`;
}

function htmlMarcas(n) {
  const marcas = [];
  if (n.marca === 'dh') marcas.push('<span class="chip dh">Queda en DeviceHub</span>');
  if (n.marca === 'checkpoint') marcas.push('<span class="chip cp">Checkpoint</span>');
  return marcas.length ? `<div class="marcas">${marcas.join('')}</div>` : '';
}

function htmlCambio(m) {
  const e = cambioPendiente(m);
  if (!e) return '';
  const nombre = estados[estadoDe(e.hacia)].nombre;
  return `<div class="cambio-dh">
    <span>Cambia el estado en DeviceHub a <b>${esc(nombre)}</b>${e.nota ? ' con esta nota:' : '.'}</span>
    ${e.nota ? `<code>${esc(e.nota)}</code><button type="button" id="copiar-nota">Copiar nota</button>` : ''}
    <label class="check"><input type="checkbox" id="dh-hecho"> Hecho en DeviceHub</label>
  </div>`;
}

function htmlDestino(desde, o) {
  const destino = estadoDe(o.destino);
  if (o.pausa) return '<span class="sub">El móvil se queda en este paso</span>';
  if (destino !== estadoDe(desde)) {
    const motivo = o.nota?.motivo ? ` [${esc(o.nota.motivo)}]` : '';
    return `<span class="chip ${claseEstado(destino)}">→ ${esc(estados[destino].nombre)}${motivo}</span>`;
  }
  return '';
}

function htmlPaso(m, actual, n) {
  const bloqueado = !!cambioPendiente(m);
  const ayuda = n.ayuda ? `<p class="ayuda">${esc(n.ayuda)}</p>` : '';

  if (n.tipo === 'fin') {
    return `${htmlCambio(m)}<div class="fin"><p class="pregunta">${esc(n.texto)}</p>${ayuda}</div>`;
  }

  const plazo = plazoDe(m, n);
  const htmlPlazo = plazo
    ? `<div class="plazo">${chipPlazo(plazo)}</div>`
    : '';

  if (n.tipo === 'accion') {
    const marcados = m.marcados?.[actual] ?? [];
    const lista = (n.checklist ?? []).map((c, i) =>
      `<li><label class="check"><input type="checkbox" data-i="${i}" ${marcados[i] ? 'checked' : ''}> ${esc(c)}</label></li>`).join('');
    const completo = (n.checklist ?? []).every((_, i) => marcados[i]);
    return `${htmlCambio(m)}${htmlMarcas(n)}
      <p class="pregunta">${esc(n.texto)}</p>${ayuda}
      ${lista ? `<ul class="checklist">${lista}</ul>` : ''}
      <div class="opciones"><button class="primario" id="hecho" ${bloqueado || !completo ? 'disabled' : ''}>
        <span>Hecho</span>${htmlDestino(actual, { destino: n.siguiente })}</button></div>`;
  }

  const opciones = n.opciones.map((o, i) => `
    <button data-i="${i}" class="${o.pausa ? 'pausa' : ''}" ${bloqueado ? 'disabled' : ''}>
      <span>${esc(o.texto)}${o.ayuda ? `<span class="sub">${esc(o.ayuda)}</span>` : ''}</span>
      ${htmlDestino(actual, o)}
    </button>`).join('');
  return `${htmlCambio(m)}${htmlMarcas(n)}
    <p class="pregunta">${esc(n.texto)}</p>${ayuda}${htmlPlazo}
    <div class="opciones">${opciones}</div>`;
}

function htmlPerdido() {
  const botones = flujo.estados.map((e) => `<button data-reubicar="${esc(e.id)}"><span>${esc(e.nombre)}</span></button>`).join('');
  return `<p class="pregunta">Este paso ya no existe en el flujo</p>
    <p class="ayuda">El flujo ha cambiado desde que se guardó el móvil. Elige en qué estado está ahora; empezará por su primer paso.</p>
    <div class="opciones">${botones}</div>`;
}

function enlazarPaso(m, actual, n) {
  const paso = $('paso');

  $('dh-hecho')?.addEventListener('change', () => {
    cambioPendiente(m).dhHecho = true;
    guardar();
    pintarMovil(m);
  });
  $('copiar-nota')?.addEventListener('click', () => copiar(cambioPendiente(m).nota));

  paso.querySelectorAll('[data-reubicar]').forEach((b) => b.addEventListener('click', () => {
    const e = estados[b.dataset.reubicar];
    avanzar(m, { desde: actual, hacia: e.inicio, opcion: `Reubicado en ${e.nombre} tras un cambio del flujo` });
  }));

  if (!n) return;

  if (n.tipo === 'accion') {
    paso.querySelectorAll('.checklist input').forEach((c) => c.addEventListener('change', () => {
      m.marcados ??= {};
      (m.marcados[actual] ??= [])[c.dataset.i] = c.checked;
      guardar();
      pintarMovil(m);
    }));
    $('hecho')?.addEventListener('click', () => avanzar(m, { desde: actual, hacia: n.siguiente }));
  }

  if (n.tipo === 'pregunta') {
    paso.querySelectorAll('.opciones button').forEach((b) => b.addEventListener('click', () => elegir(m, actual, n, n.opciones[b.dataset.i])));
  }
}

async function elegir(m, actual, n, o) {
  const plazo = plazoDe(m, n);
  if (o.vence && plazo && plazo.dias > 0 &&
      !confirm(`Aún quedan ${plazo.dias} días de plazo (hasta el ${fecha(plazo.vence)}). ¿Seguro?`)) return;

  let nota;
  if (o.nota || o.foto) {
    nota = await pedirNota(o);
    if (nota === null) return;
  }
  avanzar(m, { desde: actual, hacia: o.destino, opcion: o.texto, nota });
  if (o.pausa) {
    avisar(`Móvil ${m.id}: sigue en «${n.texto}».`);
    location.hash = '';
  }
}

function avanzar(m, paso) {
  m.historial.push({ t: Date.now(), ...paso });
  if (m.marcados) delete m.marcados[paso.desde];
  guardar();
  pintarMovil(m);
  $('paso').scrollIntoView({ block: 'nearest' });
}

function pedirNota(o) {
  return new Promise((resolver) => {
    const dlg = $('dlg-nota');
    const destino = estados[estadoDe(o.destino)].nombre;
    $('nota-titulo').textContent = `${o.texto} → ${destino}`;
    const prefijo = o.nota?.motivo ? `[${o.nota.motivo}] ` : '';
    $('nota-texto').value = prefijo + (o.nota?.texto ?? '');
    $('nota-foto').hidden = !o.foto;
    $('nota-foto-ok').checked = false;
    const comprobar = () => { $('nota-ok').disabled = o.foto && !$('nota-foto-ok').checked; };
    $('nota-foto-ok').onchange = comprobar;
    comprobar();
    dlg.onclose = () => {
      const texto = $('nota-texto').value.trim();
      resolver(dlg.returnValue === 'ok' ? texto : null);
    };
    dlg.returnValue = '';
    dlg.showModal();
    const t = $('nota-texto');
    t.focus();
    t.setSelectionRange(t.value.length, t.value.length);
  });
}

function textoHistorial(m) {
  const lineas = [`Móvil ${m.id} · alta ${fechaHora(m.creado)}`];
  m.historial.forEach((e) => {
    let l = `${fechaHora(e.t)} · ${estados[estadoDe(e.desde)]?.nombre ?? '?'} · ${nodo(e.desde)?.texto ?? e.desde}`;
    if (e.opcion) l += ` → ${e.opcion}`;
    if (cruza(e)) l += ` ⇒ ${estados[estadoDe(e.hacia)]?.nombre ?? '?'}`;
    if (e.nota) l += ` · ${e.nota}`;
    lineas.push(l);
  });
  return lineas.join('\n');
}

// --- Utilidades -------------------------------------------------------------

let temporizadorAviso;
function avisar(texto) {
  const a = $('aviso');
  a.textContent = texto;
  a.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { a.hidden = true; }, 3500);
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    avisar('Copiado');
  } catch {
    prompt('Copia el texto:', texto);
  }
}

// --- Escáner QR -------------------------------------------------------------

async function escanear() {
  const dlg = $('dlg-escaner');
  const video = $('video');
  let flujoVideo;
  let activo = true;
  dlg.onclose = () => {
    activo = false;
    flujoVideo?.getTracks().forEach((t) => t.stop());
  };
  try {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    flujoVideo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = flujoVideo;
    dlg.showModal();
    await video.play();
    while (activo) {
      const codigos = await detector.detect(video).catch(() => []);
      if (codigos.length) {
        dlg.close();
        abrir(codigos[0].rawValue);
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  } catch (err) {
    if (dlg.open) dlg.close();
    avisar(`No se puede usar la cámara: ${err.message}. Teclea el número.`);
  }
}

// --- Copia de seguridad -----------------------------------------------------

function exportar() {
  const datos = JSON.stringify({ exportado: new Date().toISOString(), moviles }, null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([datos], { type: 'application/json' }));
  a.download = `vincle-guia-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importar(archivo) {
  try {
    const datos = JSON.parse(await archivo.text());
    if (!datos || !Object.hasOwn(datos, 'moviles')) throw new Error('la copia no contiene «moviles»');
    const { validos: entrantes } = leerMoviles(datos.moviles, true);
    const mezclados = { ...moviles };
    let nuevos = 0;
    for (const [id, m] of Object.entries(entrantes)) {
      // Se queda la versión con más pasos.
      if (!mezclados[id] || m.historial.length > mezclados[id].historial.length) {
        mezclados[id] = m;
        nuevos++;
      }
    }
    moviles = mezclados;
    guardar();
    pintarLista();
    avisar(`${nuevos} móviles importados o actualizados.`);
  } catch (err) {
    avisar(`No se ha podido importar: ${err.message}`);
  }
}

// --- Arranque ---------------------------------------------------------------

async function iniciar() {
  cargar();
  try {
    flujo = await (await fetch('flujo.json', { cache: 'no-cache' })).json();
  } catch {
    document.body.innerHTML = '<main><p>No se ha podido cargar el flujo. Abre la app una vez con conexión.</p></main>';
    return;
  }
  estados = Object.fromEntries(flujo.estados.map((e) => [e.id, e]));

  if (!('BarcodeDetector' in window)) {
    $('escanear').hidden = true;
    $('sin-escaner').hidden = false;
  }
  $('escanear').addEventListener('click', escanear);
  $('form-id').addEventListener('submit', (ev) => {
    ev.preventDefault();
    abrir($('input-id').value);
    $('input-id').value = '';
  });
  $('lista').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-id]');
    if (b) location.hash = `#/m/${b.dataset.id}`;
  });
  $('filtro').addEventListener('change', pintarLista);
  $('volver').addEventListener('click', () => { location.hash = ''; });
  $('deshacer').addEventListener('click', () => {
    const m = moviles[location.hash.split('/')[2]];
    if (!m?.historial.length) return;
    const e = ultimo(m);
    const descripcion = `«${nodo(e.desde)?.texto ?? e.desde}${e.opcion ? ` → ${e.opcion}` : ''}»`;
    if (cruza(e) && e.dhHecho) {
      const anterior = estados[estadoDe(e.desde)]?.nombre ?? estadoDe(e.desde);
      if (!confirm(`Este cambio ya se marcó como hecho en DeviceHub. Antes de deshacer ${descripcion}, devuelve allí el estado a ${anterior}.\n\n¿Ya lo has hecho?`)) return;
    } else if (!confirm(`¿Deshacer ${descripcion}?`)) return;
    m.historial.pop();
    guardar();
    pintarMovil(m);
  });
  $('copiar-historial').addEventListener('click', () => copiar(textoHistorial(moviles[location.hash.split('/')[2]])));
  $('exportar').addEventListener('click', exportar);
  $('importar').addEventListener('change', (ev) => ev.target.files[0] && importar(ev.target.files[0]));
  const centrarDiagrama = () => requestAnimationFrame(() => {
    const contenedor = document.querySelector('.diagrama-scroll');
    contenedor.scrollLeft = (contenedor.scrollWidth - contenedor.clientWidth) / 2;
    contenedor.scrollTop = 0;
  });
  $('diagrama-estado').addEventListener('toggle', () => {
    if ($('diagrama-estado').open) centrarDiagrama();
  });
  $('diagrama-imagen').addEventListener('load', () => {
    if ($('diagrama-estado').open) centrarDiagrama();
  });
  const dlgDiagrama = $('dlg-diagrama');
  $('diagrama-ampliar').addEventListener('click', () => {
    dlgDiagrama.showModal();
    requestAnimationFrame(() => {
      const visor = document.querySelector('.visor-diagrama');
      visor.scrollLeft = (visor.scrollWidth - visor.clientWidth) / 2;
      visor.scrollTop = 0;
    });
  });
  $('diagrama-cerrar').addEventListener('click', () => dlgDiagrama.close());

  const conexion = () => { $('offline').hidden = navigator.onLine; };
  addEventListener('online', conexion);
  addEventListener('offline', conexion);
  conexion();

  addEventListener('hashchange', ruta);
  ruta();
  if (avisoCarga) avisar(avisoCarga);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

iniciar();
