# Guide on the phone

A web app that walks the refurbisher through the flow, phone by phone: it
scans the label, shows which DeviceHub state the device is in and what to do
or decide at that point, and keeps track of the PENDING DONOR deadlines.

[Open the guide](../../app/?lang=en){ .md-button .md-button--primary }

On Android, in Chrome, *Add to home screen* installs it like any other app.
It works offline once opened and follows the phone's light or dark theme
automatically. The guide is available in Spanish, English and Catalan; pick
the language from the selector in its header.

## Getting started { #como-empezar }

1. Take the next pre-printed label from the sheet.
2. Open the guide with the button above.
3. On Android, scan the QR. In a browser without a scanner, type the number
   printed under the QR.
4. If the phone is not in the guide yet, confirm its registration. It will
   start at **INBOX** and the screen will tell you what to do next, starting
   with sticking the label on the phone.

The guide is a worklist and a local history. It does not run anything on the
phone. With an API token configured it can check and advance DeviceHub states
when the operator presses the corresponding button; it never changes them
silently.

At the registration and photos step it can open the DeviceHub WebForm. The
base URL is set from the ⚙ button in the header, from the step itself or in
**DeviceHub connection**. The default is `https://lab6.ereuse.org`. To change
states it stores the API token only in the browser's local storage and does
not include it in backups. Sign-in and its cookie still belong to DeviceHub.
The direct link is available on phone and computer; on a computer it also
generates a QR locally to open the same address on the phone, without sharing
it with any external service.

## What it does { #que-hace }

- **State map.** At the top, the line of DeviceHub states with the current one
  highlighted and the ones already visited ticked.
- **Current step.** The action or question from the detailed diagram, with its
  criterion and one button per exit. Exits that change state say so.
- **State changes.** When entering a state, it first queries DeviceHub and only
  updates it if it matches the expected previous state. It also keeps the
  direct link and manual confirmation. Exits to DISMANTLE send the note with
  the catalogue reason along with the change.
- **Installation and checks.** At the Workbench Android step it offers the
  direct download on the phone or a QR on a computer. After the snapshot it
  links straight to **Components** in DeviceHub to check the inventory.
- **No duplicated tests.** Workbench Android guides the tests and sends their
  results. The guide only asks you to complete that run and links directly to
  **Properties** in DeviceHub to review the `hwtest:*` values.
- **Deadlines.** Donor waits show the days left, and the list can sort phones
  by due date.
- **History.** Every step is recorded with its time; you can undo the last
  one, copy the whole history or delete the phone. From **Backup** you can
  delete every phone in the browser.

## Prototype limitations { #limitaciones-del-prototipo }

- Data is stored only in the browser of the phone being used. Export a copy
  from the list from time to time.
- The API connection needs a token and DeviceHub must allow this guide's web
  origin through CORS. Offline or without a token, the links and manual
  confirmation remain.
- The QR scanner uses the `BarcodeDetector` API, which Chrome on Android has.
  Where it is missing, the number is typed.
- Notes sent to DeviceHub are written in the guide's language; the reason
  code in brackets (`[NO-CARGA]`, …) is the same in every language.

## Where the flow comes from { #de-donde-sale-el-flujo }

The flow lives in [`flujo/flujo.yaml`](https://github.com/aucoop/vincle-digital-docs/blob/main/flujo/flujo.yaml),
the executable version of the [detailed diagrams](diagramas-detallados.md).
The English and Catalan texts are in
[`flujo/i18n/`](https://github.com/aucoop/vincle-digital-docs/tree/main/flujo/i18n),
keyed by the same ids. After editing them:

```sh
python flujo/generar.py                                  # validates and regenerates docs/app/flujo*.json
python flujo/generar.py --mermaid INSTALL --idioma en    # one state's diagram, to compare
```

The deployment fails if any `flujo*.json` is out of date with the YAML, or if
a translation is missing a text.
