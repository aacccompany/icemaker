const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mqtt = require('mqtt');

const SERIAL_PORT = process.env.SERIAL_PORT || 'COM4';
const SERIAL_BAUD = parseInt(process.env.SERIAL_BAUD || '115200', 10);
const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883', 10);
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('Missing ACCESS_TOKEN env var. Create a device in IceMaker and pass its access token.');
  process.exit(1);
}

const LOG_RE = /\[TB\] Sending data to server over topic \(([^)]+)\) with data \((\{.*\})\)/;

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  username: ACCESS_TOKEN,
});

client.on('connect', () => {
  console.log(`[bridge] Connected to IceMaker MQTT at ${MQTT_HOST}:${MQTT_PORT}`);
});
client.on('error', (err) => console.error('[bridge] MQTT error:', err.message));
client.on('reconnect', () => console.log('[bridge] MQTT reconnecting...'));

const port = new SerialPort({ path: SERIAL_PORT, baudRate: SERIAL_BAUD });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

port.on('open', () => console.log(`[bridge] Serial port ${SERIAL_PORT} open at ${SERIAL_BAUD} baud`));
port.on('error', (err) => console.error('[bridge] Serial error:', err.message));

parser.on('data', (line) => {
  const match = line.match(LOG_RE);
  if (!match) return;
  const [, topic, jsonStr] = match;
  try {
    const data = JSON.parse(jsonStr);
    client.publish(topic, JSON.stringify(data), { qos: 0 }, (err) => {
      if (err) {
        console.error('[bridge] Publish failed:', err.message);
      } else {
        console.log(`[bridge] -> ${topic} ${jsonStr}`);
      }
    });
  } catch (e) {
    console.error('[bridge] Failed to parse device line:', line, e.message);
  }
});
