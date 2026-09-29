# Flujo de alto nivel

Vista resumida del recorrido de un móvil, desde su recepción hasta la entrega,
reutilización o reciclaje.

```mermaid
flowchart TD
    START(["Móvil recibido"]) --> INBOX["INBOX<br/>etiqueta, fotos y alta<br/>con DH-scan o WebForm"]
    INBOX -->|"daño evidente"| DIS
    INBOX --> VI["VISUAL INSPECTION<br/>carga, arranque y bloqueo"]

    VI -->|"no carga o no arranca"| DIS
    VI -->|"bloqueado con PIN o FRP"| PD
    VI -->|"arranca y es accesible"| INSTALL

    PD["PENDING DONOR · nuevo<br/>pedir PIN, verificación FRP<br/>o liberar la gestión empresarial<br/>plazo de 30 días"]
    PD -->|"se recupera el acceso"| INSTALL
    PD -->|"sin respuesta en 30 días"| DIS

    INSTALL["INSTALL<br/>quitar cuentas, factory reset<br/>y usuario de test"]
    INSTALL -->|"pide contraseña o<br/>gestión empresarial"| PD
    INSTALL -->|"obsoleto"| DIS
    INSTALL -->|"reset hecho"| TEST

    TEST["TEST<br/>Workbench Android:<br/>tests y snapshot"]
    TEST -->|"apto según criterios"| PACK
    TEST -->|"requiere reparación"| REPAIR

    REPAIR["REPAIR"]
    REPAIR -->|"reparación completada"| TEST
    REPAIR -->|"no reparable"| DIS

    PACK["PACKAGING<br/>reset II y preparar la entrega"]
    PACK -->|"no arranca tras el reset II"| REPAIR
    PACK -->|"pide la cuenta anterior (FRP)"| PD
    PACK -->|"entregado a receptor"| DON["DONATION"]

    DON --> USE["IN USE · nuevo"]
    USE -->|"devolución o cambio de persona"| VI
    USE -->|"se rompe sin arreglo"| DIS

    DIS(["DISMANTLE<br/>reciclaje"])

    classDef reject fill:#f8d7da,stroke:#b02a37,color:#58151c
    classDef ok fill:#d1e7dd,stroke:#146c43,color:#0a3622
    classDef checkpoint fill:#fff3cd,stroke:#997404,color:#664d03
    classDef newstate fill:#e2d9f3,stroke:#59359a,color:#2f1c6a
    class DIS reject
    class DON ok
    class INBOX,TEST checkpoint
    class PD,USE newstate
```
