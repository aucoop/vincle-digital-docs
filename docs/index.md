---
hide:
  - navigation
  - toc
---

# Una segunda vida para cada móvil

<div class="hero-copy" markdown>
Vincle Digital documenta cómo recibir, revisar, borrar, probar y entregar
móviles Android con trazabilidad en DeviceHub.
</div>

[Ver el recorrido completo](diagramas-detallados.md){ .md-button .md-button--primary }
[Abrir vista rápida](diagrama-alto-nivel.md){ .md-button }

<div class="process-grid" markdown>

<div class="process-card" markdown>
### 01 · Registrar

Etiqueta, fotos y primer alta mediante DH-scan. Cada móvil recibe un
`custom_id` que lo acompaña durante todo el proceso.
</div>

<div class="process-card" markdown>
### 02 · Preparar

Comprobación de carga, arranque y bloqueos antes de retirar cuentas y ejecutar
el restablecimiento de fábrica.
</div>

<div class="process-card" markdown>
### 03 · Probar

Workbench Android registra inventario y pruebas de hardware en DeviceHub; no
quedan resultados sueltos en papel.
</div>

<div class="process-card" markdown>
### 04 · Entregar

El móvil limpio y preparado pasa a donación. Si vuelve, entra otra vez por
inspección visual.
</div>

</div>

## Recorrido resumido

```mermaid
flowchart LR
    A[Recepción] --> B[Inspección]
    B --> C[Instalación]
    C --> D[Tests]
    D --> E[Preparación]
    E --> F[Donación]
    F --> G[En uso]
    G --> B
    B -. no apto .-> H[Reciclaje]
    D -. no apto .-> H
```

!!! info "Documento vivo"
    Los estados nuevos, criterios pendientes y preguntas abiertas están
    marcados dentro del [flujo detallado](diagramas-detallados.md).
