# Vincle Digital

Documentación del flujo de reacondicionado de móviles Android y herramientas
de apoyo para su trazabilidad en DeviceHub.

## Documentación

- [Diagrama de alto nivel](diagrama-alto-nivel.md)
- [Diagramas detallados del reacondicionado](diagramas-detallados.md)
- [Diagrama fuente de Lucidchart](Diagrama%20reparació%20%20Vincle%20Digital.json)

Los diagramas Mermaid se renderizan directamente en GitHub.

## Etiquetas

El directorio [`etiquetas`](etiquetas) contiene el generador de planchas A4
con QR y los requisitos de Python.

```sh
python -m pip install -r etiquetas/requirements.txt
python etiquetas/generar_planchas.py 1 189 -o plancha-000001.pdf
```
