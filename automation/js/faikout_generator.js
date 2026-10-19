'use strict';

// ================================================================
// faikout_generator.js
// openHAB GraalVM JS – Faikout MQTT Integration Generator
//
// Place this file in: /etc/openhab/automation/js/
//
// Runs on system startup. Queries the Faikout HTTP pages to detect
// which features are active (same logic as the ioBroker generator),
// then creates:
//   - A MQTT Broker Thing
//   - A Generic MQTT Thing for the Faikout with per-feature channels
//   - Items linked to those channels
//
// All Things and Items are created via the openHAB REST API and
// stored in the internal JSON database (not in .things/.items files).
// Re-running the script is safe – existing entries are updated.
// ================================================================

const { rules, triggers, actions } = require('openhab');

// ================================================================
// CONFIGURATION – adjust to your setup
// ================================================================

// --- Faikout devices ---
// Add one entry per Faikout. The Device ID is fetched automatically from the device.
// name: used as Item prefix, e.g. Klima_Wohnzimmer_Power, Klima_Wohnzimmer_Temp, ...
const DEVICES = [
  { name: 'Klima_Wohnzimmer',    ip: '192.168.x.x' },
//{ name: 'Klima_Schlafzimmer',  ip: '192.168.x.x' },
//{ name: 'Klima_Kueche',        ip: '192.168.x.x' },
//{ name: 'Klima_Buero',         ip: '192.168.x.x' },
//{ name: 'Klima_Keller',        ip: '192.168.x.x' },
//{ name: 'Klima_Gaestezimmer',  ip: '192.168.x.x' },
];

// --- MQTT Broker ---
const MQTT_BROKER = {
  host: '192.168.x.x',
  port: 1883,
  user: '',
  pass: '',
};

// --- openHAB ---
const OPENHAB = {
  apiToken:            'oh.admin.xxxxxxxxxxxxxxxxxxxx',
  createConfigItems:   true,   // set false to skip write-only config channels
};

// ================================================================
// INTERNAL – do not change below this line
// ================================================================
const CFG = {
  mqttBrokerHost:      MQTT_BROKER.host,
  mqttBrokerPort:      MQTT_BROKER.port,
  mqttUsername:        MQTT_BROKER.user,
  mqttPassword:        MQTT_BROKER.pass,
  ohRestUrl:           'http://localhost:8080/rest',
  ohApiToken:          OPENHAB.apiToken,
  brokerUID:           'mqtt:broker:faikout-broker',
  createConfigChannels: OPENHAB.createConfigItems,
};

// ================================================================
// DEVICE CONTEXT – built at runtime per device
// ================================================================
// dev = {
//   name:         'Klima_Wohnzimmer'
//   ip:           '192.168.x.x'
//   host:         'AABBCCDDEEFF'          ← fetched from device
//   statusTopic:  'state/AABBCCDDEEFF/status'
//   commandTopic: 'setting/AABBCCDDEEFF'
//   deviceUID:    'mqtt:topic:faikout-broker:klima-wohnzimmer'
// }

