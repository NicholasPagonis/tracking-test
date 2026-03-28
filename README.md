# Airport Operational Resource Location Sharing — Proof of Concept

A lightweight middleware platform that ingests real-time device locations from **Traccar Client** (Android and iPhone), displays them on an operational dashboard, and syncs positions to an **ArcGIS hosted feature layer** for use in **WebEOC**.

---

## Solution Summary

```
Traccar Client (Android/iOS)
    ↓  HTTP GET/POST (OsmAnd protocol)
Node.js API (Express)
    ↓  SQLite via Knex
    ↓  WebSocket → React/Leaflet Dashboard
    ↓  ArcGIS Feature Layer (sync adapter)
    ↓  WebEOC (stub adapter — ArcGIS is primary path)
```

Devices are registered by `device_id` (e.g. `GTA_1`, `TDM_1`). Each maps to a role, platform, and display name. The API classifies each device as **active**, **stale**, or **offline** based on fix age. A geofence engine determines which named airport zone each device is currently in.

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│  FIELD DEVICES                                                         │
│  Android: Traccar Client → GET /ingest?id=GTA_1&lat=...&key=...       │
│  iPhone:  Traccar Client → GET /ingest?id=TDM_1&lat=...&key=...       │
└───────────────────────┬───────────────────────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────────────────────┐
│  apps/api  (Node.js / Express)                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  POST/GET /ingest → ingest controller → location service        │  │
│  │    → geofence service (enter/exit events)                       │  │
│  │    → device_status upsert (materialised latest position)        │  │
│  │    → broadcast.service → WebSocket fan-out                      │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │  GET /api/devices         REST API for dashboard                │  │
│  │  GET /api/devices/:id/trail  GeoJSON trail for map              │  │
│  │  GET /api/geofences       Zone boundaries                       │  │
│  │  GET /api/health          Health and status                     │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │  Background jobs:                                                │  │
│  │    status-sweep (30s) — active→stale→offline transitions        │  │
│  │    prune (30m) — delete location history >24h                   │  │
│  │    arcgis-sync (configurable) — push to ArcGIS feature layer    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│  SQLite (WAL mode) at /data/tracking.db                                │
└────────────────────────┬──────────────────────────────────────────────┘
           ┌─────────────┤──────────────────┐
           │             │                  │
┌──────────▼──┐  ┌───────▼─────┐  ┌────────▼──────────┐
│ apps/web    │  │ ArcGIS      │  │ WebEOC adapter    │
│ React/Vite  │  │ Feature Svc │  │ STUB              │
│ Leaflet map │  │ (live sync) │  │ (log + mock)      │
└─────────────┘  └─────────────┘  └───────────────────┘
```

---

## Quick Start (Local — No Docker)

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone and install

```bash
git clone <repo-url> airport-tracking
cd airport-tracking
npm install --workspaces --if-present
```

### 2. Configure environment

```bash
cp .env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit apps/api/.env — defaults are fine for local demo
```

### 3. Start the API

```bash
cd apps/api
npm start
# API runs at http://localhost:3000
# Database is created and seeded automatically on first run
```

### 4. Start the web dashboard (separate terminal)

```bash
cd apps/web
npm run dev
# Dashboard at http://localhost:5173
```

### 5. Start the simulator (separate terminal)

```bash
cd packages/simulator
node src/index.js
# Simulates 5 devices moving around the airport
```

Open `http://localhost:5173` — you should see 5 devices moving on the map within a few seconds.

---

## Quick Start (Docker Compose with Simulator)

```bash
cp .env.example .env
# Edit .env if needed

# Start all services including simulator
docker compose -f docker-compose.yml -f docker-compose.sim.yml up --build

# Dashboard at http://localhost
# API at http://localhost/api/health
```

To run without the simulator (for use with real devices):
```bash
docker compose up --build
```

---

## Traccar Client Setup

### Android

1. Install **Traccar Client** from Google Play
2. Open app → Settings
3. Set **Device identifier**: use the role ID (e.g. `GTA_1`)
4. Set **Server URL**: `http://<your-server-ip>/ingest`
5. Add `?key=<device-api-key>` to the URL (or configure as a custom parameter if your Traccar version supports it)
   - Full URL example: `http://192.168.1.100/ingest?key=gta1-demo-key-airporttracking`
6. Set **Frequency**: 5–10 seconds for operational use
7. Enable **Background service** (required for continuous tracking)
8. Grant **Always Allow** location permission

**Android background behaviour:**
- Android background location is generally reliable when **Background service** is enabled and battery optimisation is disabled for the app
- Disable battery optimisation: Settings → Apps → Traccar → Battery → Unrestricted
- Frequency 5s is achievable on Android

### iPhone (iOS)

1. Install **Traccar Client** from the App Store
2. Open app → configure same settings as Android above
3. Set frequency to **30 seconds minimum** for iOS
   - iOS restricts background location to significant-change mode when the app is not in the foreground
   - The system may deliver updates every 30–300 seconds depending on movement and power state
