"""Valida flujo/flujo.yaml y sus traducciones y genera sus salidas.

    python flujo/generar.py                             # valida y escribe docs/app/flujo*.json
    python flujo/generar.py --check                     # falla si algún flujo*.json no está al día
    python flujo/generar.py --mermaid INBOX             # imprime el diagrama de un estado
    python flujo/generar.py --mermaid INBOX --idioma en # el mismo diagrama, traducido

flujo.yaml está en castellano. flujo/i18n/<idioma>.yaml traduce sus textos
(resúmenes de estado, pasos, ayudas, checklists, opciones y notas) por id; los
ids, destinos, motivos y nombres de estado de DeviceHub no se traducen.
"""

import argparse
import copy
import json
import sys
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = RAIZ / "flujo" / "flujo.yaml"
SALIDA = RAIZ / "docs" / "app" / "flujo.json"
TRADUCCIONES = RAIZ / "flujo" / "i18n"
IDIOMAS = ("en", "ca")


def salida(idioma):
    return SALIDA if idioma == "es" else SALIDA.with_name(f"flujo.{idioma}.json")

TIPOS = {"accion", "pregunta", "fin"}
MARCAS = {"dh", "checkpoint"}


def validar(flujo):
    errores = []
    estados = {e["id"]: e for e in flujo["estados"]}
    nodos = flujo["nodos"]
    motivos = flujo["motivos"]

    for e in estados.values():
        if e["inicio"] not in nodos:
            errores.append(f"estado {e['id']}: inicio {e['inicio']} no existe")
        elif nodos[e["inicio"]]["estado"] != e["id"]:
            errores.append(f"estado {e['id']}: inicio {e['inicio']} es de otro estado")
        marcar = e.get("marcar_tras")
        if marcar and nodos.get(marcar, {}).get("estado") != e["id"]:
            errores.append(f"estado {e['id']}: marcar_tras {marcar} no es un paso de este estado")

    for nid, n in nodos.items():
        donde = f"nodo {nid}"
        if n.get("estado") not in estados:
            errores.append(f"{donde}: estado {n.get('estado')} desconocido")
        textos = [n.get("texto")] + [o.get("texto") for o in n.get("opciones", [])]
        if not all(isinstance(t, str) for t in textos):
            errores.append(f"{donde}: texto que no es cadena; ¿falta entrecomillar un No?")
        if n.get("tipo") not in TIPOS:
            errores.append(f"{donde}: tipo {n.get('tipo')} desconocido")
        if n.get("marca") and n["marca"] not in MARCAS:
            errores.append(f"{donde}: marca {n['marca']} desconocida")
        if n.get("tipo") == "accion" and n.get("siguiente") not in nodos:
            errores.append(f"{donde}: siguiente {n.get('siguiente')} no existe")
        if n.get("tipo") == "pregunta":
            if len(n.get("opciones", [])) < 2:
                errores.append(f"{donde}: una pregunta necesita al menos dos opciones")
            plazo = n.get("plazo")
            if plazo and plazo["desde"] != "estado" and plazo["desde"] not in nodos:
                errores.append(f"{donde}: plazo desde {plazo['desde']} no existe")
            for o in n.get("opciones", []):
                if o.get("vence") and not plazo:
                    errores.append(f"{donde}: opción con vence en una pregunta sin plazo")
                destino = nodos.get(o.get("destino"))
                if destino is None:
                    errores.append(f"{donde}: destino {o.get('destino')} no existe")
                    continue
                motivo = (o.get("nota") or {}).get("motivo")
                if motivo and motivo not in motivos:
                    errores.append(f"{donde}: motivo {motivo} fuera del catálogo")
                if destino["estado"] == "DISMANTLE" and n["estado"] != "DISMANTLE" and not motivo:
                    errores.append(f"{donde}: salida a DISMANTLE sin motivo")

    # Todo nodo tiene que ser alcanzable desde el inicio de INBOX.
    alcanzados, pendientes = set(), [estados["INBOX"]["inicio"]]
    while pendientes:
        nid = pendientes.pop()
        if nid in alcanzados or nid not in nodos:
            continue
        alcanzados.add(nid)
        pendientes.extend(sucesores(nodos[nid]))
    for nid in nodos.keys() - alcanzados:
        errores.append(f"nodo {nid}: inalcanzable")

    return errores


