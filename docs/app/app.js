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
const CLAVE_DEVICEHUB = 'vincle.guia.devicehub.base.v1';
const CLAVE_DEVICEHUB_TOKEN = 'vincle.guia.devicehub.token.v1';
const CLAVE_BIENVENIDA = 'vincle.guia.bienvenida.v1';
const DEVICEHUB_POR_DEFECTO = 'https://lab6.ereuse.org';
const WORKBENCH_ANDROID_URL = 'https://apps.sergiogimenez.com/workbench';
const DONATE_ANDROID_URL = 'https://aucoop.upc.edu/vincle-digital-donacio/';
const DONATE_ANDROID_APK_URL = 'https://people.ac.upc.edu/leandro/e/donate-android.apk';
const DIGITOS = 6;
const DIA = 24 * 3600 * 1000;

let flujo;
let estados = {};
let moviles = {};
let avisoCarga;
let baseDeviceHub = DEVICEHUB_POR_DEFECTO;
let tokenDeviceHub = '';
// Diagramas y documentación en castellano en la raíz; el resto en <idioma>/.
const prefijoIdioma = idioma === 'es' ? '' : `${idioma}/`;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = (t) => new Date(t).toLocaleDateString(idioma, { day: 'numeric', month: 'short' });
const fechaHora = (t) => new Date(t).toLocaleString(idioma, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// --- Almacenamiento ---------------------------------------------------------

function validarMovil(id, m) {
  if (!/^\d+$/.test(id)) return t('validar.id', { id });
  if (!m || typeof m !== 'object' || Array.isArray(m)) return t('validar.objeto', { id });
  if (m.id !== id) return t('validar.id-interior', { id });
  if (!Number.isFinite(m.creado)) return t('validar.fecha', { id });
  if (!Array.isArray(m.historial)) return t('validar.historial', { id });
  for (const [i, e] of m.historial.entries()) {
    if (!e || typeof e !== 'object' || !Number.isFinite(e.t) ||
        typeof e.desde !== 'string' || typeof e.hacia !== 'string') {
      return t('validar.paso', { id, paso: i + 1 });
    }
  }
  if (m.marcados !== undefined &&
      (!m.marcados || typeof m.marcados !== 'object' || Array.isArray(m.marcados))) {
    return t('validar.checklist', { id });
  }
  return null;
}

function leerMoviles(datos, estricto = false) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error(t('importar.no-coleccion'));
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
    if (errores.length) avisoCarga = t('carga.ignorados', { n: errores.length });
  } catch (err) {
    moviles = {};
    avisoCarga = t('carga.error', { error: err.message });
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(moviles));
  } catch {
    avisar(t('guardar.error'));
  }
}

