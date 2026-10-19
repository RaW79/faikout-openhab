<p align="right"><a href="https://buymeacoffee.com/raw07" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" height="40" alt="Buy Me A Coffee"></a></p>

# Faikout – openHAB Integration

[English](#english) | [Deutsch](#deutsch)

---

## English

Automatic setup of all [openHAB](https://www.openhab.org) MQTT Things, channels, and Items for the [Faikout](https://codeberg.org/RevK/ESP32-Faikout) ESP32 controller.

### What is the Faikout?

The Faikout is an ESP32 board connected to the S21 service port of a Daikin indoor unit. It controls the air conditioner fully locally via MQTT – no cloud required.

### What does this script do?

The script [`faikout_generator.js`](automation/js/faikout_generator.js) is placed in the openHAB automation folder and runs once automatically at every openHAB startup. It connects to each Faikout via HTTP, automatically detects the device ID and which features are active, and creates all required MQTT Things, channels, and Items.

- Device ID is fetched automatically – only the IP address needs to be configured
- Only active features are created (disabled features like streamer, LED, humidifier etc. are skipped)
- Supports multiple Faikout devices in a single script
- Re-running is safe – existing Things and Items are updated, not duplicated
- Optionally creates write-only Items for Faikout configuration parameters (heatback, tcontrol, etc.)

After the script has run, openHAB's MQTT Binding handles all further communication permanently.

### Prerequisites

- openHAB with the following add-ons installed:
  - **MQTT Binding** (`mqtt`)
  - **JavaScript Scripting** (`jsscripting`)
  - **JSONPath Transformation** (`jsonpath`)
- Faikout reachable via IP within the same network as the openHAB server
- An openHAB API token (Admin → Settings → API Tokens)

### Setup

1. Copy [`faikout_generator.js`](automation/js/faikout_generator.js) to `/etc/openhab/automation/js/`
2. Adjust the configuration block at the top of the script:

```js
const DEVICES = [
  { name: 'Klima_Wohnzimmer',   ip: '192.168.x.x' },
//{ name: 'Klima_Schlafzimmer', ip: '192.168.x.x' },
];

const MQTT_BROKER = {
  host: '192.168.x.x',
  port: 1883,
  user: '',
  pass: '',
};

const OPENHAB = {
  apiToken:          'oh.admin.xxxxxxxxxxxxxxxxxxxx',
  createConfigItems: true,
};
```

3. Restart openHAB once – Things and Items appear immediately.

The device ID is fetched automatically. Items are named after the device, e.g. `Klima_Wohnzimmer_Power`, `Klima_Wohnzimmer_Temp`, `Klima_Wohnzimmer_Mode` etc.

For each additional Faikout: add another entry to `DEVICES`.

### Optional: Faikout configuration parameters

Set `createConfigItems: true` to additionally create write-only Items for Faikout settings such as `heatback`, `coolback`, `tcontrol` and others (named `Klima_Wohnzimmer_Cfg_Heatback` etc.).

> **Note:** These Items are **write-only**. The Faikout does not include configuration parameters in its MQTT status message, so openHAB cannot read back the current value. Use the Faikout web UI as the authoritative source for current values.

### MQTT topic format

| Direction | Topic |
|-----------|-------|
| Status (read) | `state/<DeviceID>/status` |
| Command (write) | `setting/<DeviceID>/<key>` |

---

## Deutsch

Automatische Einrichtung aller [openHAB](https://www.openhab.org)-MQTT-Things, Channels und Items für den [Faikout](https://codeberg.org/RevK/ESP32-Faikout) ESP32-Controller.

### Was ist der Faikout?

Der Faikout ist ein ESP32-Board, das über den S21-Serviceanschluss eines Daikin-Innengeräts betrieben wird und das Klimagerät vollständig lokal per MQTT steuert – ohne Cloud.

### Was macht dieses Script?

Das Script [`faikout_generator.js`](automation/js/faikout_generator.js) wird im openHAB-Automationsordner abgelegt und läuft automatisch einmalig bei jedem openHAB-Start. Es verbindet sich per HTTP mit jedem Faikout, erkennt automatisch die Geräte-ID und aktive Features, und legt alle benötigten MQTT-Things, Channels und Items an.

- Geräte-ID wird automatisch ausgelesen – nur die IP-Adresse muss konfiguriert werden
- Nur aktive Features werden angelegt (deaktivierte Features wie Streamer, LED, Befeuchter etc. werden übersprungen)
- Mehrere Faikout-Geräte werden in einem einzigen Script unterstützt
- Erneutes Ausführen ist sicher – bestehende Things und Items werden aktualisiert, nicht doppelt angelegt
- Optional werden schreibgeschützte Items für Faikout-Konfigurationsparameter angelegt (heatback, tcontrol usw.)

Nach dem Script-Lauf übernimmt das openHAB MQTT-Binding dauerhaft die gesamte Kommunikation.

### Voraussetzungen

- openHAB mit folgenden installierten Add-ons:
  - **MQTT Binding** (`mqtt`)
  - **JavaScript Scripting** (`jsscripting`)
  - **JSONPath Transformation** (`jsonpath`)
- Faikout per IP im gleichen Netzwerk wie der openHAB-Server erreichbar
- Ein openHAB-API-Token (Admin → Einstellungen → API-Tokens)

### Einrichtung

1. [`faikout_generator.js`](automation/js/faikout_generator.js) nach `/etc/openhab/automation/js/` kopieren
2. Den Konfigurationsblock am Anfang des Scripts anpassen:

```js
const DEVICES = [
  { name: 'Klima_Wohnzimmer',   ip: '192.168.x.x' },
//{ name: 'Klima_Schlafzimmer', ip: '192.168.x.x' },
];

const MQTT_BROKER = {
  host: '192.168.x.x',
  port: 1883,
  user: '',
  pass: '',
};

const OPENHAB = {
  apiToken:          'oh.admin.xxxxxxxxxxxxxxxxxxxx',
  createConfigItems: true,
};
```

3. openHAB einmal neu starten – Things und Items erscheinen sofort.

Die Geräte-ID wird automatisch ausgelesen. Items werden nach dem Gerätenamen benannt, z.B. `Klima_Wohnzimmer_Power`, `Klima_Wohnzimmer_Temp`, `Klima_Wohnzimmer_Mode` usw.

Für jedes weitere Faikout: Einfach einen weiteren Eintrag in `DEVICES` hinzufügen.

### Optional: Faikout-Konfigurationsparameter

Mit `createConfigItems: true` werden zusätzlich schreibgeschützte Items für Faikout-Einstellungen wie `heatback`, `coolback`, `tcontrol` usw. angelegt (benannt z.B. `Klima_Wohnzimmer_Cfg_Heatback`).

> **Hinweis:** Diese Items sind **nur schreibend**. Der Faikout sendet Konfigurationsparameter nicht im MQTT-Status, daher kann openHAB den aktuellen Wert nicht zurücklesen. Die Faikout-Weboberfläche bleibt die maßgebliche Quelle für aktuelle Einstellungen.

### MQTT-Topic-Format

| Richtung | Topic |
|----------|-------|
| Status (lesen) | `state/<GeräteID>/status` |
| Befehl (schreiben) | `setting/<GeräteID>/<key>` |

---

<small><em>All information is provided for educational purposes based on community experience. No liability is accepted for errors, omissions, or any damage resulting from the use of this information. Always follow applicable local regulations, standards, and safety requirements. Work on electrical installations must only be carried out by qualified personnel. / Alle Informationen basieren auf Erfahrungen aus der Community und dienen ausschließlich zu Informationszwecken. Es wird keine Haftung für Fehler, Auslassungen oder Schäden übernommen, die aus der Nutzung entstehen. Einschlägige lokale Vorschriften, Normen und Sicherheitsanforderungen sind stets einzuhalten. Arbeiten an elektrischen Anlagen dürfen nur von qualifiziertem Fachpersonal durchgeführt werden.</em></small>