// ================================================================
// CHANNEL DEFINITIONS
// All known Faikout fields. Only channels whose key appears in the
// device feature scan (or the whitelist) will be created.
//
//  id          label                        type      key           rw
// ================================================================
const CHANNELS = [
  // ---- Control ----
  { id: 'power',       label: 'Power',                   type: 'Switch', key: 'power',       rw: true  },
  { id: 'mode',        label: 'Mode',                    type: 'String', key: 'mode',        rw: true  },
  { id: 'fan',         label: 'Fan Speed',               type: 'String', key: 'fan',         rw: true  },
  { id: 'temp',        label: 'Target Temp',             type: 'Number', key: 'temp',        rw: true  },
  { id: 'swingv',      label: 'Swing Vertical',          type: 'Switch', key: 'swingv',      rw: true  },
  { id: 'swingh',      label: 'Swing Horizontal',        type: 'Switch', key: 'swingh',      rw: true  },
  { id: 'powerful',    label: 'Powerful',                type: 'Switch', key: 'powerful',    rw: true  },
  { id: 'econo',       label: 'Econo',                   type: 'Switch', key: 'econo',       rw: true  },
  { id: 'comfort',     label: 'Comfort Airflow',         type: 'Switch', key: 'comfort',     rw: true  },
  { id: 'streamer',    label: 'Streamer',                type: 'Switch', key: 'streamer',    rw: true  },
  { id: 'led',         label: 'LED',                     type: 'Switch', key: 'led',         rw: true  },
  { id: 'quiet',       label: 'Quiet Mode',              type: 'Switch', key: 'quiet',       rw: true  },
  { id: 'demand',      label: 'Demand Control',          type: 'Number', key: 'demand',      rw: true  },
  { id: 'louvre',      label: 'Louvre',                  type: 'String', key: 'louvre',      rw: true  },
  { id: 'humidify',    label: 'Humidifier',              type: 'String', key: 'humidify',    rw: true  },
  // ---- Auto / timer ----
  { id: 'autoe',       label: 'Auto Mode Enable',        type: 'Switch', key: 'autoe',       rw: true  },
  { id: 'autop',       label: 'Auto Power On/Off',       type: 'Switch', key: 'autop',       rw: true  },
  { id: 'autot',       label: 'Auto Target Temp',        type: 'Number', key: 'autot',       rw: true  },
  { id: 'autor',       label: 'Auto Hysteresis',         type: 'Number', key: 'autor',       rw: true  },
  // ---- Temperatures (read-only) ----
  { id: 'home',        label: 'Return Air Temp',         type: 'Number', key: 'home',        rw: false },
  { id: 'env',         label: 'Room Temp (sensor)',      type: 'Number', key: 'env',         rw: false },
  { id: 'outside',     label: 'Outdoor Temp',            type: 'Number', key: 'outside',     rw: false },
  { id: 'inlet',       label: 'Inlet Temp',              type: 'Number', key: 'inlet',       rw: false },
  { id: 'liquid',      label: 'Liquid Temp',             type: 'Number', key: 'liquid',      rw: false },
  // ---- Performance (read-only) ----
  { id: 'comp',        label: 'Compressor Speed',        type: 'Number', key: 'comp',        rw: false },
  { id: 'fanrpm',      label: 'Fan RPM',                 type: 'Number', key: 'fanrpm',      rw: false },
  { id: 'consumption', label: 'Power Consumption',       type: 'Number', key: 'consumption', rw: false },
  { id: 'anglev',      label: 'Vertical Vane Angle',     type: 'Number', key: 'anglev',      rw: false },
  { id: 'angleh',      label: 'Horizontal Vane Angle',   type: 'Number', key: 'angleh',      rw: false },
  { id: 'hum',         label: 'Humidity',                type: 'Number', key: 'hum',         rw: false },
  // ---- Energy meters (read-only) ----
  { id: 'Whheating',   label: 'Heating Energy',          type: 'Number', key: 'Whheating',   rw: false },
  { id: 'Whcooling',   label: 'Cooling Energy',          type: 'Number', key: 'Whcooling',   rw: false },
  { id: 'Whoutside',   label: 'Outdoor Unit Energy',     type: 'Number', key: 'Whoutside',   rw: false },
  // ---- Status flags (read-only) ----
  { id: 'slave',       label: 'Slave Mode',              type: 'Switch', key: 'slave',       rw: false },
  { id: 'antifreeze',  label: 'Anti-Freeze Active',      type: 'Switch', key: 'antifreeze',  rw: false },
  // ---- BLE sensor (optional) ----
  { id: 'ble_temp',    label: 'BLE Temperature',         type: 'Number', key: 'ble.temp',    rw: false },
  { id: 'ble_hum',     label: 'BLE Humidity',            type: 'Number', key: 'ble.hum',     rw: false },
  { id: 'ble_bat',     label: 'BLE Battery',             type: 'Number', key: 'ble.bat',     rw: false },
];

// Fields always included even if not found via o.xyz scan
// (present in status JSON but not always referenced in the UI script)
const FIELD_WHITELIST = new Set(['comp', 'outside', 'anglev', 'angleh', 'consumption']);