def traducir(flujo, trad, idioma):
    """Copia del flujo con los textos de `trad`. Exige traducir todo texto no vacío."""
    errores = []
    salida = copy.deepcopy(flujo)
    donde = f"i18n/{idioma}.yaml"

    def exigir(origen, destino, campo, t, ctx):
        if campo in origen and origen[campo] != "":
            if not isinstance(t.get(campo), str) or not t[campo].strip():
                errores.append(f"{donde}: {ctx}: falta {campo}")
            else:
                destino[campo] = t[campo]
        elif campo in t:
            errores.append(f"{donde}: {ctx}: {campo} sobra, el original no lo tiene")

    t_estados = trad.get("estados") or {}
    for e in salida["estados"]:
        exigir(e, e, "resumen", t_estados.get(e["id"]) or {}, f"estado {e['id']}")
    for eid in t_estados.keys() - {e["id"] for e in salida["estados"]}:
        errores.append(f"{donde}: estado {eid} no existe")

    t_nodos = trad.get("nodos") or {}
    for nid, n in salida["nodos"].items():
        t = t_nodos.get(nid)
        if t is None:
            errores.append(f"{donde}: nodo {nid}: sin traducir")
            continue
        exigir(n, n, "texto", t, f"nodo {nid}")
        exigir(n, n, "ayuda", t, f"nodo {nid}")
        if "checklist" in n:
            if len(t.get("checklist") or []) != len(n["checklist"]):
                errores.append(f"{donde}: nodo {nid}: checklist con otro número de elementos")
            else:
                n["checklist"] = t["checklist"]
        opciones, t_opciones = n.get("opciones", []), t.get("opciones") or []
        if len(t_opciones) != len(opciones):
            errores.append(f"{donde}: nodo {nid}: {len(t_opciones)} opciones traducidas de {len(opciones)}")
            continue
        for i, (o, to) in enumerate(zip(opciones, t_opciones)):
            ctx = f"nodo {nid}, opción {i + 1}"
            exigir(o, o, "texto", to, ctx)
            exigir(o, o, "ayuda", to, ctx)
            if "nota" in o:
                # La traducción de la nota va como `nota: texto`; el motivo no se traduce.
                exigir(o["nota"], o["nota"], "texto", {"texto": to["nota"]} if "nota" in to else {}, ctx + ", nota")
            elif "nota" in to:
                errores.append(f"{donde}: {ctx}: nota sobra, el original no la tiene")
    for nid in t_nodos.keys() - salida["nodos"].keys():
        errores.append(f"{donde}: nodo {nid} no existe")

    salida["idioma"] = idioma
    return salida, errores


def flujos(flujo):
    """{idioma: flujo} con el original y cada traducción, o los errores de traducción."""
    resultado, errores = {"es": dict(flujo, idioma="es")}, []
    for idioma in IDIOMAS:
        trad = yaml.safe_load((TRADUCCIONES / f"{idioma}.yaml").read_text(encoding="utf-8"))
        resultado[idioma], e = traducir(flujo, trad, idioma)
        errores += e
    return resultado, errores


def sucesores(nodo):
    if nodo["tipo"] == "accion":
        return [nodo["siguiente"]]
    return [o["destino"] for o in nodo.get("opciones", [])]