function normalizarBaseDeviceHub(valor) {
  const url = new URL(String(valor).trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(t('dh.error.protocolo'));
  if (url.username || url.password) throw new Error(t('dh.error.credenciales'));
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.href.replace(/\/$/, '');
}

function cargarBaseDeviceHub() {
  try {
    baseDeviceHub = normalizarBaseDeviceHub(localStorage.getItem(CLAVE_DEVICEHUB) || DEVICEHUB_POR_DEFECTO);
  } catch {
    baseDeviceHub = DEVICEHUB_POR_DEFECTO;
  }
  tokenDeviceHub = localStorage.getItem(CLAVE_DEVICEHUB_TOKEN) || '';
}

const urlAltaDeviceHub = () => `${baseDeviceHub}/product/add/`;
// La guía rellena la etiqueta local hasta seis dígitos para leerla mejor,
// pero DeviceHub guarda el custom_id numérico sin esos ceros iniciales.
const customIdDeviceHub = (id) => String(id).replace(/^0+(?=\d)/, '');
const urlDispositivoDeviceHub = (m) => `${baseDeviceHub}/product/custom_id:${encodeURIComponent(customIdDeviceHub(m.id))}/`;
const urlComponentesDeviceHub = (m) => `${urlDispositivoDeviceHub(m)}#components`;
const urlPropiedadesDeviceHub = (m) => `${urlDispositivoDeviceHub(m)}#user_properties`;
const urlTokensDeviceHub = () => `${baseDeviceHub}/user/v1/tokens/`;
const estadoDeviceHub = (id) => estados[id]?.devicehub ?? id;
const urlEstadoApiDeviceHub = (m) => `${baseDeviceHub}/api/v1/devices/custom_id:${encodeURIComponent(customIdDeviceHub(m.id))}/state/`;

async function peticionDeviceHub(m, opciones = {}) {
  if (!tokenDeviceHub) throw new Error(t('dh.error.sin-token'));
  let respuesta;
  try {
    respuesta = await fetch(urlEstadoApiDeviceHub(m), {
      cache: 'no-store',
      ...opciones,
      headers: {
        Authorization: `Bearer ${tokenDeviceHub}`,
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    throw new Error(t('dh.error.conexion'));
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    if (respuesta.status === 401) throw new Error(t('dh.error.401'));
    throw new Error(datos.detail || datos.error || t('dh.error.estado', { estado: respuesta.status }));
  }
  return datos;
}

function confirmarCambioDeviceHub(m, e, estado) {
  e.dhHecho = true;
  e.dhEstado = estado;
  e.dhT = Date.now();
  guardar();
  pintarMovil(m);
  avisar(t('dh.confirmado', { estado }));
}

async function sincronizarCambioDeviceHub(m, soloComprobar = false) {
  const e = cambioPendiente(m);
  if (!e) return;
  const objetivo = estadoDeviceHub(estadoDe(e.hacia));
  // Al marcar el estado inicial el dispositivo aún no tiene estado.
  const anteriorEsperado = cruza(e) ? estadoDeviceHub(estadoDe(e.desde)) : null;
  const botones = [$('cambiar-estado-devicehub'), $('comprobar-estado-devicehub')].filter(Boolean);
  botones.forEach((b) => { b.disabled = true; });
  if ($('dh-api-mensaje')) $('dh-api-mensaje').textContent = t('dh.comprobando');

  try {
    const consulta = await peticionDeviceHub(m);
    const actual = consulta.current_state;
    if (actual === objetivo) {
      confirmarCambioDeviceHub(m, e, objetivo);
      return;
    }
    if (soloComprobar) {
      throw new Error(actual
        ? t('dh.falta-cambiar', { actual, objetivo })
        : t('dh.sin-estado'));
    }
    if (actual !== null && actual !== anteriorEsperado) {
      throw new Error(t('dh.otro-estado', { actual, esperado: anteriorEsperado }));
    }

    const actualizado = await peticionDeviceHub(m, {
      method: 'POST',
      body: JSON.stringify({
        state: objetivo,
        expected_previous_state: actual,
        comment: e.nota || null,
      }),
    });
    confirmarCambioDeviceHub(m, e, actualizado.current_state);
  } catch (err) {
    if ($('dh-api-mensaje')) $('dh-api-mensaje').textContent = err.message;
    botones.forEach((b) => { b.disabled = false; });
    avisar(err.message);
  }
}

// qrSiempre: descargas que se instalan en el móvil reacondicionado. El QR hace
// falta aunque la guía se use en el móvil personal del operador.
function htmlAccesoAdaptado({ id, url, texto, qr, primario = false, qrSiempre = false }) {
  return `<div class="acceso-devicehub${qrSiempre ? ' qr-siempre' : ''}">
    <a id="${esc(id)}" class="boton${primario ? ' primario' : ''}" href="${esc(url)}">${esc(texto)}</a>
    <div class="qr-devicehub" data-qr-url="${esc(url)}" data-qr-label="${esc(qr)}">
      <strong>${esc(qr)}</strong>
      <div class="qr-lienzo"></div>
      <code>${esc(url)}</code>
    </div>
  </div>`;
}

function modoBienvenida(activo) {
  $('dlg-devicehub').classList.toggle('bienvenida', activo);
  $('devicehub-config-titulo').textContent = t(activo ? 'dh.bienvenida-titulo' : 'dh.titulo');
  $('bienvenida-intro').hidden = !activo;
  $('bienvenida-pasos-token').hidden = !activo;
  $('bienvenida-privacidad').hidden = !activo;
  $('devicehub-token-ayuda').hidden = activo;
  $('devicehub-cancelar').textContent = t(activo ? 'dh.mas-tarde' : 'comun.cancelar');
  $('devicehub-guardar').textContent = t(activo ? 'dh.guardar-empezar' : 'comun.guardar');
}

function primeraVisitaVista() {
  try {
    return Boolean(localStorage.getItem(CLAVE_BIENVENIDA) || localStorage.getItem(CLAVE_DEVICEHUB_TOKEN));
  } catch {
    return false;
  }
}

function marcarBienvenidaVista() {
  try {
    localStorage.setItem(CLAVE_BIENVENIDA, '1');
  } catch {
    // Sin almacenamiento, la bienvenida volverá a aparecer; no bloquea la guía.
  }
}

function abrirConfiguracionDeviceHub(bienvenida = false) {
  modoBienvenida(bienvenida === true);
  $('devicehub-base').value = baseDeviceHub;
  $('devicehub-token').value = tokenDeviceHub;
  $('devicehub-tokens-enlace').href = urlTokensDeviceHub();
  $('devicehub-tokens-enlace-bienvenida').href = urlTokensDeviceHub();
  $('devicehub-error').hidden = true;
  $('dlg-devicehub').showModal();
  $('devicehub-base').focus();
}

// --- Modelo -----------------------------------------------------------------

const nodo = (id) => flujo.nodos[id];
const estadoDe = (id) => nodo(id)?.estado;
const ultimo = (m) => m.historial[m.historial.length - 1];
const pasoActual = (m) => (m.historial.length ? ultimo(m).hacia : estados.INBOX.inicio);
const cruza = (e) => estadoDe(e.desde) !== estadoDe(e.hacia);
// La opción elegida en el idioma actual. `oi` (índice de la opción) falta en
// los pasos guardados antes de las traducciones: se muestra el texto guardado.
const opcionDe = (e) => (e.oi !== undefined && nodo(e.desde)?.opciones?.[e.oi]?.texto) || e.opcion;

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

// Cambio de estado que falta anotar en DeviceHub. En el estado inicial no hay
// entrada que cruce: se marca tras el paso `marcar_tras`, cuando el
// dispositivo ya existe en DeviceHub.
function cambioPendiente(m) {
  const i = indiceEntrada(m);
  const e = i >= 0
    ? m.historial[i]
    : m.historial.find((p) => p.desde === estados.INBOX.marcar_tras);
  return e && !e.dhHecho ? e : null;
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
  if (p.dias < 0) return `<span class="chip plazo-vencido">${esc(t('plazo.vencido', { dias: -p.dias }))}</span>`;
  if (p.dias === 0) return `<span class="chip plazo-vencido">${esc(t('plazo.hoy'))}</span>`;
  return `<span class="chip cp">${esc(t('plazo.quedan', { dias: p.dias, fecha: fecha(p.vence) }))}</span>`;
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
    avisar(t('abrir.no-numero', { texto }));
    return;
  }
  if (!moviles[id]) {
    if (!confirm(t('abrir.alta', { id }))) return;
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
  $('titulo').textContent = m ? t('movil.titulo', { id: m.id }) : t('cabecera.titulo');
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
      <span class="donde">${esc(n?.texto ?? t('lista.paso-perdido'))}</span>
      <span class="linea"><span class="donde">${fecha(actualizado(m))}</span>${chipPlazo(plazo)}</span>
    </button></li>`).join('');
  $('introduccion').hidden = total > 0;
  $('lista-vacia').textContent = total
    ? t('lista.sin-coincidencias')
    : t('lista.vacia');
  $('lista-vacia').hidden = lista.length > 0;
  $('devicehub-base-actual').textContent = baseDeviceHub;
  $('devicehub-token-estado').textContent = t(tokenDeviceHub ? 'conexion.con-token' : 'conexion.sin-token');
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
    const diagramaUrl = `diagramas/${prefijoIdioma}${encodeURIComponent(est)}.png`;
    panelDiagrama.hidden = false;
    $('diagrama-titulo').textContent = t('diagrama.de', { estado: info.nombre });
    $('diagrama-imagen').src = diagramaUrl;
    $('diagrama-imagen').alt = t('diagrama.alt', { estado: info.nombre });
    $('visor-diagrama-titulo').textContent = t('diagrama.de', { estado: info.nombre });
    $('visor-diagrama-imagen').src = diagramaUrl;
    $('visor-diagrama-imagen').alt = t('diagrama.alt-ampliado', { estado: info.nombre });
    $('diagrama-doc').hidden = !info.doc;
    if (info.doc) $('diagrama-doc').href = `../${prefijoIdioma}${info.doc}`;
  } else {
    panelDiagrama.hidden = true;
  }

  // Lo recorrido desde que entró en el estado actual.
  const recorrido = m.historial.slice(indiceEntrada(m) + 1);
  $('recorrido').innerHTML = recorrido.map((e) =>
    `<li>${esc(nodo(e.desde)?.texto ?? e.desde)}${opcionDe(e) ? ` · <b>${esc(opcionDe(e))}</b>` : ''}</li>`).join('');
  $('recorrido').hidden = recorrido.length === 0;

  $('paso').className = `paso ${n?.marca ?? ''}`;
  $('paso').innerHTML = n ? htmlPaso(m, actual, n) : htmlPerdido();
  enlazarPaso(m, actual, n);
  window.renderizarQrsDeviceHub?.();

  $('deshacer').disabled = m.historial.length === 0;
  $('historial').innerHTML = m.historial.map((e) =>
    `<li>${fechaHora(e.t)} · ${esc(estados[estadoDe(e.desde)]?.nombre ?? '?')} · ${esc(nodo(e.desde)?.texto ?? e.desde)}${opcionDe(e) ? ` → ${esc(opcionDe(e))}` : ''}${e.nota ? `<br><i>${esc(e.nota)}</i>` : ''}</li>`).join('')
    || `<li>${esc(t('historial.alta', { fecha: fechaHora(m.creado) }))}</li>`;
}

function htmlMarcas(n) {
  const marcas = [];
  if (n.marca === 'dh') marcas.push(`<span class="chip dh">${esc(t('marca.dh'))}</span>`);
  if (n.marca === 'checkpoint') marcas.push(`<span class="chip cp">${esc(t('marca.checkpoint'))}</span>`);
  return marcas.length ? `<div class="marcas">${marcas.join('')}</div>` : '';
}

function htmlCambio(m) {
  const e = cambioPendiente(m);
  if (!e) return '';
  const nombre = estados[estadoDe(e.hacia)].nombre;
  const url = urlDispositivoDeviceHub(m);
  return `<div class="cambio-dh">
    <span>${t('cambio.texto', { estado: esc(nombre) })}${e.nota ? esc(t('cambio.con-nota')) : '.'}</span>
    ${e.nota ? `<code>${esc(e.nota)}</code><button type="button" id="copiar-nota">${esc(t('cambio.copiar-nota'))}</button>` : ''}
    ${tokenDeviceHub ? `<div class="acciones-devicehub">
      <button type="button" id="cambiar-estado-devicehub" class="primario">${esc(t('cambio.cambiar-a', { estado: nombre }))}</button>
      <button type="button" id="comprobar-estado-devicehub">${esc(t('cambio.solo-comprobar'))}</button>
    </div>
    <span id="dh-api-mensaje" class="sub" role="status">${esc(t('cambio.comprobara'))}</span>`
    : `<p class="sub">${esc(t('cambio.sin-token'))}</p>
      <button type="button" id="configurar-devicehub-paso">${esc(t('cambio.configurar-api'))}</button>`}
    ${htmlAccesoAdaptado({ id: 'abrir-estado-devicehub', url, texto: t('cambio.abrir-movil'), qr: t('cambio.qr-movil') })}
    <span class="sub">${esc(t('cambio.manual', { estado: nombre }))}</span>
    <label class="check"><input type="checkbox" id="dh-hecho"> ${esc(t('cambio.hecho-manual'))}</label>
  </div>`;
}

function htmlDestino(desde, o) {
  const destino = estadoDe(o.destino);
  if (o.pausa) return `<span class="sub">${esc(t('paso.se-queda'))}</span>`;
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
    const webform = actual === 'inbox.scan' ? `<div class="devicehub-webform">
      <strong>${esc(t('webform.titulo'))}</strong>
      <p>${esc(t('webform.explica'))}</p>
      ${htmlAccesoAdaptado({ id: 'abrir-webform-devicehub', url: urlAltaDeviceHub(), texto: t('webform.abrir'), qr: t('webform.qr'), primario: true })}
      <span class="sub">${esc(t('webform.sub'))}</span>
      <button id="configurar-devicehub-paso" class="enlace-boton" type="button">${esc(t('webform.cambiar-servidor', { servidor: baseDeviceHub }))}</button>
    </div>` : '';
    const instalarWorkbench = actual === 'install.wb' ? `<div class="recurso-externo">
      <strong>${esc(t('workbench.titulo'))}</strong>
      <p>${esc(t('workbench.explica'))}</p>
      ${htmlAccesoAdaptado({ id: 'descargar-workbench', url: WORKBENCH_ANDROID_URL, texto: t('workbench.titulo'), qr: t('workbench.qr'), primario: true, qrSiempre: true })}
      <span class="sub">${esc(t('descarga.sub'))}</span>
    </div>` : '';
    const instalarDonate = actual === 'install.donate' ? `<div class="recurso-externo">
      <strong>${esc(t('donate.titulo'))}</strong>
      <p>${t('donate.explica', { url: esc(DONATE_ANDROID_URL) })}</p>
      ${htmlAccesoAdaptado({ id: 'descargar-donate', url: DONATE_ANDROID_APK_URL, texto: t('donate.titulo'), qr: t('donate.qr'), primario: true, qrSiempre: true })}
      <span class="sub">${esc(t('descarga.sub'))}</span>
    </div>` : '';
    const verInventario = actual === 'install.inventario' ? `<div class="recurso-externo">
      <strong>${esc(t('inventario.titulo'))}</strong>
      <p>${esc(t('inventario.explica'))}</p>
      <a id="ver-componentes-devicehub" class="boton" href="${esc(urlComponentesDeviceHub(m))}">${esc(t('inventario.ver'))}</a>
    </div>` : '';
    const verResultados = actual === 'test.wb' ? `<div class="recurso-externo">
      <strong>${esc(t('resultados.titulo'))}</strong>
      <p>${t('resultados.explica')}</p>
      <a id="ver-resultados-devicehub" class="boton" href="${esc(urlPropiedadesDeviceHub(m))}">${esc(t('resultados.ver'))}</a>
    </div>` : '';
    return `${htmlCambio(m)}${htmlMarcas(n)}
      <p class="pregunta">${esc(n.texto)}</p>${ayuda}
      ${webform}${instalarDonate}${instalarWorkbench}${verInventario}${verResultados}
      ${lista ? `<ul class="checklist">${lista}</ul>` : ''}
      <div class="opciones"><button class="primario" id="hecho" ${bloqueado || !completo ? 'disabled' : ''}>
        <span>${esc(t('paso.hecho'))}</span>${htmlDestino(actual, { destino: n.siguiente })}</button></div>`;
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
  return `<p class="pregunta">${esc(t('perdido.titulo'))}</p>
    <p class="ayuda">${esc(t('perdido.explica'))}</p>
    <div class="opciones">${botones}</div>`;
}

function enlazarPaso(m, actual, n) {
  const paso = $('paso');

  $('dh-hecho')?.addEventListener('change', (ev) => {
    if (!ev.target.checked) return;
    if (!confirm(t('cambio.confirmar-manual'))) {
      ev.target.checked = false;
      return;
    }
    const e = cambioPendiente(m);
    confirmarCambioDeviceHub(m, e, estadoDeviceHub(estadoDe(e.hacia)));
  });
  $('cambiar-estado-devicehub')?.addEventListener('click', () => sincronizarCambioDeviceHub(m));
  $('comprobar-estado-devicehub')?.addEventListener('click', () => sincronizarCambioDeviceHub(m, true));
  $('copiar-nota')?.addEventListener('click', () => copiar(cambioPendiente(m).nota));
  $('configurar-devicehub-paso')?.addEventListener('click', abrirConfiguracionDeviceHub);

  paso.querySelectorAll('[data-reubicar]').forEach((b) => b.addEventListener('click', () => {
    const e = estados[b.dataset.reubicar];
    avanzar(m, { desde: actual, hacia: e.inicio, opcion: t('perdido.reubicado', { estado: e.nombre }) });
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
      !confirm(t('elegir.quedan', { dias: plazo.dias, fecha: fecha(plazo.vence) }))) return;

  let nota;
  if (o.nota || o.foto) {
    nota = await pedirNota(o);
    if (nota === null) return;
  }
  avanzar(m, { desde: actual, hacia: o.destino, opcion: o.texto, oi: n.opciones.indexOf(o), nota });
  if (o.pausa) {
    avisar(t('elegir.sigue', { id: m.id, paso: n.texto }));
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
  const lineas = [t('historial.cabecera', { id: m.id, fecha: fechaHora(m.creado) })];
  m.historial.forEach((e) => {
    let l = `${fechaHora(e.t)} · ${estados[estadoDe(e.desde)]?.nombre ?? '?'} · ${nodo(e.desde)?.texto ?? e.desde}`;
    if (opcionDe(e)) l += ` → ${opcionDe(e)}`;
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
    avisar(t('copiar.hecho'));
  } catch {
    prompt(t('copiar.manual'), texto);
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
    avisar(t('escaner.error', { error: err.message }));
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
    if (!datos || !Object.hasOwn(datos, 'moviles')) throw new Error(t('importar.sin-moviles'));
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
    avisar(t('importar.hecho', { n: nuevos }));
  } catch (err) {
    avisar(t('importar.error', { error: err.message }));
  }
}

// --- Borrado ----------------------------------------------------------------

function borrarMovil() {
  const id = location.hash.split('/')[2];
  if (!moviles[id]) return;
  if (!confirm(t('borrar.confirmar-uno', { id }))) return;
  delete moviles[id];
  guardar();
  location.hash = '';
  avisar(t('borrar.hecho-uno', { id }));
}

function borrarTodo() {
  const total = Object.keys(moviles).length;
  if (!total) {
    avisar(t('borrar.ninguno'));
    return;
  }
  if (!confirm(t('borrar.confirmar-todos', { n: total }))) return;
  moviles = {};
  guardar();
  pintarLista();
  avisar(t('borrar.hecho-todos'));
}

// --- Arranque ---------------------------------------------------------------

function prepararIdioma() {
  traducirDocumento();
  const selector = $('idioma');
  selector.innerHTML = Object.entries(IDIOMAS)
    .map(([codigo, nombre]) => `<option value="${codigo}" lang="${codigo}" title="${esc(nombre)}" aria-label="${esc(nombre)}">${codigo.toUpperCase()}</option>`).join('');
  selector.value = idioma;
  selector.addEventListener('change', () => cambiarIdioma(selector.value));
  $('enlace-ayuda').href = `../${prefijoIdioma}guia-app/`;
}

async function iniciar() {
  prepararIdioma();
  cargar();
  cargarBaseDeviceHub();
  try {
    flujo = await (await fetch(idioma === 'es' ? 'flujo.json' : `flujo.${idioma}.json`, { cache: 'no-cache' })).json();
  } catch {
    document.body.innerHTML = `<main><p>${esc(t('carga.flujo'))}</p></main>`;
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
    const descripcion = t('cita', { texto: `${nodo(e.desde)?.texto ?? e.desde}${opcionDe(e) ? ` → ${opcionDe(e)}` : ''}` });
    if (cruza(e) && e.dhHecho) {
      const anterior = estados[estadoDe(e.desde)]?.nombre ?? estadoDe(e.desde);
      if (!confirm(t('deshacer.ya-en-dh', { paso: descripcion, anterior }))) return;
    } else if (!confirm(t('deshacer.confirmar', { paso: descripcion }))) return;
    m.historial.pop();
    guardar();
    pintarMovil(m);
  });
  $('copiar-historial').addEventListener('click', () => copiar(textoHistorial(moviles[location.hash.split('/')[2]])));
  $('borrar-movil').addEventListener('click', borrarMovil);
  $('exportar').addEventListener('click', exportar);
  $('borrar-todo').addEventListener('click', borrarTodo);
  $('importar').addEventListener('change', (ev) => ev.target.files[0] && importar(ev.target.files[0]));
  $('configurar-devicehub').addEventListener('click', () => abrirConfiguracionDeviceHub());
  $('configurar-devicehub-cabecera').addEventListener('click', () => abrirConfiguracionDeviceHub());
  $('devicehub-cancelar').addEventListener('click', () => {
    marcarBienvenidaVista();
    $('dlg-devicehub').close();
  });
  $('dlg-devicehub').addEventListener('cancel', marcarBienvenidaVista);
  // Mientras se escribe la URL base, el enlace a los tokens apunta al servidor nuevo.
  $('devicehub-base').addEventListener('input', () => {
    try {
      const url = `${normalizarBaseDeviceHub($('devicehub-base').value)}/user/v1/tokens/`;
      $('devicehub-tokens-enlace').href = url;
      $('devicehub-tokens-enlace-bienvenida').href = url;
    } catch {
      // URL incompleta mientras se escribe: se mantiene el enlace anterior.
    }
  });
  $('form-devicehub').addEventListener('submit', (ev) => {
    ev.preventDefault();
    try {
      baseDeviceHub = normalizarBaseDeviceHub($('devicehub-base').value);
      tokenDeviceHub = $('devicehub-token').value.trim();
      if (tokenDeviceHub && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tokenDeviceHub)) {
        throw new Error(t('dh.error.token-uuid'));
      }
      localStorage.setItem(CLAVE_DEVICEHUB, baseDeviceHub);
      if (tokenDeviceHub) localStorage.setItem(CLAVE_DEVICEHUB_TOKEN, tokenDeviceHub);
      else localStorage.removeItem(CLAVE_DEVICEHUB_TOKEN);
      marcarBienvenidaVista();
      $('dlg-devicehub').close();
      $('devicehub-base-actual').textContent = baseDeviceHub;
      $('devicehub-token-estado').textContent = t(tokenDeviceHub ? 'conexion.con-token' : 'conexion.sin-token');
      $('devicehub-tokens-enlace').href = urlTokensDeviceHub();
      const m = moviles[location.hash.split('/')[2]];
      if (m) pintarMovil(m);
      avisar(t('dh.guardada'));
    } catch (err) {
      $('devicehub-error').textContent = t('dh.url-invalida', { error: err.message });
      $('devicehub-error').hidden = false;
    }
  });
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
  if (!primeraVisitaVista()) abrirConfiguracionDeviceHub(true);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

iniciar();
