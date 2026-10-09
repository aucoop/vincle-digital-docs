# Guía en el móvil

Una app web que acompaña al reacondicionador por el flujo, móvil a móvil:
escanea la etiqueta, muestra en qué estado de DeviceHub está el dispositivo y
qué toca hacer o decidir en ese punto, y lleva la cuenta de los plazos de
PENDING DONOR.

[Abrir la guía](app/index.html){ .md-button .md-button--primary }

En Android, desde Chrome, *Añadir a pantalla de inicio* la instala como una app
más. Funciona sin conexión una vez abierta y adapta automáticamente su tema
claro u oscuro a la configuración del teléfono. La guía está en castellano,
inglés y catalán; el idioma se elige con el selector de la cabecera.

## Cómo empezar

1. Toma la siguiente etiqueta preimpresa de la plancha.
2. Abre la guía con el botón anterior.
3. En Android, escanea el QR. En un navegador sin escáner, escribe el número
   impreso bajo el QR.
4. Si el móvil todavía no existe en la guía, confirma su alta. Empezará en
   **INBOX** y la pantalla indicará qué hacer a continuación, comenzando por
   pegar la etiqueta al móvil.

La guía es una lista de trabajo y un historial local. No ejecuta acciones en
el teléfono. Con un token API configurado puede comprobar y avanzar los estados
de DeviceHub cuando el operador pulsa el botón correspondiente; nunca los
cambia silenciosamente.

En el paso de alta y fotos puede abrir el WebForm de DeviceHub. La URL base se
configura desde el botón ⚙ de la cabecera, desde el propio paso o en
**Conexión con DeviceHub**. Por defecto es
`https://lab6.ereuse.org`. Para cambiar estados guarda el token API únicamente
en el almacenamiento local del navegador y no lo incluye en las copias de
seguridad. El inicio de sesión y su cookie siguen perteneciendo a DeviceHub.
El enlace directo está disponible
en móvil y ordenador; en ordenador también genera localmente un QR para abrir
la misma dirección en el teléfono, sin compartirla con ningún servicio externo.

## Qué hace

- **Mapa de estados.** Arriba, la línea de estados de DeviceHub con el actual
  resaltado y los ya recorridos marcados.
- **Paso actual.** La acción o la pregunta del diagrama detallado, con su
  criterio y un botón por salida. Las salidas que cambian de estado lo indican.
- **Cambios de estado.** Al entrar en un estado, consulta primero DeviceHub y
  solo lo actualiza si coincide con el estado anterior esperado. También
  conserva el enlace directo y la confirmación manual. Las salidas a DISMANTLE
  envían la nota con el motivo del catálogo junto con el cambio.
- **Instalación y comprobación.** En el paso de Workbench Android ofrece la
  descarga directa en móvil o un QR en ordenador. Después del snapshot permite
  abrir directamente **Componentes** en DeviceHub para comprobar el inventario.
- **Tests sin duplicar.** Workbench Android guía las pruebas y envía sus
  resultados. La guía solo pide completar ese recorrido y enlaza directamente
  a **Propiedades** en DeviceHub para revisar los valores `hwtest:*`.
- **Plazos.** Las esperas del donante muestran los días que quedan, y la lista
  permite ver los móviles ordenados por vencimiento.
- **Historial.** Cada paso queda registrado con la hora; se puede deshacer el
  último, copiar el historial entero o borrar el móvil. Desde **Copia de
  seguridad** se pueden borrar todos los móviles del navegador.

## Limitaciones del prototipo

- Los datos se guardan solo en el navegador del móvil que se usa. Conviene
  exportar una copia de vez en cuando, desde la lista.
- La conexión API necesita un token y que DeviceHub permita el origen web de
  esta guía mediante CORS. Sin conexión o sin token se conservan los enlaces y
  la confirmación manual.
- El escáner de QR usa la API `BarcodeDetector`, que tiene Chrome en Android.
  Donde no existe, el número se teclea.
- Las notas que se envían a DeviceHub se escriben en el idioma de la guía; el
  código de motivo entre corchetes (`[NO-CARGA]`, …) es el mismo en todos los
  idiomas.

## De dónde sale el flujo

El flujo está en [`flujo/flujo.yaml`](https://github.com/aucoop/vincle-digital-docs/blob/main/flujo/flujo.yaml),
que es la versión ejecutable de los [diagramas detallados](diagramas-detallados.md).
Los textos en inglés y catalán están en
[`flujo/i18n/`](https://github.com/aucoop/vincle-digital-docs/tree/main/flujo/i18n),
por los mismos ids. Tras editarlos:

```sh
python flujo/generar.py                                  # valida y regenera docs/app/flujo*.json
python flujo/generar.py --mermaid INSTALL --idioma en    # diagrama de un estado, para comparar
```

El despliegue falla si algún `flujo*.json` no está al día con el YAML, o si a
una traducción le falta un texto.