// ================================================================
// OPTIONAL CONFIG CHANNELS (write-only – not in MQTT status JSON)
// Set CFG.createConfigChannels = true to enable.
// These send directly to setting/ID/<key> – raw value payload.
// ================================================================
const CONFIG_CHANNELS = [
  { id: 'cfg_heatback',   label: 'Heat Pull-Back',           type: 'Number', key: 'heatback'   },
  { id: 'cfg_heatover',   label: 'Heat Push-Over',           type: 'Number', key: 'heatover'   },
  { id: 'cfg_coolback',   label: 'Cool Pull-Back',           type: 'Number', key: 'coolback'   },
  { id: 'cfg_coolover',   label: 'Cool Push-Over',           type: 'Number', key: 'coolover'   },
  { id: 'cfg_tcontrol',   label: 'Control Timeout',          type: 'Number', key: 'tcontrol'   },
  { id: 'cfg_thermref',   label: 'Inlet/Home Blend',         type: 'Number', key: 'thermref'   },
  { id: 'cfg_tmin',       label: 'Min Temperature',          type: 'Number', key: 'tmin'       },
  { id: 'cfg_tmax',       label: 'Max Temperature',          type: 'Number', key: 'tmax'       },
  { id: 'cfg_tcoolmin',   label: 'Min Temp Cooling',         type: 'Number', key: 'tcoolmin'   },
  { id: 'cfg_theatmax',   label: 'Max Temp Heating',         type: 'Number', key: 'theatmax'   },
  { id: 'cfg_frosttemp',  label: 'Frost Protection',         type: 'Number', key: 'frosttemp'  },
  { id: 'cfg_minoutside', label: 'Min Outdoor Temp',         type: 'Number', key: 'minoutside' },
  { id: 'cfg_switchtemp', label: 'Switch-Point Offset',      type: 'Number', key: 'switchtemp' },
  { id: 'cfg_pushtemp',   label: 'Push-Point Offset',        type: 'Number', key: 'pushtemp'   },
  { id: 'cfg_reporting',  label: 'Report Interval',          type: 'Number', key: 'reporting'  },
  { id: 'cfg_lockmode',   label: 'Lock Heat/Cool Mode',      type: 'Switch', key: 'lockmode'   },
];

// ================================================================
// HTTP HELPER (synchronous – openHAB GraalVM JS)
// ================================================================
function httpGet(url) {
  try {
    return actions.HTTP.sendHttpGetRequest(url, 6000);
  } catch (e) {
    console.warn('[faikout-gen] HTTP GET ' + url + ' failed: ' + e);
    return null;
  }
}

// ================================================================
// FETCH DEVICE ID – reads MAC/hostname from /revk-settings page
// ================================================================
function fetchDeviceId(ip) {
  const html = httpGet('http://' + ip + '/revk-settings?_page=0');
  if (!html) return null;
  const match = html.match(/<h1>([^\s<]+)/);
  return match ? match[1] : null;
}

// ================================================================
// FEATURE DETECTION – same logic as ioBroker generator
//   1. Parse main page for o.fieldname references
//   2. Parse extras page for disabled features and BLE flag
//   3. Apply whitelist
// Returns a Set of active field keys, or null if device unreachable.
// ================================================================
function fetchDeviceFields(ip) {
  console.log('[faikout-gen] Querying Faikout at http://' + ip + '/');
  const mainHtml   = httpGet('http://' + ip + '/');
  const extrasHtml = httpGet('http://' + ip + '/revk-settings?_page=-2') || '';

  if (!mainHtml) {
    console.warn('[faikout-gen] Faikout not reachable – using all channels as fallback.');
    return null;
  }

  // Extract all o.fieldname references from the WebSocket handler
  const matches = mainHtml.match(/\bo\.([a-zA-Z]\w*)\b/g) || [];
  const found = new Set(matches.map(function(m) { return m.slice(2).toLowerCase(); }));

  // BLE: only activate sub-keys if bleenable is checked on extras page
  const bleEnabled = /id="bleenable"[^>]*checked/.test(extrasHtml);
  if (bleEnabled && found.has('ble')) {
    found.add('ble_temp');
    found.add('ble_hum');
    found.add('ble_bat');
  } else {
    found.delete('ble');
  }

  // Remove features disabled via "noXXX" checkbox on extras page
  for (var i = 0; i < CHANNELS.length; i++) {
    var key = CHANNELS[i].key;
    if (new RegExp('id="no' + key + '"[^>]*checked').test(extrasHtml)) {
      found.delete(key);
    }
  }

  // Always include whitelisted fields
  FIELD_WHITELIST.forEach(function(f) { found.add(f); });

  console.log('[faikout-gen] Detected fields: ' + Array.from(found).join(', '));
  return found;
}

