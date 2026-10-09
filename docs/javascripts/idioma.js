// Selector de idioma de Zensical: lleva a la misma página en el otro idioma.
// El castellano está en la raíz del sitio y el resto en /<idioma>/, con los
// mismos nombres de página y las mismas anclas. extra.css cuelga siempre de la
// raíz (los otros idiomas la enlazan con ../), así que sirve para encontrarla
// igual en local y en GitHub Pages.
(function () {
  function raizSitio() {
    const hoja = document.querySelector('link[href*="stylesheets/extra.css"]');
    return hoja ? new URL('../', hoja.href) : new URL('/', location.href);
  }

  function enlazarIdiomas() {
    const raiz = raizSitio();
    const actual = document.documentElement.lang || 'es';
    const raizActual = new URL(actual === 'es' ? './' : `${actual}/`, raiz);
    const pagina = location.pathname.startsWith(raizActual.pathname)
      ? location.pathname.slice(raizActual.pathname.length)
      : '';
    document.querySelectorAll('a.md-select__link[hreflang]').forEach((a) => {
      const destino = a.hreflang === 'es' ? './' : `${a.hreflang}/`;
      a.href = new URL(destino + pagina, raiz).href + location.hash;
    });
  }

  enlazarIdiomas();
  // Con navigation.instant la página cambia sin recargar.
  if (window.document$) window.document$.subscribe(enlazarIdiomas);
})();
