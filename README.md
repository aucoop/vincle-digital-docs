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
El flujo sale de [`flujo/flujo.yaml`](flujo/flujo.yaml); después de editarlo:

```sh
python flujo/generar.py
```

## Desarrollo del sitio

```sh
python -m pip install -r requirements-docs.txt
zensical serve
```
