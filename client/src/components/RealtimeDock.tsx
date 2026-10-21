import React, { useState } from 'react';
import {
  Radio,
  Zap,
  ShieldAlert,
  CheckCircle2,
  X,
  Send,
  Activity,
  Check
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { buildApiUrl } from '../config/api';

export const RealtimeDock: React.FC = () => {
  const {
    isConnected,
    liveIncomingEmergency,
    clearIncomingEmergency,
    approvedEmergencyPass,
    clearApprovedPass,
    simulateEvent
  } = useRealtime();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleSimulate = async (type: string, payload?: any, key = type) => {
    setIsSimulating(key);
    await simulateEvent(type, payload);
    setIsSimulating(null);
    setActionSuccessMsg(`Event '${type}' dispatched via WebSocket.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleAuthorizeIncoming = async () => {
    if (!liveIncomingEmergency) return;
    try {
      const res = await fetch(buildApiUrl(`/api/emergency/sos-requests/${liveIncomingEmergency.requestId}/approve`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Authorized live via Real-Time Operations Desk' })
      });
      if (res.ok) {
        setActionSuccessMsg('Emergency clearance authorized! Live notification pushed to driver.');
        clearIncomingEmergency();
      }
    } catch (err) {
      console.warn('Failed to authorize emergency pass:', err);
    }
  };

  return (
    <>
      {/* 1. HIGH-PRIORITY INCOMING SOS POPUP BANNER (REAL-TIME BROADCAST) */}
      {liveIncomingEmergency && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '560px',
            width: '92%',
            zIndex: 9999,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(127, 29, 29, 0.95) 100%)',
            color: '#FFF',
            padding: '16px 20px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.4)',
            border: '2px solid rgba(254, 202, 202, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: 'slideDown 250ms ease-out'
          }}
          id="banner-live-incoming-sos"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} color="#FEE2E2" />
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#FEE2E2' }}>
                  WEBSOCKET LIVE SOS BROADCAST
                </span>
                <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#FFF', margin: '2px 0 0 0' }}>
                  {liveIncomingEmergency.stationName}
                </h4>
              </div>
            </div>

            <button
              onClick={clearIncomingEmergency}
              style={{ background: 'transparent', border: 'none', color: '#FEE2E2', cursor: 'pointer', padding: '2px' }}
              title="Dismiss"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ fontSize: '0.76rem', color: '#FEE2E2', lineHeight: 1.4, background: 'rgba(0, 0, 0, 0.25)', padding: '8px 12px', borderRadius: '10px' }}>
            <div><strong>Driver:</strong> {liveIncomingEmergency.driverName} • <strong>SoC:</strong> <span style={{ color: '#FEF08A', fontWeight: 800 }}>{liveIncomingEmergency.driverSocPct}%</span></div>
            <div style={{ marginTop: '3px' }}><strong>Reason:</strong> {liveIncomingEmergency.reason}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.74rem', padding: '6px 12px', background: 'rgba(0, 0, 0, 0.3)', color: '#FFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              onClick={clearIncomingEmergency}
            >
              Ignore
            </button>
            <button
              className="btn-primary"
              style={{ fontSize: '0.74rem', padding: '6px 16px', background: '#FFF', color: '#DC2626', fontWeight: 900, borderColor: '#FFF' }}
              onClick={handleAuthorizeIncoming}
              id="btn-realtime-authorize-sos"
            >
              <Check size={14} />
              <span>1-Click Authorize Gate Pass</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. DRIVER APPROVED SOS CLEARANCE POPUP (REAL-TIME BROADCAST) */}
      {approvedEmergencyPass && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '540px',
            width: '92%',
            zIndex: 9999,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(6, 78, 59, 0.95) 100%)',
            color: '#FFF',
            padding: '16px 20px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.3)',
            border: '2px solid rgba(167, 243, 208, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: 'slideDown 250ms ease-out'
          }}
          id="banner-live-approved-sos"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={22} color="#D1FAE5" />
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#D1FAE5' }}>
                  GATE PASS GRANTED • REAL-TIME PUSH
                </span>
                <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#FFF', margin: '2px 0 0 0' }}>
                  {approvedEmergencyPass.stationName}
                </h4>
              </div>
            </div>

            <button
              onClick={clearApprovedPass}
              style={{ background: 'transparent', border: 'none', color: '#D1FAE5', cursor: 'pointer', padding: '2px' }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '10px' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#A7F3D0', fontWeight: 700 }}>GATE SECURITY ACCESS PIN</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.1em', color: '#FEF08A' }}>
                {approvedEmergencyPass.pin || '9842'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: '#A7F3D0' }}>CLEARANCE STATUS</div>
              <span className="badge" style={{ background: '#FFF', color: '#059669', fontSize: '0.75rem', fontWeight: 900 }}>
                ACCESS GRANTED
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.72rem', color: '#D1FAE5', margin: 0 }}>
            Show this PIN to the gate security officer or valet at {approvedEmergencyPass.stationName}. Dedicated 22 kW DC bay is cleared.
          </p>
        </div>
      )}

      {/* 3. FLOATING REAL-TIME DOCK & SIMULATOR CONTROL */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}
        id="realtime-dock-container"
      >
        {/* Expanded Simulator Window */}
        {isExpanded && (
          <div
            className="glass-panel"
            style={{
              padding: '16px',
              width: '320px',
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: '16px',
              background: '#0B0F19',
              border: '1.5px solid var(--border-glass)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '4px'
            }}
            id="panel-realtime-simulator"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={14} color={isConnected ? 'var(--brand-emerald)' : '#EF4444'} />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFF' }}>
                  Live Event Hub Simulator
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
              Simulate live telemetry & audit events across all connected browser clients with zero page refresh.
            </p>

            {actionSuccessMsg && (
              <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--brand-emerald)', color: 'var(--brand-emerald)', fontSize: '0.68rem', fontWeight: 700 }}>
                ✓ {actionSuccessMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.74rem', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => handleSimulate('STATION_STATUS_CHANGED', undefined, 'station_toggle')}
                disabled={isSimulating !== null}
                id="btn-sim-station-status"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={13} color="#F59E0B" />
                  <span>Toggle Station Status</span>
                </span>
                <Send size={11} color="var(--text-muted)" />
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: '0.74rem', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => handleSimulate('EMERGENCY_REQUEST_SUBMITTED', undefined, 'sos_req')}
                disabled={isSimulating !== null}
                id="btn-sim-sos-request"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={13} color="#EF4444" />
                  <span>Trigger Driver SOS Request</span>
                </span>
                <Send size={11} color="var(--text-muted)" />
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: '0.74rem', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => handleSimulate('EMERGENCY_REQUEST_APPROVED', undefined, 'sos_app')}
                disabled={isSimulating !== null}
                id="btn-sim-sos-approved"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} color="var(--brand-emerald)" />
                  <span>Trigger SOS Gate Pass Granted</span>
                </span>
                <Send size={11} color="var(--text-muted)" />
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: '0.74rem', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => handleSimulate('COMMUNITY_AUDIT_SUBMITTED', undefined, 'audit')}
                disabled={isSimulating !== null}
                id="btn-sim-community-audit"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={13} color="var(--brand-cyan)" />
                  <span>Broadcast Driver Community Audit</span>
                </span>
                <Send size={11} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        )}

        {/* Floating Pill Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${isConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 800
          }}
          id="btn-realtime-dock-toggle"
          title="Click to open Live Event Hub Simulator"
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? 'var(--brand-emerald)' : '#EF4444',
              boxShadow: isConnected ? '0 0 8px var(--brand-emerald)' : 'none'
            }}
          />
          <span>{isConnected ? 'LIVE WS CONNECTED' : 'WS RECONNECTING...'}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>• Simulator</span>
        </button>
      </div>
    </>
  );
};
