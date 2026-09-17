# Etiquetas de trazabilidad

Las etiquetas se imprimen antes de recibir los dispositivos. Cada QR contiene
solo un número correlativo, usado por DH-scan y Workbench Android como
`custom_id`.

## Formatos

| Formato | Medida | Distribución A4 | Referencia |
|---|---:|---:|---|
| Pequeña | 25,4 × 10 mm | 7 × 27 | Avery L7658 |
| Grande | 38,1 × 21,2 mm | 5 × 13 | Avery L7651 / Apli 1285 |

## Generar una plancha

```sh
python -m pip install -r etiquetas/requirements.txt
python etiquetas/generar_planchas.py 1 189 -o plancha-000001.pdf
```

Para comprobar la alineación en papel normal:

```sh
python etiquetas/generar_planchas.py 1 189 --reticula
```

Cada punto de impresión debe usar un rango reservado. DeviceHub también
rechaza cualquier `custom_id` repetido.

[Ver el generador en GitHub](https://github.com/aucoop/vincle-digital-docs/blob/main/etiquetas/generar_planchas.py){ .md-button }
