# Documentación de Vincle Digital

Documentación del flujo de reacondicionado de móviles Android y herramientas
de apoyo para su trazabilidad en DeviceHub.

## Documentación

- [Sitio web](https://aucoop.github.io/vincle-digital-docs/)
- [Diagrama de alto nivel](docs/diagrama-alto-nivel.md)
- [Diagramas detallados del reacondicionado](docs/diagramas-detallados.md)
- [Diagrama fuente de Lucidchart](Diagrama%20reparació%20%20Vincle%20Digital.json)

Los diagramas Mermaid se renderizan en GitHub y en el sitio generado con
[Zensical](https://zensical.org/).

## Etiquetas

El directorio [`etiquetas`](etiquetas) contiene el generador de planchas A4
con QR y los requisitos de Python.

```sh
python -m pip install -r etiquetas/requirements.txt
python etiquetas/generar_planchas.py 1 189 -o plancha-000001.pdf
```

## Guía en el móvil

[`docs/app`](docs/app) es una app web instalable que guía el flujo paso a paso.
El flujo sale de [`flujo/flujo.yaml`](flujo/flujo.yaml) y sus textos en
inglés y catalán de [`flujo/i18n/`](flujo/i18n); los textos de la interfaz
están en [`docs/app/i18n.js`](docs/app/i18n.js). Después de editar el flujo:

```sh
python flujo/generar.py
```

Si cambian textos de los diagramas por estado, se regeneran los PNG (en
`docs/app/diagramas/`, `diagramas/en/` y `diagramas/ca/`) con
`node flujo/diagramas-png.cjs`.

## Idiomas

El sitio está en castellano (`docs/`, en la raíz), inglés (`i18n/en/`, en
`/en/`) y catalán (`i18n/ca/`, en `/ca/`). Las páginas traducidas mantienen
el nombre de fichero y los ids de los títulos en castellano para que el
selector de idioma lleve a la misma página y sección. Al cambiar una página,
conviene actualizar las tres.

## Desarrollo del sitio

```sh
python -m pip install -r requirements-docs.txt
zensical serve                          # castellano
zensical serve -f zensical.en.toml      # inglés (o zensical.ca.toml)
```

Para el sitio completo, con los tres idiomas y el selector funcionando:

```sh
zensical build --clean && zensical build -f zensical.en.toml && zensical build -f zensical.ca.toml
python -m http.server -d site 8000
```
