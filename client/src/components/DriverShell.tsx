import React, { useState, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Utensils,
  Building2,
  Lock,
  Search,
  Compass,
  Award,
  BatteryCharging,
  Car,
  Sliders,
  Gift,
  Map,
  List
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MapView } from './MapView';
import type { ChargingStation, VehicleProfile } from '../../../shared/types';

interface DriverShellProps {
  stations: ChargingStation[];
  primaryVehicle?: VehicleProfile;
  onSelectStation: (station: ChargingStation) => void;
  onTriggerEmergency: () => void;
  filterWorkingOnly: boolean;
  onToggleWorkingOnly: () => void;
  filterDcFast: boolean;
  onToggleDcFast: () => void;
  filterEmergencyOnly: boolean;
  onToggleEmergencyOnly: () => void;
  onOpenAuth: () => void;
}

export const DriverShell: React.FC<DriverShellProps> = ({
  stations,
  primaryVehicle,
  onSelectStation,
  onTriggerEmergency,
  filterWorkingOnly,
  onToggleWorkingOnly,
  filterDcFast,
  onToggleDcFast,
  filterEmergencyOnly,
  onToggleEmergencyOnly,
  onOpenAuth
}) => {
  const { user, isAuthenticated, updateVehicle } = useAuth();
  const [viewMode, setViewMode] = useState<'MAP' | 'LIST'>('MAP');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBottomTab, setActiveBottomTab] = useState<'EXPLORE' | 'VERIFY' | 'SAVED' | 'PROFILE'>('EXPLORE');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // Bulletproof responsive desktop detection matching CSS breakpoint (>= 1024px)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (typeof window.matchMedia === 'function') {
        return window.matchMedia('(min-width: 1024px)').matches;
      }
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const update = () => {
      if (typeof window.matchMedia === 'function') {
        setIsDesktop(window.matchMedia('(min-width: 1024px)').matches);
      } else {
        setIsDesktop(window.innerWidth >= 1024);
      }
    };

    update();

    let mql: MediaQueryList | null = null;
    if (typeof window.matchMedia === 'function') {
      mql = window.matchMedia('(min-width: 1024px)');
      try {
        mql.addEventListener('change', update);
      } catch {
        mql.addListener(update);
      }
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      if (mql) {
        try {
          mql.removeEventListener('change', update);
        } catch {
          mql.removeListener(update);
        }
      }
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // SoC Slider state
  const activeVehicle = user?.primaryVehicle || primaryVehicle;
  const [socSlider, setSocSlider] = useState<number>(activeVehicle?.currentEstimatedSocPct ?? 18);
  const [isUpdatingSoc, setIsUpdatingSoc] = useState(false);
  const [socSavedNotice, setSocSavedNotice] = useState(false);

  const calculatedRange = Math.round(((socSlider / 100) * (activeVehicle?.batteryCapacityKwh || 40)) * 7.2);

  const handleSaveSoc = async () => {
    setIsUpdatingSoc(true);
    await updateVehicle({
      currentEstimatedSocPct: socSlider,
      estimatedRangeKm: calculatedRange
    });
    setIsUpdatingSoc(false);
    setSocSavedNotice(true);
    setTimeout(() => setSocSavedNotice(false), 3000);
  };

  const filteredStations = stations.filter(station => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = station.name.toLowerCase().includes(q);
      const matchOp = station.operatorName.toLowerCase().includes(q);
      const matchAddr = station.address.toLowerCase().includes(q);
      const matchArea = station.landmark.toLowerCase().includes(q);
      if (!matchName && !matchOp && !matchAddr && !matchArea) return false;
    }
    if (filterWorkingOnly && (station.overallStatus === 'FAULTY' || station.overallStatus === 'OFFLINE')) {
      return false;
    }
    if (filterDcFast && !station.connectors.some(c => c.currentType === 'DC' && c.maxPowerKw >= 50)) {
      return false;
    }
    if (filterEmergencyOnly && !station.emergencyAccessEnabled) {
      return false;
    }
    return true;
  });

  // Reusable Component 1: 1-Tap Emergency SOS Trigger Banner
  const renderEmergencyBanner = () => (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.28) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        borderRadius: '14px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--emergency-glow)'
      }}
      id="driver-emergency-banner"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0
          }}
        >
          <AlertTriangle size={20} strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#FCA5A5' }}>
              LOW BATTERY SOS
            </span>
            <span className="badge badge-emergency" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
              Range: {activeVehicle ? `${activeVehicle.estimatedRangeKm} km` : '52 km'}
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Find verified fast chargers guaranteed live on grid power
          </p>
        </div>
      </div>

      <button
        className="btn-emergency"
        onClick={onTriggerEmergency}
        id="btn-emergency-mode"
        style={{ fontSize: '0.8rem', padding: '8px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        <Zap size={14} fill="#FFF" />
        <span>Emergency</span>
      </button>
    </div>
  );

  // Reusable Component 2: Search Input
  const renderSearchBar = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        padding: '8px 12px',
        border: '1px solid var(--border-subtle)',
        gap: '8px'
      }}
    >
      <Search size={16} color="var(--text-muted)" />
      <input
        type="text"
        placeholder="Search station, operator, highway..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          width: '100%',
          fontFamily: 'inherit'
        }}
        id="driver-search-input"
      />
    </div>
  );

  // Reusable Component 3: Quick Filter Chips
  const renderFilterPills = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        width: '100%',
        maxWidth: '100%',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch'
      }}
      id="quick-filters-scroll"
    >
      <button
        onClick={onToggleWorkingOnly}
        style={{
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '0.74rem',
          fontWeight: 600,
          background: filterWorkingOnly ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${filterWorkingOnly ? 'var(--brand-emerald)' : 'var(--border-subtle)'}`,
          color: filterWorkingOnly ? 'var(--brand-emerald)' : 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer'
        }}
        id="filter-working-only"
      >
        <CheckCircle2 size={12} />
        <span>Working Only</span>
      </button>

      <button
        onClick={onToggleDcFast}
        style={{
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '0.74rem',
          fontWeight: 600,
          background: filterDcFast ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${filterDcFast ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
          color: filterDcFast ? 'var(--brand-cyan)' : 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer'
        }}
        id="filter-dc-fast"
      >
        <Zap size={12} />
        <span>DC Fast (≥50kW)</span>
      </button>

      <button
        onClick={onToggleEmergencyOnly}
        style={{
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '0.74rem',
          fontWeight: 600,
          background: filterEmergencyOnly ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${filterEmergencyOnly ? 'var(--emergency-red)' : 'var(--border-subtle)'}`,
          color: filterEmergencyOnly ? '#F87171' : 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer'
        }}
        id="filter-emergency-access"
      >
        <Lock size={12} />
        <span>Emergency Access</span>
      </button>
    </div>
  );

  // Reusable Component 4: Single Station Card
  const renderStationCard = (station: ChargingStation, _isDesktopView: boolean) => {
    const trustClass =
      station.trustScore.score >= 80 ? 'high' : station.trustScore.score >= 50 ? 'medium' : 'low';
    const isPowerCut = station.powerGridStatus === 'REPORTED_CUT';
    const isCardSelected = selectedStationId === station.id;

    return (
      <div
        key={station.id}
        className="glass-card"
        style={{
          borderColor: isCardSelected
            ? 'var(--brand-emerald)'
            : isPowerCut
            ? 'rgba(239, 68, 68, 0.35)'
            : 'var(--border-subtle)',
          background: isPowerCut
            ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.06) 0%, var(--bg-card) 100%)'
            : isCardSelected
            ? 'rgba(16, 185, 129, 0.05)'
            : 'var(--bg-card)',
          boxShadow: isCardSelected ? '0 0 16px rgba(16, 185, 129, 0.2)' : undefined,
          cursor: 'pointer',
          transition: 'all 200ms ease'
        }}
        onClick={() => {
          setSelectedStationId(station.id);
          onSelectStation(station);
        }}
        id={`station-card-${station.id}`}
      >
        {/* Card Top: Operator & Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                {station.operatorName}
              </span>
              {station.accessType === 'PRIVATE_AUTHORIZED' && (
                <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', fontSize: '0.62rem', padding: '1px 6px' }}>
                  Private Access
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
              {station.name}
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {station.landmark} • {station.distanceKm} km away
            </p>
          </div>

          {/* Trust Score Pill */}
          <div className={`trust-score-pill ${trustClass}`} title={`Trust Score based on ${station.trustScore.verificationCount24h} verifications in 24h`}>
            <ShieldCheck size={14} />
            <span className="score-num">{station.trustScore.score}</span>
            <span className="score-total">/100</span>
          </div>
        </div>

        {/* Status & Freshness Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '8px 0 12px 0',
            flexWrap: 'wrap'
          }}
        >
          {station.trustScore.freshness === 'LIVE' && (
            <span className="badge badge-live">
              <span className="status-dot live" style={{ width: '6px', height: '6px' }} />
              LIVE Status
            </span>
          )}
          {station.trustScore.freshness === 'RECENT' && (
            <span className="badge badge-recent">
              <Clock size={11} />
              Verified Recent
            </span>
          )}
          {station.trustScore.freshness === 'STALE' && (
            <span className="badge badge-stale">
              <Clock size={11} />
              Stale (&gt;1 hr)
            </span>
          )}

          {station.powerGridStatus === 'CONFIRMED_LIVE' ? (
            <span
              style={{
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--brand-emerald)',
                fontWeight: 600
              }}
            >
              <Zap size={12} />
              Grid Confirmed
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--status-faulty)',
                fontWeight: 700
              }}
            >
              <AlertTriangle size={12} />
              Grid Cut Reported
            </span>
          )}

          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {station.trustScore.verificationCount24h} audits today
          </span>
        </div>

        {/* Connectors & Tariff Row */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.76rem',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <BatteryCharging size={14} color="var(--brand-cyan)" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {station.connectors.map(c => `${c.maxPowerKw}kW ${c.type}`).join(' | ')}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{station.connectors[0]?.tariffPerKwhInr}
            </span>
            /kWh
          </div>
        </div>

        {/* Card Bottom: Amenities & Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            {station.amenities.slice(0, 3).map((amenity, idx) => (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {amenity.type === 'FOOD' && <Utensils size={12} />}
                {amenity.type === 'RESTROOM' && <Building2 size={12} />}
                {amenity.name}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px' }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStationId(station.id);
                onSelectStation(station);
              }}
            >
              Details
            </button>
            <button
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStationId(station.id);
                alert(`Initiating verified route to: ${station.name}`);
              }}
            >
              <Navigation size={12} />
              <span>Route</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Reusable Component 5: Profile & EV Battery Management View
  const renderProfileScreen = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} id="driver-profile-screen">
      {/* User Profile Card */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#020617',
                fontSize: '1.1rem',
                fontWeight: 800
              }}
            >
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                {user?.fullName || 'Guest Driver'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {user?.email || 'Sign in to sync your vehicle and rewards'}
              </p>
            </div>
          </div>

          {!isAuthenticated && (
            <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={onOpenAuth}>
              Sign In
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reputation Score</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-emerald)' }}>
              {user?.reputationScore ? `${user.reputationScore * 100}%` : '94%'}
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--brand-cyan)' }}>High Contributor</span>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Energy Points</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
              {user?.energyPoints ?? 480}
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--brand-emerald)' }}>Redeemable at Cafes</span>
          </div>
        </div>
      </div>

      {/* EV Vehicle Specifications Card */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Car size={18} color="var(--brand-cyan)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            Primary Electric Vehicle
          </h3>
        </div>

        {activeVehicle ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                {activeVehicle.make} {activeVehicle.model} ({activeVehicle.category})
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Battery: {activeVehicle.batteryCapacityKwh} kWh • Max DC: {activeVehicle.maxChargeRateKw} kW
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', marginTop: '4px' }}>
                Supported: {activeVehicle.supportedConnectors.join(', ')}
              </div>
            </div>

            {/* Interactive Battery State of Charge (SoC) Slider */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Current Battery SoC:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: socSlider <= 15 ? 'var(--status-faulty)' : 'var(--brand-emerald)' }}>
                  {socSlider}% ({calculatedRange} km safe range)
                </span>
              </div>

              <input
                type="range"
                min="3"
                max="100"
                value={socSlider}
                onChange={(e) => setSocSlider(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: socSlider <= 15 ? '#EF4444' : '#10B981',
                  cursor: 'pointer'
                }}
                id="input-battery-soc-slider"
              />

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                💡 Adjusting your SoC dynamically calibrates the Emergency Charging SOS algorithm to guarantee chargers within your actual range.
              </p>

              <button
                className="btn-secondary"
                style={{ width: '100%', marginTop: '10px', fontSize: '0.8rem', padding: '8px' }}
                onClick={handleSaveSoc}
                disabled={isUpdatingSoc}
                id="btn-save-vehicle-soc"
              >
                <Sliders size={14} />
                <span>{isUpdatingSoc ? 'Saving to Cloud...' : socSavedNotice ? '✓ Battery State Synced!' : 'Sync Vehicle Battery SoC'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.82rem' }}>No vehicle linked. Sign in to link your EV.</p>
            <button className="btn-primary" style={{ marginTop: '10px', fontSize: '0.8rem' }} onClick={onOpenAuth}>
              Add Vehicle Profile
            </button>
          </div>
        )}
      </div>

      {/* Energy Points Rewards Store Preview */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Gift size={18} color="var(--brand-emerald)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            Energy Rewards Store
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
            <span>₹100 Off at Tata Power Fast Chargers</span>
            <span style={{ fontWeight: 700, color: 'var(--brand-cyan)' }}>300 pts</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
            <span>Free Coffee at Third Wave Highway Oasis</span>
            <span style={{ fontWeight: 700, color: 'var(--brand-cyan)' }}>150 pts</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Reusable Component 6: Mobile Bottom Navigation Bar
  const renderBottomNav = () => (
    <div
      style={{
        background: 'rgba(10, 15, 29, 0.95)',
        backdropFilter: 'var(--glass-blur)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}
      id="driver-bottom-nav"
    >
      <button
        onClick={() => {
          setActiveBottomTab('EXPLORE');
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          color: activeBottomTab === 'EXPLORE' ? 'var(--brand-emerald)' : 'var(--text-muted)',
          fontSize: '0.7rem',
          fontWeight: 600
        }}
        id="nav-tab-explore"
      >
        <Compass size={18} />
        <span>Explore</span>
      </button>

      <button
        onClick={() => {
          if (filteredStations[0]) {
            setSelectedStationId(filteredStations[0].id);
            onSelectStation(filteredStations[0]);
          }
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          color: 'var(--brand-cyan)',
          fontSize: '0.7rem',
          fontWeight: 600
        }}
        id="nav-tab-verify"
      >
        <CheckCircle2 size={18} />
        <span>Verify</span>
      </button>

      <button
        onClick={onTriggerEmergency}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          color: '#EF4444',
          fontSize: '0.7rem',
          fontWeight: 700
        }}
        id="nav-tab-emergency"
      >
        <Zap size={18} />
        <span>SOS Mode</span>
      </button>

      <button
        onClick={() => setActiveBottomTab('PROFILE')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          color: activeBottomTab === 'PROFILE' ? 'var(--brand-emerald)' : 'var(--text-muted)',
          fontSize: '0.7rem',
          fontWeight: 600
        }}
        id="nav-tab-profile"
      >
        <Award size={18} />
        <span>Profile</span>
      </button>
    </div>
  );

  // =========================================================================
  // VIEW MODE A: DESKTOP & WIDE LAPTOP 2-COLUMN DASHBOARD (>= 1024px)
  // =========================================================================
  if (isDesktop) {
    return (
      <div className="driver-shell-container" id="driver-mobile-view" style={{ width: '100%', maxWidth: '100%', margin: 0 }}>
        {/* Left Side Panel: Station Directory, Search, Filters & Profile */}
        <aside className="driver-sidebar-panel" id="driver-sidebar-panel">
          {/* Top Location & Navigation Header */}
          <div
            style={{
              padding: '16px 18px 12px 18px',
              background: 'var(--bg-card-solid)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} color="var(--brand-emerald)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Bengaluru, Karnataka
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Desktop Sidebar Tab Switcher */}
                <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '2px' }}>
                  <button
                    onClick={() => setActiveBottomTab('EXPLORE')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: activeBottomTab === 'EXPLORE' ? 'var(--brand-emerald)' : 'transparent',
                      color: activeBottomTab === 'EXPLORE' ? '#020617' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Compass size={12} />
                    <span>Stations</span>
                  </button>
                  <button
                    onClick={() => setActiveBottomTab('PROFILE')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: activeBottomTab === 'PROFILE' ? 'var(--brand-emerald)' : 'transparent',
                      color: activeBottomTab === 'PROFILE' ? '#020617' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Award size={12} />
                    <span>Profile</span>
                  </button>
                </div>

                <div
                  onClick={() => setActiveBottomTab('PROFILE')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    color: 'var(--brand-cyan)',
                    cursor: 'pointer'
                  }}
                  title="Energy Points"
                >
                  <Sparkles size={12} />
                  <span>{user?.energyPoints ?? 480}</span>
                </div>
              </div>
            </div>

            {/* Emergency SOS Banner */}
            {renderEmergencyBanner()}

            {/* Search & Quick Filter Pills */}
            {activeBottomTab === 'EXPLORE' && (
              <>
                {renderSearchBar()}
                {renderFilterPills()}
              </>
            )}
          </div>

          {/* Sidebar Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
            id="driver-main-container"
          >
            {activeBottomTab === 'EXPLORE' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Verified Nearby Stations ({filteredStations.length})
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--brand-emerald)', fontWeight: 600 }}>
                    Dynamic Trust Engine
                  </span>
                </div>
                {filteredStations.map(station => renderStationCard(station, true))}
              </>
            )}

            {activeBottomTab === 'PROFILE' && renderProfileScreen()}
          </div>
        </aside>

        {/* Right Main Canvas: Interactive Leaflet Map */}
        <main className="driver-map-panel" id="driver-map-panel">
          <MapView
            stations={filteredStations}
            selectedStationId={selectedStationId || undefined}
            onSelectStation={onSelectStation}
            filterWorkingOnly={filterWorkingOnly}
            onToggleWorkingOnly={onToggleWorkingOnly}
            filterDcFast={filterDcFast}
            onToggleDcFast={onToggleDcFast}
            filterEmergencyOnly={filterEmergencyOnly}
            onToggleEmergencyOnly={onToggleEmergencyOnly}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE B: MOBILE PHONE & TABLET PORTRAIT COMPACT (< 1024px)
  // =========================================================================
  return (
    <div className="driver-shell-container" id="driver-mobile-view" style={{ width: '100%', maxWidth: '100%', margin: 0 }}>
      {/* Mobile App Header Bar */}
      <div
        style={{
          padding: '14px 16px 12px 16px',
          background: 'var(--bg-card-solid)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* Top Location & View Switcher Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} color="var(--brand-emerald)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Bengaluru, Karnataka
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Map / List View Toggle */}
            {activeBottomTab === 'EXPLORE' && (
              <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '2px' }} id="view-mode-toggle">
                <button
                  onClick={() => setViewMode('MAP')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: viewMode === 'MAP' ? 'var(--brand-emerald)' : 'transparent',
                    color: viewMode === 'MAP' ? '#020617' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  id="btn-view-map"
                >
                  <Map size={12} />
                  <span>Map</span>
                </button>
                <button
                  onClick={() => setViewMode('LIST')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: viewMode === 'LIST' ? 'var(--brand-emerald)' : 'transparent',
                    color: viewMode === 'LIST' ? '#020617' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  id="btn-view-list"
                >
                  <List size={12} />
                  <span>List</span>
                </button>
              </div>
            )}

            <div
              onClick={() => setActiveBottomTab('PROFILE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--brand-cyan)',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={12} />
              <span>{user?.energyPoints ?? 480}</span>
            </div>
          </div>
        </div>

        {/* 1-Tap Emergency Trigger Banner */}
        {renderEmergencyBanner()}

        {activeBottomTab === 'EXPLORE' && viewMode === 'LIST' && (
          <>
            {renderSearchBar()}
            {renderFilterPills()}
          </>
        )}
      </div>

      {/* Main Tab Views */}
      <div
        style={{
          flex: 1,
          overflowY: viewMode === 'MAP' && activeBottomTab === 'EXPLORE' ? 'hidden' : 'auto',
          padding: viewMode === 'MAP' && activeBottomTab === 'EXPLORE' ? '0' : '16px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        id="driver-main-container"
      >
        {/* VIEW 1: EXPLORE - MAP VIEW */}
        {activeBottomTab === 'EXPLORE' && viewMode === 'MAP' && (
          <MapView
            stations={filteredStations}
            selectedStationId={selectedStationId || undefined}
            onSelectStation={onSelectStation}
            filterWorkingOnly={filterWorkingOnly}
            onToggleWorkingOnly={onToggleWorkingOnly}
            filterDcFast={filterDcFast}
            onToggleDcFast={onToggleDcFast}
            filterEmergencyOnly={filterEmergencyOnly}
            onToggleEmergencyOnly={onToggleEmergencyOnly}
          />
        )}

        {/* VIEW 2: EXPLORE - LIST VIEW */}
        {activeBottomTab === 'EXPLORE' && viewMode === 'LIST' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Verified Nearby Stations ({filteredStations.length})
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--brand-emerald)', fontWeight: 600 }}>
                Dynamic Trust Engine
              </span>
            </div>
            {filteredStations.map(station => renderStationCard(station, false))}
          </div>
        )}

        {/* VIEW 3: PROFILE & EV BATTERY MANAGEMENT */}
        {activeBottomTab === 'PROFILE' && renderProfileScreen()}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {renderBottomNav()}
    </div>
  );
};
