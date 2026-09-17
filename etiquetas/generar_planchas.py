#!/usr/bin/env python3
"""Genera planchas A4 de etiquetas preimpresas para dispositivos.

Cada etiqueta lleva un QR con el número solo (lo que DH-scan y
workbench-android leen como custom_id) y el mismo número en grande para
leerlo sin escanear.

Formatos (A4):
    pequena  189 etiquetas de 25,4 x 10 mm (7 x 27), tipo Avery L7658.
             Por defecto: cabe en la trasera de un móvil sin tapar nada.
    grande   65 etiquetas de 38,1 x 21,2 mm (5 x 13), tipo Avery L7651 / Apli 1285.

Uso:
    python generar_planchas.py 1 189 -o plancha-000001.pdf
    python generar_planchas.py 1 189 --reticula      # prueba de alineación en papel normal
    python generar_planchas.py 1 189 --desplazar-y 0.5   # corrige si sale descentrado
    python generar_planchas.py 190 254 --formato grande --titulo "Vincle Digital"

Los números se reparten por rangos: cada sitio que imprime tiene su bloque
y nadie más usa esos números. DeviceHub rechaza igualmente un custom_id
repetido.

Requiere reportlab: pip install -r requirements.txt
"""

import argparse
import sys

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

FORMATOS = {
    # Avery L7658
    "pequena": dict(cols=7, rows=27, w=25.4, h=10.0, pitch_x=27.9, pitch_y=10.0,
                    left=9.0, top=13.5, qr=8.5, font=9, titulo=False),
    # Avery L7651 / Apli 1285
    "grande": dict(cols=5, rows=13, w=38.1, h=21.2, pitch_x=40.6, pitch_y=21.2,
                   left=4.7, top=10.7, qr=17.0, font=11, titulo=True),
}


def draw_qr(c, value, x, y, size):
    # Margen blanco de 2 módulos: la etiqueta ya deja borde alrededor.
    widget = QrCodeWidget(value, barLevel="M", barBorder=2)
    x1, y1, x2, y2 = widget.getBounds()
    w, h = x2 - x1, y2 - y1
    d = Drawing(size, size, transform=[size / w, 0, 0, size / h, 0, 0])
    d.add(widget)
    renderPDF.draw(d, c, x, y)


def draw_label(c, f, value, x, y, titulo, reticula):
    label_w, label_h, qr = f["w"] * mm, f["h"] * mm, f["qr"] * mm
    if reticula:
        c.setLineWidth(0.2)
        c.rect(x, y, label_w, label_h)

    pad = (label_h - qr) / 2
    qr_x = x + pad
    draw_qr(c, value, qr_x, y + pad, qr)

    text_x = qr_x + qr + 0.8 * mm
    text_w = x + label_w - 1 * mm - text_x
    size = f["font"]
    while c.stringWidth(value, "Helvetica-Bold", size) > text_w and size > 5:
        size -= 0.5
    c.setFont("Helvetica-Bold", size)
    c.drawString(text_x, y + label_h / 2 - size * 0.35, value)

    if titulo and f["titulo"]:
        c.setFont("Helvetica", 5)
        c.drawString(text_x, y + 2.5 * mm, titulo[:20])


def generar(inicio, fin, formato, digitos, salida, titulo, reticula, dx, dy):
    f = FORMATOS[formato]
    valores = [str(n).zfill(digitos) for n in range(inicio, fin + 1)]
    largo = max(len(v) for v in valores)
    if largo > digitos:
        sys.exit(f"{valores[-1]} tiene más de {digitos} cifras: usa --digitos {largo}")

    c = canvas.Canvas(salida, pagesize=A4)
    c.setTitle(f"Etiquetas {valores[0]}-{valores[-1]}")
    _, page_h = A4
    por_pagina = f["cols"] * f["rows"]

    for i, valor in enumerate(valores):
        if i and i % por_pagina == 0:
            c.showPage()
        pos = i % por_pagina
        col, row = pos % f["cols"], pos // f["cols"]
        x = (f["left"] + dx + col * f["pitch_x"]) * mm
        y = page_h - (f["top"] + dy + row * f["pitch_y"] + f["h"]) * mm
        draw_label(c, f, valor, x, y, titulo, reticula)

    c.save()
    paginas = -(-len(valores) // por_pagina)
    print(f"{salida}: {len(valores)} etiquetas ({valores[0]}-{valores[-1]}), "
          f"{paginas} página(s) de {por_pagina}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("inicio", type=int, help="primer número del rango")
    p.add_argument("fin", type=int, help="último número del rango, incluido")
    p.add_argument("--formato", choices=FORMATOS, default="pequena", help="tamaño de etiqueta (pequena por defecto)")
    p.add_argument("-o", "--salida", help="PDF de salida (por defecto etiquetas-INICIO-FIN.pdf)")
    p.add_argument("--digitos", type=int, default=6,
                   help="cifras con ceros a la izquierda (6 por defecto: el Short ID de DeviceHub son 6 caracteres)")
    p.add_argument("--titulo", default="", help='texto pequeño, solo en formato grande, p. ej. "Vincle Digital"')
    p.add_argument("--reticula", action="store_true", help="dibuja el contorno de cada etiqueta para alinear")
    p.add_argument("--desplazar-x", type=float, default=0, help="mueve todo a la derecha, en mm (negativo: izquierda)")
    p.add_argument("--desplazar-y", type=float, default=0, help="mueve todo hacia abajo, en mm (negativo: arriba)")
    args = p.parse_args()

    if args.inicio < 0 or args.fin < args.inicio:
        sys.exit("el rango no es válido: fin debe ser mayor o igual que inicio")

    salida = args.salida or f"etiquetas-{str(args.inicio).zfill(args.digitos)}-{str(args.fin).zfill(args.digitos)}.pdf"
    generar(args.inicio, args.fin, args.formato, args.digitos, salida, args.titulo,
            args.reticula, args.desplazar_x, args.desplazar_y)


if __name__ == "__main__":
    main()
