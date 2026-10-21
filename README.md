# ⚡ VoltIQ: Indian EV Charging Intelligence, Trust Verification & Highway Dead-Zone Resilience Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline_First-orange)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> **VoltIQ** is a mission-critical mobility platform engineered specifically for the ground realities of India's electric vehicle charging ecosystem. It eliminates "ghost chargers", detects Discom power brownouts, safeguards highway travelers against cellular blackspots, and provides mathematically deterministic emergency charging recommendations.

---

## 📌 The Real-World Indian Problem

In India, the primary bottleneck in EV adoption is not station density—it is **infrastructure unpredictability**:

```
                       THE GHOST CHARGER CRISIS

    Aggregator App: "Station 50 kW Available" ──► Driver Arrives at 5% SoC
                                                        │
                      ┌─────────────────────────────────┼─────────────────────────────────┐
                      ▼                                 ▼                                 ▼
              Discom Power Cut                  Physical Hardware                 Gated / Private
            (2-Phase Brownout)                   (Broken Gun/Lock)              (Access Code Locked)
                      │                                 │                                 │
                      └─────────────────────────────────┴─────────────────────────────────┘
                                                        │
                                                        ▼
                                         STRANDED ON HIGHWAY AT NIGHT
```

VoltIQ resolves this with a **Multi-Source Real-Time Trust Architecture**, combining operator telemetry, GPS-geofenced community audits, Discom grid heuristics, and exponential time-decay reliability modeling.

---

## 🚀 Key Architectural Innovations

### 1. Multi-Source Bayesian Trust Engine ($S_t$)
Station reliability is dynamically computed rather than averaged:
$$S_t = \left[ 0.40 \cdot C_{\text{score}} + 0.25 \cdot O_{\text{status}} + 0.20 \cdot G_{\text{discom}} + 0.15 \cdot H_{\text{uptime}} \right] \times e^{-\frac{\Delta t}{\tau}}$$
- $C_{\text{score}}$: Proximity-weighted community audit score.
- $O_{\text{status}}$: Direct operator status telemetry.
- $G_{\text{discom}}$: Real-time power distribution feeder grid state.
- $H_{\text{uptime}}$: 30-day historical mean uptime.
- $e^{-\frac{\Delta t}{\tau}}$: Exponential time decay ($\tau = 4.0\text{ hours}$).

### 2. Emergency Dead-Zone SOS Router (Utility Index $U$)
When battery state-of-charge drops below 15%, standard distance sorting is replaced with composite utility maximization:
$$U = \frac{P_{\text{rate}} \times S_t \times A_{\text{avail}}}{D_{\text{distance}} + Q_{\text{penalty}}}$$
Guarantees recommending a verified operational 60 kW charger 6 km away over an unverified 7.2 kW charger 1 km away.

### 3. Anti-Fraud Proximity Auditing
- Enforces strict device GPS geofencing ($<100\text{ meters}$).
- Reputation-weighted user scoring ($R_i \in [0.1, 1.0]$).
- Anti-farming limits (1 audit per user per station per 12 hours; 50 daily Energy Points cap).

### 4. PWA Offline Highway Resilience
- High-speed Service Worker caching (`sw.js`).
- Pre-caches nearest 5 emergency charging hubs in browser IndexedDB.
- Offline navigation fallback with tap-to-call emergency hotlines when 4G/5G signal drops to 0 bars.

### 5. In-App Academic Viva Presentation Dossier
- Accessible directly via the **"🎓 Viva Dossier"** button in the app header.
- Interactive tabs: Research Abstract, Mathematical Proofs, 15-Minute Live Viva Script, and 12 Examiner Defense Q&As.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  React 19 + TypeScript + Vite | Leaflet Maps | Custom Design Tokens    │
│  Driver PWA | Operator Portal | Admin Moderation | Academic Dossier    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / WebSocket (Port 3001)
┌───────────────────────────────────▼────────────────────────────────────┐
│                           API GATEWAY LAYER                            │
│  Express API | Helmet Security | JWT RBAC | Rate Limiting | Geofencing │
└──────────────────┬────────────────┬───────────────────┬────────────────┘
                   │                │                   │
┌──────────────────▼───┐ ┌──────────▼─────────┐ ┌───────▼────────────────┐
│   TRUST SCORE ENGINE │ │  EMERGENCY ROUTER  │ │ PREDICTIVE ML ENGINE   │
│  Exponential Decay   │ │  Utility Index (U) │ │ Failure Forecaster     │
│  Bayesian Consensus  │ │  Dead-Zone Finder  │ │ Peak Queue Estimator   │
└──────────────────┬───┘ └──────────┬─────────┘ └───────┬────────────────┘
                   │                │                   │
