// Botón «Guía» en la cabecera de Zensical para abrir la PWA (docs/app/).
// La raíz del sitio se deduce de la hoja extra.css, que siempre cuelga de ella,
// así que funciona igual en local y en GitHub Pages.
(function () {
  function raizSitio() {
    const hoja = document.querySelector('link[href*="stylesheets/extra.css"]');
    return hoja ? new URL('../', hoja.href) : new URL('./', location.href);
  }

  function anadirAcceso() {
    const cabecera = document.querySelector('.md-header__inner');
    if (!cabecera || cabecera.querySelector('.acceso-guia')) return;
    const raiz = raizSitio();
    const enlace = document.createElement('a');
    enlace.className = 'acceso-guia';
    enlace.href = new URL('app/', raiz).href;
    enlace.title = 'Abrir la guía paso a paso';
    enlace.setAttribute('aria-label', 'Abrir la guía paso a paso');
    enlace.innerHTML = `<img src="${new URL('app/icono.svg', raiz).href}" alt="" width="28" height="28"><span>Guía</span>`;
    const destino = cabecera.querySelector('.md-header__source') || null;
    cabecera.insertBefore(enlace, destino);
  }

  anadirAcceso();
  // Con navigation.instant la cabecera puede volver a pintarse al navegar.
  if (window.document$) window.document$.subscribe(anadirAcceso);
})();