// ================================================================
// REST HELPERS
// ================================================================
function buildHeaders() {
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (CFG.ohApiToken) h['Authorization'] = 'Bearer ' + CFG.ohApiToken;
  return h;
}

function ohGet(path) {
  try {
    return actions.HTTP.sendHttpGetRequest(CFG.ohRestUrl + path, buildHeaders(), 5000);
  } catch (e) {
    console.error('[faikout-gen] GET ' + path + ' failed: ' + e);
    return null;
  }
}

function ohPost(path, body) {
  try {
    return actions.HTTP.sendHttpPostRequest(
      CFG.ohRestUrl + path, 'application/json', JSON.stringify(body), buildHeaders(), 5000
    );
  } catch (e) {
    console.error('[faikout-gen] POST ' + path + ' failed: ' + e);
    return null;
  }
}

function ohPut(path, body) {
  try {
    return actions.HTTP.sendHttpPutRequest(
      CFG.ohRestUrl + path, 'application/json', JSON.stringify(body), buildHeaders(), 5000
    );
  } catch (e) {
    console.error('[faikout-gen] PUT ' + path + ' failed: ' + e);
    return null;
  }
}

// ================================================================
// MQTT BROKER THING
// ================================================================
function ensureBrokerThing() {
  const existing = ohGet('/things/' + encodeURIComponent(CFG.brokerUID));
  if (existing && !existing.includes('"error"')) {
    console.log('[faikout-gen] Broker Thing exists, skipping creation.');
    return;
  }
  const body = {
    UID:           CFG.brokerUID,
    thingTypeUID:  'mqtt:broker',
    label:         'Faikout MQTT Broker',
    configuration: {
      host:     CFG.mqttBrokerHost,
      port:     CFG.mqttBrokerPort,
      secure:   false,
      clientId: 'openhab-faikout',
      ...(CFG.mqttUsername && { username: CFG.mqttUsername }),
      ...(CFG.mqttPassword && { password: CFG.mqttPassword }),
    },
    channels: [],
  };
  console.log('[faikout-gen] Creating Broker Thing...');
  ohPost('/things', body);
}

// ================================================================
// GENERIC MQTT DEVICE THING WITH CHANNELS
// ================================================================
function channelTypeUID(type) {
  return type === 'Number' ? 'mqtt:number'
       : type === 'Switch' ? 'mqtt:switch'
       : 'mqtt:string';
}

function channelConfig(dev, ch) {
  // Config channels are write-only – no stateTopic
  if (ch.cfg) {
    const cfg = { commandTopic: dev.commandTopic + '/' + ch.key };
    if (ch.type === 'Switch') { cfg.on = '1'; cfg.off = '0'; }
    return cfg;
  }
  const cfg = {
    stateTopic:            dev.statusTopic,
    transformationPattern: 'JSONPATH:$.' + ch.key,
  };
  if (ch.rw) {
    cfg.commandTopic = dev.commandTopic + '/' + ch.key;
    if (ch.type === 'Switch') {
      cfg.on  = 'true';
      cfg.off = 'false';
    }
  }
  return cfg;
}

function ensureDeviceThing(dev, activeChannels) {
  const channelList = activeChannels.map(function(ch) {
    return {
      uid:            dev.deviceUID + ':' + ch.id,
      id:             ch.id,
      channelTypeUID: channelTypeUID(ch.type),
      label:          ch.label,
      configuration:  channelConfig(dev, ch),
      properties:     {},
      defaultTags:    [],
    };
  });

  const body = {
    UID:           dev.deviceUID,
    thingTypeUID:  'mqtt:topic',
    label:         dev.name + ' (' + dev.host + ')',
    bridgeUID:     CFG.brokerUID,
    configuration: {},
    channels:      channelList,
  };

  const existing = ohGet('/things/' + encodeURIComponent(dev.deviceUID));
  if (existing && !existing.includes('"error"')) {
    console.log('[faikout-gen] Updating Device Thing (' + activeChannels.length + ' channels)...');
    ohPut('/things/' + encodeURIComponent(dev.deviceUID), body);
  } else {
    console.log('[faikout-gen] Creating Device Thing (' + activeChannels.length + ' channels)...');
    ohPost('/things', body);
  }
}

