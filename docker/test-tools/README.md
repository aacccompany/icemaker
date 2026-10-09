# Device bridge (manual test tool)

Relays telemetry from a LEAFTECH CloudMeter device's USB serial debug output
into IceMaker over MQTT. This is a **manual test tool**, not the production
integration — see task T2 in the "AA&CC Ice maker WebApps" Odoo project for
the real production path (device pointed directly at IceMaker's MQTT broker,
or a permanent bridge).

## Setup

1. Install the Silicon Labs CP210x USB-to-UART driver (needed for the
   device's USB-serial chip to show up as a COM port on Windows):
   https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
2. `npm install` in this folder
3. In IceMaker: create a Device (profile type "Default"), copy its Access
   Token from "Manage credentials"

## Run

```
ACCESS_TOKEN=<device-access-token> SERIAL_PORT=COM4 MQTT_HOST=localhost node bridge.js
```

Env vars (all optional except `ACCESS_TOKEN`):

- `ACCESS_TOKEN` — required, the IceMaker device's access token
- `SERIAL_PORT` — default `COM4`
- `SERIAL_BAUD` — default `115200`
- `MQTT_HOST` — default `localhost`
- `MQTT_PORT` — default `1883`

The script parses the device's own `[TB] Sending data to server over topic
(...)` debug lines (it already uses the ThingsBoard Arduino SDK) and
republishes the same topic/payload to IceMaker's MQTT broker.
