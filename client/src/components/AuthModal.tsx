import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Zap,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Car,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole, VehicleCategory, ConnectorType } from '../../../shared/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

const PRESET_VEHICLES = [
  {
    name: 'Tata Nexon EV Max (4W)',
    make: 'Tata',
    model: 'Nexon EV Max',
    category: '4W' as VehicleCategory,
    supportedConnectors: ['CCS2', 'TYPE2'] as ConnectorType[],
    batteryCapacityKwh: 40.5,
    maxChargeRateKw: 50,
    estimatedRangeKm: 310
  },
  {
    name: 'MG ZS EV Long Range (4W)',
    make: 'MG',
    model: 'ZS EV',
    category: '4W' as VehicleCategory,
    supportedConnectors: ['CCS2', 'TYPE2'] as ConnectorType[],
    batteryCapacityKwh: 50.3,
    maxChargeRateKw: 75,
    estimatedRangeKm: 380
  },
  {
    name: 'Ather 450X Gen 3 (2W)',
    make: 'Ather',
    model: '450X Gen 3',
    category: '2W' as VehicleCategory,
    supportedConnectors: ['ATHER_GRID', '15A_3PIN'] as ConnectorType[],
    batteryCapacityKwh: 3.7,
    maxChargeRateKw: 3.3,
    estimatedRangeKm: 105
  },
  {
    name: 'Ola S1 Pro (2W)',
    make: 'Ola',
    model: 'S1 Pro',
    category: '2W' as VehicleCategory,
    supportedConnectors: ['OLA_HYPERCHARGER', '15A_3PIN'] as ConnectorType[],
    batteryCapacityKwh: 4.0,
    maxChargeRateKw: 3.0,
    estimatedRangeKm: 135
  }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'DRIVER'
}) => {
  const { login, register, quickLoginDemo } = useAuth();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(defaultRole);
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState<number>(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await login({ email: loginEmail, password: loginPassword });
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || 'Failed to sign in');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const chosenVehicle = PRESET_VEHICLES[selectedVehicleIdx];

    const result = await register({
      fullName: regFullName,
      email: regEmail,
      password: regPassword,
      role: regRole,
      vehicle: regRole === 'DRIVER' ? {
        make: chosenVehicle.make,
        model: chosenVehicle.model,
        category: chosenVehicle.category,
        supportedConnectors: chosenVehicle.supportedConnectors,
        batteryCapacityKwh: chosenVehicle.batteryCapacityKwh,
        maxChargeRateKw: chosenVehicle.maxChargeRateKw,
        currentEstimatedSocPct: 85,
        estimatedRangeKm: chosenVehicle.estimatedRangeKm
      } : undefined
    });

    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || 'Registration failed');
    }
  };

  const handleDemoClick = async (role: 'DRIVER' | 'OPERATOR' | 'ADMIN') => {
    setIsSubmitting(true);
    await quickLoginDemo(role);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'var(--glass-blur)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px'
      }}
      onClick={onClose}
      id="auth-modal-overlay"
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
        id="auth-modal-card"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'var(--brand-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--brand-emerald-glow)',
              marginBottom: '10px'
            }}
          >
            <Zap size={26} color="#020617" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>
            {tab === 'LOGIN' ? 'Sign In to VoltIQ' : 'Create VoltIQ Account'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Access verified trust scores, emergency charging, and fleet intelligence.
          </p>
        </div>

        {/* 1-Click Quick Demo Sign-In Box */}
        <div
          style={{
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            marginBottom: '20px'
          }}
          id="quick-demo-accounts-box"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.74rem', color: 'var(--brand-cyan)', fontWeight: 700 }}>
            <KeyRound size={13} />
            <span>1-CLICK DEMO EVALUATION LOGINS</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.72rem', padding: '6px 4px', flexDirection: 'column', gap: '2px' }}
              onClick={() => handleDemoClick('DRIVER')}
              disabled={isSubmitting}
              id="btn-demo-driver"
            >
              <span style={{ fontWeight: 700, color: 'var(--brand-emerald)' }}>Driver</span>
              <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Rohit (Nexon)</span>
            </button>

            <button
              className="btn-secondary"
              style={{ fontSize: '0.72rem', padding: '6px 4px', flexDirection: 'column', gap: '2px' }}
              onClick={() => handleDemoClick('OPERATOR')}
              disabled={isSubmitting}
              id="btn-demo-operator"
            >
              <span style={{ fontWeight: 700, color: 'var(--brand-cyan)' }}>Operator</span>
              <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Tata Power</span>
            </button>

            <button
              className="btn-secondary"
              style={{ fontSize: '0.72rem', padding: '6px 4px', flexDirection: 'column', gap: '2px' }}
              onClick={() => handleDemoClick('ADMIN')}
              disabled={isSubmitting}
              id="btn-demo-admin"
            >
              <span style={{ fontWeight: 700, color: '#A78BFA' }}>Admin</span>
              <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Platform</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '3px',
            borderRadius: '10px',
            marginBottom: '18px'
          }}
        >
          <button
            onClick={() => { setTab('LOGIN'); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: tab === 'LOGIN' ? 'var(--bg-tertiary)' : 'transparent',
              color: tab === 'LOGIN' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('REGISTER'); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: tab === 'REGISTER' ? 'var(--bg-tertiary)' : 'transparent',
              color: tab === 'REGISTER' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            Register (+50 Pts)
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FCA5A5',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '16px'
            }}
          >
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Login Form */}
        {tab === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Email Address
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-subtle)', gap: '8px' }}>
                <Mail size={16} color="var(--text-muted)" />
                <input
                  type="email"
                  required
                  placeholder="driver@voltiq.in"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#FFF', fontSize: '0.85rem', width: '100%' }}
                  id="input-login-email"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Password
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-subtle)', gap: '8px' }}>
                <Lock size={16} color="var(--text-muted)" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#FFF', fontSize: '0.85rem', width: '100%' }}
                  id="input-login-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '6px', fontSize: '0.9rem' }}
              disabled={isSubmitting}
              id="btn-submit-login"
            >
              <ShieldCheck size={16} />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Registration Form */}
        {tab === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Full Name
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-subtle)', gap: '8px' }}>
                <User size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  required
                  placeholder="Priya Menon"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#FFF', fontSize: '0.85rem', width: '100%' }}
                  id="input-reg-name"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Email Address
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-subtle)', gap: '8px' }}>
                <Mail size={16} color="var(--text-muted)" />
                <input
                  type="email"
                  required
                  placeholder="priya@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#FFF', fontSize: '0.85rem', width: '100%' }}
                  id="input-reg-email"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Password (min 6 characters)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-subtle)', gap: '8px' }}>
                <Lock size={16} color="var(--text-muted)" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#FFF', fontSize: '0.85rem', width: '100%' }}
                  id="input-reg-password"
                />
              </div>
            </div>

            {/* Role Picker */}
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Account Persona
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRegRole('DRIVER')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: regRole === 'DRIVER' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${regRole === 'DRIVER' ? 'var(--brand-emerald)' : 'var(--border-subtle)'}`,
                    color: regRole === 'DRIVER' ? 'var(--brand-emerald)' : 'var(--text-secondary)'
                  }}
                >
                  EV Driver
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('OPERATOR')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: regRole === 'OPERATOR' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${regRole === 'OPERATOR' ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                    color: regRole === 'OPERATOR' ? 'var(--brand-cyan)' : 'var(--text-secondary)'
                  }}
                >
                  Charging Operator
                </button>
              </div>
            </div>

            {/* If Driver: EV Model Selection */}
            {regRole === 'DRIVER' && (
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                  Select Your Electric Vehicle (2W / 4W)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {PRESET_VEHICLES.map((v, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedVehicleIdx(idx)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: selectedVehicleIdx === idx ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${selectedVehicleIdx === idx ? 'var(--brand-emerald)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Car size={15} color={selectedVehicleIdx === idx ? 'var(--brand-emerald)' : 'var(--text-muted)'} />
                        <span style={{ fontWeight: 600, color: selectedVehicleIdx === idx ? '#FFF' : 'var(--text-secondary)' }}>
                          {v.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {v.batteryCapacityKwh} kWh • {v.supportedConnectors.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '6px', fontSize: '0.9rem' }}
              disabled={isSubmitting}
              id="btn-submit-register"
            >
              <Sparkles size={16} />
              <span>{isSubmitting ? 'Creating Account...' : 'Register & Claim 50 Pts'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