// ================================================================
// ITEMS + CHANNEL LINKS
// ================================================================
function itemName(dev, ch) {
  return dev.name + '_' + ch.id.charAt(0).toUpperCase() + ch.id.slice(1);
}

function ensureItem(dev, ch) {
  const name = itemName(dev, ch);
  const body = {
    name:     name,
    type:     ch.type,
    label:    dev.name + ' ' + ch.label,
    category: ch.type === 'Number' ? 'Temperature' : '',
    tags:     [],
  };
  console.log('[faikout-gen] Ensuring Item: ' + name);
  ohPut('/items/' + name, body);
  return name;
}

function ensureLink(name, channelUID) {
  ohPut('/links/' + encodeURIComponent(name) + '/' + encodeURIComponent(channelUID), {
    itemName:      name,
    channelUID:    channelUID,
    configuration: {},
  });
}

// ================================================================
// MAIN
// ================================================================
function generateForDevice(dev) {
  console.log('[faikout-gen] --- Device: ' + dev.name + ' (' + dev.ip + ') ---');

  // 1. Fetch Device ID from device
  const host = fetchDeviceId(dev.ip);
  if (!host) {
    console.error('[faikout-gen] Cannot read Device ID from ' + dev.ip + ' – skipping.');
    return;
  }
  dev.host         = host;
  dev.statusTopic  = 'state/'   + host + '/status';
  dev.commandTopic = 'setting/' + host;
  dev.deviceUID    = 'mqtt:topic:faikout-broker:' + dev.name.toLowerCase().replace(/_/g, '-');
  console.log('[faikout-gen] Device ID: ' + host);

  // 2. Detect active features via HTML scraping
  const found = fetchDeviceFields(dev.ip);
  var activeChannels;
  if (found) {
    activeChannels = CHANNELS.filter(function(ch) { return found.has(ch.key) || found.has(ch.id); });
    console.log('[faikout-gen] Active channels: ' + activeChannels.map(function(c) { return c.id; }).join(', '));
  } else {
    console.warn('[faikout-gen] Faikout unreachable – generating all channels as fallback.');
    activeChannels = CHANNELS.slice();
  }

  // 3. Append config channels if enabled
  if (CFG.createConfigChannels) {
    CONFIG_CHANNELS.forEach(function(ch) { activeChannels.push(Object.assign({ cfg: true, rw: true }, ch)); });
    console.log('[faikout-gen] Config channels enabled (+' + CONFIG_CHANNELS.length + ').');
  }

  // 4. Device Thing
  ensureDeviceThing(dev, activeChannels);

  // 5. Items + channel links
  for (var i = 0; i < activeChannels.length; i++) {
    const name = ensureItem(dev, activeChannels[i]);
    ensureLink(name, dev.deviceUID + ':' + activeChannels[i].id);
  }

  console.log('[faikout-gen] Done: ' + dev.name + ' – ' + activeChannels.length + ' channel(s) created/updated.');
}

function generate() {
  console.log('[faikout-gen] === Faikout Integration Generator starting (' + DEVICES.length + ' device(s)) ===');

  // Broker Thing is shared – create once
  ensureBrokerThing();

  // Process each device
  for (var i = 0; i < DEVICES.length; i++) {
    generateForDevice(Object.assign({}, DEVICES[i]));
  }

  console.log('[faikout-gen] === All done. ===');
}

// ================================================================
// RULE – runs once when openHAB is fully started
// ================================================================
rules.JSRule({
  name:        'Faikout Integration Generator',
  description: 'Generates MQTT Things and Items for Faikout on startup',
  triggers:    [triggers.SystemStartlevelTrigger(100)],
  execute:     generate,
});