def mermaid(flujo, estado):
    """Diagrama de un estado con las mismas clases de color que la documentación."""
    nodos = flujo["nodos"]
    nombres = {e["id"]: e["nombre"] for e in flujo["estados"]}
    nuevos = {e["id"] for e in flujo["estados"] if e.get("nuevo")}
    propios = {nid: n for nid, n in nodos.items() if n["estado"] == estado}
    mid = {nid: nid.replace(".", "_") for nid in nodos}
    lineas = ["flowchart TD"]

    for nid, n in propios.items():
        texto = n["texto"].replace('"', "'")
        forma = ('{"%s"}' if n["tipo"] == "pregunta" else
                 '(["%s"])' if n["tipo"] == "fin" else '["%s"]') % texto
        clase = {"dh": ":::dh", "checkpoint": ":::checkpoint"}.get(n.get("marca"), "")
        lineas.append(f"    {mid[nid]}{forma}{clase}")

    salidas = set()
    for nid, n in propios.items():
        if n["tipo"] == "accion":
            aristas = [(None, n["siguiente"], None)]
        else:
            aristas = [(o["texto"], o["destino"], o.get("nota")) for o in n.get("opciones", [])]
        for etiqueta, destino, nota in aristas:
            if nodos[destino]["estado"] != estado:
                otro = nodos[destino]["estado"]
                clase = ("reject" if otro == "DISMANTLE" else
                         "newstate" if otro in nuevos else "ok")
                if nota and nota.get("motivo"):
                    otro_id = f"out_{mid[nid]}_{nota['motivo'].replace('-', '_')}"
                    lineas.append(f'    {otro_id}(["[{nota["motivo"]}]<br/>→ {nombres[otro]}"]):::{clase}')
                else:
                    otro_id = f"out_{otro}"
                    if otro_id not in salidas:
                        lineas.append(f'    {otro_id}(["→ {nombres[otro]}"]):::{clase}')
                salidas.add(otro_id)
                destino_id = otro_id
            else:
                destino_id = mid[destino]
            flecha = f' -->|"{etiqueta}"| ' if etiqueta else " --> "
            lineas.append(f"    {mid[nid]}{flecha}{destino_id}")

    lineas += [
        "    classDef reject fill:#f8d7da,stroke:#b02a37,color:#58151c",
        "    classDef ok fill:#d1e7dd,stroke:#146c43,color:#0a3622",
        "    classDef checkpoint fill:#fff3cd,stroke:#997404,color:#664d03",
        "    classDef dh fill:#cfe2ff,stroke:#0a58ca,color:#052c65",
        "    classDef newstate fill:#e2d9f3,stroke:#59359a,color:#2f1c6a",
    ]
    return "\n".join(lineas)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--check", action="store_true", help="fallar si flujo.json no está al día")
    p.add_argument("--mermaid", metavar="ESTADO", help="imprimir el diagrama Mermaid de un estado")
    p.add_argument("--idioma", default="es", choices=("es", *IDIOMAS), help="idioma del diagrama (es por defecto)")
    args = p.parse_args()

    flujo = yaml.safe_load(FUENTE.read_text(encoding="utf-8"))
    errores = validar(flujo)
    if not errores:
        traducidos, errores = flujos(flujo)
    if errores:
        print("\n".join(errores), file=sys.stderr)
        sys.exit(1)

    if args.mermaid:
        estados = {e["id"] for e in flujo["estados"]}
        if args.mermaid not in estados:
            disponibles = ", ".join(sorted(estados))
            print(f"estado {args.mermaid} desconocido; disponibles: {disponibles}", file=sys.stderr)
            sys.exit(2)
        print(mermaid(traducidos[args.idioma], args.mermaid))
        return

    desfasados = []
    for idioma, f in traducidos.items():
        ruta = salida(idioma)
        contenido = json.dumps(f, ensure_ascii=False, indent=1) + "\n"
        if args.check:
            if not ruta.exists() or ruta.read_text(encoding="utf-8") != contenido:
                desfasados.append(str(ruta.relative_to(RAIZ)))
            continue
        ruta.parent.mkdir(parents=True, exist_ok=True)
        ruta.write_text(contenido, encoding="utf-8")
        print(f"{len(f['nodos'])} nodos → {ruta.relative_to(RAIZ)}")
    if desfasados:
        print(f"{', '.join(desfasados)} no está al día: python flujo/generar.py", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
