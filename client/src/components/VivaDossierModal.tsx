import React, { useState } from 'react';
import {
  BookOpen,
  Award,
  Clock,
  X,
  Download,
  Layers,
  HelpCircle,
  FileText
} from 'lucide-react';

interface VivaDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VivaDossierModal: React.FC<VivaDossierModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'abstract' | 'math' | 'script' | 'qa' | 'architecture'>('abstract');

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} id="viva-dossier-modal-backdrop">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '1000px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden'
        }}
        id="viva-dossier-modal"
      >
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={24} color="#F59E0B" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  B.Tech Presentation Dossier & Defense Manual
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FCD34D',
                  border: '1px solid rgba(245, 158, 11, 0.4)'
                }}>
                  SUBMISSION DOSSIER
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Institutional capstone report, mathematical derivations, viva presentation walkthrough & defense guide
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 14px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
              id="btn-print-dossier"
            >
              <Download size={14} />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
              id="btn-close-dossier-modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 28px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderBottom: '1px solid var(--border-glass)',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveSection('abstract')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeSection === 'abstract' ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
              background: activeSection === 'abstract' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeSection === 'abstract' ? '#FCD34D' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            id="tab-dossier-abstract"
          >
            <FileText size={15} />
            <span>1. Abstract & Context</span>
          </button>

          <button
            onClick={() => setActiveSection('math')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeSection === 'math' ? '1px solid var(--brand-emerald)' : '1px solid var(--border-subtle)',
              background: activeSection === 'math' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeSection === 'math' ? 'var(--brand-emerald)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            id="tab-dossier-math"
          >
            <Award size={15} />
            <span>2. Mathematical Formulations</span>
          </button>

          <button
            onClick={() => setActiveSection('script')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeSection === 'script' ? '1px solid var(--brand-cyan)' : '1px solid var(--border-subtle)',
              background: activeSection === 'script' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeSection === 'script' ? 'var(--brand-cyan)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            id="tab-dossier-script"
          >
            <Clock size={15} />
            <span>3. 15-Minute Viva Demo Script</span>
          </button>

          <button
            onClick={() => setActiveSection('qa')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeSection === 'qa' ? '1px solid #A78BFA' : '1px solid var(--border-subtle)',
              background: activeSection === 'qa' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeSection === 'qa' ? '#C4B5FD' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            id="tab-dossier-qa"
          >
            <HelpCircle size={15} />
            <span>4. 12 Examiner Defense Q&As</span>
          </button>

          <button
            onClick={() => setActiveSection('architecture')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeSection === 'architecture' ? '1px solid #F43F5E' : '1px solid var(--border-subtle)',
              background: activeSection === 'architecture' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeSection === 'architecture' ? '#FDA4AF' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            id="tab-dossier-arch"
          >
            <Layers size={15} />
            <span>5. System Architecture</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {activeSection === 'abstract' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Project Abstract & Indian EV Context
                </h3>
                <p>
                  India's aggressive shift toward electric mobility under FAME-II and PM E-DRIVE mandates has created high infrastructure density, but acute reliability challenges. The primary obstacle is the <strong>"Ghost Station" phenomenon</strong>: chargers marked as "Available" on legacy aggregators that are in reality unusable due to 3-phase grid power cuts, ICE bay blockades, or locked society/hotel gates.
                </p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                  The 4 Distinct Indian Infrastructure Challenges Solved:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>Grid Brownouts & Single-Phasing</strong>: Discom feeders drop from 3-phase to 2-phase during peak evening hours (18:00–21:30). Charger screens light up, but DC fast rectifiers fail to handshake.</li>
                  <li><strong>Gated Property Barriers</strong>: Over 40% of DC fast chargers are in private hotel basements or tech parks. VoltIQ provides an automated digital gate pass PIN/QR protocol.</li>
                  <li><strong>Interstate Highway Dead-Zones</strong>: Multi-kilometer 0-bar cellular drops leave drivers stranded without map access. VoltIQ's PWA caches emergency chargers within a 25 km radius.</li>
                  <li><strong>Dominant 2W/3W Fleet Share</strong>: 80%+ of Indian EVs are 2-Wheelers and 3-Wheelers. VoltIQ provides multi-connector support (Ather Grid, Bharat AC001, 15A 3-pin) alongside 4W CCS2.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'math' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Mathematical Formulations & Algorithmic Proofs
                </h3>
                <p>VoltIQ relies on formal mathematical formulations rather than arbitrary star ratings.</p>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <strong style={{ color: 'var(--brand-emerald)', display: 'block', fontSize: '0.9rem' }}>
                  Formula 1: Dynamic Trust Score ($S_t$)
                </strong>
                <code style={{ display: 'block', padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', color: '#A7F3D0', margin: '8px 0', fontFamily: 'monospace' }}>
                  S_t = max(0, min(100, 0.45·C_i + 0.25·O_i + 0.20·G_i - D_i))
                </code>
                <p style={{ margin: 0, fontSize: '0.78rem' }}>
                  Where $C_i$ is community audit score, $O_i$ is operator telemetry agreement (100 or 35), $G_i$ is 3-phase power stability (100, 40, or 0), and $D_i$ is stale freshness decay penalty.
                </p>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <strong style={{ color: 'var(--brand-cyan)', display: 'block', fontSize: '0.9rem' }}>
                  Formula 2: Exponential Freshness Decay ($D_i$)
                </strong>
                <code style={{ display: 'block', padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', color: '#BAE6FD', margin: '8px 0', fontFamily: 'monospace' }}>
                  D_i = 30 · (1 - e^(-0.04 · max(0, Δt - 2.0)))
                </code>
                <p style={{ margin: 0, fontSize: '0.78rem' }}>
                  Grace period of 2.0 hours incurs zero freshness decay penalty. After 2 hours, decay increases asymptotically up to a maximum 30-point penalty.
                </p>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <strong style={{ color: '#FCD34D', display: 'block', fontSize: '0.9rem' }}>
                  Formula 3: Emergency Composite Utility Index ($U$)
                </strong>
                <code style={{ display: 'block', padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', color: '#FDE68A', margin: '8px 0', fontFamily: 'monospace' }}>
                  U = (PowerScore · TrustScore · AvailabilityFactor) / (Distance_km + QueuePenalty)
                </code>
                <p style={{ margin: 0, fontSize: '0.78rem' }}>
                  Prioritizes reachable high-power DC fast dispensers (120 kW rating yields 1.0 power score) within a 1.25x safe battery buffer.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'script' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  15-Minute Technical Viva Demonstration Script
                </h3>
                <p>Follow this exact chronological structure when demonstrating the platform to examiners.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', borderLeft: '4px solid #A78BFA' }}>
                  <strong style={{ color: '#C4B5FD' }}>Min 0–3: Problem Statement & Live Map</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>Explain the "Ghost Station" phenomenon. Open `http://localhost:5173`. Show live WebSocket pulse pill, driver SoC badge (12% critical), and interactive Leaflet map markers.</p>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', borderLeft: '4px solid var(--brand-emerald)' }}>
                  <strong style={{ color: 'var(--brand-emerald)' }}>Min 3–6: Trust Breakdown & Community Audit Flow</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>Open Zeon Charging Oasis. Demonstrate the 4 component breakdown. Click "Verify Status" and complete the 5-step audit with 50m Haversine spatial proof-of-presence.</p>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
                  <strong style={{ color: '#FCD34D' }}>Min 6–9: Emergency Charging & Hotel Gate Pass SOS</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>Click "Emergency Charging". Show Composite Utility ranking. Select The Oberoi MG Road and request an emergency hotel gate pass, generating a digital valet PIN/QR code.</p>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', borderLeft: '4px solid var(--brand-cyan)' }}>
                  <strong style={{ color: 'var(--brand-cyan)' }}>Min 9–12: Operator Portal & Predictive AI (R_fail Index)</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>Switch to Operator Portal. Inspect Majestic Bus Stand Hub (R_fail = 78%). Trigger "Dispatch Preventive Technician", creating an SLA ticket. Show instant WebSocket update across all client screens.</p>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', borderLeft: '4px solid #F43F5E' }}>
                  <strong style={{ color: '#FDA4AF' }}>Min 12–15: Security OWASP Sandbox & Highway Offline PWA</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>Open Security Audit modal: test live XSS neutralization and 429 rate limit flood. Open PWA modal: click "SIMULATE DEAD-ZONE" to prove 0-bar highway offline resilience. Run the 8-stage Automated Test Suite (100% PASS in 1ms).</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'qa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Examiner Q&A Defense Manual (Top 12 Questions)
                </h3>
              </div>

              {[
                { q: 'Q1: How do you prevent token farming or malicious review bombing?', a: 'Gated by Haversine spherical distance (<50m), reputation weighting (W = R_i · P_i), and 50 points/day anti-farming cap with 12h per-station cooldown.' },
                { q: 'Q2: Why Leaflet.js over Google Maps API?', a: 'Zero API quota cost, zero vendor billing risk for educational/MVP deployment, lightweight (<40KB bundle), and full programmatic control over animated CSS trust rings.' },
                { q: 'Q3: What is the Indian Power Quality & Phase Failure Signal?', a: 'Detects commercial Discom 3-phase to 2-phase brownout drops (<380V), where dispenser screens stay on but DC fast rectifiers trip on session start.' },
                { q: 'Q4: How does the Emergency Rescue algorithm rank chargers?', a: 'Calculates 1.25x safe battery buffer using real consumption (~5.8 km/kWh) and ranks by Composite Utility Index U = (Power · Trust · Availability) / (Distance + Queue).' },
                { q: 'Q5: How does the platform resolve locked hotel/society gates?', a: 'Emergency SOS generates a digital valet PIN and QR pass, transmitted via WebSockets and approved by on-site valet security.' },
                { q: 'Q6: Why use an exponential decay function for freshness?', a: 'Confidence decays non-linearly. An audit 30 minutes ago is fresh, but 12 hours ago is unverified. Exponential decay e^(-0.04·Δt) penalizes stale chargers without physical audits.' },
                { q: 'Q7: Why WebSockets instead of HTTP polling?', a: 'Saves mobile battery and cellular data in poor signal areas; pushes state transitions to Driver, Operator, and Admin screens in sub-25ms.' },
                { q: 'Q8: How does Predictive Analytics forecast station breakdown (R_fail)?', a: 'Combines voltage stability score, thermal derating frequency during afternoon peaks, and OCPP heartbeat jitter. Triggers preventive dispatch when R_fail >= 0.65.' },
                { q: 'Q9: How does PWA offline resilience work in highway dead-zones?', a: 'Service Worker (sw.js) caches static shell and map tiles. OfflineStorageEngine stores 10 emergency chargers within 25 km locally with offline directions and gate codes.' },
                { q: 'Q10: What OWASP Top 10 defenses are implemented?', a: 'Helmet headers (nosniff, DENY), IP rate limiting (20 req/15m on auth), recursive XSS sanitization converting <script> to [SANITIZED_SCRIPT], and strict JWT RBAC.' },
                { q: 'Q11: How will the system scale from prototype to pan-India volume?', a: 'Repository abstractions decouple storage. SQLite with Haversine SQL wrappers drops seamlessly into PostgreSQL 16 + PostGIS (ST_DWithin, GIST spatial index) without rewriting business logic.' },
                { q: 'Q12: How are 2-wheelers and 3-wheelers accommodated?', a: 'Vehicle profiler accommodates Ather Grid, Ola Hypercharger, Bharat DC001, and 15A 3-pin standards alongside 4W CCS2 and Type 2.' }
              ].map((item, idx) => (
                <div key={idx} style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{item.q}</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.a}</p>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'architecture' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Complete System Architecture & Production Deployment
                </h3>
                <p>Multi-tier client-server architecture with dual transport (REST + WebSockets).</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: 'var(--brand-cyan)', display: 'block', marginBottom: '4px' }}>Frontend Tier</strong>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem' }}>
                    <li>React 19 + TypeScript + Vite v8</li>
                    <li>Leaflet.js open-source map engine</li>
                    <li>Custom CSS Design System (Zero heavy utility bloat)</li>
                    <li>PWA Service Worker (Cache-First + Stale-While-Revalidate)</li>
                    <li>Optimized Chunk Splitting (&lt;300 kB bundles)</li>
                  </ul>
                </div>

                <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: 'var(--brand-emerald)', display: 'block', marginBottom: '4px' }}>Backend Tier</strong>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem' }}>
                    <li>Node.js + Express with ES Modules</li>
                    <li>Native WebSocket Server (`/ws`)</li>
                    <li>Zod Runtime Validation + JWT Auth</li>
                    <li>Helmet Security & express-rate-limit</li>
                    <li>Automated 8-Stage E2E Test Runner</li>
                  </ul>
                </div>
              </div>

              <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <strong style={{ color: '#FCD34D', display: 'block', marginBottom: '4px' }}>Production Containerization</strong>
                <p style={{ margin: 0, fontSize: '0.75rem' }}>
                  Configured with multi-stage Alpine Dockerfile and docker-compose.yml for one-command cloud orchestration on AWS (ap-south-1 Mumbai) or university servers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
