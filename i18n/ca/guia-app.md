# Guia al mòbil

Una app web que acompanya qui recondiciona pel flux, mòbil a mòbil: escaneja
l'etiqueta, mostra en quin estat de DeviceHub és el dispositiu i què cal fer o
decidir en aquell punt, i porta el compte dels terminis de PENDING DONOR.

[Obrir la guia](../../app/?lang=ca){ .md-button .md-button--primary }

A Android, des de Chrome, *Afegeix a la pantalla d'inici* la instal·la com una
app més. Funciona sense connexió un cop oberta i adapta automàticament el tema
clar o fosc a la configuració del telèfon. La guia està en castellà, anglès i
català; tria l'idioma amb el selector de la capçalera.

## Com començar { #como-empezar }

1. Agafa la següent etiqueta preimpresa del full.
2. Obre la guia amb el botó anterior.
3. A Android, escaneja el QR. En un navegador sense escàner, escriu el número
   imprès sota el QR.
4. Si el mòbil encara no existeix a la guia, confirma'n l'alta. Començarà a
   **INBOX** i la pantalla indicarà què cal fer a continuació, començant per
   enganxar l'etiqueta al mòbil.

La guia és una llista de feina i un historial local. No executa accions al
telèfon. Amb un token API configurat pot comprovar i avançar els estats de
DeviceHub quan l'operador prem el botó corresponent; mai no els canvia
silenciosament.

Al pas d'alta i fotos pot obrir el WebForm de DeviceHub. La URL base es
configura des del botó ⚙ de la capçalera, des del mateix pas o a **Connexió
amb DeviceHub**. Per defecte és `https://lab6.ereuse.org`. Per canviar estats
desa el token API únicament a l'emmagatzematge local del navegador i no
l'inclou a les còpies de seguretat. L'inici de sessió i la seva galeta
continuen pertanyent a DeviceHub. L'enllaç directe està disponible al mòbil i
a l'ordinador; a l'ordinador també genera localment un QR per obrir la mateixa
adreça al telèfon, sense compartir-la amb cap servei extern.

## Què fa { #que-hace }

- **Mapa d'estats.** A dalt, la línia d'estats de DeviceHub amb l'actual
  ressaltat i els ja recorreguts marcats.
- **Pas actual.** L'acció o la pregunta del diagrama detallat, amb el seu
  criteri i un botó per sortida. Les sortides que canvien d'estat ho indiquen.
- **Canvis d'estat.** En entrar en un estat, consulta primer DeviceHub i només
  l'actualitza si coincideix amb l'estat anterior esperat. També conserva
  l'enllaç directe i la confirmació manual. Les sortides a DISMANTLE envien la
  nota amb el motiu del catàleg juntament amb el canvi.
- **Instal·lació i comprovació.** Al pas de Workbench Android ofereix la
  descàrrega directa al mòbil o un QR a l'ordinador. Després del snapshot
  permet obrir directament **Components** a DeviceHub per comprovar
  l'inventari.
- **Tests sense duplicar.** Workbench Android guia les proves i n'envia els
  resultats. La guia només demana completar aquest recorregut i enllaça
  directament a **Propietats** de DeviceHub per revisar els valors `hwtest:*`.
- **Terminis.** Les esperes del donant mostren els dies que queden, i la llista
  permet veure els mòbils ordenats per venciment.
- **Historial.** Cada pas queda registrat amb l'hora; es pot desfer l'últim,
  copiar tot l'historial o esborrar el mòbil. Des de **Còpia de seguretat**
  es poden esborrar tots els mòbils del navegador.

## Limitacions del prototip { #limitaciones-del-prototipo }

- Les dades només es desen al navegador del mòbil que es fa servir. Convé
  exportar-ne una còpia de tant en tant, des de la llista.
- La connexió API necessita un token i que DeviceHub permeti l'origen web
  d'aquesta guia mitjançant CORS. Sense connexió o sense token es conserven els
  enllaços i la confirmació manual.
- L'escàner de QR fa servir l'API `BarcodeDetector`, que té Chrome a Android.
  On no existeix, el número es tecleja.
- Les notes que s'envien a DeviceHub s'escriuen en l'idioma de la guia; el codi
  de motiu entre claudàtors (`[NO-CARGA]`, …) és el mateix en tots els idiomes.

## D'on surt el flux { #de-donde-sale-el-flujo }

El flux és a [`flujo/flujo.yaml`](https://github.com/aucoop/vincle-digital-docs/blob/main/flujo/flujo.yaml),
que és la versió executable dels [diagrames detallats](diagramas-detallados.md).
Els textos en anglès i català són a
[`flujo/i18n/`](https://github.com/aucoop/vincle-digital-docs/tree/main/flujo/i18n),
pels mateixos ids. Després d'editar-los:

```sh
python flujo/generar.py                                  # valida i regenera docs/app/flujo*.json
python flujo/generar.py --mermaid INSTALL --idioma ca    # diagrama d'un estat, per comparar
```

El desplegament falla si algun `flujo*.json` no està al dia amb el YAML, o si a
una traducció li falta un text.