4. Grant **Always** location permission: Settings → Privacy → Location Services → Traccar → Always

**iOS background behaviour and limitations (important):**
- iOS does not permit apps to run location timers at arbitrary frequencies in background
- When the phone is stationary, iOS may suspend background location entirely (significant-change mode delivers updates only on cell tower change)
- Traccar Client on iOS will send updates more frequently when the app is foregrounded
- Operators should be instructed to keep the Traccar Client app visible on screen when precise real-time tracking is needed
- The dashboard uses configurable stale/offline thresholds — set `STATUS_ACTIVE_SECONDS` to at least 120 for iOS devices
- The dashboard displays `platform` per device so operators know which devices are iOS and can interpret delayed updates accordingly
- `source_timestamp_utc` is the device GPS fix time; `received_timestamp_utc` is when the server received it — both are stored and displayed so operators can distinguish between GPS lag and network delivery lag

---

## Device Registration

Devices are registered in the database seed (`apps/api/src/db/seeds/002_devices.js`). For a real deployment:

1. Add a row to the `devices` table with the `device_id` matching what is configured in Traccar Client
2. Generate a secure random `api_key`, SHA-256 hash it, store the hash
3. Give the raw key to the device operator for Traccar URL configuration

Current demo devices and their raw API keys:

| device_id | display_name              | platform | Raw API key                        |
|-----------|---------------------------|----------|------------------------------------|
| GTA_1     | Ground Transport Agent 1  | android  | `gta1-demo-key-airporttracking`    |
| GTA_2     | Ground Transport Agent 2  | ios      | `gta2-demo-key-airporttracking`    |
| TDM_1     | Terminal Duty Manager     | ios      | `tdm1-demo-key-airporttracking`    |
| ADM_1     | Airport Duty Manager      | android  | `adm1-demo-key-airporttracking`    |
| SEC_1     | Security Supervisor 1     | android  | `sec1-demo-key-airporttracking`    |

Traccar Client URL format:
```
http://<server>/ingest?key=<raw-api-key>
```

---

## Status Logic

| Status  | Condition                          | Colour |
|---------|------------------------------------|--------|
| Active  | Last fix within 3 minutes          | Green  |
| Stale   | Last fix between 3 and 10 minutes  | Amber  |
| Offline | Last fix more than 10 minutes ago  | Grey   |

Thresholds are configured via environment variables:
```
STATUS_ACTIVE_SECONDS=180
STATUS_STALE_SECONDS=600
```

A background sweep job runs every 30 seconds to transition devices from active→stale and stale→offline even when no new data is arriving. The WebSocket broadcasts the updated status to all dashboard clients immediately.

---

## ArcGIS Sync

The ArcGIS adapter (`packages/arcgis-adapter`) syncs current device positions to an ArcGIS hosted feature layer.

### Setup

1. Create a **hosted feature layer** in ArcGIS Online or ArcGIS Enterprise
2. Add these fields to the layer:
   - `device_id` (String, 50)
   - `role_code` (String, 20)
   - `display_name` (String, 100)
   - `role_label` (String, 100)
   - `platform` (String, 20)
   - `status` (String, 10)
   - `battery_pct` (Double)
   - `accuracy_m` (Double)
   - `speed_ms` (Double)
   - `bearing_deg` (Double)
   - `zone_name` (String, 100)
   - `last_seen_utc` (String, 30)
   - `source_timestamp_utc` (String, 30)
   - `notes` (String, 500)
   - `source` (String, 50)
3. Note the Feature Service URL (ends in `/FeatureServer/0`)
4. Create an OAuth2 application in ArcGIS and note the client ID and secret
5. Configure environment variables:
   ```
   ARCGIS_ENABLED=true
   ARCGIS_FEATURE_SERVICE_URL=https://services.arcgis.com/<org>/arcgis/rest/services/<name>/FeatureServer/0
   ARCGIS_CLIENT_ID=<your-client-id>
   ARCGIS_CLIENT_SECRET=<your-client-secret>
   ARCGIS_SYNC_INTERVAL_SECONDS=30
   ```

### How it works

Each sync cycle:
1. Queries the feature layer for all existing features (to get OBJECTIDs keyed by `device_id`)
2. Sends an **updateFeatures** call for devices already present
3. Sends an **addFeatures** call for any new devices
4. One feature per device (point geometry), not a growing track

### Manual sync trigger

```bash
curl -X POST http://localhost:3000/api/admin/sync/arcgis \
  -H "X-API-Key: dev-admin-key"
```

---

## WebEOC Integration

The WebEOC adapter (`packages/webeoc-adapter`) is a stub. It logs all calls and returns mock responses.

