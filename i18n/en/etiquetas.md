# Traceability labels

Labels are printed before the devices arrive. Each QR holds only a sequential
number, which DH-scan and Workbench Android use as the `custom_id`.

## Formats { #formatos }

| Format | Size | A4 layout | Reference |
|---|---:|---:|---|
| Small | 25.4 × 10 mm | 7 × 27 | Avery L7658 |
| Large | 38.1 × 21.2 mm | 5 × 13 | Avery L7651 / Apli 1285 |

## Generate a sheet { #generar-una-plancha }

```sh
python -m pip install -r etiquetas/requirements.txt
python etiquetas/generar_planchas.py 1 189 -o plancha-000001.pdf
```

To check the alignment on plain paper:

```sh
python etiquetas/generar_planchas.py 1 189 --reticula
```

Each printing point must use a reserved range. DeviceHub also rejects any
repeated `custom_id`.

[See the generator on GitHub](https://github.com/aucoop/vincle-digital-docs/blob/main/etiquetas/generar_planchas.py){ .md-button }
