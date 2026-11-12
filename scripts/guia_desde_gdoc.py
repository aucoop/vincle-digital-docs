#!/usr/bin/env python3
"""Genera docs/guia.md a partir de la pestaña «Guia per als participants» del Google Doc.

El Google Doc es la fuente: el equipo edita y comenta allí. Este script convierte
la lectura JSON de la API de Docs (documents.get con includeTabsContent) en una
página Zensical y descarga sus imágenes a docs/guia/img/.

Las sugerencias pendientes se tratan como aceptadas: se incluye el texto
sugerido, se omite el que se propone borrar y se aplican los cambios de estilo
sugeridos. Así la web muestra la guía tal como quedará.

Uso:
    python scripts/guia_desde_gdoc.py lectura.json [--tab t.judn7o4r4mll] [--docs docs]
"""
import argparse
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

TAB_GUIA = "t.judn7o4r4mll"

# Nombre del estado en DeviceHub -> clase CSS del gomet (ver stylesheets/extra.css).
ESTADOS = {
    "Per-desmantellar": "vermell",
    "Per-revisar": "groc",
    "Pendent-donant": "blau",
    "Per-donació": "verd",
    "Entrada": "gris",
    "Reciclat": "gris",
    "Lliurat": "gris",
}
PT_A_PX = 4 / 3


def pestana(doc, tab_id):
    def recorrer(tabs):
        for t in tabs:
            yield t
            yield from recorrer(t.get("childTabs", []))
    for t in recorrer(doc["tabs"]):
        if t["tabProperties"]["tabId"] == tab_id:
            return t["documentTab"]
    raise SystemExit(f"No hay ninguna pestaña {tab_id}")


def aceptar(base, cambios, clave_estilo, clave_estado):
    """Aplica sobre `base` los campos que una sugerencia marca como cambiados."""
    estilo = dict(base)
    for cambio in (cambios or {}).values():
        sugerido = cambio.get(clave_estilo, {})
        for campo_sugerido, marcado in cambio.get(clave_estado, {}).items():
            if not marcado:
                continue
            campo = campo_sugerido[: -len("Suggested")]
            if campo in sugerido:
                estilo[campo] = sugerido[campo]
            else:
                estilo.pop(campo, None)
    return estilo


def vineta(parrafo):
    cambios = parrafo.get("suggestedBulletChanges")
    if not cambios:
        return parrafo.get("bullet")
    sugerida = next(iter(cambios.values())).get("bullet", {})
    return sugerida if sugerida.get("listId") else None


def color(estilo, campo):
    c = estilo.get(campo, {}).get("color", {}).get("rgbColor")
    if not c:
        return None
    return "#%02x%02x%02x" % tuple(round(255 * c.get(k, 0)) for k in ("red", "green", "blue"))


def tipo_aviso(estilo_parrafo):
    """Un párrafo sombreado con borde a la izquierda es un aviso: rojo = danger, naranja = warning."""
    if not estilo_parrafo.get("shading", {}).get("backgroundColor"):
        return None
    borde = estilo_parrafo.get("borderLeft", {}).get("color", {}).get("color", {}).get("rgbColor", {})
    return "warning" if borde.get("green", 0) > 0.45 else "danger"


