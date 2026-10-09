# Diagrames detallats del recondicionament de mòbils

Desenvolupa el [diagrama d'alt nivell](../diagrama-alto-nivel/) estat a estat,
encaixant cada caixa del Lucidchart "Diagrama reparació Vincle Digital" a
l'estat de DeviceHub on passa.

## Llegenda { #leyenda }

Tots els diagrames fan servir els mateixos colors:

| Color | Significat |
|---|---|
| Blau | Alguna cosa queda escrita a DeviceHub: evidència, canvi d'estat, nota o propietat |
| Groc | Checkpoint: evidència de DH-scan o snapshot de workbench-android |
| Vermell | Sortida a DISMANTLE. Sempre amb nota del motiu |
| Verd | Surt de l'estat cap al següent del camí normal |
| Morat | Estat nou que encara no existeix a DeviceHub |
| Gris | Document o fitxa de suport (caixes "document" del Lucidchart) |


---

## 1. Màquina d'estats { #1-maquina-de-estados }

La vista completa: quins estats hi ha i quines transicions són vàlides. El
detall de cada estat és a les seccions següents.

```mermaid
stateDiagram-v2
    direction TB

    state "INBOX" as INBOX
    state "VISUAL INSPECTION" as VI
    state "PENDING DONOR (nou)" as PD
    state "INSTALL" as INSTALL
    state "TEST" as TEST
    state "REPAIR" as REPAIR
    state "PACKAGING" as PACK
    state "DONATION" as DON
    state "IN USE (nou)" as USE
    state "DISMANTLE" as DIS

    [*] --> INBOX: mòbil rebut,<br/>primer POST de DH-scan
    INBOX --> VI: registrat
    INBOX --> DIS: dany evident

    VI --> INSTALL: arrenca i és accessible
    VI --> PD: bloquejat amb PIN<br/>o FRP
    VI --> DIS: no carrega<br/>o no arrenca

    PD --> INSTALL: es recupera l'accés<br/>o s'allibera la gestió
    PD --> DIS: sense resposta en 30 dies

    INSTALL --> TEST: reset fet,<br/>usuari de test configurat
    INSTALL --> DIS: obsolet
    INSTALL --> PD: demana una contrasenya<br/>o alliberar la gestió

    TEST --> PACK: apte segons<br/>criteris de lliurament
    TEST --> REPAIR: requereix<br/>reparació

    REPAIR --> TEST: reparació<br/>completada
    REPAIR --> DIS: no reparable<br/>o reparació no viable

    PACK --> DON: lliurat al receptor
    PACK --> REPAIR: no arrenca<br/>després del reset II
    PACK --> PD: demana el compte<br/>anterior (FRP)

    DON --> USE: el receptor el fa servir
    USE --> VI: devolució o<br/>canvi de persona
    USE --> DIS: es trenca sense arranjament

    DIS --> [*]
```

El procediment intern de REPAIR queda fora de l'abast d'aquest document. Una
reparació completada requereix repetir TEST abans de decidir si el dispositiu
és apte per a PACKAGING.

---

## 2. INBOX · Etiquetatge i triatge ràpid { #2-inbox-etiquetado-y-cribado-rapido }

És un triatge de pocs segons per mòbil: s'etiqueta, es dona d'alta i s'aparta
el que es veu a simple vista que no serveix. No s'encén el mòbil ni es busca
informació del model: en aquest punt es fa un primer registre a DeviceHub per
tenir constància dels mòbils que rebem.

```mermaid
flowchart TD
    START(["Mòbil rebut"]) --> PEGAR["Enganxar la següent etiqueta<br/>preimpresa del full"]
    PEGAR --> SCAN["DH-scan o WebForm de DeviceHub:<br/>custom_id, fotos i tipus"]:::checkpoint
    SCAN --> LBL{"Té l'etiqueta<br/>del fabricant a la vista?"}
    LBL -->|"Sí"| OCR["DH-scan: codi de barres o OCR<br/>fabricant, model, número de sèrie,<br/>product code, GTIN"]:::checkpoint
    LBL -->|"No"| POST
    OCR --> POST["Primer POST d'evidència<br/>a DeviceHub: el mòbil<br/>consta com a rebut"]:::dh
    POST --> ST_INBOX["Estat INBOX"]:::dh

    ST_INBOX --> CRIBA{"Triatge a simple vista"}

    CRIBA -->|"iPhone"| IPH(["Fora del flux Android<br/>veure preguntes obertes"]):::reject
    CRIBA -->|"Mòbil de tecles<br/>o un altre aparell"| OTRO(["Reclassificar o<br/>DISMANTLE"]):::reject
    CRIBA -->|"Bateria inflada"| N_BAT["Nota: [BATERIA-HINCHADA]<br/>+ foto"]:::dh
    N_BAT --> DIS(["DISMANTLE"]):::reject

    CRIBA -->|"Trencat, mullat<br/>o un altre dany greu"| N_DEST["Nota: [DAÑO-EVIDENTE]<br/>+ foto"]:::dh
    N_DEST --> DIS
    CRIBA -->|"Mòbil o tauleta Android"| NEXT(["→ VISUAL INSPECTION"]):::ok

    classDef reject fill:#f8d7da,stroke:#b02a37,color:#58151c
    classDef ok fill:#d1e7dd,stroke:#146c43,color:#0a3622
    classDef checkpoint fill:#fff3cd,stroke:#997404,color:#664d03
    classDef dh fill:#cfe2ff,stroke:#0a58ca,color:#052c65
```

**ID i etiqueta.** Les etiquetes s'imprimeixen per endavant en fulls A4 amb
numeració correlativa, amb l'eina `generar_planchas.py`.

- El QR porta només el número, no una URL: DH-scan desa el text del QR tal
  qual com a `custom_id`. A workbench-android el número es tecleja i l'app
  comprova a DeviceHub que existeix.

**Només allò evident.** Aquí es descarta el que no necessita comprovació:
pantalla trencada a trossos, bateria inflada (apartar l'aparell pel risc
d'incendi) o senyals clars d'aigua. La resta del maquinari el prova
workbench-android a TEST.

Queda a DeviceHub en sortir d'INBOX:

| Dada | Origen |
|---|---|
| `custom_id` | QR de l'etiqueta, llegit per DH-scan i enviat al primer POST |
| tipus | `DeviceType` de mòbil o de tauleta de la institució |
| fotos | DH-scan o WebForm de DeviceHub |
| fabricant, model, número de sèrie, product code, GTIN | Codi de barres o OCR de l'etiqueta, si n'hi ha, com a propietats |
| estat `INBOX` | La guia el marca després del primer POST, amb el token API o a mà |


---

## 3. VISUAL INSPECTION · Càrrega, arrencada i bloqueig { #3-visual-inspection-carga-arranque-y-bloqueo }

Respon al que workbench-android no pot comprovar perquè encara no està
instal·lat: si el mòbil carrega, si arrenca i si hi podem entrar. Tota la
resta es mira en un altre lloc:

```mermaid
flowchart TD
    IN(["Des d'INBOX<br/>o des d'IN USE"]) --> ST_VI["Estat VISUAL INSPECTION"]:::dh

    ST_VI --> CARGA{"Endollar 15 min<br/>carrega? icona o LED"}
    CARGA -->|"No"| OTRO_CAB["Provar un altre cable<br/>i netejar el connector"]
    OTRO_CAB --> CARGA2{"Carrega ara?"}
    CARGA2 -->|"No"| N_NOCAR["Nota: no carrega"]:::dh
    N_NOCAR --> DIS1(["DISMANTLE"]):::reject
    CARGA2 -->|"Sí"| ARRANCA
    CARGA -->|"Sí"| ARRANCA{"Arrenca?"}

    ARRANCA -->|"No"| N_NOARR["Nota: no arrenca<br/>bootloop o pantalla negra"]:::dh
    N_NOARR --> DIS2(["DISMANTLE"]):::reject

    ARRANCA -->|"Sí"| PANT{"Quina pantalla surt?"}
    PANT -->|"Escriptori sense bloqueig"| OK(["→ INSTALL"]):::ok
    PANT -->|"Assistent inicial"| FRP{"Demana el compte<br/>anterior? FRP"}
    FRP -->|"No"| OK
    FRP -->|"Sí"| PEND
    PANT -->|"Pantalla de bloqueig"| PIN{"El PIN venia<br/>amb la donació<br/>i funciona?"}
    PIN -->|"Sí"| OK
    PIN -->|"No"| PEND(["→ PENDING DONOR"]):::newstate

    classDef reject fill:#f8d7da,stroke:#b02a37,color:#58151c
    classDef ok fill:#d1e7dd,stroke:#146c43,color:#0a3622
    classDef dh fill:#cfe2ff,stroke:#0a58ca,color:#052c65
    classDef newstate fill:#e2d9f3,stroke:#59359a,color:#2f1c6a
```

La càrrega va abans que l'arrencada perquè un mòbil sense bateria no arrenca i
no es pot distingir d'un d'espatllat. No cal carregar-lo més: n'hi ha prou que
s'encengui. Si hi ha un tester USB a mà, es pot fer servir per comprovar si el
mòbil consumeix corrent encara que no mostri cap icona ni LED. El consum
concret depèn del model, de la bateria i de la fase de càrrega.

Mai no es proven PIN a cegues: després de diversos intents el mòbil es
bloqueja durant un temps o s'esborra, i això darrer deixa l'FRP armat.

---

## 4. PENDING DONOR (RELEASE) · Espera d'alliberament (estat nou) { #4-pending-donor-release-espera-de-liberacion-estado-nuevo }

Espera l'actuació del donant, propietari o empresa per obtenir un PIN,
completar la verificació FRP o retirar la gestió empresarial.


```mermaid
flowchart TD
    IN(["Des de VISUAL INSPECTION,<br/>INSTALL o PACKAGING"]) --> ST_PD["Estat PENDING DONOR<br/>nota: data límit = avui + 30 dies"]:::dh
    ST_PD --> GUARDAR["Desar a la prestatgeria<br/>d'espera, etiquetat"]
    GUARDAR --> CONTACTO{"Hi ha contacte del donant,<br/>propietari o empresa?"}

    CONTACTO -->|"No"| N_ANON["Nota: donant anònim"]:::dh
    N_ANON --> DIS1(["DISMANTLE"]):::reject

    CONTACTO -->|"Sí"| MSG["Demanar que desbloquegi el dispositiu,<br/>completi la verificació FRP<br/>o retiri la gestió empresarial"]:::dh
    MSG --> R1{"Respon<br/>en 7 dies?"}
    R1 -->|"No"| REC["Recordatori"]:::dh
    REC --> R2{"Respon abans<br/>de la data límit?"}
    R2 -->|"No"| N_TIME["Nota: sense resposta<br/>en 30 dies"]:::dh
    N_TIME --> DIS2(["DISMANTLE"]):::reject

    R1 -->|"Sí"| QUE
    R2 -->|"Sí"| QUE{"Què respon?"}
    QUE -->|"Dona el PIN"| PIN["Provar el PIN per desbloquejar el mòbil"]
    QUE -->|"FRP actiu"| FRP_OK["El donant completa<br/>la verificació amb un compte<br/>sincronitzat prèviament"]
    QUE -->|"Gestió empresarial"| MDM_OK["L'empresa retira<br/>MDM, zero-touch o Knox"]
    QUE -->|"No vol o no pot"| N_NEG["Nota: el donant rebutja"]:::dh
    N_NEG --> DIS3(["DISMANTLE"]):::reject

    PIN --> FUNC{"Es desbloqueja?"}
    FUNC -->|"No"| MSG
    FUNC -->|"Sí"| N_OK["Nota: accés recuperat"]:::dh
    FRP_OK --> N_OK
    MDM_OK --> N_OK
    N_OK --> OK(["→ INSTALL"]):::ok

    classDef reject fill:#f8d7da,stroke:#b02a37,color:#58151c
    classDef ok fill:#d1e7dd,stroke:#146c43,color:#0a3622
    classDef dh fill:#cfe2ff,stroke:#0a58ca,color:#052c65
```


---

## 5. INSTALL · Esborrat de comptes, reset i registre amb workbench-android { #5-install-borrado-de-cuentas-reset-y-registro-con-workbench-android }

```mermaid
flowchart TD
    IN(["Des de VISUAL INSPECTION<br/>o PENDING DONOR"]) --> ST_IN["Estat INSTALL"]:::dh

    ST_IN --> EMM{"Gestió empresarial?<br/>perfil de treball,<br/>zero-touch, Knox"}
    EMM -->|"Sí"| N_EMM["Nota: bloqueig MDM empresarial<br/>demanar la baixa a l'empresa"]:::dh
    N_EMM --> PEND_MDM(["→ PENDING DONOR"]):::newstate

    EMM -->|"No"| BANDEJA["Treure la safata: retirar<br/>la SIM i la SD del donant"]
    BANDEJA --> DONATE["Instal·lar donate-android<br/>APK sense permisos ni xarxa"]
    DONATE --> CUENTAS["donate-android guia:<br/>eliminar tots els comptes,<br/>Google i fabricant"]
    CUENTAS --> PASS{"Demana una contrasenya<br/>que no tenim?"}
    PASS -->|"Sí"| PEND(["→ PENDING DONOR"]):::newstate
    PASS -->|"No"| LOCK["Treure el bloqueig de pantalla"]
    LOCK --> RESET["donate-android obre el<br/>factory reset del sistema"]

    RESET --> ASIST["Arrenca a<br/>l'assistent inicial"]
    ASIST --> USR["Configurar l'usuari de test<br/>sense compte de Google<br/>idioma, data, sense PIN"]
    USR --> WIFI_CFG["Connectar a la WiFi del taller"]
    WIFI_CFG --> INSTWB["Instal·lar workbench-android<br/>APK"]
    INSTWB --> WBID["workbench-android:<br/>teclejar el número de l'etiqueta<br/>i comprovar-lo a DeviceHub"]
    WBID --> INV["Snapshot d'inventari<br/>model, Android, pedaç,<br/>RAM, emmagatzematge, bateria"]:::checkpoint

    INV --> OBS{"Obsolet?<br/>pedaç de fa<br/>més de X anys"}
    OBS -->|"Sí"| N_OBS["Nota: obsolet<br/>model, Android i pedaç"]:::dh
    N_OBS --> DIS0(["DISMANTLE"]):::reject
    OBS -->|"No"| OK(["→ TEST"]):::ok

    classDef reject fill:#f8d7da,stroke:#b02a37,color:#58151c
    classDef ok fill:#d1e7dd,stroke:#146c43,color:#0a3622
    classDef checkpoint fill:#fff3cd,stroke:#997404,color:#664d03
    classDef dh fill:#cfe2ff,stroke:#0a58ca,color:#052c65
    classDef newstate fill:#e2d9f3,stroke:#59359a,color:#2f1c6a
```

**donate-android** guia l'esborrat de comptes i obre el factory reset del mateix
Android: l'app no pot fer el reset ni saltar-se res. No demana permisos ni té
accés a la xarxa, així que es pot instal·lar en un mòbil que encara té dades
del donant. workbench-android, en canvi, s'instal·la després del reset. L'última
APK publicada es descarrega des de
[`apps.sergiogimenez.com/workbench`](https://apps.sergiogimenez.com/workbench).

L'ordre importa: comptes fora **abans** del reset. Si es reseteja amb el compte
posat, apareix l'FRP i només el propietari el pot treure. No s'intenta cap
bypass de l'FRP.

### Què reporta workbench-android { #que-reporta-workbench-android }

El que necessitem del registre i el que envia l'app al snapshot. El que arriba
a DeviceHub com a propietat es veu a la fitxa del producte.

| Dada | Per a què | A l'app | A DeviceHub |
|---|---|---|---|
| `custom_id` | Unir amb l'alta de DH-scan | Es tecleja i es comprova que existeix a DeviceHub abans d'enviar (l'etiqueta és a la part del darrere del mateix mòbil, la seva càmera no la veu) | Identificador del producte |
| Tipus | Mòbil o tauleta | `Smartphone` o `Tablet` (pantalla ≥ 600 dp) | Tipus del producte |
| Fabricant, marca, model | Fitxa | Sí, de `Build` | Sí |
| Versió d'Android, API | Fitxa, obsolet | Sí | `android:version`, `android:api_level` |
| Pedaç de seguretat | Decidir obsolet | Sí, `Build.VERSION.SECURITY_PATCH` | `android:security_patch` |
| Obsolet | Sortida a DISMANTLE | No | Falta la regla: es decideix amb `android:security_patch` |
| CPU, RAM, emmagatzematge, pantalla, càmeres, sensors | Fitxa | Sí | Components |
| Bateria: nivell, salut, voltatge, temperatura | Fitxa, TEST | Sí | Component bateria |
| Cicles de bateria | Desgast | Només API 34+ i segons el fabricant | Sense alternativa fiable |
| Salut de la bateria en % | Desgast | No, fixat a `null` | Depèn del fabricant |
| Número de sèrie | Fitxa | No | No accessible sense privilegis des de l'API 29. Surt de l'etiqueta (DH-scan) |
| IMEI | Fitxa, traçabilitat | No | No accessible des de l'API 29. `*#06#` a mà |
| SIM o SD a dins | Control d'INSTALL, abans del reset | Parcial: el test de SIM demana retirar-la | La SD no es comprova |
| Specs PD (càrrega ràpida) | Carregador de lliurament | No | Android no ho exposa: fitxa del fabricant |

Falta fixar la X del criteri d'obsolet.

---

## 6. TEST · Diagnòstic amb workbench-android { #6-test-diagnostico-con-workbench-android }

**La idea és que tots els tests es facin des de workbench-android**, sense
proves a mà ni diagnòstics de fàbrica: és l'única manera que el taller no perdi
temps i que cada resultat quedi al snapshot.

```mermaid
flowchart TD
    IN(["Des d'INSTALL"]) --> ST_T["Estat TEST"]:::dh
    ST_T --> WB["Completar tots els tests<br/>a Workbench Android<br/>i enviar el snapshot"]:::checkpoint
    WB --> PROPS["Resultats hwtest:*<br/>desats a Propietats<br/>de DeviceHub"]:::dh
    PROPS --> DEC{"Compleix els criteris<br/>de lliurament?"}
    DEC -->|"Sí"| PACK(["→ PACKAGING"]):::ok
    DEC -->|"No"| REP(["→ REPAIR"]):::ok

    classDef ok fill:#d1e7dd,stroke:#146c43,color:#0a3622
    classDef checkpoint fill:#fff3cd,stroke:#997404,color:#664d03
    classDef dh fill:#cfe2ff,stroke:#0a58ca,color:#052c65
```

Workbench guia totes les proves —incloses la SIM i la bateria quan
correspongui—, registra `PASS`, `FAIL` o `SKIP` i envia el snapshot. La guia
del taller només confirma que s'ha completat aquest recorregut, sense
duplicar-lo com a checklist. Els resultats queden a DeviceHub i, segons els
criteris de lliurament, el mòbil passa a PACKAGING o a REPAIR.

### Què fa workbench-android { #que-hace-workbench-android }

Tots els tests del diagrama són a l'app. Cada resultat arriba a DeviceHub com a
propietat `hwtest:<id>`. Si canvia entre passades, el canvi queda al registre
del producte.

| Test | Ids de resultat | Com decideix |
|---|---|---|
| Pantalla, tàctil, multitàctil | `screen`, `touch`, `multitouch` | Operari; el tàctil passa només en cobrir la graella |
| Sensors | `accelerometer`, `gyroscope`, `magnetometer`, `proximity`, `light` | Passa si la lectura canvia; SKIP si no existeix |
| Vibració, llanterna | `vibration`, `flashlight` | Operari |
| Càrrega | `charging` | Pass només amb el carregador detectat |
| WiFi | `wifi` | Pass només amb WiFi validada pel sistema |
| Àudio | `speaker`, `earpiece`, `microphone` | Operari; auricular SKIP si no n'hi ha; el micròfon grava i reprodueix |
| Càmeres | `camera_back`, `camera_front` | Operari amb la vista prèvia; SKIP si no n'hi ha |
| Botons | `volume_up`, `volume_down`, `power` | Detectats: tecles de volum i pantalla apagada |
| Bluetooth | `bluetooth` | Pass amb almenys un dispositiu visible trobat |
| GPS | `gps` | Pass amb satèl·lits visibles; la nota porta satèl·lits i fix |
| SIM | `sim`, `cellular_network`, `call`, `mobile_data` | SIM a punt, registre a la xarxa, trucada pel marcador, dades validades. SKIP sense telefonia |
| Bateria | `battery_drain` | Descàrrega de 15, 30 o 60 min; la caiguda va a la nota |


Encara sense provar en un mòbil real: llegir un QR real, auricular, micròfon
amb veu, Bluetooth amb dispositius a prop i la trucada. A l'emulador funcionen
el recorregut complet, la represa i l'enviament a DeviceHub.

---

## 7. PACKAGING → DONATION → IN USE · Preparació, lliurament i ús { #7-packaging-donation-in-use-preparacion-entrega-y-uso }


```mermaid
flowchart TD
    IN(["Des de TEST<br/>apte per al lliurament"]) --> ST_P["Estat PACKAGING"]:::dh

    ST_P --> RESET2["Reset II<br/>factory reset des d'Ajustos:<br/>esborra l'usuari de test i la WiFi"]
    RESET2 --> ASIST{"Arrencada correcta a l'assistent<br/>inicial sense demanar compte?"}
    ASIST -->|"No"| REP(["→ REPAIR"]):::ok
    ASIST -->|"Sí"| FRP{"Demana un compte<br/>anterior? FRP"}

    FRP -->|"Sí"| PEND(["→ PENDING DONOR"]):::newstate
    FRP -->|"No"| APAGAR["Apagar amb la<br/>bateria al 50-80 %"]
    APAGAR --> LIMPIEZA["Neteja exterior<br/>i protector si cal"]
    LIMPIEZA --> KIT["Kit: mòbil, carregador,<br/>cable, funda,<br/>guia de primers passos"]
    KIT --> ETIQ["Etiqueta QR visible<br/>amb custom_id"]
    ETIQ --> ESPERA["Prestatgeria de llestos"]

    ESPERA --> ASIGN{"Hi ha receptor<br/>assignat?"}
    ASIGN -->|"No"| ESPERA
    ASIGN -->|"Sí"| ENTREGA["Lliurament al receptor<br/>signatura de recepció"]

    ENTREGA --> ST_D["Estat DONATION<br/>nota: entitat o receptor"]:::dh
    ST_D --> CONF["Primera configuració<br/>amb el receptor si ho necessita"]
    CONF --> ST_U["Estat IN USE"]:::newstate

    ST_U --> CHK["Passada de workbench-android<br/>periòdica o en tornar"]:::checkpoint
    CHK --> EVENTO{"Què passa?"}
    EVENTO -->|"Continua en ús"| ST_U
    EVENTO -->|"Canvi de persona<br/>o devolució"| VI(["→ VISUAL INSPECTION"]):::ok
    EVENTO -->|"Es trenca"| REV{"Reparable?"}
    REV -->|"Sí"| VI
    REV -->|"No"| DIS(["DISMANTLE"]):::reject

    classDef reject fill:#f8d7da,stroke:#b02a37,color:#58151c
    classDef ok fill:#d1e7dd,stroke:#146c43,color:#0a3622
    classDef checkpoint fill:#fff3cd,stroke:#997404,color:#664d03
    classDef dh fill:#cfe2ff,stroke:#0a58ca,color:#052c65
    classDef newstate fill:#e2d9f3,stroke:#59359a,color:#2f1c6a
```

La tornada des d'IN USE entra per VISUAL INSPECTION i no per TEST: el mòbil ha
estat en mans d'una altra persona i pot tornar amb comptes, PIN o danys nous.

Cada fila `DONATION` de l'historial obre un període d'ús i la transició
següent el tanca. Amb això es calculen les hores d'impacte social sense marcar
evidències a mà.

---

## 8. DISMANTLE · Catàleg de motius { #8-dismantle-catalogo-de-motivos }

Totes les sortides vermelles acaben aquí. Per poder comptar després per què es
perden mòbils, el motiu ha de ser un d'aquesta llista i anar al principi de la
nota del canvi d'estat, per exemple `[NO-CARGA] provat amb dos cables`. Els
codis es mantenen en castellà en tots els idiomes perquè es puguin comptar
plegats.

```mermaid
flowchart LR
    subgraph INBOX
        M2["NO-ANDROID"]
        M0["DAÑO-EVIDENTE"]
        M4["BATERIA-HINCHADA"]
    end
    subgraph VISUAL_INSPECTION["VISUAL INSPECTION"]
        M5["NO-CARGA"]
        M6["NO-ARRANCA"]
    end
    subgraph PENDING_DONOR["PENDING DONOR"]
        M7["DONANTE-ANONIMO"]
        M8["SIN-RESPUESTA"]
        M9["DONANTE-RECHAZA"]
    end
    subgraph INSTALL
        M1["OBSOLETO"]
        M10["MDM-EMPRESA"]
    end
    subgraph IN_USE["IN USE"]
        M19["ROTO-EN-USO"]
    end

    INBOX --> DIS
    VISUAL_INSPECTION --> DIS
    PENDING_DONOR --> DIS
    INSTALL --> DIS
    IN_USE --> DIS

    DIS["DISMANTLE"]:::reject --> DEST{"Destinació"}
    DEST --> PIEZAS["Donant de peces<br/>pantalla, bateria, càmera"]
    DEST --> WEEE["Gestor autoritzat RAEE<br/>amb esborrat certificat<br/>si no s'ha pogut resetejar"]

    classDef reject fill:#f8d7da,stroke:#b02a37,color:#58151c
```

| Codi | Significat |
|---|---|
| `NO-ANDROID` | No és un mòbil o tauleta Android |
| `DAÑO-EVIDENTE` | Dany físic evident |
| `BATERIA-HINCHADA` | Bateria inflada |
| `NO-CARGA` | No carrega |
| `NO-ARRANCA` | No arrenca |
| `DONANTE-ANONIMO` | Donant anònim |
| `SIN-RESPUESTA` | Sense resposta en 30 dies |
| `DONANTE-RECHAZA` | El donant rebutja |
| `OBSOLETO` | Obsolet |
| `MDM-EMPRESA` | Bloqueig MDM d'empresa |
| `ROTO-EN-USO` | Trencat durant l'ús sense arranjament |

---

## Preguntes obertes { #preguntas-abiertas }

Decisions preses per poder dibuixar i que convé validar:

1. **iPhone.** Què en fem?
2. **Criteri d'obsolet.** Quants anys d'antiguitat del pedaç de seguretat fan obsolet un mòbil?
3. **Llindar de bateria.** "Descàrrega excessiva en 60 minuts" necessita un número concret per grau.
