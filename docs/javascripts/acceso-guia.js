// Botón «Guía» en la cabecera de Zensical para abrir la PWA (docs/app/).
// La raíz del sitio se deduce de la hoja extra.css, que siempre cuelga de ella
// (también en /en/ y /ca/), así que funciona igual en local y en GitHub Pages.
// Desde otro idioma, la guía se abre en ese idioma con ?lang=.
(function () {
  const TEXTOS = {
    es: { etiqueta: 'Guía', titulo: 'Abrir la guía paso a paso' },
    en: { etiqueta: 'Guide', titulo: 'Open the step-by-step guide' },
    ca: { etiqueta: 'Guia', titulo: 'Obrir la guia pas a pas' },
  };

  function raizSitio() {
    const hoja = document.querySelector('link[href*="stylesheets/extra.css"]');
    return hoja ? new URL('../', hoja.href) : new URL('./', location.href);
  }

  function anadirAcceso() {
    const cabecera = document.querySelector('.md-header__inner');
    if (!cabecera || cabecera.querySelector('.acceso-guia')) return;
    const raiz = raizSitio();
    const idioma = document.documentElement.lang in TEXTOS ? document.documentElement.lang : 'es';
    const textos = TEXTOS[idioma];
    const enlace = document.createElement('a');
    enlace.className = 'acceso-guia';
    enlace.href = new URL(idioma === 'es' ? 'app/' : `app/?lang=${idioma}`, raiz).href;
    enlace.title = textos.titulo;
    enlace.setAttribute('aria-label', textos.titulo);
    enlace.innerHTML = `<img src="${new URL('app/icono.svg', raiz).href}" alt="" width="28" height="28"><span>${textos.etiqueta}</span>`;
    const destino = cabecera.querySelector('.md-header__source') || null;
    cabecera.insertBefore(enlace, destino);
  }

  anadirAcceso();
  // Con navigation.instant la cabecera puede volver a pintarse al navegar.
  if (window.document$) window.document$.subscribe(anadirAcceso);
})();
