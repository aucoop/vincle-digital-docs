---
hide:
  - navigation
  - toc
---

# A second life for every phone

<div class="hero-copy" markdown>
Vincle Digital documents how to receive, check, wipe, test and hand over
Android phones with traceability in DeviceHub.
</div>

[See the full route](diagramas-detallados.md){ .md-button .md-button--primary }
[Open the quick view](diagrama-alto-nivel.md){ .md-button }
[Use the step-by-step guide](guia-app.md){ .md-button }

<div class="process-grid" markdown>

<div class="process-card" markdown>
### 01 · Register { #01-registrar }

Label, photos and first registration with DH-scan or the DeviceHub WebForm.
Each phone gets a `custom_id` that stays with it throughout the process.
</div>

<div class="process-card" markdown>
### 02 · Prepare { #02-preparar }

Check charging, booting and locks before removing accounts and running the
factory reset.
</div>

<div class="process-card" markdown>
### 03 · Test { #03-probar }

Workbench Android records the inventory and hardware tests in DeviceHub; no
results are left lying around on paper.
</div>

<div class="process-card" markdown>
### 04 · Hand over { #04-entregar }

The clean, prepared phone goes to donation. If it comes back, it re-enters
through visual inspection.
</div>

</div>

## Route at a glance { #recorrido-resumido }

```mermaid
flowchart TD
    A["Reception<br/>INBOX"] --> B["Inspection<br/>VISUAL INSPECTION"]
    B --> C["Installation<br/>INSTALL"]
    C --> D["Tests<br/>TEST"]
    D --> E["Preparation<br/>PACKAGING"]
    E --> F["Donation"]
    F --> G["In use"]
    G --> B
    B -. "locked" .-> P["Waiting for the donor<br/>PENDING DONOR"]
    C -. "password or MDM" .-> P
    P -. "access recovered" .-> C
    D -. "not fit" .-> R["Repair<br/>REPAIR"]
    R -. "repaired" .-> D
    B -. "does not boot" .-> H["Recycling<br/>DISMANTLE"]
    R -. "not repairable" .-> H
```

!!! info "Living document"
    New states, pending criteria and open questions are marked in the
    [detailed flow](diagramas-detallados.md).