┌──────────────────▼────────────────▼───────────────────▼────────────────┐
│                          DATA PERSISTENCE LAYER                        │
│  SQLite3 (Zero-Config Dev) / PostgreSQL + PostGIS (Production)         │
│  High-Performance Spatial Haversine Queries | Foreign Key Constraints │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Domain | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8 | Ultra-fast SPA client, typed state management |
| **Design System** | Custom Vanilla CSS Tokens | Deep EV dark theme (`#0A0F1D`, `#10B981`, `#F59E0B`) |
| **Mapping** | Leaflet.js, OpenStreetMap CartoDB | Custom SVG trust markers, zero-cost API footprint |
| **Backend** | Node.js 20, Express, TypeScript | High-throughput asynchronous REST API |
| **Real-Time** | Native WebSockets (`ws`) | Instant push notifications for grid cuts & faults |
| **Validation** | Zod Schema Validation | Strict runtime payload verification |
| **Database** | SQLite3 / PostGIS compatible | Spatial bounding-box and Haversine distance queries |
| **Offline** | Service Worker, IndexedDB | Highway dead-zone resilience |
| **DevOps** | Docker, Docker Compose, PowerShell | Multi-stage containerization & 1-click execution |

---

## ⚡ Quick Start Guide

### Option 1: One-Click Production Launch (Windows PowerShell)
```powershell
# From the repository root:
.\start-production.ps1
```
This script validates Node.js, compiles client and server codebases, and launches the unified production platform on `http://localhost:3001`.

### Option 2: Docker Containerization
```bash
# Build and run using Docker Compose:
docker-compose up --build -d

# Check running status:
docker-compose ps
```
Access the application at `http://localhost:3001`.

### Option 3: Local Developer Setup
```bash
# 1. Install root & child dependencies:
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. Start Backend Server (Port 3001):
cd server
npm run dev

# 3. Start Frontend Client in another terminal (Port 5173):
cd client
npm run dev
```

---

## 🧭 In-App Roles & Credentials (Demo Mode)

The system is pre-seeded with realistic Indian charging networks (Tata Power EZ Charge, Jio-BP Pulse, Ather Grid, Statiq, Zeon Electric):

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **EV Driver** | `driver@voltiq.in` | `Driver@123` | Audit stations, emergency mode, vehicle profile |
| **Station Operator** | `operator@tatapower.in` / `operator@voltiq.in` | `Operator@123` | Update station telemetry, resolve tickets |
| **Platform Admin** | `admin@voltiq.in` | `Admin@123` | Moderate reports, adjust reputation, fraud audit |

---

## 🧪 Automated Engine Verification Suite

VoltIQ includes an automated 8-stage verification test battery validating spatial Haversine mathematics, Bayesian trust decay, emergency triage utility, predictive AI, WebSocket broadcasting, and OWASP security:

```bash
# Execute test suite from repository root:
npm test
```
*Expected Result:* **8/8 Tests Passed (100% Pass Rate in ~2–3 ms).**

---

## ⚖️ Implemented Features vs. Simulated Telemetry

To ensure rigorous academic and industrial integrity:

| Feature / Subsystem | Implementation Type | Technical Description |
| :--- | :--- | :--- |
| **Trust Score Engine ($S_t$)** | **Fully Implemented** | Live Bayesian weighting with exponential time-decay half-life ($\tau = 4\text{h}$). |
| **Emergency Utility Router ($U$)** | **Fully Implemented** | Multi-criteria mathematical ranking (<15% SoC) with safe battery radius buffer. |
| **Anti-Fraud Geofencing** | **Fully Implemented** | Spherical Haversine distance gate rejecting submissions beyond 100 meters. |
| **PWA Offline Highway Cache** | **Fully Implemented** | Service worker caching + browser IndexedDB pre-caching 5 nearest emergency hubs. |
| **Real-Time WebSocket Hub** | **Fully Implemented** | Bi-directional event broker (`ws://localhost:3001/ws`) with zero-polling alerts. |
| **Discom Grid Brownouts** | **Heuristic Simulation** | Modeled via event simulation engine; **does not** connect to live state electricity board SCADA systems. |
| **Charger Telemetry / MeterValues** | **Heuristic Simulation** | OCPP 1.6J MeterValues (kW, voltage, thermals) are simulated via background timers rather than physical charge point hardware. |

---

## ⚠️ Known Limitations & Academic Scope

1. **SCADA Integration:** Commercial Discom grid feeder stability is modeled through our predictive brownout heuristic rather than real-time state grid telemetry.
2. **Physical Hardware Bridge:** OCPP 1.6J / 2.0.1 charge point communication is demonstrated through our WebSocket telemetry simulator; physical RS-485/CAN-bus hardware connectivity represents future work.
3. **Turn-by-Turn Voice Navigation:** Leaflet provides interactive route corridors, battery radius buffers, and straight-line directions; turn-by-turn spoken guidance is scheduled for v2.0.

---

## 🎓 Academic Viva & Thesis Defense

VoltIQ was designed from inception as an exemplary engineering capstone. During evaluation:
1. Open the web app at `http://localhost:5173` (or `http://localhost:3001` in production).
2. Click **"🎓 Viva Dossier"** in the top navigation bar.
3. Access the **15-Minute Viva Script** for exact slide-by-slide and live-action instructions.
4. Access the **Examiner Defense Q&A** for mathematical justifications and edge-case defenses.

---

## 📜 License
This project is open-source under the [MIT License](LICENSE). Engineered for Indian Smart Mobility.
