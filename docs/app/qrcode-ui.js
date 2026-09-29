import QRCode from './vendor/qrcode/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CORRECCION_MEDIA = 0;

const agenteMovil = navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const tactilPequeno = (navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches) && innerWidth < 900;
document.documentElement.classList.add(agenteMovil || tactilPequeno ? 'dispositivo-movil' : 'dispositivo-escritorio');

function crearSvgQr(url, etiqueta) {
  const qr = new QRCode(0, CORRECCION_MEDIA);
  qr.addData(url);
  qr.make();

  const margen = 4;
  const modulos = qr.getModuleCount();
  const lado = modulos + margen * 2;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${lado} ${lado}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', etiqueta);
  svg.setAttribute('shape-rendering', 'crispEdges');

  const fondo = document.createElementNS(SVG_NS, 'rect');
  fondo.setAttribute('width', String(lado));
  fondo.setAttribute('height', String(lado));
  fondo.setAttribute('fill', '#fff');
  svg.append(fondo);

  let dibujo = '';
  for (let fila = 0; fila < modulos; fila++) {
    for (let columna = 0; columna < modulos; columna++) {
      if (qr.isDark(fila, columna)) dibujo += `M${columna + margen} ${fila + margen}h1v1h-1z`;
    }
  }
  const tinta = document.createElementNS(SVG_NS, 'path');
  tinta.setAttribute('d', dibujo);
  tinta.setAttribute('fill', '#000');
  svg.append(tinta);
  return svg;
}

function renderizarQrsDeviceHub() {
  document.querySelectorAll('.qr-devicehub[data-qr-url]').forEach((contenedor) => {
    const url = contenedor.dataset.qrUrl;
    if (contenedor.dataset.qrRenderizado === url) return;
    try {
      const lienzo = contenedor.querySelector('.qr-lienzo');
      lienzo.replaceChildren(crearSvgQr(url, contenedor.dataset.qrLabel));
      contenedor.dataset.qrRenderizado = url;
      contenedor.closest('.acceso-devicehub')?.classList.add('qr-listo');
    } catch (error) {
      console.error('No se ha podido generar el QR de DeviceHub:', error);
    }
  });
}

window.renderizarQrsDeviceHub = renderizarQrsDeviceHub;
renderizarQrsDeviceHub();
