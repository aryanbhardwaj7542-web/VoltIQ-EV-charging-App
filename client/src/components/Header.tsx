import React from 'react';
import {
  Zap,
  ShieldCheck,
  Car,
  LayoutDashboard,
  Smartphone,
  ShieldAlert,
  LogOut,
  LogIn,
  Sparkles,
  GraduationCap,
  Wifi,
  WifiOff,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import type { UserRole } from '../../../shared/types';
import { getWsUrl } from '../config/api';

interface HeaderProps {
  currentPersona: UserRole;
  onPersonaChange: (role: UserRole) => void;
  onOpenAuth: () => void;
  onOpenSecurityAudit?: () => void;
  onOpenVivaModal?: () => void;
  onOpenPwaModal?: () => void;
  onOpenDossierModal?: () => void;
  isOffline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPersona,
  onPersonaChange,
  onOpenAuth,
  onOpenSecurityAudit,
  onOpenVivaModal,
  onOpenPwaModal,
  onOpenDossierModal,
  isOffline = false
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected } = useRealtime();

  return (
    <header className="top-header" id="app-top-header">
      {/* Brand Logo */}
      <div className="brand-wrapper">
        <div className="brand-logo-icon">
          <Zap size={22} color="#020617" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-title">VoltIQ</span>
            <span className="brand-badge">INDIA EV</span>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '-2px' }}>
            Charging Intelligence & Trust Engine
          </p>
        </div>
      </div>

      {/* Persona Switcher */}
      <div className="persona-switcher" id="persona-switcher">
        <button
          className={`persona-tab ${currentPersona === 'DRIVER' ? 'active' : ''}`}
          onClick={() => onPersonaChange('DRIVER')}
          id="btn-persona-driver"
        >
          <Smartphone size={14} />
          <span>Driver<span className="header-desktop-only"> PWA</span></span>
        </button>

        <button
          className={`persona-tab ${currentPersona === 'OPERATOR' ? 'active' : ''}`}
          onClick={() => onPersonaChange('OPERATOR')}
          id="btn-persona-operator"
        >
          <LayoutDashboard size={14} />
          <span>Operator<span className="header-desktop-only"> Portal</span></span>
        </button>

        <button
          className={`persona-tab ${currentPersona === 'ADMIN' ? 'active' : ''}`}
          onClick={() => onPersonaChange('ADMIN')}
          id="btn-persona-admin"
        >
          <ShieldAlert size={14} />
          <span>Admin<span className="header-desktop-only"> Console</span></span>
        </button>
      </div>

      {/* Right User Bar */}
      <div className="header-user-bar" id="header-user-bar">
        {/* Realtime WebSocket Pulse Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            fontSize: '0.7rem',
            fontWeight: 700,
            color: isConnected ? 'var(--brand-emerald)' : '#FCA5A5'
          }}
          id="header-ws-status-badge"
          title={isConnected ? `Connected to ${getWsUrl()}` : 'Disconnected'}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isConnected ? 'var(--brand-emerald)' : '#EF4444'
            }}
          />
          <span>{isConnected ? 'LIVE WS' : 'OFFLINE'}</span>
        </div>

        {/* Active Vehicle Badge (when in Driver mode) */}
        {user?.primaryVehicle && currentPersona === 'DRIVER' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem'
            }}
            id="vehicle-profile-badge"
          >
            <Car size={16} color="var(--brand-cyan)" />
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.primaryVehicle.make} {user.primaryVehicle.model}
              </span>
              <span style={{ color: 'var(--brand-emerald)', marginLeft: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                {user.primaryVehicle.currentEstimatedSocPct}% SoC ({user.primaryVehicle.estimatedRangeKm} km)
              </span>
            </div>
          </div>
        )}

        {/* User Account Controls */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* User Info Capsule */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                fontSize: '0.78rem'
              }}
              id="user-session-chip"
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--brand-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#020617',
                  fontWeight: 800,
                  fontSize: '0.75rem'
                }}
              >
                {user.fullName.charAt(0)}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#FFF' }}>{user.fullName}</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    marginLeft: '6px',
                    fontWeight: 700,
                    background: user.role === 'ADMIN' ? 'rgba(167, 139, 250, 0.2)' : user.role === 'OPERATOR' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: user.role === 'ADMIN' ? '#A78BFA' : user.role === 'OPERATOR' ? 'var(--brand-cyan)' : 'var(--brand-emerald)'
                  }}
                >
                  {user.role}
                </span>
              </div>

              {/* Energy Points */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px', color: 'var(--brand-cyan)', fontWeight: 700 }}>
                <Sparkles size={12} />
                <span>{user.energyPoints} pts</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                padding: '8px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              id="btn-logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
            onClick={onOpenAuth}
            id="btn-open-auth"
          >
            <LogIn size={14} />
            <span>Sign In / Demo</span>
          </button>
        )}

        {/* Real-time System Status Pill */}
        <div
          className="header-desktop-only"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            padding: '5px 10px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: 'var(--brand-emerald)'
          }}
        >
          <span className="status-dot live" />
          <ShieldCheck size={13} />
          <span style={{ fontWeight: 600 }}>Trust Engine Active</span>
        </div>

        {/* Action Buttons Hub (Responsive Scroll/Wrap) */}
        <div className="header-action-buttons">
          {/* Security Hardening & OWASP Top 10 Audit Trigger Button */}
          {onOpenSecurityAudit && (
            <button
              onClick={onOpenSecurityAudit}
              id="btn-open-security-audit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: 'var(--brand-emerald)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              title="Inspect OWASP Top 10 Compliance, Rate Limiter & Security Penetration Sandbox"
            >
              <ShieldAlert size={14} />
              <span>Security Audit</span>
            </button>
          )}

          {/* Academic Viva Defense & E2E Testing Center Trigger Button */}
          {onOpenVivaModal && (
            <button
              onClick={onOpenVivaModal}
              id="btn-open-viva-modal"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(167, 139, 250, 0.15)',
                border: '1px solid rgba(167, 139, 250, 0.4)',
                color: '#C4B5FD',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              title="Open B.Tech Academic Viva Defense Center & Automated E2E Test Battery"
            >
              <GraduationCap size={15} />
              <span>Viva Defense</span>
            </button>
          )}

          {/* PWA & Highway Offline Resilience Trigger Button */}
          {onOpenPwaModal && (
            <button
              onClick={onOpenPwaModal}
              id="btn-open-pwa-modal"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                background: isOffline ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.12)',
                border: `1px solid ${isOffline ? 'rgba(239, 68, 68, 0.4)' : 'rgba(6, 182, 212, 0.35)'}`,
                color: isOffline ? '#FCA5A5' : 'var(--brand-cyan)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              title="Open PWA & Indian Highway Dead-Zone Offline Resilience Center"
            >
              {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
              <span>{isOffline ? 'Offline Active' : 'PWA & Offline'}</span>
            </button>
          )}

          {/* Academic Presentation Dossier & Defense Manual Button */}
          {onOpenDossierModal && (
            <button
              onClick={onOpenDossierModal}
              id="btn-open-dossier-modal"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#FCD34D',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              title="Open Complete Academic Capstone Presentation Dossier & Defense Guide"
            >
              <BookOpen size={14} />
              <span>Project Dossier</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
