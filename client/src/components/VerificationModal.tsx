import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Camera,
  Info,
  Check
} from 'lucide-react';
import type { ChargingStation } from '../../../shared/types';
import { useAuth } from '../context/AuthContext';

interface VerificationModalProps {
  station: ChargingStation | null;
  onClose: () => void;
  onSubmitVerification: (stationId: string, payload: any) => Promise<void> | void;
}

// Sample realistic verification photo presets for quick demonstration
const PHOTO_PRESETS = [
  {
    label: 'Working Gun & Screen',
    url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Free Bay with Green LED',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Power Cut / Dark Screen',
    url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&auto=format&fit=crop&q=80'
  }
];

export const VerificationModal: React.FC<VerificationModalProps> = ({
  station,
  onClose,
  onSubmitVerification
}) => {
  const { user } = useAuth();
  if (!station) return null;

  // 5 Binary / Categorical Ground Truth Questions
  const [isChargerWorking, setIsChargerWorking] = useState<boolean | null>(true);
  const [gridPowerOption, setGridPowerOption] = useState<'STABLE' | 'OUTAGE' | 'VOLTAGE_SAG'>('STABLE');
  const [isBayFree, setIsBayFree] = useState<boolean | null>(true);
  const [isParkingAvailable, setIsParkingAvailable] = useState<boolean | null>(true);
  const [hasDamage, setHasDamage] = useState<boolean | null>(false);
  const [comment, setComment] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string>(PHOTO_PRESETS[0].url);

  // Geolocation & Anti-Fraud Simulation State
  const [isOnSiteSimulated, setIsOnSiteSimulated] = useState<boolean>(true);
  const [calculatedDistanceMeters, setCalculatedDistanceMeters] = useState<number>(24);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate distance based on real GPS or simulated on-site toggle
  useEffect(() => {
    if (isOnSiteSimulated) {
      setCalculatedDistanceMeters(24); // 24 meters away (directly on site)
    } else {
      // Remote test mode: simulates user submitting from home ~4.8 km away
      setCalculatedDistanceMeters(4850);
    }
  }, [isOnSiteSimulated]);

  // Anti-fraud classification
  const isProximityVerified = calculatedDistanceMeters <= 150;
  const isPerimeter = calculatedDistanceMeters > 150 && calculatedDistanceMeters <= 500;
  const potentialPoints = isProximityVerified ? 25 : isPerimeter ? 10 : 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Calculate submission coordinates based on simulation mode
      const submitterLat = isOnSiteSimulated
        ? station.latitude + 0.00018
        : station.latitude + 0.042;
      const submitterLng = isOnSiteSimulated
        ? station.longitude + 0.00015
        : station.longitude + 0.038;

      const payload = {
        isChargerWorking: isChargerWorking ?? true,
        isGridPowerOn: gridPowerOption === 'STABLE',
        isBayFree: isBayFree ?? true,
        isParkingAvailable: isParkingAvailable ?? true,
        hasPhysicalDamage: hasDamage ?? false,
        submitterLat,
        submitterLng,
        comment: comment.trim() || (gridPowerOption === 'OUTAGE' ? 'Grid power outage confirmed on site.' : 'Smooth fast charging observed.'),
        photoUrl: selectedPhoto
      };

      await onSubmitVerification(station.id, payload);
      onClose();
    } catch (err) {
      console.error('Failed to submit verification:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // High-contrast, dynamic button selection styles for rapid field questions
  const getPositiveBtnStyle = (isSelected: boolean) => ({
    padding: '7px 16px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    background: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
    border: isSelected ? '1.5px solid var(--brand-emerald)' : '1px solid var(--border-subtle)',
    color: isSelected ? 'var(--brand-emerald)' : 'var(--text-secondary)',
    boxShadow: isSelected ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none'
  });

  const getNegativeBtnStyle = (isSelected: boolean) => ({
    padding: '7px 16px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    background: isSelected ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
    border: isSelected ? '1.5px solid #EF4444' : '1px solid var(--border-subtle)',
    color: isSelected ? '#FCA5A5' : 'var(--text-secondary)',
    boxShadow: isSelected ? '0 0 14px rgba(239, 68, 68, 0.35)' : 'none'
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px'
      }}
      onClick={onClose}
      id="verification-modal-overlay"
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px',
          background: 'rgba(13, 19, 34, 0.98)',
          border: '1px solid var(--border-glass)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
        id="verification-modal-card"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
          id="btn-close-verify-modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ paddingRight: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="var(--brand-emerald)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-emerald)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Anti-Fraud Ground Verification Engine
            </span>
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFF', marginTop: '4px' }}>
            Verify: {station.name}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>
            Audited by <strong style={{ color: 'var(--brand-cyan)' }}>{user?.fullName || 'Verified Driver'}</strong> (Reputation: {user?.reputationScore || 0.94}x)
          </p>
        </div>

        {/* Anti-Fraud GPS Geofence Banner */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: isProximityVerified
              ? 'rgba(16, 185, 129, 0.12)'
              : isPerimeter
                ? 'rgba(245, 158, 11, 0.12)'
                : 'rgba(239, 68, 68, 0.14)',
            border: `1px solid ${isProximityVerified ? 'rgba(16, 185, 129, 0.35)' : isPerimeter ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
          id="gps-proximity-status-banner"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color={isProximityVerified ? 'var(--brand-emerald)' : isPerimeter ? '#F59E0B' : '#EF4444'} />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isProximityVerified ? 'var(--brand-emerald)' : isPerimeter ? '#FDE68A' : '#FCA5A5' }}>
                {isProximityVerified
                  ? `🎯 GEOFENCE VERIFIED (${calculatedDistanceMeters}m from charger)`
                  : isPerimeter
                    ? `⚠️ PERIMETER VICINITY (${calculatedDistanceMeters}m away)`
                    : `🚫 REMOTE LOCATION DETECTED (${(calculatedDistanceMeters / 1000).toFixed(1)} km away)`}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {isProximityVerified
                  ? 'Eligible for full trust score impact & +25 Energy Points reward.'
                  : isPerimeter
                    ? 'Within parking perimeter. Partial +10 Energy Points credited.'
                    : 'Anti-Fraud rule: Remote reports receive 0 points & flagged for consensus review.'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <span
              className="badge"
              style={{
                background: isProximityVerified ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                color: isProximityVerified ? 'var(--brand-emerald)' : '#F87171',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              +{potentialPoints} Pts
            </span>
          </div>
        </div>

        {/* Viva / Demonstration GPS Mode Switcher */}
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem'
          }}
          id="demo-gps-switcher"
        >
          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={13} color="var(--brand-cyan)" />
            <span>Viva Simulator: Test Geofence Modes</span>
          </span>

          <button
            onClick={() => setIsOnSiteSimulated(prev => !prev)}
            style={{
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              background: isOnSiteSimulated ? 'var(--brand-emerald)' : 'rgba(239, 68, 68, 0.2)',
              color: isOnSiteSimulated ? '#020617' : '#FCA5A5',
              border: 'none',
              cursor: 'pointer'
            }}
            id="btn-toggle-demo-gps"
          >
            {isOnSiteSimulated ? '✓ Simulating On-Site (24m)' : '✕ Simulating Remote (4.8km)'}
          </button>
        </div>

        {/* 5 Rapid Binary Field Audit Questions */}
        <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Question 1: Charger Power Delivery */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>1. Is charger dispensing power?</span>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Did the charging session successfully initiate?</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={getPositiveBtnStyle(isChargerWorking === true)}
                onClick={() => setIsChargerWorking(true)}
                id="btn-q1-yes"
              >
                ✓ YES
              </button>
              <button
                style={getNegativeBtnStyle(isChargerWorking === false)}
                onClick={() => setIsChargerWorking(false)}
                id="btn-q1-no"
              >
                ✕ NO
              </button>
            </div>
          </div>

          {/* Question 2: Crucial Indian Power Quality Check */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>2. Grid Electricity Status (Indian Context)</span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Is the utility feeder live or is there load shedding / voltage sag?</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: gridPowerOption === 'STABLE' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1.5px solid ${gridPowerOption === 'STABLE' ? 'var(--brand-emerald)' : 'var(--border-subtle)'}`,
                  color: gridPowerOption === 'STABLE' ? 'var(--brand-emerald)' : 'var(--text-secondary)',
                  boxShadow: gridPowerOption === 'STABLE' ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
                onClick={() => setGridPowerOption('STABLE')}
                id="btn-q2-stable"
              >
                ⚡ 3-Phase Live
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: gridPowerOption === 'VOLTAGE_SAG' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1.5px solid ${gridPowerOption === 'VOLTAGE_SAG' ? '#F59E0B' : 'var(--border-subtle)'}`,
                  color: gridPowerOption === 'VOLTAGE_SAG' ? '#FDE68A' : 'var(--text-secondary)',
                  boxShadow: gridPowerOption === 'VOLTAGE_SAG' ? '0 0 14px rgba(245, 158, 11, 0.35)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
                onClick={() => setGridPowerOption('VOLTAGE_SAG')}
                id="btn-q2-fluctuation"
              >
                ⚠️ Voltage Sag
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: gridPowerOption === 'OUTAGE' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1.5px solid ${gridPowerOption === 'OUTAGE' ? 'var(--emergency-red)' : 'var(--border-subtle)'}`,
                  color: gridPowerOption === 'OUTAGE' ? '#FCA5A5' : 'var(--text-secondary)',
                  boxShadow: gridPowerOption === 'OUTAGE' ? '0 0 14px rgba(239, 68, 68, 0.35)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
                onClick={() => setGridPowerOption('OUTAGE')}
                id="btn-q2-outage"
              >
                ✕ Power Cut
              </button>
            </div>
          </div>

          {/* Question 3: ICEing & Bay Clearance */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>3. Was bay clear of ICEing?</span>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Are petrol/diesel cars or cabs parked blocking the bay?</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={getPositiveBtnStyle(isBayFree === true)}
                onClick={() => setIsBayFree(true)}
                id="btn-q3-yes"
              >
                ✓ BAY FREE
              </button>
              <button
                style={getNegativeBtnStyle(isBayFree === false)}
                onClick={() => setIsBayFree(false)}
                id="btn-q3-no"
              >
                ✕ ICE'D
              </button>
            </div>
          </div>

          {/* Question 4: Parking & Gate Clearance */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>4. Physical parking accessible?</span>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Open gate, no locked barrier or construction obstruction?</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={getPositiveBtnStyle(isParkingAvailable === true)}
                onClick={() => setIsParkingAvailable(true)}
                id="btn-q4-yes"
              >
                ✓ OPEN
              </button>
              <button
                style={getNegativeBtnStyle(isParkingAvailable === false)}
                onClick={() => setIsParkingAvailable(false)}
                id="btn-q4-no"
              >
                ✕ BLOCKED
              </button>
            </div>
          </div>

          {/* Question 5: Hardware Integrity */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>5. Any physical damage?</span>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Broken gun latch, damaged screen, or frayed high-voltage cable?</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={getPositiveBtnStyle(hasDamage === false)}
                onClick={() => setHasDamage(false)}
                id="btn-q5-no"
              >
                ✓ INTACT
              </button>
              <button
                style={getNegativeBtnStyle(hasDamage === true)}
                onClick={() => setHasDamage(true)}
                id="btn-q5-yes"
              >
                ✕ DAMAGED
              </button>
            </div>
          </div>
        </div>

        {/* Photo Evidence Proof Selector */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Camera size={14} color="var(--brand-cyan)" />
            <span style={{ fontWeight: 700 }}>Attach Visual Evidence (Photo Proof)</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {PHOTO_PRESETS.map((preset, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedPhoto(preset.url)}
                style={{
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: `2px solid ${selectedPhoto === preset.url ? 'var(--brand-emerald)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  position: 'relative',
                  height: '70px',
                  background: '#020617'
                }}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(2, 6, 23, 0.85)',
                    padding: '2px 4px',
                    fontSize: '0.62rem',
                    color: '#FFF',
                    textAlign: 'center',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {preset.label}
                </div>
                {selectedPhoto === preset.url && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'var(--brand-emerald)',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#020617'
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Observed Speed Notes */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Optional Notes / Peak Speed Observed (kW):
          </label>
          <input
            type="text"
            placeholder="e.g. Nexon EV charged at 54 kW on Gun 1, cafeteria open"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none'
            }}
            id="input-verification-comment"
          />
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: '22px' }}>
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            id="btn-submit-verified-audit"
          >
            <CheckCircle2 size={18} />
            <span>
              {isSubmitting
                ? 'Validating Geofence & Updating Trust Engine...'
                : `Submit Verified Audit (+${potentialPoints} Energy Points)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;