**ArcGIS is the primary path into WebEOC** for this proof of concept:
1. The ArcGIS sync adapter keeps the feature layer current
2. A WebEOC map widget references the ArcGIS feature service URL
3. Incident coordinators see device positions on the WebEOC map

**Future direct WebEOC integration:**
The `WebEOCAdapter` class in `packages/webeoc-adapter/src/webeoc-adapter.js` defines the interface. To implement it for real:
1. Replace the stub `connect()` method with a real POST to `/WebEOCProxy/api/login`
2. Replace `pushResourceStatus()` with a POST to `/WebEOCProxy/api/board/{boardName}/data`
3. Map the DeviceWithStatus fields to the specific WebEOC board field names in your instance

---

## API Reference

All API endpoints require `X-API-Key: <dashboard-key>` header except health endpoints.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health |
| GET | `/api/health/status` | Device count and system status |
| GET | `/api/devices` | All devices with current status |
| GET | `/api/devices?role=GTA` | Filter by role code |
| GET | `/api/devices?status=active` | Filter by status |
| GET | `/api/devices/:id` | Single device |
| GET | `/api/devices/:id/history` | Location history (24h) |
| GET | `/api/devices/:id/trail` | GeoJSON trail |
| GET | `/api/geofences` | All geofence zones |
| GET | `/api/geofences/events` | Geofence enter/exit events |
| POST | `/api/admin/sync/arcgis` | Manual ArcGIS sync |
| GET | `/ingest` | Traccar OsmAnd ingest |
| POST | `/ingest` | JSON ingest (simulator) |

---

## Simulator Scenarios

| Scenario | Description |
|----------|-------------|
| `normal-ops` | All 5 devices moving normally around airport zones |
| `stale-ios` | iOS devices (GTA_2, TDM_1) go stale after ~4–6 minutes |
| `emergency` | All devices update at 500ms interval — fast movement |

```bash
# Run a specific scenario
node packages/simulator/src/index.js --scenario=stale-ios
```

---

## Folder Structure

```
airport-tracking/
├── apps/
│   ├── api/                     Node.js/Express backend
│   │   └── src/
│   │       ├── config.js        Environment config
│   │       ├── index.js         Entry point
│   │       ├── app.js           Express app factory
│   │       ├── db/              Knex + SQLite, migrations, seeds
│   │       ├── routes/          Express routers
│   │       ├── controllers/     Route handlers
│   │       ├── services/        Business logic
│   │       ├── repositories/    Database queries
│   │       ├── middleware/      Auth, validation, errors
│   │       ├── websocket/       WS server
│   │       ├── jobs/            Background workers
│   │       └── utils/           Geo, time, logger
│   └── web/                     React/Vite dashboard
│       └── src/
│           ├── App.jsx          Root layout
│           ├── api/             Fetch wrappers
│           ├── hooks/           useDevices, useGeofences, useTrail
│           ├── components/      Map markers, device list, filters
│           └── utils/           Status helpers
├── packages/
│   ├── arcgis-adapter/          ArcGIS Feature Service client
│   ├── webeoc-adapter/          WebEOC stub (interface only)
│   └── simulator/               Demo mode device simulation
├── docker/                      Dockerfiles and nginx config
├── docs/                        Detailed documentation
├── docker-compose.yml
├── docker-compose.sim.yml       + simulator service
└── .env.example
```

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API port |
| `DB_PATH` | `./data/tracking.db` | SQLite database path |
| `API_KEY_DASHBOARD` | `dev-dashboard-key` | Dashboard read API key |
| `API_KEY_ADMIN` | `dev-admin-key` | Admin endpoint key |
| `STATUS_ACTIVE_SECONDS` | `180` | Active threshold (3 min) |
| `STATUS_STALE_SECONDS` | `600` | Stale threshold (10 min) |
| `HISTORY_RETENTION_HOURS` | `24` | History retention |
| `ARCGIS_ENABLED` | `false` | Enable ArcGIS sync |
| `WEBEOC_ENABLED` | `false` | Enable WebEOC push |
| `SIMULATOR_INTERVAL_MS` | `5000` | Simulator update rate |

---

## Future Enhancements

1. **Traccar Server integration**: Replace the Traccar Client direct ingest with polling/webhooks from a Traccar Server instance — provides device management, history and replay
2. **PostgreSQL**: Swap SQLite for Postgres by changing Knex client in `db/connection.js` — migrations are compatible
3. **Role-based dashboard access**: Add a simple session/token auth layer for operator login
4. **Geofence alerting**: Email or SMS notification on geofence transitions for specific zones
5. **ArcGIS track layer**: Switch from a current-position layer to an ArcGIS Track layer for animated trails
6. **Direct WebEOC integration**: Implement `WebEOCAdapter` when WebEOC API credentials are available
7. **Tablet-optimised UI**: Larger touch targets and split-screen mode for operational tablet use
8. **Offline resilience**: Queue ingest payloads on device when network is unavailable (Traccar Client supports this natively)
