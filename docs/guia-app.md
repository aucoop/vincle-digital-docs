# Guía en el móvil

Una app web que acompaña al reacondicionador por el flujo, móvil a móvil:
escanea la etiqueta, muestra en qué estado de DeviceHub está el dispositivo y
qué toca hacer o decidir en ese punto, y lleva la cuenta de los plazos de
PENDING DONOR.

[Abrir la guía](app/index.html){ .md-button .md-button--primary }

En Android, desde Chrome, *Añadir a pantalla de inicio* la instala como una app
más. Funciona sin conexión una vez abierta.

## Cómo empezar

1. Toma la siguiente etiqueta preimpresa de la plancha.
2. Abre la guía con el botón anterior.
3. En Android, escanea el QR. En un navegador sin escáner, escribe el número
   impreso bajo el QR.
4. Si el móvil todavía no existe en la guía, confirma su alta. Empezará en
   **INBOX** y la pantalla indicará qué hacer a continuación, comenzando por
   pegar la etiqueta al móvil.

La guía es una lista de trabajo y un historial local. **No ejecuta acciones en
el teléfono ni modifica DeviceHub:** cuando sea necesario, mostrará el cambio
de estado o la nota que el operador debe registrar manualmente.

En el paso de alta y fotos puede abrir el WebForm de DeviceHub. La URL base se
configura en **Conexión con DeviceHub** y por defecto es
`https://lab6.ereuse.org`. La guía no guarda credenciales: el inicio de sesión
y su cookie pertenecen siempre a DeviceHub.

## Qué hace

- **Mapa de estados.** Arriba, la línea de estados de DeviceHub con el actual
  resaltado y los ya recorridos marcados.
- **Paso actual.** La acción o la pregunta del diagrama detallado, con su
  criterio y un botón por salida. Las salidas que cambian de estado lo indican.
- **Cambios de estado.** Al entrar en un estado, recuerda que hay que cambiarlo
  en DeviceHub y no deja seguir hasta marcarlo como hecho. Las salidas a
  DISMANTLE piden la nota con el motivo del catálogo, lista para copiar.
- **Plazos.** Las esperas del donante muestran los días que quedan, y la lista
  permite ver los móviles ordenados por vencimiento.
- **Historial.** Cada paso queda registrado con la hora; se puede deshacer el
  último y copiar el historial entero.

## Limitaciones del prototipo

- Los datos se guardan solo en el navegador del móvil que se usa. Conviene
  exportar una copia de vez en cuando, desde la lista.
- No escribe directamente en DeviceHub: abre su WebForm para el alta y las
  fotos; los cambios de estado y las notas se hacen a mano.
- El escáner de QR usa la API `BarcodeDetector`, que tiene Chrome en Android.
  Donde no existe, el número se teclea.

## De dónde sale el flujo

El flujo está en [`flujo/flujo.yaml`](https://github.com/aucoop/vincle-digital-docs/blob/main/flujo/flujo.yaml),
que es la versión ejecutable de los [diagramas detallados](diagramas-detallados.md).
Tras editarlo:

```sh
python flujo/generar.py                      # valida y regenera docs/app/flujo.json
python flujo/generar.py --mermaid INSTALL    # diagrama de un estado, para comparar
```

El despliegue falla si `flujo.json` no está al día con el YAML.
