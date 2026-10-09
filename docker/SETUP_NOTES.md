# Setup IceMaker on a new machine

Steps to stand up the IceMaker stack (rebranded ThingsBoard) and test a
LEAFTECH CloudMeter device on a fresh computer.

## 1. Copy the rebranded web-ui image

The built `icemaker/tb-web-ui` Docker image is not committed to git (it's a
build artifact, not source). Copy it from wherever it was last exported
(USB / shared folder / cloud drive) into this `docker/` folder:

```
docker/icemaker-tb-web-ui.tar
```

If you don't have this file, you can rebuild it from source instead — see
"Rebuilding the image from source" below. Skipping this step entirely is
also fine if you only need to test functionality, not branding: the stack
will just pull the stock `thingsboard/tb-web-ui` image from Docker Hub.

## 2. Clone the project

```bash
git clone https://github.com/aacccompany/icemaker.git
cd icemaker
git checkout feature/aacc-rebrand
```

## 3. Install Docker Desktop

https://www.docker.com/products/docker-desktop — install and leave it running.

## 4. Load the rebranded image (skip if you skipped step 1)

```bash
cd docker
docker load -i icemaker-tb-web-ui.tar
docker tag icemaker/tb-web-ui:latest thingsboard/tb-web-ui:latest
```

Tagging it as `thingsboard/tb-web-ui:latest` means `docker-compose` picks it
up automatically — no config file changes needed.

## 5. Start the stack

```bash
./docker-create-log-folders.sh
./docker-install-tb.sh --loadDemo
./docker-start-services.sh
```

First run pulls several images and can take a few minutes.

## 6. Log in

Open `http://localhost`

- Username: `tenant@thingsboard.org`
- Password: `tenant`

You should see "IceMaker" branding if step 4 was done.

## 7. Test a LEAFTECH CloudMeter device (optional)

```bash
cd docker/test-tools
npm install
```

- Install the CP210x USB-to-UART driver: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
- Install Node.js: https://nodejs.org
- Plug the device into this machine via USB

In IceMaker: **Entities > Devices > "+"** → create a device → open it →
**Manage credentials** tab → copy the Access Token.

```bash
ACCESS_TOKEN=<token> SERIAL_PORT=COM4 MQTT_HOST=localhost node bridge.js
```

Check the device's **Latest telemetry** tab in IceMaker — values should
update in real time. This bridge is a manual test tool only (see `test-tools/README.md`
and task T2 in the "AA&CC Ice maker WebApps" Odoo project for the real
production data path).

## Rebuilding the rebranded image from source (if you don't have the .tar)

```bash
cd ui-ngx
npm install
npm run build:prod
```

Then package the build output into the `msa/web-ui` Docker image (copy the
`ui-ngx/target/generated-resources/public` output into a `web-ui` build
context alongside the module's `server.js`/`conf` files, matching
`msa/web-ui/docker/Dockerfile`) and `docker build -t icemaker/tb-web-ui:latest .`

## Known gotcha: CRLF line endings

If you ever see errors like `$'\r': command not found` from containers,
some `.sh`/`.env`/`.conf` file under `docker/` or `msa/` got checked out
with Windows line endings. The repo's `.gitattributes` should prevent this
going forward, but if it recurs: `sed -i 's/\r$//' <file>` and rebuild.

## Memory note

The full stack (with HA duplicates + Kafka + 10 js-executors) is heavy —
16GB RAM machines struggle. `docker/.env` already sets `JAVA_OPTS=-Xmx320M
-Xms320M` to cap each JVM. If still tight, start only one instance per
service and scale `tb-js-executor` down:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.kafka.yml \
  up -d --scale tb-js-executor=1 \
  valkey postgres zookeeper kafka tb-core1 tb-rule-engine1 tb-mqtt-transport1 \
  tb-http-transport1 tb-coap-transport tb-lwm2m-transport tb-snmp-transport \
  tb-web-ui1 tb-vc-executor1 tb-js-executor haproxy
```

When done testing, shut everything down to reclaim RAM:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.kafka.yml down
```

On Windows, Docker Desktop keeps WSL2 running (and holding memory) even
after containers stop. To fully reclaim it: quit Docker Desktop from the
system tray, then `wsl --shutdown`.
