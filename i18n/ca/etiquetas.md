# Etiquetes de traçabilitat

Les etiquetes s'imprimeixen abans de rebre els dispositius. Cada QR conté
només un número correlatiu, que DH-scan i Workbench Android fan servir com a
`custom_id`.

## Formats { #formatos }

| Format | Mida | Distribució A4 | Referència |
|---|---:|---:|---|
| Petita | 25,4 × 10 mm | 7 × 27 | Avery L7658 |
| Gran | 38,1 × 21,2 mm | 5 × 13 | Avery L7651 / Apli 1285 |

## Generar un full { #generar-una-plancha }

```sh
python -m pip install -r etiquetas/requirements.txt
python etiquetas/generar_planchas.py 1 189 -o plancha-000001.pdf
```

Per comprovar l'alineació en paper normal:

```sh
python etiquetas/generar_planchas.py 1 189 --reticula
```

Cada punt d'impressió ha de fer servir un rang reservat. DeviceHub també
rebutja qualsevol `custom_id` repetit.

[Veure el generador a GitHub](https://github.com/aucoop/vincle-digital-docs/blob/main/etiquetas/generar_planchas.py){ .md-button }
