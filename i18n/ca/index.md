---
hide:
  - navigation
  - toc
---

# Una segona vida per a cada mòbil

<div class="hero-copy" markdown>
Vincle Digital documenta com rebre, revisar, esborrar, provar i lliurar
mòbils Android amb traçabilitat a DeviceHub.
</div>

[Veure el recorregut complet](diagramas-detallados.md){ .md-button .md-button--primary }
[Obrir la vista ràpida](diagrama-alto-nivel.md){ .md-button }
[Fer servir la guia pas a pas](guia-app.md){ .md-button }

<div class="process-grid" markdown>

<div class="process-card" markdown>
### 01 · Registrar { #01-registrar }

Etiqueta, fotos i primera alta amb DH-scan o el WebForm de DeviceHub. Cada
mòbil rep un `custom_id` que l'acompanya durant tot el procés.
</div>

<div class="process-card" markdown>
### 02 · Preparar { #02-preparar }

Comprovació de càrrega, arrencada i bloquejos abans de retirar comptes i
executar el restabliment de fàbrica.
</div>

<div class="process-card" markdown>
### 03 · Provar { #03-probar }

Workbench Android registra l'inventari i les proves de maquinari a DeviceHub;
no queden resultats solts en paper.
</div>

<div class="process-card" markdown>
### 04 · Lliurar { #04-entregar }

El mòbil net i preparat passa a donació. Si torna, entra una altra vegada per
la inspecció visual.
</div>

</div>

## Recorregut resumit { #recorrido-resumido }

```mermaid
flowchart TD
    A["Recepció<br/>INBOX"] --> B["Inspecció<br/>VISUAL INSPECTION"]
    B --> C["Instal·lació<br/>INSTALL"]
    C --> D["Tests<br/>TEST"]
    D --> E["Preparació<br/>PACKAGING"]
    E --> F["Donació"]
    F --> G["En ús"]
    G --> B
    B -. "bloquejat" .-> P["Espera del donant<br/>PENDING DONOR"]
    C -. "contrasenya o MDM" .-> P
    P -. "accés recuperat" .-> C
    D -. "no apte" .-> R["Reparació<br/>REPAIR"]
    R -. "reparat" .-> D
    B -. "no arrenca" .-> H["Reciclatge<br/>DISMANTLE"]
    R -. "no reparable" .-> H
```

!!! info "Document viu"
    Els estats nous, els criteris pendents i les preguntes obertes estan
    marcats dins del [flux detallat](diagramas-detallados.md).
