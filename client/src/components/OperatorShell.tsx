import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Wrench,
  ShieldCheck,
  Zap,
  Radio,
  RotateCw,
  Plus,
  Clock,
  UserCheck,
  Camera,
  Check,
  X,
  Lock,
  Unlock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import type { ChargingStation, MaintenanceTicket, PredictiveAnalyticsSummary } from '../../../shared/types';
import { buildApiUrl } from '../config/api';

interface OperatorShellProps {
  stations: ChargingStation[];
  onToggleStationStatus: (stationId: string) => void;
  onRefreshStations?: () => void;
}

const TECHNICIAN_PRESETS = [
  'Ramesh Kumar (Senior High-Voltage DC Specialist)',
  'Sunil Verma (Grid Feeder & Transformer Tech)',
  'Praveen M. (Hardware & Connector Engineer)',
  'Ananya Iyer (Station Firmware & OCPI Tech)'
];

const PROOF_PHOTO_PRESETS = [
  {
    label: 'Multimeter 415V 3-Phase Test Passed',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'New CCS2 Gun & Lock Latch Installed',
    url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Feeder Breaker Reset & Green LED',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80'
  }
];

export const OperatorShell: React.FC<OperatorShellProps> = ({
  stations: initialStations,
  onToggleStationStatus: _onToggleStationStatus
}) => {
  const [stations, setStations] = useState<ChargingStation[]>(initialStations);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stationFilter, setStationFilter] = useState<'ALL' | 'FAULTY' | 'EMERGENCY'>('ALL');
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal States
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [selectedStationForTicket, setSelectedStationForTicket] = useState<string>(stations[0]?.id || '');
  const [newFaultCategory, setNewFaultCategory] = useState<MaintenanceTicket['faultCategory']>('GRID_TRIPPED');
  const [newPriority, setNewPriority] = useState<MaintenanceTicket['priority']>('HIGH');
  const [newDescription, setNewDescription] = useState('');
  const [newTech, setNewTech] = useState(TECHNICIAN_PRESETS[0]);

  // Dispatch Modal State
  const [dispatchTicket, setDispatchTicket] = useState<MaintenanceTicket | null>(null);
  const [selectedTechToDispatch, setSelectedTechToDispatch] = useState(TECHNICIAN_PRESETS[0]);
  const [dispatchSlaHours, setDispatchSlaHours] = useState(4);

  // Resolve Modal State
  const [resolveTicket, setResolveTicket] = useState<MaintenanceTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedProofPhoto, setSelectedProofPhoto] = useState(PROOF_PHOTO_PRESETS[0].url);

  const [activeView, setActiveView] = useState<'OPERATIONS' | 'PREDICTIVE'>('OPERATIONS');
  const [predictiveSummary, setPredictiveSummary] = useState<PredictiveAnalyticsSummary | null>(null);
  const [isDispatchingPreventive, setIsDispatchingPreventive] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sync internal stations when parent props update
  useEffect(() => {
    setStations(initialStations);
  }, [initialStations]);

  // Fetch Tickets from Backend
  const fetchTickets = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/tickets'));
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.warn('Could not fetch tickets from server:', err);
    }
  };

  // Fetch Predictive Failure Diagnostics from Backend
  const fetchPredictiveData = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/analytics/predictive'));
      if (res.ok) {
        const data = await res.json();
        setPredictiveSummary(data.summary || null);
      }
    } catch (err) {
      console.warn('Could not fetch predictive data:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchPredictiveData();
  }, []);

  // Dispatch Preventive Service Technician
  const handlePreventiveDispatch = async (stationId: string, stationName: string) => {
    setIsDispatchingPreventive(stationId);
    try {
      const res = await fetch(buildApiUrl(`/api/analytics/predictive/${stationId}/preventive-dispatch`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianName: 'Sunil N. (Senior Predictive Fleet Engineer)',
          notes: 'Proactive voltage stabilizer calibration & radiator filter clean'
        })
      });

      if (res.ok) {
        showToast(`⚡ Preventive tech Sunil N. dispatched to ${stationName}! Pre-fault risk index mitigated.`);
        await Promise.all([fetchTickets(), fetchPredictiveData()]);
      } else {
        showToast('Failed to schedule preventive service dispatch.');
      }
    } catch (err) {
      console.warn('Preventive dispatch error:', err);
      showToast('Network error while dispatching preventive service.');
    } finally {
      setIsDispatchingPreventive(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTickets(), fetchPredictiveData()]);
    try {
      const res = await fetch(buildApiUrl('/api/stations?lat=12.9716&lng=77.5946'));
      if (res.ok) {
        const data = await res.json();
        setStations(data.stations || []);
      }
    } catch (err) {
      console.warn('Failed to refresh stations:', err);
    }
    setIsRefreshing(false);
    showToast('Fleet telemetry and ticket status refreshed.');
  };

  // Toggle Station Operational Status
  const handleToggleStatus = async (stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;

    const isCurrentlyFaulty = station.overallStatus === 'FAULTY';
    const newStatus = isCurrentlyFaulty ? 'AVAILABLE' : 'FAULTY';
    const newPower = isCurrentlyFaulty ? 'CONFIRMED_LIVE' : 'REPORTED_CUT';

    // Optimistic UI update
    setStations(prev =>
      prev.map(s => {
        if (s.id === stationId) {
          return {
            ...s,
            overallStatus: newStatus,
            powerGridStatus: newPower,
            trustScore: {
              ...s.trustScore,
              score: isCurrentlyFaulty ? 88 : 22,
              freshness: 'LIVE',
              lastVerifiedAt: new Date().toISOString()
            }
          };
        }
        return s;
      })
    );

    try {
      const res = await fetch(buildApiUrl(`/api/stations/${stationId}/status`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallStatus: newStatus,
          powerGridStatus: newPower
        })
      });
      if (res.ok) {
        showToast(`Station ${station.name} marked ${newStatus}`);
      }
    } catch (err) {
      console.warn('Backend status update failed:', err);
    }
  };

  // Toggle Grid Feeder Status (Confirmed 3-Phase vs Cut)
  const handleToggleGridFeeder = async (stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;

    const isLive = station.powerGridStatus === 'CONFIRMED_LIVE';
    const newPower = isLive ? 'REPORTED_CUT' : 'CONFIRMED_LIVE';

    setStations(prev =>
      prev.map(s => s.id === stationId ? { ...s, powerGridStatus: newPower } : s)
    );

    try {
      await fetch(buildApiUrl(`/api/stations/${stationId}/status`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerGridStatus: newPower })
      });
      showToast(`Grid feeder set to ${newPower} for ${station.name}`);
    } catch (err) {
      console.warn('Backend grid update failed:', err);
    }
  };

  // Toggle Emergency Access SOS Permission
  const handleToggleEmergencyAccess = async (stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;

    const nextState = !station.emergencyAccessEnabled;

    setStations(prev =>
      prev.map(s => s.id === stationId ? { ...s, emergencyAccessEnabled: nextState } : s)
    );

    try {
      await fetch(buildApiUrl(`/api/stations/${stationId}/status`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyAccessEnabled: nextState })
      });
      showToast(nextState ? `Emergency Access SOS ENABLED for ${station.name}` : `Emergency Access revoked for ${station.name}`);
    } catch (err) {
      console.warn('Backend emergency toggle failed:', err);
    }
  };

  // Submit New Ticket
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStation = stations.find(s => s.id === selectedStationForTicket);
    if (!targetStation) return;

    const payload = {
      stationId: targetStation.id,
      stationName: targetStation.name,
      operatorId: targetStation.operatorId || 'op-custom-01',
      reportedBy: 'CPO Operations Desk (Manual Incident)',
      faultCategory: newFaultCategory,
      priority: newPriority,
      description: newDescription.trim() || 'Immediate technician inspection required.',
      assignedTechnician: newTech,
      slaTargetHours: newPriority === 'CRITICAL' ? 2 : newPriority === 'HIGH' ? 4 : 12
    };

    try {
      const res = await fetch(buildApiUrl('/api/tickets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(prev => [data.ticket, ...prev]);
        showToast(`Incident ticket logged with ${data.ticket.slaTargetHours}h SLA.`);
        setIsCreateTicketOpen(false);
        setNewDescription('');
        return;
      }
    } catch (err) {
      console.warn('Backend ticket creation failed:', err);
    }

    // Client fallback
    const mockTicket: MaintenanceTicket = {
      id: `tkt-${Date.now()}`,
      ...payload,
      status: 'INVESTIGATING',
      createdAt: new Date().toISOString(),
      slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    };
    setTickets(prev => [mockTicket, ...prev]);
    showToast('Incident ticket logged locally.');
    setIsCreateTicketOpen(false);
  };

  // Submit Technician Dispatch
  const handleDispatchSubmit = async () => {
    if (!dispatchTicket) return;

    try {
      const res = await fetch(buildApiUrl(`/api/tickets/${dispatchTicket.id}/dispatch`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianName: selectedTechToDispatch,
          slaHours: dispatchSlaHours
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(prev => prev.map(t => t.id === dispatchTicket.id ? data.ticket : t));
        showToast(`Technician ${selectedTechToDispatch} dispatched!`);
        setDispatchTicket(null);
        return;
      }
    } catch (err) {
      console.warn('Backend dispatch failed:', err);
    }

    // Client fallback
    setTickets(prev =>
      prev.map(t =>
        t.id === dispatchTicket.id
          ? {
              ...t,
              assignedTechnician: selectedTechToDispatch,
              status: 'INVESTIGATING',
              slaTargetHours: dispatchSlaHours,
              slaDeadline: new Date(Date.now() + dispatchSlaHours * 60 * 60 * 1000).toISOString()
            }
          : t
      )
    );
    showToast(`Technician ${selectedTechToDispatch} dispatched.`);
    setDispatchTicket(null);
  };

  // Submit Resolution with Technician Proof Photo & Restore Station Trust
  const handleResolveSubmit = async () => {
    if (!resolveTicket) return;

    try {
      const res = await fetch(buildApiUrl(`/api/tickets/${resolveTicket.id}/resolve`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionNotes: resolutionNotes.trim() || 'Technician completed repairs. 415V 3-phase grid verified and CCS2 connector calibrated.',
          repairProofUrl: selectedProofPhoto
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(prev => prev.map(t => t.id === resolveTicket.id ? data.ticket : t));
        if (data.station) {
          setStations(prev => prev.map(s => s.id === data.station.id ? data.station : s));
        }
        showToast('🎉 Ticket resolved with repair proof! Station trust score restored!');
        setResolveTicket(null);
        setResolutionNotes('');
        return;
      }
    } catch (err) {
      console.warn('Backend resolve failed:', err);
    }

    // Client fallback
    setTickets(prev =>
      prev.map(t =>
        t.id === resolveTicket.id
          ? {
              ...t,
              status: 'RESOLVED',
              resolvedAt: new Date().toISOString(),
              resolutionNotes: resolutionNotes.trim() || 'Verified working on site.',
              repairProofUrl: selectedProofPhoto
            }
          : t
      )
    );
    setStations(prev =>
      prev.map(s => {
        if (s.id === resolveTicket.stationId) {
          return {
            ...s,
            overallStatus: 'AVAILABLE',
            powerGridStatus: 'CONFIRMED_LIVE',
            trustScore: {
              ...s.trustScore,
              score: Math.min(100, s.trustScore.score + 40),
              freshness: 'LIVE',
              lastVerifiedAt: new Date().toISOString()
            }
          };
        }
        return s;
      })
    );
    showToast('🎉 Ticket resolved! Station trust score restored to Available.');
    setResolveTicket(null);
    setResolutionNotes('');
  };

  const totalStations = stations.length;
  const operationalCount = stations.filter(s => s.overallStatus === 'AVAILABLE' || s.overallStatus === 'PARTIALLY_AVAILABLE').length;
  const powerCutsCount = stations.filter(s => s.powerGridStatus === 'REPORTED_CUT').length;
  const emergencyPointsCount = stations.filter(s => s.emergencyAccessEnabled).length;
  const avgTrust = Math.round(stations.reduce((acc, s) => acc + s.trustScore.score, 0) / (totalStations || 1));

  const filteredStations = stations.filter(s => {
    if (stationFilter === 'FAULTY') return s.overallStatus === 'FAULTY' || s.powerGridStatus === 'REPORTED_CUT';
    if (stationFilter === 'EMERGENCY') return s.emergencyAccessEnabled;
    return true;
  });

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === 'ACTIVE') return t.status !== 'RESOLVED';
    if (ticketFilter === 'RESOLVED') return t.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="mobile-view-full" id="operator-dashboard-view">
      {/* Top Banner & KPI Row */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFF' }}>
                CPO Fleet Operations & Incident Management
              </h1>
              <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>
                Live Grid Telemetry
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
              Monitor uptime %, dispatch high-voltage technicians with SLA timers, and restore station trust with repair proofs.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              id="btn-refresh-telemetry"
            >
              <RotateCw size={14} className={isRefreshing ? 'spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh Telemetry'}</span>
            </button>

            <button
              className="btn-primary"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setIsCreateTicketOpen(true)}
              id="btn-open-create-ticket"
            >
              <Plus size={14} />
              <span>+ Create Incident Ticket</span>
            </button>
          </div>
        </div>

        {/* 4 Fleet Metric Cards */}
        <div
          className="kpi-grid-responsive"
          id="operator-kpi-row"
        >
          {/* Card 1: Monitored Stations */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Monitored Stations</span>
              <Activity size={17} color="var(--brand-cyan)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '6px', color: '#FFF' }}>
              {totalStations}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--brand-emerald)', marginTop: '4px' }}>
              ● 100% hooked into Dynamic Trust Engine
            </div>
          </div>

          {/* Card 2: Operational Uptime */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Network Uptime</span>
              <CheckCircle size={17} color="var(--brand-emerald)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '6px', color: 'var(--brand-emerald)' }}>
              {operationalCount} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalStations}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {Math.round((operationalCount / totalStations) * 100)}% fleet online
            </div>
          </div>

          {/* Card 3: Grid Power Cuts Reported */}
          <div className="glass-panel" style={{ padding: '16px', borderColor: powerCutsCount > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Feeder Outages</span>
              <AlertTriangle size={17} color={powerCutsCount > 0 ? 'var(--status-faulty)' : 'var(--text-muted)'} />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '6px', color: powerCutsCount > 0 ? 'var(--status-faulty)' : '#FFF' }}>
              {powerCutsCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: powerCutsCount > 0 ? '#FCA5A5' : 'var(--brand-emerald)', marginTop: '4px' }}>
              {powerCutsCount > 0 ? 'Urgent transformer cuts flagged' : 'All feeder lines live'}
            </div>
          </div>

          {/* Card 4: Emergency SOS Hubs */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Emergency SOS Bays</span>
              <Zap size={17} color="var(--emergency-red)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '6px', color: '#F87171' }}>
              {emergencyPointsCount} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 500 }}>stations</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', marginTop: '4px' }}>
              Fleet trust benchmark: {avgTrust}/100
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
          marginBottom: '20px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
        id="operator-view-tabs"
      >
        <button
          onClick={() => setActiveView('OPERATIONS')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeView === 'OPERATIONS' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: `1.5px solid ${activeView === 'OPERATIONS' ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
            color: activeView === 'OPERATIONS' ? 'var(--brand-cyan)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
          id="tab-operator-operations"
        >
          <Activity size={14} />
          <span>Fleet Incident & Station Controls</span>
        </button>

        <button
          onClick={() => setActiveView('PREDICTIVE')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeView === 'PREDICTIVE' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: `1.5px solid ${activeView === 'PREDICTIVE' ? '#F59E0B' : 'var(--border-subtle)'}`,
            color: activeView === 'PREDICTIVE' ? '#FDE68A' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
          id="tab-operator-predictive"
        >
          <TrendingUp size={14} />
          <span>🔮 Predictive Diagnostics & Pre-Fault Maintenance</span>
          {predictiveSummary && (
            <span
              style={{
                background: (predictiveSummary.stationsAtHighRiskCount || 0) > 0 ? '#EF4444' : 'rgba(255, 255, 255, 0.15)',
                color: '#FFF',
                padding: '1px 6px',
                borderRadius: '8px',
                fontSize: '0.65rem',
                fontWeight: 800
              }}
            >
              {predictiveSummary.stationsAtHighRiskCount} At Risk
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: FLEET INCIDENT & ASSET CONTROLS */}
      {activeView === 'OPERATIONS' && (
        <div className="operator-main-grid">
          {/* Left Column: Station Controls & Emergency Permissions */}
          <div className="glass-panel" style={{ padding: '20px' }} id="operator-station-controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF' }}>
                Charging Station Controls
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Toggle hardware operational state, grid feeder lines, and emergency SOS clearance.
              </p>
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '8px' }}>
              <button
                onClick={() => setStationFilter('ALL')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: stationFilter === 'ALL' ? 'var(--brand-emerald)' : 'transparent',
                  color: stationFilter === 'ALL' ? '#020617' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                All ({stations.length})
              </button>
              <button
                onClick={() => setStationFilter('FAULTY')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: stationFilter === 'FAULTY' ? '#EF4444' : 'transparent',
                  color: stationFilter === 'FAULTY' ? '#FFF' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Degraded
              </button>
              <button
                onClick={() => setStationFilter('EMERGENCY')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: stationFilter === 'EMERGENCY' ? '#8B5CF6' : 'transparent',
                  color: stationFilter === 'EMERGENCY' ? '#FFF' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                SOS Enabled
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '680px', overflowY: 'auto' }}>
            {filteredStations.map(station => {
              const isFaulty = station.overallStatus === 'FAULTY';
              const isPowerCut = station.powerGridStatus === 'REPORTED_CUT';

              return (
                <div
                  key={station.id}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: isFaulty || isPowerCut ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isFaulty || isPowerCut ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                  id={`operator-station-row-${station.id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#FFF' }}>{station.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', background: 'rgba(6, 182, 212, 0.12)', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>
                          {station.operatorName}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {station.landmark} • {station.connectors.length} Guns ({station.connectors.map(c => `${c.maxPowerKw}kW ${c.type}`).join(', ')})
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={`trust-score-pill ${station.trustScore.score >= 80 ? 'high' : 'low'}`}>
                        <ShieldCheck size={13} />
                        <span className="score-num">{station.trustScore.score}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.7rem' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        background: station.overallStatus === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: station.overallStatus === 'AVAILABLE' ? 'var(--brand-emerald)' : '#FCA5A5'
                      }}
                    >
                      Status: {station.overallStatus}
                    </span>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        background: station.powerGridStatus === 'CONFIRMED_LIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: station.powerGridStatus === 'CONFIRMED_LIVE' ? 'var(--brand-emerald)' : '#FCA5A5'
                      }}
                    >
                      Grid: {station.powerGridStatus}
                    </span>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        background: station.emergencyAccessEnabled ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: station.emergencyAccessEnabled ? '#C4B5FD' : 'var(--text-muted)'
                      }}
                    >
                      {station.emergencyAccessEnabled ? '⚡ SOS Enabled' : 'Standard Access'}
                    </span>
                  </div>

                  {/* Operator Quick Control Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                    {/* Toggle Hardware Status */}
                    <button
                      className="btn-secondary"
                      style={{
                        fontSize: '0.72rem',
                        padding: '5px 10px',
                        background: isFaulty ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        borderColor: isFaulty ? 'var(--brand-emerald)' : '#EF4444',
                        color: isFaulty ? 'var(--brand-emerald)' : '#FCA5A5'
                      }}
                      onClick={() => handleToggleStatus(station.id)}
                      id={`btn-toggle-status-${station.id}`}
                    >
                      <Wrench size={12} />
                      <span>{isFaulty ? 'Mark Repaired (Available)' : 'Tag Faulty / Down'}</span>
                    </button>

                    {/* Toggle Feeder Line */}
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '5px 10px' }}
                      onClick={() => handleToggleGridFeeder(station.id)}
                      id={`btn-toggle-grid-${station.id}`}
                    >
                      <Zap size={12} color={isPowerCut ? 'var(--brand-emerald)' : '#F59E0B'} />
                      <span>{isPowerCut ? 'Confirm Grid Restored' : 'Simulate Power Cut'}</span>
                    </button>

                    {/* Toggle Emergency SOS Permission */}
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '5px 10px' }}
                      onClick={() => handleToggleEmergencyAccess(station.id)}
                      id={`btn-toggle-emergency-${station.id}`}
                    >
                      {station.emergencyAccessEnabled ? <Unlock size={12} color="#A78BFA" /> : <Lock size={12} color="var(--text-muted)" />}
                      <span>{station.emergencyAccessEnabled ? 'Disable SOS Gate' : 'Enable SOS Gate'}</span>
                    </button>

                    {/* Report Incident Ticket */}
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '5px 10px', marginLeft: 'auto' }}
                      onClick={() => {
                        setSelectedStationForTicket(station.id);
                        setIsCreateTicketOpen(true);
                      }}
                      id={`btn-new-ticket-station-${station.id}`}
                    >
                      <Plus size={12} />
                      <span>Ticket</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Incident Management Tickets with SLA Timers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Tickets Desk */}
          <div className="glass-panel" style={{ padding: '20px' }} id="operator-ticket-desk">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF' }}>
                  Incident Tickets & SLA Desk
                </h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Active hardware failures, grid load-shedding alerts, and repair verification proofs.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '8px' }}>
                <button
                  onClick={() => setTicketFilter('ACTIVE')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: ticketFilter === 'ACTIVE' ? 'var(--brand-cyan)' : 'transparent',
                    color: ticketFilter === 'ACTIVE' ? '#020617' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  id="tab-tickets-active"
                >
                  Active ({tickets.filter(t => t.status !== 'RESOLVED').length})
                </button>
                <button
                  onClick={() => setTicketFilter('RESOLVED')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: ticketFilter === 'RESOLVED' ? 'var(--brand-emerald)' : 'transparent',
                    color: ticketFilter === 'RESOLVED' ? '#020617' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  id="tab-tickets-resolved"
                >
                  Resolved ({tickets.filter(t => t.status === 'RESOLVED').length})
                </button>
              </div>
            </div>

            {/* Ticket Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No tickets found matching this filter.
                </div>
              ) : (
                filteredTickets.map(ticket => {
                  const isCritical = ticket.priority === 'CRITICAL';
                  const isResolved = ticket.status === 'RESOLVED';

                  return (
                    <div
                      key={ticket.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: isResolved ? 'rgba(16, 185, 129, 0.05)' : isCritical ? 'rgba(239, 68, 68, 0.07)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isResolved ? 'rgba(16, 185, 129, 0.3)' : isCritical ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                      id={`ticket-card-${ticket.id}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.62rem',
                              padding: '2px 6px',
                              background: isCritical ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                              color: isCritical ? '#F87171' : '#FDE68A'
                            }}
                          >
                            {ticket.priority} PRIORITY
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FFF' }}>
                            {ticket.faultCategory}
                          </span>
                        </div>

                        <span
                          className="badge"
                          style={{
                            fontSize: '0.62rem',
                            padding: '2px 6px',
                            background: isResolved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(6, 182, 212, 0.25)',
                            color: isResolved ? 'var(--brand-emerald)' : 'var(--brand-cyan)'
                          }}
                        >
                          {ticket.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>
                        {ticket.stationName}
                      </div>

                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        "{ticket.description}"
                      </p>

                      {/* SLA & Technician Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} color="var(--brand-cyan)" />
                          <span>Target SLA: <strong style={{ color: '#FFF' }}>{ticket.slaTargetHours || 4}h</strong></span>
                        </span>

                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <UserCheck size={11} color="var(--brand-emerald)" />
                          <span>{ticket.assignedTechnician || 'Unassigned'}</span>
                        </span>
                      </div>

                      {/* Resolution Notes & Proof Preview if resolved */}
                      {isResolved && ticket.resolutionNotes && (
                        <div style={{ marginTop: '4px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', fontSize: '0.68rem', color: '#A7F3D0' }}>
                          ✓ Resolved: {ticket.resolutionNotes}
                        </div>
                      )}

                      {/* Ticket Action Buttons */}
                      {!isResolved && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          <button
                            className="btn-secondary"
                            style={{ flex: 1, fontSize: '0.72rem', padding: '5px' }}
                            onClick={() => {
                              setDispatchTicket(ticket);
                              setSelectedTechToDispatch(ticket.assignedTechnician || TECHNICIAN_PRESETS[0]);
                            }}
                            id={`btn-dispatch-tech-${ticket.id}`}
                          >
                            <UserCheck size={12} />
                            <span>{ticket.assignedTechnician ? 'Reassign Tech' : 'Dispatch Tech'}</span>
                          </button>

                          <button
                            className="btn-primary"
                            style={{ flex: 1, fontSize: '0.72rem', padding: '5px' }}
                            onClick={() => {
                              setResolveTicket(ticket);
                              setResolutionNotes(`Repairs completed on ${ticket.stationName}. Verified live grid & hardware calibration.`);
                            }}
                            id={`btn-resolve-proof-${ticket.id}`}
                          >
                            <Camera size={12} />
                            <span>Upload Proof & Restore</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live Community Driver Audits Feed */}
          <div className="glass-panel" style={{ padding: '18px' }} id="operator-driver-audits-stream">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Radio size={16} color="var(--brand-emerald)" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFF' }}>
                Incoming Driver Field Audits
              </h3>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Real-time reports submitted by EV drivers with GPS proximity validation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.74rem' }}>
              <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--brand-emerald)', fontWeight: 700 }}>
                  <span>Indiranagar Metro Hub</span>
                  <span>14m verified</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  "Full 58 kW DC session on Gun 1. Grid 3-phase live."
                </div>
              </div>

              <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F87171', fontWeight: 700 }}>
                  <span>Majestic Bus Stand Hub</span>
                  <span>32m verified</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  "Local distribution transformer down. Screen dark."
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* VIEW 2: PREDICTIVE DIAGNOSTICS & PRE-FAULT MAINTENANCE */}
      {activeView === 'PREDICTIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} id="operator-predictive-console">
          {/* Top Predictive Intelligence Banner */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={22} color="#F59E0B" />
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFF' }}>
                    Predictive Fleet Reliability & Failure Pattern Engine
                  </h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', maxWidth: '720px', lineHeight: 1.4 }}>
                  Machine learning telemetry analysis continuously monitors Indian 3-phase grid power sags, cable thermal derating thresholds, and OCPP packet delays to prevent station outages before they occur.
                </p>
              </div>

              {/* Network Health Index Badge */}
              <div style={{ textAlign: 'right', background: 'rgba(255, 255, 255, 0.04)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Network Reliability Health Index
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--brand-emerald)', fontFamily: 'Outfit, sans-serif' }}>
                  {predictiveSummary?.networkHealthIndex || 88.5}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--brand-cyan)' }}>
                  ✓ Heuristic Pre-Fault Monitoring Active
                </div>
              </div>
            </div>

            {/* 3 Domain Reality Alert Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '16px' }}>
              {(predictiveSummary?.patternInsights || [
                'Evening Grid Voltage Sags: 62% of station faults occur between 18:00 and 21:30 during regional peak aircon/domestic load.',
                'Thermal Derating Peak: Fast chargers with unserviced radiator filters exhibit a 45% power drop above 33°C ambient temperature.',
                'Subterranean Basement Shielding: Sub-level stations suffer intermittent OCPP 1.6J timeouts due to high cellular attenuation.'
              ]).map((insight, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* List of Stations with Predictive Risk & Pre-Fault Dispatch */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF' }}>
                  Station Predictive Failure Signatures & Preventive Action Desk
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Stations ranked by imminent failure probability. Dispatch certified technicians before driver charging sessions trip.
                </p>
              </div>

              <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#FDE68A', padding: '6px 12px' }}>
                Primary Failure Mode: {predictiveSummary?.topFailureMode || 'GRID_VOLTAGE_SAG_PHASE_DROP'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(predictiveSummary?.stationPredictions || []).map((pred) => {
                const isCritical = pred.riskTier === 'CRITICAL' || pred.riskTier === 'HIGH';
                const isModerate = pred.riskTier === 'MODERATE';
                const isScheduled = pred.preventiveMaintStatus === 'SCHEDULED';
                const isDispatching = isDispatchingPreventive === pred.stationId;

                return (
                  <div
                    key={pred.stationId}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: isCritical
                        ? 'rgba(239, 68, 68, 0.06)'
                        : isModerate
                        ? 'rgba(245, 158, 11, 0.04)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: `1.5px solid ${
                        isCritical
                          ? 'rgba(239, 68, 68, 0.35)'
                          : isModerate
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'var(--border-subtle)'
                      }`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                    id={`pred-card-${pred.stationId}`}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF' }}>
                            {pred.stationName}
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: isCritical ? 'rgba(239, 68, 68, 0.2)' : isModerate ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: isCritical ? '#FCA5A5' : isModerate ? '#FDE68A' : 'var(--brand-emerald)',
                              fontSize: '0.68rem',
                              fontWeight: 800
                            }}
                          >
                            {pred.riskTier} RISK ({pred.failureRiskPct}%)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#FDE68A', marginTop: '2px', fontWeight: 700 }}>
                          ⚡ Signature: {pred.signatureTitle}
                        </div>
                      </div>

                      {/* Failure Meter Progress Bar */}
                      <div style={{ width: '160px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                          <span>Failure Risk ($R_f$)</span>
                          <span style={{ fontWeight: 800, color: isCritical ? '#EF4444' : isModerate ? '#F59E0B' : 'var(--brand-emerald)' }}>
                            {pred.failureRiskPct}%
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pred.failureRiskPct}%`,
                              background: isCritical ? '#EF4444' : isModerate ? '#F59E0B' : 'var(--brand-emerald)',
                              borderRadius: '3px',
                              transition: 'width 300ms ease'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Signature Description */}
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {pred.signatureDescription}
                    </p>

                    {/* Root Cause Telemetry Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700 }}>VOLTAGE STABILITY</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: pred.rootCauseTelemetry.voltageStabilityScore > 85 ? 'var(--brand-emerald)' : '#F59E0B' }}>
                          {pred.rootCauseTelemetry.voltageStabilityScore}%
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700 }}>THERMAL DERATE</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: pred.rootCauseTelemetry.thermalDerateRiskPct > 60 ? '#EF4444' : 'var(--brand-emerald)' }}>
                          {pred.rootCauseTelemetry.thermalDerateRiskPct}%
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700 }}>OCPP LATENCY</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: pred.rootCauseTelemetry.ocppHeartbeatLatencyMs > 800 ? '#EF4444' : 'var(--brand-cyan)' }}>
                          {pred.rootCauseTelemetry.ocppHeartbeatLatencyMs} ms
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700 }}>RECURRENCE</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF' }}>
                          ~{pred.rootCauseTelemetry.recurrentFailureIntervalHours}h
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: '#FFF' }}>Recommended:</strong> {pred.recommendedIntervention}
                        <span style={{ marginLeft: '6px', color: '#FDE68A' }}>({pred.suggestedActionDeadline})</span>
                      </div>

                      <div>
                        {isScheduled ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid var(--brand-emerald)',
                              color: 'var(--brand-emerald)',
                              fontSize: '0.75rem',
                              fontWeight: 800
                            }}
                            id={`status-preventive-scheduled-${pred.stationId}`}
                          >
                            <CheckCircle size={14} />
                            <span>Technician En Route (SLA: 2h)</span>
                          </div>
                        ) : (
                          <button
                            className="btn-primary"
                            style={{
                              fontSize: '0.75rem',
                              padding: '6px 14px',
                              background: isCritical ? '#EF4444' : 'var(--brand-primary)',
                              borderColor: isCritical ? '#DC2626' : 'var(--brand-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onClick={() => handlePreventiveDispatch(pred.stationId, pred.stationName)}
                            disabled={isDispatching}
                            id={`btn-preventive-dispatch-${pred.stationId}`}
                          >
                            <Wrench size={14} className={isDispatching ? 'spin' : ''} />
                            <span>{isDispatching ? 'Dispatching SLA...' : '⚡ Dispatch Preventive Service Tech'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {isCreateTicketOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '16px'
          }}
          onClick={() => setIsCreateTicketOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              background: '#0B0F19',
              border: '1.5px solid var(--border-glass)',
              borderRadius: '20px',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
            id="modal-create-ticket"
          >
            <button
              onClick={() => setIsCreateTicketOpen(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>
              Create Incident Ticket
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Log a charging hardware or utility grid fault to initiate technician SLA tracking.
            </p>

            <form onSubmit={handleCreateTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Target Station:
                </label>
                <select
                  value={selectedStationForTicket}
                  onChange={e => setSelectedStationForTicket(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', border: '1px solid var(--border-subtle)' }}
                  id="select-ticket-station"
                >
                  {stations.map(s => (
                    <option key={s.id} value={s.id} style={{ background: '#0F172A', color: '#FFF' }}>
                      {s.name} ({s.operatorName})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Fault Category:
                  </label>
                  <select
                    value={newFaultCategory}
                    onChange={e => setNewFaultCategory(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', border: '1px solid var(--border-subtle)' }}
                    id="select-ticket-category"
                  >
                    <option value="GRID_TRIPPED" style={{ background: '#0F172A' }}>GRID_TRIPPED (Utility Cut)</option>
                    <option value="GUN_DAMAGED" style={{ background: '#0F172A' }}>GUN_DAMAGED (Hardware)</option>
                    <option value="SCREEN_DEAD" style={{ background: '#0F172A' }}>SCREEN_DEAD (Display)</option>
                    <option value="SOFTWARE_LOCK" style={{ background: '#0F172A' }}>SOFTWARE_LOCK (Firmware)</option>
                    <option value="BAY_OBSTRUCTED" style={{ background: '#0F172A' }}>BAY_OBSTRUCTED (ICEing)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Priority & Target SLA:
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', border: '1px solid var(--border-subtle)' }}
                    id="select-ticket-priority"
                  >
                    <option value="CRITICAL" style={{ background: '#0F172A' }}>CRITICAL (2h SLA)</option>
                    <option value="HIGH" style={{ background: '#0F172A' }}>HIGH (4h SLA)</option>
                    <option value="MEDIUM" style={{ background: '#0F172A' }}>MEDIUM (12h SLA)</option>
                    <option value="LOW" style={{ background: '#0F172A' }}>LOW (24h SLA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Assign Initial Technician:
                </label>
                <select
                  value={newTech}
                  onChange={e => setNewTech(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', border: '1px solid var(--border-subtle)' }}
                  id="select-ticket-tech"
                >
                  {TECHNICIAN_PRESETS.map((t, idx) => (
                    <option key={idx} value={t} style={{ background: '#0F172A', color: '#FFF' }}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Incident Description & Diagnostics:
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="e.g. Gun 1 latch pin bent, contactor refuses to lock, feeder supply confirmed at transformer."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', border: '1px solid var(--border-subtle)', outline: 'none', fontSize: '0.8rem' }}
                  id="input-ticket-description"
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '10px', fontSize: '0.85rem', marginTop: '6px' }}
                id="btn-submit-create-ticket"
              >
                Log Ticket & Start SLA Timer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Dispatch Technician Modal */}
      {dispatchTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '16px'
          }}
          onClick={() => setDispatchTicket(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: '480px', width: '100%', padding: '24px', background: '#0B0F19', border: '1.5px solid var(--brand-cyan)', borderRadius: '20px', position: 'relative' }}
            onClick={e => e.stopPropagation()}
            id="modal-dispatch-technician"
          >
            <button
              onClick={() => setDispatchTicket(null)}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFF' }}>
              Dispatch Field Technician
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '14px' }}>
              Station: <strong>{dispatchTicket.stationName}</strong> (Ticket #{dispatchTicket.id})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Select Field Engineer:
                </label>
                <select
                  value={selectedTechToDispatch}
                  onChange={e => setSelectedTechToDispatch(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', border: '1px solid var(--border-subtle)' }}
                  id="select-dispatch-engineer"
                >
                  {TECHNICIAN_PRESETS.map((t, idx) => (
                    <option key={idx} value={t} style={{ background: '#0F172A', color: '#FFF' }}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Target SLA Window (Hours):
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={dispatchSlaHours}
                  onChange={e => setDispatchSlaHours(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', border: '1px solid var(--border-subtle)' }}
                  id="input-dispatch-sla-hours"
                />
              </div>

              <button
                className="btn-primary"
                style={{ padding: '10px', fontSize: '0.85rem', marginTop: '6px' }}
                onClick={handleDispatchSubmit}
                id="btn-confirm-dispatch-tech"
              >
                Confirm Dispatch & Notify Technician
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Technician Repair Proof Verification & Trust Restoration */}
      {resolveTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '16px'
          }}
          onClick={() => setResolveTicket(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: '540px', width: '100%', padding: '24px', background: '#0B0F19', border: '1.5px solid var(--brand-emerald)', borderRadius: '20px', position: 'relative' }}
            onClick={e => e.stopPropagation()}
            id="modal-resolve-proof"
          >
            <button
              onClick={() => setResolveTicket(null)}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--brand-emerald)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>
                Verify Repair Proof & Restore Trust
              </h3>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '14px' }}>
              Station: <strong>{resolveTicket.stationName}</strong> • Fault: {resolveTicket.faultCategory}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Photo Evidence Picker */}
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Attach Verified Technician Field Evidence (Photo Proof):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {PROOF_PHOTO_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedProofPhoto(preset.url)}
                      style={{
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: `2px solid ${selectedProofPhoto === preset.url ? 'var(--brand-emerald)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        position: 'relative',
                        height: '70px',
                        background: '#020617'
                      }}
                    >
                      <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '2px 4px', fontSize: '0.6rem', color: '#FFF', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {preset.label}
                      </div>
                      {selectedProofPhoto === preset.url && (
                        <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--brand-emerald)', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#020617' }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution Notes */}
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Technician Resolution Log:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Installed new CCS2 latch, calibrated 3-phase grid power to 415V, initiated test charging on Tata Nexon EV max."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', border: '1px solid var(--border-subtle)', outline: 'none', fontSize: '0.8rem' }}
                  id="input-resolution-notes"
                />
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#A7F3D0' }}>
                <AlertCircle size={15} color="var(--brand-emerald)" />
                <span>Submitting verified repair proof will automatically set the station status to <strong>Available</strong>, confirm live grid, and restore its Trust Score immediately.</span>
              </div>

              <button
                className="btn-primary"
                style={{ padding: '10px', fontSize: '0.85rem' }}
                onClick={handleResolveSubmit}
                id="btn-confirm-resolve-proof"
              >
                ✓ Verify Proof & Restore Station Trust
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#020617',
            padding: '12px 18px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.82rem',
            boxShadow: 'var(--brand-emerald-glow)',
            zIndex: 9999
          }}
          id="operator-toast"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default OperatorShell;
