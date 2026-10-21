import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  Utensils,
  Building2,
  Shield,
  Navigation,
  BatteryCharging,
  Zap,
  Clock,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Activity,
  Wifi,
  Car,
  MessageSquare,
  TrendingUp,
  BarChart2,
  AlertTriangle
} from 'lucide-react';
import type { ChargingStation, FailurePatternAnalysis } from '../../../shared/types';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../config/api';

interface StationDetailModalProps {
  station: ChargingStation;
  onClose: () => void;
  onOpenVerify: () => void;
  onTriggerEmergency?: () => void;
}

interface TrustBreakdownData {
  overallScore: number;
  reliabilityPct: number;
  freshness: string;
  confidenceRating: string;
  formula: string;
  components: {
    community: {
      weight: number;
      rawScore: number;
      weightedContribution: number;
      auditCount24h: number;
      summary: string;
    };
    operator: {
      weight: number;
      rawScore: number;
      weightedContribution: number;
      statusAgreement: boolean;
      summary: string;
    };
    gridPower: {
      weight: number;
      rawScore: number;
      weightedContribution: number;
      status: string;
      phaseQuality: string;
      summary: string;
    };
    staleDecay: {
      penaltyPoints: number;
      hoursSinceLastAudit: number;
      decayMultiplier: number;
      summary: string;
    };
  };
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({
  station,
  onClose,
  onOpenVerify,
  onTriggerEmergency
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'TRUST' | 'FORECAST' | 'GUNS' | 'AUDITS' | 'AMENITIES'>('TRUST');
  const [copied, setCopied] = useState<boolean>(false);
  const [breakdown, setBreakdown] = useState<TrustBreakdownData | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState<boolean>(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [predictiveData, setPredictiveData] = useState<FailurePatternAnalysis | null>(null);
  const [selectedForecastHour, setSelectedForecastHour] = useState<number>(new Date().getHours());

  // Active vehicle configuration for dynamic charging time calculation
  const vehicle = user?.primaryVehicle || {
    make: 'Tata',
    model: 'Nexon EV Max',
    category: '4W',
    batteryCapacityKwh: 40.5,
    maxChargeRateKw: 50,
    currentEstimatedSocPct: 18,
    estimatedRangeKm: 52
  };

  // Fetch real-time mathematical breakdown, predictive analytics & verifications from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [breakdownRes, auditsRes, predictiveRes] = await Promise.all([
          fetch(buildApiUrl(`/api/stations/${station.id}/trust-breakdown`)),
          fetch(buildApiUrl(`/api/stations/${station.id}/verifications`)),
          fetch(buildApiUrl(`/api/analytics/predictive/${station.id}`))
        ]);

        if (breakdownRes.ok) {
          const bData = await breakdownRes.json();
          if (isMounted && bData.success) {
            setBreakdown(bData.breakdown);
          }
        }

        if (auditsRes.ok) {
          const aData = await auditsRes.json();
          if (isMounted && aData.success) {
            setAudits(aData.verifications || []);
          }
        }

        if (predictiveRes.ok) {
          const pData = await predictiveRes.json();
          if (isMounted && pData.success) {
            setPredictiveData(pData.analysis);
          }
        }
      } catch (err) {
        console.warn('Using client-calculated fallback trust metrics:', err);
      } finally {
        if (isMounted) setIsLoadingBreakdown(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [station.id]);

  // Copy address to clipboard
  const handleCopyAddress = () => {
    const fullText = `${station.name}, ${station.address}, ${station.landmark}, ${station.city}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Google Maps external navigation
  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Calculate dynamic charging time to 80% SoC
  const calculateChargingTime = (gunKw: number) => {
    const currentSoc = vehicle.currentEstimatedSocPct || 20;
    const targetSoc = 80;
    if (currentSoc >= targetSoc) return { minutes: 0, kwhNeeded: 0 };

    const kwhNeeded = Number(((vehicle.batteryCapacityKwh * (targetSoc - currentSoc)) / 100).toFixed(1));
    const effectiveKw = Math.min(gunKw, vehicle.maxChargeRateKw || 50);
    const hours = kwhNeeded / effectiveKw;
    const minutes = Math.round(hours * 60);

    return { minutes, kwhNeeded };
  };

  const isHighTrust = station.trustScore.score >= 80;
  const isPowerCut = station.powerGridStatus === 'REPORTED_CUT';
  const isVoltageSag = station.powerGridStatus === 'VOLTAGE_FLUCTUATION';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={onClose}
      id="station-modal-overlay"
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '620px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px',
          background: 'rgba(13, 19, 34, 0.96)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          position: 'relative',
          borderRadius: '20px'
        }}
        onClick={(e) => e.stopPropagation()}
        id="station-modal-card"
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
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'background 150ms ease'
          }}
          id="btn-close-station-modal"
        >
          <X size={18} />
        </button>

        {/* Header: Operator & Title */}
        <div style={{ paddingRight: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {station.operatorName}
            </span>
            <span className="badge badge-live" style={{ fontSize: '0.66rem', padding: '2px 8px' }}>
              <Clock size={11} style={{ marginRight: '3px' }} />
              {station.operatingHours}
            </span>
            {station.emergencyAccessEnabled && (
              <span className="badge badge-emergency" style={{ fontSize: '0.66rem', padding: '2px 8px' }}>
                <Zap size={11} style={{ marginRight: '3px' }} />
                Emergency Gate Enabled
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', marginTop: '6px', lineHeight: 1.2 }}>
            {station.name}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.82rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={14} color="var(--brand-emerald)" />
              {station.landmark}, {station.city}
            </span>
            {station.distanceKm !== undefined && (
              <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>
                • {station.distanceKm} km away
              </span>
            )}
            <button
              onClick={handleCopyAddress}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '2px 8px',
                color: copied ? 'var(--brand-emerald)' : 'var(--text-muted)',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Copy full address"
              id="btn-copy-address"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Indian Power Quality & Grid Stability Alert Banner */}
        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isPowerCut
              ? 'rgba(239, 68, 68, 0.15)'
              : isVoltageSag
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${isPowerCut ? 'rgba(239, 68, 68, 0.4)' : isVoltageSag ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`
          }}
          id="power-grid-stability-banner"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity
              size={18}
              color={isPowerCut ? '#EF4444' : isVoltageSag ? '#F59E0B' : 'var(--brand-emerald)'}
            />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isPowerCut ? '#FCA5A5' : isVoltageSag ? '#FDE68A' : 'var(--brand-emerald)' }}>
                {isPowerCut
                  ? 'GRID POWER CUT ACTIVE (BESCOM FEEDER DOWN)'
                  : isVoltageSag
                    ? 'VOLTAGE SAG DETECTED (SINGLE-PHASING RISK)'
                    : '3-PHASE GRID POWER CONFIRMED STABLE (415V)'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {isPowerCut
                  ? 'Charger hardware is offline. Do not navigate here until power is restored.'
                  : isVoltageSag
                    ? 'Charger screen may illuminate, but high-current DC fast session may trip.'
                    : 'Substation telemetry and recent driver audits confirm uninterrupted fast charging.'}
              </div>
            </div>
          </div>

          <span
            className="badge"
            style={{
              background: isPowerCut ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.2)',
              color: isPowerCut ? '#F87171' : 'var(--brand-emerald)',
              fontSize: '0.68rem',
              fontWeight: 700
            }}
          >
            {station.trustScore.freshness}
          </span>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '18px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '8px'
          }}
          id="station-modal-tabs"
        >
          <button
            onClick={() => setActiveTab('TRUST')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: activeTab === 'TRUST' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'TRUST' ? 'var(--brand-emerald)' : 'var(--text-secondary)',
              border: activeTab === 'TRUST' ? '1px solid var(--brand-emerald)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            id="tab-trust-score"
          >
            <ShieldCheck size={14} />
            <span>Trust Engine Dossier</span>
          </button>

          <button
            onClick={() => setActiveTab('FORECAST')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: activeTab === 'FORECAST' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'FORECAST' ? '#FDE68A' : 'var(--text-secondary)',
              border: activeTab === 'FORECAST' ? '1px solid #F59E0B' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            id="tab-demand-forecast"
          >
            <TrendingUp size={14} />
            <span>AI Forecast & Congestion</span>
          </button>

          <button
            onClick={() => setActiveTab('GUNS')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: activeTab === 'GUNS' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'GUNS' ? 'var(--brand-cyan)' : 'var(--text-secondary)',
              border: activeTab === 'GUNS' ? '1px solid var(--brand-cyan)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            id="tab-guns-matrix"
          >
            <BatteryCharging size={14} />
            <span>Guns ({station.connectors.length}) & Speeds</span>
          </button>

          <button
            onClick={() => setActiveTab('AMENITIES')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: activeTab === 'AMENITIES' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeTab === 'AMENITIES' ? '#FFF' : 'var(--text-secondary)',
              border: activeTab === 'AMENITIES' ? '1px solid var(--border-subtle)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            id="tab-amenities"
          >
            <Utensils size={14} />
            <span>Amenities</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDITS')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: activeTab === 'AUDITS' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              color: activeTab === 'AUDITS' ? '#C084FC' : 'var(--text-secondary)',
              border: activeTab === 'AUDITS' ? '1px solid #A855F7' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            id="tab-audits-feed"
          >
            <MessageSquare size={14} />
            <span>Driver Audits ({audits.length})</span>
          </button>
        </div>

        {/* TAB 1: TRUST ENGINE DOSSIER */}
        {activeTab === 'TRUST' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Overall Score Summary Header */}
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: isHighTrust ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${isHighTrust ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  Dynamic Reliability Score
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: isHighTrust ? 'var(--brand-emerald)' : 'var(--status-faulty)', fontFamily: 'Outfit, sans-serif' }}>
                    {isLoadingBreakdown ? '...' : (breakdown?.overallScore ?? station.trustScore.score)}
                  </span>
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: isHighTrust ? 'var(--brand-emerald)' : '#F87171', fontWeight: 600 }}>
                  {isHighTrust ? '✓ High Driver Confidence' : '⚠️ Action Required / Disputed Status'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF' }}>
                  Reliability: {station.trustScore.reliabilityPct}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {station.trustScore.verificationCount24h} Field Audits (24h)
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--brand-cyan)', marginTop: '4px', background: 'rgba(6, 182, 212, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                  {breakdown?.confidenceRating || 'VERIFIED_HIGH'}
                </div>
              </div>
            </div>

            {/* Mathematical Formula Callout */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.74rem'
              }}
              id="trust-formula-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, color: 'var(--brand-cyan)' }}>
                  GOVERNING MATHEMATICAL MODEL
                </span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                  S_t = 0.45·C_i + 0.25·O_i + 0.20·G_i - D_i
                </span>
              </div>

              {/* Segmented Visual Contribution Bar */}
              <div style={{ height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex', background: 'rgba(255, 255, 255, 0.05)', marginBottom: '8px' }}>
                <div
                  style={{
                    width: `${breakdown?.components.community.weightedContribution || 40}%`,
                    background: 'var(--brand-emerald)',
                    transition: 'width 300ms ease'
                  }}
                  title="Community Component"
                />
                <div
                  style={{
                    width: `${breakdown?.components.operator.weightedContribution || 25}%`,
                    background: 'var(--brand-cyan)',
                    transition: 'width 300ms ease'
                  }}
                  title="Operator Component"
                />
                <div
                  style={{
                    width: `${breakdown?.components.gridPower.weightedContribution || 20}%`,
                    background: '#F59E0B',
                    transition: 'width 300ms ease'
                  }}
                  title="Grid Power Component"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--brand-emerald)' }}>● Community (45%)</span>
                <span style={{ color: 'var(--brand-cyan)' }}>● Operator (25%)</span>
                <span style={{ color: '#F59E0B' }}>● Grid (20%)</span>
                <span style={{ color: '#EF4444' }}>● Decay (-D)</span>
              </div>
            </div>

            {/* 4 Multi-Source Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* 1. Community Audits */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>COMMUNITY (45%)</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-emerald)' }}>
                    +{breakdown?.components.community.weightedContribution ?? 42} pts
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#FFF', marginTop: '4px' }}>
                  {breakdown?.components.community.rawScore ?? station.trustScore.signals.communityConfidence}% Approval
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                  {breakdown?.components.community.summary ?? `${station.trustScore.verificationCount24h} proximity-verified driver audits.`}
                </p>
              </div>

              {/* 2. Operator Telemetry */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>OPERATOR (25%)</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
                    +{breakdown?.components.operator.weightedContribution ?? 25} pts
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#FFF', marginTop: '4px' }}>
                  {station.trustScore.signals.operatorStatusAgreement ? 'Agreement Match' : 'Discrepancy'}
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                  {breakdown?.components.operator.summary ?? 'OCPP 1.6J live heartbeat.'}
                </p>
              </div>

              {/* 3. Grid Stability */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>GRID POWER (20%)</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isPowerCut ? '#EF4444' : '#F59E0B' }}>
                    +{breakdown?.components.gridPower.weightedContribution ?? 20} pts
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#FFF', marginTop: '4px' }}>
                  {breakdown?.components.gridPower.phaseQuality ?? '3-Phase Active'}
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                  {breakdown?.components.gridPower.summary ?? 'Feeder power stable.'}
                </p>
              </div>

              {/* 4. Stale Decay */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>STALE DECAY</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: (breakdown?.components.staleDecay.penaltyPoints || 0) > 0 ? '#EF4444' : 'var(--brand-emerald)' }}>
                    -{(breakdown?.components.staleDecay.penaltyPoints ?? 0)} pts
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#FFF', marginTop: '4px' }}>
                  {station.trustScore.freshness}
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                  {breakdown?.components.staleDecay.summary ?? 'Verified recently.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: AI CONGESTION & FAILURE PATTERN FORECAST */}
        {activeTab === 'FORECAST' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }} id="panel-predictive-forecast">
            {/* Predictive Risk Overview Card */}
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: predictiveData?.riskTier === 'CRITICAL' || predictiveData?.riskTier === 'HIGH'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : predictiveData?.riskTier === 'MODERATE'
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${
                  predictiveData?.riskTier === 'CRITICAL' || predictiveData?.riskTier === 'HIGH'
                    ? 'rgba(239, 68, 68, 0.35)'
                    : predictiveData?.riskTier === 'MODERATE'
                    ? 'rgba(245, 158, 11, 0.35)'
                    : 'rgba(16, 185, 129, 0.35)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp
                    size={18}
                    color={
                      predictiveData?.riskTier === 'CRITICAL' || predictiveData?.riskTier === 'HIGH'
                        ? '#EF4444'
                        : predictiveData?.riskTier === 'MODERATE'
                        ? '#F59E0B'
                        : 'var(--brand-emerald)'
                    }
                  />
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    AI Predictive Failure Risk Index ($R_f$)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '2rem',
                      fontWeight: 900,
                      color:
                        predictiveData?.riskTier === 'CRITICAL' || predictiveData?.riskTier === 'HIGH'
                          ? '#EF4444'
                          : predictiveData?.riskTier === 'MODERATE'
                          ? '#F59E0B'
                          : 'var(--brand-emerald)'
                    }}
                  >
                    {predictiveData?.failureRiskPct ?? 25}%
                  </span>
                  <span
                    className="badge"
                    style={{
                      background:
                        predictiveData?.riskTier === 'CRITICAL' || predictiveData?.riskTier === 'HIGH'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : predictiveData?.riskTier === 'MODERATE'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(16, 185, 129, 0.2)',
                      color:
                        predictiveData?.riskTier === 'CRITICAL' || predictiveData?.riskTier === 'HIGH'
                          ? '#FCA5A5'
                          : predictiveData?.riskTier === 'MODERATE'
                          ? '#FDE68A'
                          : 'var(--brand-emerald)',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}
                  >
                    {predictiveData?.riskTier ?? 'LOW'} RISK
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {predictiveData?.riskTier === 'CRITICAL' || predictiveData?.riskTier === 'HIGH'
                    ? '⚠️ High probability of lockout/derate during evening peak load'
                    : '✓ Optimal hardware & grid stability predicted'}
                </div>
              </div>

              {/* Optimal vs Peak Window Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--brand-emerald)', textTransform: 'uppercase' }}>
                    ⚡ Optimal Charging Window
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFF' }}>
                    {predictiveData?.peakWindow.recommendedAlternativeTime || '12:00 PM – 4:00 PM (0m wait)'}
                  </div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#F87171', textTransform: 'uppercase' }}>
                    ⚠️ Peak Congestion Window
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFF' }}>
                    {predictiveData?.peakWindow.startHour || 17}:00 – {predictiveData?.peakWindow.endHour || 21}:00 ({predictiveData?.peakWindow.peakWaitMinutes || 35}m queue)
                  </div>
                </div>
              </div>
            </div>

            {/* 24-Hour Interactive Timeline & Congestion Curve */}
            <div className="glass-panel" style={{ padding: '16px' }} id="interactive-24h-demand-timeline">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart2 size={16} color="var(--brand-cyan)" />
                    <span>24-Hour Projected Occupancy & Wait Times</span>
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Click any hour column to view estimated queue wait and Indian grid sag probability.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--brand-emerald)' }}></span> &lt;45% Free
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F59E0B' }}></span> 70%+ Busy
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#EF4444' }}></span> 85%+ Congested
                  </span>
                </div>
              </div>

              {/* 24 Bars Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(24, 1fr)',
                  gap: '4px',
                  alignItems: 'end',
                  height: '110px',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                {(predictiveData?.hourlyDemandForecast || []).map((h) => {
                  const isSelected = selectedForecastHour === h.hour;
                  const isPeak = h.expectedOccupancyPct >= 85;
                  const isBusy = h.expectedOccupancyPct >= 70;
                  const barColor = isPeak ? '#EF4444' : isBusy ? '#F59E0B' : h.expectedOccupancyPct > 45 ? 'var(--brand-cyan)' : 'var(--brand-emerald)';

                  return (
                    <div
                      key={h.hour}
                      onClick={() => setSelectedForecastHour(h.hour)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        cursor: 'pointer'
                      }}
                      title={`${h.hour}:00 - Occupancy ${h.expectedOccupancyPct}%, Wait ~${h.expectedWaitMinutes}m`}
                    >
                      <div
                        style={{
                          width: '100%',
                          minWidth: '6px',
                          height: `${Math.max(12, h.expectedOccupancyPct)}%`,
                          background: barColor,
                          borderRadius: '3px 3px 0 0',
                          opacity: isSelected ? 1 : 0.65,
                          transform: isSelected ? 'scaleY(1.05)' : 'none',
                          border: isSelected ? '1.5px solid #FFF' : 'none',
                          transition: 'all 150ms ease'
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.58rem',
                          color: isSelected ? '#FFF' : 'var(--text-muted)',
                          fontWeight: isSelected ? 800 : 500,
                          marginTop: '4px'
                        }}
                      >
                        {h.hour}h
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Selected Hour Insight Card */}
              {predictiveData && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                  id="selected-hour-insight"
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', fontWeight: 800 }}>
                      TIMELINE DRILLDOWN: {selectedForecastHour}:00 - {selectedForecastHour + 1}:00
                    </span>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF', marginTop: '2px' }}>
                      Projected Occupancy: {predictiveData.hourlyDemandForecast[selectedForecastHour]?.expectedOccupancyPct || 25}%
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Estimated Queue</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: (predictiveData.hourlyDemandForecast[selectedForecastHour]?.expectedWaitMinutes || 0) > 15 ? '#EF4444' : 'var(--brand-emerald)' }}>
                        ~{predictiveData.hourlyDemandForecast[selectedForecastHour]?.expectedWaitMinutes || 0} min
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Indian Grid Sag Risk</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: (predictiveData.hourlyDemandForecast[selectedForecastHour]?.gridSagRiskPct || 10) > 50 ? '#F59E0B' : 'var(--brand-cyan)' }}>
                        {predictiveData.hourlyDemandForecast[selectedForecastHour]?.gridSagRiskPct || 10}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Failure Mode Diagnostics & Substation Telemetry */}
            {predictiveData && (
              <div className="glass-panel" style={{ padding: '16px' }} id="failure-mode-diagnostics">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} color="#F59E0B" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFF' }}>
                      {predictiveData.signatureTitle}
                    </span>
                  </div>
                  <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)' }}>
                    Sig: {predictiveData.primaryFailureSignature}
                  </span>
                </div>

                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '14px' }}>
                  {predictiveData.signatureDescription}
                </p>

                {/* 4 Root-Cause Telemetry Gauges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>VOLTAGE STABILITY</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: predictiveData.rootCauseTelemetry.voltageStabilityScore > 85 ? 'var(--brand-emerald)' : '#F59E0B', marginTop: '2px' }}>
                      {predictiveData.rootCauseTelemetry.voltageStabilityScore}%
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {predictiveData.rootCauseTelemetry.voltageStabilityScore > 85 ? '415V Nominal' : 'Sag &lt;360V detected'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>THERMAL DERATE RISK</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: predictiveData.rootCauseTelemetry.thermalDerateRiskPct > 60 ? '#EF4444' : 'var(--brand-emerald)', marginTop: '2px' }}>
                      {predictiveData.rootCauseTelemetry.thermalDerateRiskPct}%
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Coolant Loop & Radiator
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>OCPP PING LATENCY</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: predictiveData.rootCauseTelemetry.ocppHeartbeatLatencyMs > 800 ? '#EF4444' : 'var(--brand-cyan)', marginTop: '2px' }}>
                      {predictiveData.rootCauseTelemetry.ocppHeartbeatLatencyMs} ms
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Cloud CMS Heartbeat
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>FAULT RECURRENCE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                      ~{predictiveData.rootCauseTelemetry.recurrentFailureIntervalHours}h
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Interval Pattern
                    </div>
                  </div>
                </div>

                {/* Recommended Preventive Maintenance */}
                <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#FDE68A', textTransform: 'uppercase' }}>
                    Recommended Preventive Action
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#FFF', marginTop: '2px', fontWeight: 600 }}>
                    {predictiveData.recommendedIntervention}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Action Window: <strong style={{ color: '#FDE68A' }}>{predictiveData.suggestedActionDeadline}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'GUNS' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Dynamic EV Charging Time Estimator for User's Active Vehicle */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(13, 19, 34, 0.6) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              id="ev-charging-time-estimator"
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={16} color="var(--brand-cyan)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-cyan)', textTransform: 'uppercase' }}>
                    Your Vehicle: {vehicle.make} {vehicle.model}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Battery: {vehicle.batteryCapacityKwh} kWh • Current SoC: <strong style={{ color: '#FFF' }}>{vehicle.currentEstimatedSocPct}%</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--brand-cyan)', fontSize: '0.72rem', fontWeight: 700 }}>
                  Target: 80% SoC
                </span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Requires ~{calculateChargingTime(station.connectors[0]?.maxPowerKw || 50).kwhNeeded} kWh
                </div>
              </div>
            </div>

            {/* List of Connectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {station.connectors.map((conn) => {
                const est = calculateChargingTime(conn.maxPowerKw);
                const isAvailable = conn.status === 'AVAILABLE';

                return (
                  <div
                    key={conn.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: conn.currentType === 'DC' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: conn.currentType === 'DC' ? 'var(--brand-cyan)' : 'var(--brand-emerald)'
                        }}
                      >
                        <Zap size={20} />
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFF' }}>
                          {conn.maxPowerKw} kW {conn.type}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {conn.currentType} Fast Charging • ₹{conn.tariffPerKwhInr}/kWh
                        </div>
                        {/* Dynamic estimated charging duration badge */}
                        <div style={{ fontSize: '0.72rem', color: 'var(--brand-emerald)', fontWeight: 600, marginTop: '2px' }}>
                          ⚡ 18% ➔ 80% in ~{est.minutes} mins (~₹{Math.round(est.kwhNeeded * conn.tariffPerKwhInr)})
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        className="badge"
                        style={{
                          background: isAvailable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: isAvailable ? 'var(--brand-emerald)' : 'var(--status-occupied)',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {conn.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: AMENITIES & ACCESS */}
        {activeTab === 'AMENITIES' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Access Policy Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-cyan)', textTransform: 'uppercase' }}>
                Access & Security Policy
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                {station.accessType === 'PUBLIC'
                  ? 'Open to all public EV drivers 24/7. No gate pass or security clearance required.'
                  : station.accessType === 'PRIVATE_AUTHORIZED'
                    ? 'Located within commercial/hotel premises. Emergency access protocol enabled for EVs below 20% SoC.'
                    : 'Gated residential complex. Pre-authorization or emergency SOS token required at the security gate.'}
              </p>
            </div>

            {/* Amenity Badges */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
                On-Site Facilities
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {station.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: amenity.isAvailable ? '#FFF' : 'var(--text-muted)'
                    }}
                  >
                    {amenity.type === 'FOOD' && <Utensils size={15} color="var(--brand-cyan)" />}
                    {amenity.type === 'RESTROOM' && <Building2 size={15} color="var(--brand-emerald)" />}
                    {amenity.type === 'SECURITY_24_7' && <Shield size={15} color="#FBBF24" />}
                    {amenity.type === 'WIFI' && <Wifi size={15} color="var(--brand-cyan)" />}
                    {amenity.type === 'PARKING' && <Car size={15} color="var(--brand-emerald)" />}
                    <span>{amenity.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMMUNITY DRIVER AUDITS FEED */}
        {activeTab === 'AUDITS' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#C084FC', textTransform: 'uppercase' }}>
                On-Site Field Verification Log ({audits.length})
              </span>
              <button
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                onClick={onOpenVerify}
                id="btn-audits-add-new"
              >
                + Submit Audit
              </button>
            </div>

            {audits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No recent community audits yet. Be the first driver to audit this station!
              </div>
            ) : (
              audits.map((a, idx) => (
                <div
                  key={a.id || idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#FFF' }}>
                        {a.userName}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: a.isProximityVerified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: a.isProximityVerified ? 'var(--brand-emerald)' : '#FCA5A5',
                          fontSize: '0.66rem'
                        }}
                      >
                        {a.isProximityVerified ? `🎯 On-Site (${a.distanceMeters}m)` : `⚠️ Remote (${a.distanceMeters}m)`}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(a.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Signals mini badges */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.68rem' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: a.isChargerWorking ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: a.isChargerWorking ? 'var(--brand-emerald)' : '#F87171', fontWeight: 600 }}>
                      Charger: {a.isChargerWorking ? 'Working' : 'Broken'}
                    </span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: a.isGridPowerOn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: a.isGridPowerOn ? 'var(--brand-emerald)' : '#F87171', fontWeight: 600 }}>
                      Grid: {a.isGridPowerOn ? 'Live' : 'Outage'}
                    </span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: a.isBayFree ? 'rgba(6, 182, 212, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: a.isBayFree ? 'var(--brand-cyan)' : '#FDE68A', fontWeight: 600 }}>
                      Bay: {a.isBayFree ? 'Free' : 'ICEing'}
                    </span>
                  </div>

                  {/* Comment */}
                  {a.comment && (
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                      "{a.comment}"
                    </p>
                  )}

                  {/* Photo thumbnail */}
                  {a.photoUrl && (
                    <div style={{ marginTop: '2px', width: '120px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <img src={a.photoUrl} alt="Audit proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal Action Controls Footer */}
        <div
          style={{
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}
          id="station-modal-actions"
        >
          <button
            className="btn-secondary"
            style={{ flex: 1, minWidth: '140px', padding: '10px', fontSize: '0.82rem' }}
            onClick={onOpenVerify}
            id="btn-verify-condition"
          >
            <CheckCircle2 size={16} />
            <span>Community Audit (+25 pts)</span>
          </button>

          {station.emergencyAccessEnabled && (
            <button
              className="btn-emergency"
              style={{ flex: 1, minWidth: '140px', padding: '10px', fontSize: '0.82rem' }}
              onClick={() => {
                if (onTriggerEmergency) onTriggerEmergency();
                else alert('Emergency SOS Protocol initiated. Notifying station host.');
              }}
              id="btn-emergency-request"
            >
              <Zap size={16} />
              <span>Request Emergency Gate</span>
            </button>
          )}

          <button
            className="btn-primary"
            style={{ flex: 1.2, minWidth: '160px', padding: '10px', fontSize: '0.82rem' }}
            onClick={handleOpenGoogleMaps}
            id="btn-navigate-google-maps"
          >
            <Navigation size={16} />
            <span>Directions via Google Maps</span>
            <ExternalLink size={13} style={{ marginLeft: '2px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StationDetailModal;
