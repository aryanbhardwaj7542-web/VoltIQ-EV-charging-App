# 📖 VoltIQ Production Runbook & Operational Procedures

This document provides system administrators, DevOps engineers, and academic evaluators with operational guidelines, disaster recovery workflows, and maintenance procedures for the **VoltIQ Platform**.

---

## 1. System Ports & Architecture

| Port | Service | Protocol | Description |
| :--- | :--- | :--- | :--- |
| **3001** | Production Unified Server | HTTP / WebSocket | Serves compiled React 19 frontend, Express REST API, and WebSocket Hub |
| **5173** | Development Vite Server | HTTP (HMR) | Local frontend hot module reload dev server |
| **3001/ws** | Real-Time Telemetry Hub | WebSocket | Bi-directional status notifications, grid alerts, and emergency pings |

---

## 2. Health Monitoring & Diagnostics

### 2.1 HTTP Health Endpoint
Check basic process liveness:
```bash
curl -X GET http://localhost:3001/api/health
```
**Expected Response:**
```json
{
  "status": "HEALTHY",
  "uptimeSeconds": 3482,
  "timestamp": "2026-10-15T22:30:00.000Z",
  "activeConnections": 14,
  "database": "CONNECTED"
}
```

### 2.2 System Metrics Endpoint
Detailed engine diagnostic state (requires Admin JWT header or local loopback):
```bash
curl -X GET http://localhost:3001/api/system/status
```

### 2.3 Automated Test Suite Execution
Execute the full 8-engine academic test suite in the backend terminal:
```bash
cd server
npx tsx src/test/vivaTestSuite.ts
```
*Expected Result:* **8/8 Test Suites Passed (100% Pass Rate in ~1ms).**

---

## 3. Database Administration & Backup

### 3.1 SQLite Database Location
- **Development / Bare Metal:** `server/src/db/voltiq.db`
- **Docker Container:** Mounted to persistent volume at `/app/data/voltiq.db`

### 3.2 Hot Database Backup
To take a zero-downtime hot snapshot of the database:
```powershell
# Windows PowerShell
$backupName = "voltiq_backup_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".db"
Copy-Item ".\server\src\db\voltiq.db" -Destination ".\server\src\db\$backupName"
Write-Host "Snapshot saved: $backupName"
```

### 3.3 Database Re-Seeding (Reset Demo Data)
If test sessions have corrupted demonstration stations or user accounts:
```bash
cd server
npm run seed
```
This restores all 12+ real-world Indian charging stations across Bengaluru and Delhi-NCR corridors with clean trust scores.

---

## 4. Environment Variables Configuration

Configure in `server/.env`:

| Key | Default Value | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3001` | Express and WebSocket listening port |
| `NODE_ENV` | `production` | Enables production optimizations & error masking |
| `JWT_SECRET` | `voltiq-super-secret-jwt-key` | Secret key for signing driver/operator JWTs |
| `MAPBOX_ACCESS_TOKEN` | *(Optional)* | Used if Leaflet switches from CartoDB to Mapbox |
| `DISCOM_SIM_INTERVAL_MS`| `30000` | Frequency of simulated Indian Discom grid power cuts |
| `TELEMETRY_INTERVAL_MS` | `15000` | Frequency of IoT simulated charger telemetry pulses |

---

## 5. Troubleshooting & Incident Runbooks

### Incident A: Discom Power Cut Simulation Causes Station Disruption
- **Symptom:** Stations in Bengaluru (e.g., BESCOM Whitefield) suddenly show `REPORTED_CUT` or `UNCERTAIN` freshness badge.
- **Cause:** Discom Grid Simulation engine simulates 2-phase brownouts and local transformer tripping.
- **Resolution:**
  1. Open the **Operator Dashboard** (`operator@voltiq.in` / `Operator@123`).
  2. Locate the impacted station under **"Managed Stations"**.
  3. Click **"Report Grid Restored"** or submit an **Operator Verification Proof**.
  4. The Trust Score Engine immediately recalculates $S_t$ and pushes WebSocket broadcast `STATION_UPDATED`.

### Incident B: User Stranded in Highway Dead Zone (Offline Mode)
- **Symptom:** Driver loses cellular data (0 bars on NH44 highway corridor).
- **Behavior:**
  1. VoltIQ automatically activates the offline banner (`Offline Mode - Using Cached Highway Emergency Data`).
  2. The PWA queries `OfflineStorageEngine` (IndexedDB) for pre-cached emergency hubs within 25 km.
  3. Turn-by-turn fallback coordinates and direct telephone hotlines for roadside assistance are displayed.

### Incident C: WebSocket Connection Dropped
- **Symptom:** In-app green status indicator changes to orange `Reconnecting...`.
- **Diagnostics:**
  1. Check if backend port 3001 is listening: `netstat -ano | findstr 3001`.
  2. Verify reverse-proxy configuration does not strip `Upgrade: websocket` and `Connection: Upgrade` headers.
  3. The frontend `RealtimeContext` has exponential backoff reconnect logic (retries at 1s, 2s, 4s, 8s, up to 30s).

---

## 6. Production Security Checklist

- [x] **Rate Limiting Active:** Public verification endpoints restricted to prevent Sybil spamming.
- [x] **GPS Geofence Checked:** Community audit submissions beyond 150m rejected automatically.
- [x] **Content-Security-Policy:** Helmet headers active on Express server.
- [x] **JWT Token Expiry:** Driver tokens set to 7 days; sensitive operator tokens to 24 hours.
- [x] **XSS Mitigation:** React 19 native escaping + Zod schema sanitization.

---

*VoltIQ Operations & Site Reliability Engineering — Version 1.0 Production Release*