class Conversor:
    def __init__(self, dt, docs_dir):
        self.dt = dt
        self.docs = Path(docs_dir)
        self.img_dir = self.docs / "guia" / "img"
        self.img_dir.mkdir(parents=True, exist_ok=True)
        self.lineas = []
        self.titulos = {}  # headingId -> ancla
        self.notas = []
        self.nivel_lista = None  # nivel de la última viñeta, para colgar imágenes y avisos

    # --- texto en línea ---------------------------------------------------
    def texto(self, elementos):
        partes = []
        for el in elementos:
            if "textRun" in el:
                tr = el["textRun"]
                if tr.get("suggestedDeletionIds"):
                    continue
                estilo = aceptar(tr.get("textStyle", {}), tr.get("suggestedTextStyleChanges"),
                                 "textStyle", "textStyleSuggestionState")
                partes.append(self.formatear(tr["content"].replace("\n", ""), estilo))
            elif "inlineObjectElement" in el:
                io = el["inlineObjectElement"]
                if io.get("suggestedDeletionIds"):
                    continue
                partes.append(self.imagen(io["inlineObjectId"]))
            elif "footnoteReference" in el:
                self.notas.append(el["footnoteReference"]["footnoteId"])
                partes.append(f"[^{len(self.notas)}]")
        return "".join(partes)

    def formatear(self, texto, estilo):
        if not texto.strip():
            return texto
        nucleo = texto.strip()
        izq = texto[: len(texto) - len(texto.lstrip())]
        der = texto[len(texto.rstrip()):]
        nucleo = re.sub(r"([*_`\[\]<>])", r"\\\1", nucleo)
        enlace = estilo.get("link", {})
        if nucleo.replace("\\", "") in ESTADOS and estilo.get("backgroundColor"):
            clase = ESTADOS[nucleo.replace("\\", "")]
            return f'{izq}<span class="estat estat-{clase}">{nucleo}</span>{der}'
        if estilo.get("bold"):
            nucleo = f"**{nucleo}**"
        if estilo.get("italic"):
            nucleo = f"*{nucleo}*"
        if "url" in enlace:
            nucleo = f"[{nucleo}]({enlace['url']})"
        elif "heading" in enlace or "headingId" in enlace:
            hid = enlace.get("heading", {}).get("id") or enlace.get("headingId")
            nucleo = f"[{nucleo}](#{{{hid}}})"  # se resuelve al final, cuando ya se conocen las anclas
        return izq + nucleo + der

    def imagen(self, oid):
        obj = self.dt["inlineObjects"][oid]["inlineObjectProperties"]["embeddedObject"]
        uri = obj["imageProperties"]["contentUri"]
        # Google rechaza (403) las descargas sin User-Agent de navegador.
        peticion = urllib.request.Request(uri, headers={"User-Agent": "Mozilla/5.0"})
        datos = urllib.request.urlopen(peticion, timeout=60).read()
        nombre = hashlib.sha1(datos).hexdigest()[:12] + ".png"
        destino = self.img_dir / nombre
        if not destino.exists():
            destino.write_bytes(datos)
        ancho = round(obj["size"]["width"]["magnitude"] * PT_A_PX)
        alt = (obj.get("title") or obj.get("description") or "").replace('"', "'")
        # Enlazada a sí misma: en el móvil, tocarla la abre a tamaño real.
        return f'[![{alt}](guia/img/{nombre}){{ width="{ancho}" loading=lazy }}](guia/img/{nombre})'

    # --- bloques ----------------------------------------------------------
    def emitir(self, texto="", sangria=0):
        pref = " " * sangria
        self.lineas.extend(pref + l if l else "" for l in texto.split("\n"))

    def parrafo(self, p):
        estilo = aceptar(p["paragraphStyle"], p.get("suggestedParagraphStyleChanges"),
                         "paragraphStyle", "paragraphStyleSuggestionState")
        tipo = estilo.get("namedStyleType", "NORMAL_TEXT")
        texto = self.texto(p["elements"]).strip()
        bullet = vineta(p)
        if not texto:
            self.emitir()
            return
        texto = texto.replace("⚠️ ", "").replace("⚠️", "") if tipo_aviso(estilo) else texto

        if tipo in ("TITLE", "HEADING_1", "HEADING_2", "HEADING_3"):
            self.nivel_lista = None
            nivel = {"TITLE": 1, "HEADING_1": 2, "HEADING_2": 3, "HEADING_3": 4}[tipo]
            ancla = self.ancla(texto)
            if estilo.get("headingId"):
                self.titulos[estilo["headingId"]] = ancla
            self.emitir()
            self.emitir(f"{'#' * nivel} {texto} {{ #{ancla} }}")
            self.emitir()
            return
        if tipo == "SUBTITLE":
            self.emitir(f"*{texto}*")
            self.emitir()
            return

        aviso = tipo_aviso(estilo)
        if bullet:
            nivel = bullet.get("nestingLevel", 0)
            marca = self.marca(bullet)
            sangria = 4 * nivel
            if aviso:
                # Elemento vacío que solo lleva el aviso: extra.css oculta el párrafo.
                self.emitir(f'{marca} <span class="li-buit"></span>', sangria)
                self.emitir()
                self.emitir(f'!!! {aviso} ""', sangria + 4)
                self.emitir(texto, sangria + 8)
                self.emitir()
            else:
                self.emitir(f"{marca} {texto}", sangria)
            self.nivel_lista = nivel
            return

        solo_imagenes = re.fullmatch(r"(\s*\[?!\[[^\]]*\]\([^)]*\)\{[^}]*\}(\]\([^)]*\))?\s*)+", texto)
        sangria = 4 * (self.nivel_lista + 1) if self.nivel_lista is not None and (solo_imagenes or aviso) else 0
        if not solo_imagenes and not aviso:
            self.nivel_lista = None
        self.emitir()
        if aviso:
            self.emitir(f'!!! {aviso} ""', sangria)
            self.emitir(texto, sangria + 4)
        else:
            self.emitir(texto, sangria)
        self.emitir()

    def marca(self, bullet):
        nivel = bullet.get("nestingLevel", 0)
        props = self.dt["lists"][bullet["listId"]]["listProperties"]["nestingLevels"][nivel]
        if props.get("glyphType") in ("DECIMAL", "ZERO_DECIMAL", "ALPHA", "UPPER_ALPHA", "ROMAN", "UPPER_ROMAN"):
            return "1."
        if props.get("glyphSymbol") in ("☐", "☐") or props.get("glyphType") == "GLYPH_TYPE_UNSPECIFIED" and not props.get("glyphSymbol"):
            return "- [ ]"
        return "-"

    def tabla(self, t):
        self.nivel_lista = None
        filas = []
        for fila in t["tableRows"]:
            celdas = []
            for c in fila["tableCells"]:
                textos = [self.texto(e["paragraph"]["elements"]).strip() for e in c["content"] if "paragraph" in e]
                celdas.append(" <br> ".join(x for x in textos if x).replace("|", "\\|"))
            filas.append(celdas)
        if not filas:
            return
        self.emitir()
        if len(filas[0]) == 1:  # una celda: va como aviso
            self.emitir('!!! note ""')
            self.emitir("\n\n".join(f[0] for f in filas), 4)
        else:
            self.emitir("| " + " | ".join(filas[0]) + " |")
            self.emitir("|" + "---|" * len(filas[0]))
            for f in filas[1:]:
                self.emitir("| " + " | ".join(f) + " |")
        self.emitir()

    def ancla(self, texto):
        limpio = re.sub(r"<[^>]+>|\{[^}]*\}|[*\\]", "", texto).lower()
        m = re.match(r"(\d+)\.", limpio)
        if m:
            return f"pas-{m.group(1)}"
        limpio = limpio.translate(str.maketrans("àáèéíïòóúüç·", "aaeeiioouuc-"))
        return re.sub(r"[^a-z0-9]+", "-", limpio).strip("-")

    def convertir(self):
        for el in self.dt["body"]["content"]:
            if "paragraph" in el:
                self.parrafo(el["paragraph"])
            elif "table" in el:
                self.tabla(el["table"])
        md = "\n".join(self.lineas)
        md = re.sub(r"\(#\{([^}]+)\}\)", lambda m: f"(#{self.titulos.get(m.group(1), '')})", md)
        for i, fid in enumerate(self.notas, 1):
            contenido = self.dt["footnotes"][fid]["content"]
            texto = " ".join(self.texto(e["paragraph"]["elements"]).strip() for e in contenido if "paragraph" in e)
            md += f"\n\n[^{i}]: {texto}"
        md = re.sub(r"\n{3,}", "\n\n", md).strip() + "\n"
        return md


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("lectura", help="JSON de documents.get (o de read_doc, con la clave content)")
    ap.add_argument("--tab", default=TAB_GUIA)
    ap.add_argument("--docs", default="docs")
    args = ap.parse_args()
    doc = json.load(open(args.lectura))
    doc = doc.get("content", doc)
    conv = Conversor(pestana(doc, args.tab), args.docs)
    cabecera = (
        "---\n"
        "title: Guia per als participants\n"
        "hide:\n  - navigation\n"
        "sense_traduccio: true\n"
        "---\n\n"
        "<!-- Generat amb scripts/guia_desde_gdoc.py a partir del Google Doc. No l'editis a mà: "
        "els canvis es fan al document. -->\n\n"
    )
    destino = Path(args.docs) / "guia.md"
    destino.write_text(cabecera + sin_casilla_en_padres(conv.convertir()), encoding="utf-8")
    print(f"{destino} ({len(list(conv.img_dir.iterdir()))} imágenes en {conv.img_dir})", file=sys.stderr)


def sin_casilla_en_padres(md):
    """Una casilla que tiene casillas hijas es un título de grupo, no algo a marcar."""
    lineas = md.split("\n")
    for i, l in enumerate(lineas):
        m = re.match(r"( *)- \[ \] ", l)
        if not m:
            continue
        siguiente = next((x for x in lineas[i + 1:] if x.strip()), "")
        h = re.match(r"( *)- \[ \] ", siguiente)
        if h and len(h.group(1)) > len(m.group(1)):
            lineas[i] = m.group(1) + "- " + l[m.end():]
    return "\n".join(lineas)


if __name__ == "__main__":
    main()
