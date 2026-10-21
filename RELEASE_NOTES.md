# 🚀 VoltIQ v1.0.0 Release Notes: Production Capstone Release

**Release Tag:** `v1.0.0`
**Release Date:** October 15, 2026
**Status:** Production Ready / Capstone Verified
**Target Environment:** Node.js 20+ LTS, React 19, Docker, Modern Chromium / WebKit Browsers

---

## 🌟 Executive Overview

VoltIQ is an end-to-end intelligence and reliability platform engineered specifically for the ground realities of India's electric vehicle charging infrastructure. Designed to eliminate the **Ghost Charger Problem**, mitigate **Discom grid 2-phase brownouts**, unlock **gated private charging bays (hotels/societies)**, and provide **0-bar offline resilience in highway dead zones**, VoltIQ bridges the gap between aggregator optimism and physical charging reality.

This release represents the completion of all 16 engineering phases (Phase 0 through Phase 15), accompanied by production containerization, automated testing suites, and an academic viva defense system.

---

## ⚡ What's New in v1.0.0

### 1. Multi-Source Bayesian Trust Engine ($S_t$)
- Calculates dynamic station trust scores based on:
  $$S_t = \left[ 0.45 \cdot C_i + 0.25 \cdot O_i + 0.20 \cdot G_i - D_i \right] \times \lambda(\Delta t)$$
- Mathematical exponential freshness decay ($\tau = 4\text{ hours}$ half-life) ensures stale data degrades gracefully into `UNCERTAIN` status badges.
- Explicit detection of Indian Discom power cut patterns and voltage drops.

### 2. Emergency Dead-Zone SOS Router (Utility Index $U$)
- Automated triage triggered when vehicle state of charge falls below 15%.
- Suspends standard distance sorting to maximize composite utility:
  $$U = \frac{PowerScore \times TrustScore \times AvailabilityFactor}{(Distance + Penalty_{queue})}$$
- Prioritizes operational 60 kW DC fast chargers within the vehicle's safe battery radius over nearby non-functioning chargers.
- Generates authenticated single-use SOS gate passes for gated hotel and society charging points.

### 3. Anti-Fraud Community Verification Engine
- 5-question rapid binary audit with GPS geofencing ($<100\text{ meters}$).
- Reputation-weighted driver consensus ($R_i \in [0.1, 1.0]$) to protect against Sybil downvoting.
- Daily anti-farming limits: Maximum 50 Energy Points per driver per day; 12-hour audit cooldown per station.

### 4. PWA Offline Highway Resilience
- High-speed Service Worker caching (`sw.js`).
- Pre-caches nearest 5 emergency charging hubs in browser IndexedDB.
- Fallback turn-by-turn coordinate display and tap-to-call roadside assistance hotlines during cellular blackouts.

### 5. Multi-Persona Operations & Governance
- **Driver PWA:** Interactive Leaflet map with custom pulsating trust markers, multi-criteria filters, and one-tap emergency triage.
- **Operator Portal:** Live station telemetry controls, grid power toggle, incident ticket logging, and SLA dispatch management.
- **Platform Admin:** Moderation queue for flagged audit reports, user reputation score adjustments, and fraud detection explorer.

### 6. Real-Time Telemetry & Predictive Analytics
- Bi-directional native WebSocket event hub (`ws://localhost:3001/ws`) broadcasting grid outage alerts within 25 ms without client polling.
- Predictive Failure Risk Index ($R_{\text{fail}}$) predicting station hardware failure windows up to 24 hours in advance.

### 7. Unified Production Runtime & SPA Fallback
- Dynamic API and WebSocket configuration auto-adapting to browser origin or `VITE_API_URL`.
- Express production static file serving with client-side SPA routing fallback.
- Multi-stage Docker containerization under Node.js 20 Alpine.

---

## 🧪 Verification & Test Results

```
========================================================================
⚡ VOLTIQ ACADEMIC VIVA & ENGINE VERIFICATION SUITE (CLI RUNNER)
========================================================================

| ID   | Subsystem / Category | Verified Engine Assertion                       | Status   | Latency |
|:---- |:-------------------- |:----------------------------------------------- |:-------- |:------- |
| TC01 | Spatial Engine       | Haversine Spherical Distance & Geofence (MG Rd) | ✅ PASSED | 1ms |
| TC02 | Trust Engine         | Mathematical Dynamic Trust Score & Decay Calcul | ✅ PASSED | 2ms |
| TC03 | Emergency SOS        | Multi-Criteria Emergency Rescue Ranking (<15% S | ✅ PASSED | 0ms |
| TC04 | Predictive AI        | Failure Pattern Risk Index (R_fail) & Demand Pr | ✅ PASSED | 1ms |
| TC05 | Real-Time Hub        | WebSocket Event Broker Hub on /ws               | ✅ PASSED | 0ms |
| TC06 | Security Hardening   | OWASP Input Sanitization & Script Stripping     | ✅ PASSED | 0ms |
| TC07 | Access Control       | RBAC Permission Boundary Enforcement            | ✅ PASSED | 0ms |
| TC08 | Data Repository      | Indian Multi-Operator EV Fleet Integrity        | ✅ PASSED | 0ms |

========================================================================
Summary: 8/8 Tests Passed (100% Pass Rate) | Total Duration: 6ms
========================================================================
```

- **Frontend Build:** `tsc -b && vite build` -> **0 errors in 2.17s** (All chunks strictly `< 300 kB`).
- **Backend Build:** `tsc` -> **0 errors** (`server/dist/server/src/index.js` generated).

---

## 📦 Deployment Instructions

### Method 1: Windows One-Click Production Launcher
```powershell
.\start-production.ps1
```
Compiles both client and server, starts unified production runtime on `http://localhost:3001`, and binds WebSocket hub on `ws://localhost:3001/ws`.

### Method 2: Containerized Docker Compose
```bash
docker-compose up --build -d
```
Runs the multi-stage Alpine production container with automated healthcheck targeting `/api/health`.

### Method 3: Local Developer Mode
```bash
# Terminal 1: Backend Server (Port 3001)
cd server && npm run dev

# Terminal 2: Frontend Client (Port 5173 with HMR)
cd client && npm run dev
```

---

## 🔒 Security & Privacy Notice

- **Secrets Handling:** No real API keys, private passwords, or generated database files are committed.
- **Authentication:** Passwords hashed with bcrypt (10 rounds); HMAC-SHA256 JWT tokens.
- **OWASP Hardening:** Helmet headers active, Zod schema validation, XSS sanitization, dual-tier rate limiting.

---

## ⚠️ Known Limitations & Future Scope

1. **Hardware Protocol Bridge:** Live OCPP 1.6J/2.0.1 charge point gateway integration is simulated via WebSocket telemetry; physical hardware integration requires an active OCPP gateway.
2. **Discom Power Data:** Grid stability data currently operates on Indian Discom outage simulation heuristics; direct integration with state electricity board SCADA feeds represents the next enterprise milestone.
3. **Turn-by-Turn Navigation:** Route previews and straight-line Haversine buffers are fully rendered in Leaflet; real-time voice-guided turn-by-turn navigation is slated for v2.0.

---

*VoltIQ Mobility Intelligence — Capstone v1.0.0 Release*
