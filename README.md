# Vincle Digital

Guia per als participants del Repair Cafè Vincle Digital, publicada a
<https://aucoop.github.io/vincle-digital-docs/guia/> amb
[Zensical](https://zensical.org/). L'arrel del lloc porta a la guia.

La font és la pestanya "Guia per als participants" del Google Doc de l'equip:
`docs/guia.md` no s'edita a mà, es regenera amb l'script.

```sh
# lectura.json: documents.get amb includeTabsContent (o la sortida de read_doc).
# Executa-ho just després de llegir el document: els enllaços de les imatges caduquen en pocs minuts.
python scripts/guia_desde_gdoc.py lectura.json
python -m pip install -r requirements-docs.txt
zensical serve
```

El contingut anterior (diagrames del flux, guia al mòbil, generador d'etiquetes,
versions en anglès i castellà) és a l'historial de git, abans del commit que el va treure.
