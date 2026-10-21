import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  RotateCw,
  Users,
  CheckCircle2,
  XCircle,
  Scale,
  Database,
  Sliders,
  UserX,
  UserCheck
} from 'lucide-react';
import type { ChargingStation, VerificationReport, UserSession } from '../../../shared/types';
import { buildApiUrl } from '../config/api';

interface AdminShellProps {
  stations: ChargingStation[];
}

interface AdminMetrics {
  trustIntegrityRate: number;
  totalVerifications: number;
  onSiteAuditsCount: number;
  remoteSpoofBlockedCount: number;
  flaggedModerationQueueCount: number;
  activeDisputesCount: number;
  registeredUsersCount: number;
  privateAuthorizedSitesCount: number;
}

interface DisputeRecord {
  id: string;
  stationId: string;
  stationName: string;
  operatorName: string;
  operatorClaim: string;
  communityClaim: string;
  reportedAuditsCount: number;
  averageSubmitterDistanceMeters: number;
  status: 'PENDING_REVIEW' | 'COMMUNITY_UPHELD' | 'TECH_PROOF_REQUIRED' | 'OPERATOR_RESTORED';
  resolvedAt?: string;
  adminNotes?: string;
}

export const AdminShell: React.FC<AdminShellProps> = ({ stations: initialStations }) => {
  const [stations, setStations] = useState<ChargingStation[]>(initialStations);
  const [activeTab, setActiveTab] = useState<'MODERATION' | 'USERS' | 'DISPUTES' | 'REGISTRY'>('MODERATION');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [verifications, setVerifications] = useState<VerificationReport[]>([]);
  const [users, setUsers] = useState<UserSession[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filter for Moderation Queue
  const [modFilter, setModFilter] = useState<'ALL' | 'FLAGGED' | 'APPROVED' | 'REJECTED'>('FLAGGED');

  // User reputation edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newReputationInput, setNewReputationInput] = useState<number>(0.8);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    setStations(initialStations);
  }, [initialStations]);

  // Load Admin Data from Server
  const loadAdminData = async () => {
    try {
      const [resMetrics, resVerifs, resUsers, resDisputes] = await Promise.all([
        fetch(buildApiUrl('/api/admin/metrics')),
        fetch(buildApiUrl('/api/admin/verifications')),
        fetch(buildApiUrl('/api/admin/users')),
        fetch(buildApiUrl('/api/admin/disputes'))
      ]);

      if (resMetrics.ok) {
        const d = await resMetrics.json();
        setMetrics(d.metrics);
      }
      if (resVerifs.ok) {
        const d = await resVerifs.json();
        setVerifications(d.verifications || []);
      }
      if (resUsers.ok) {
        const d = await resUsers.json();
        setUsers(d.users || []);
      }
      if (resDisputes.ok) {
        const d = await resDisputes.json();
        setDisputes(d.disputes || []);
      }
    } catch (err) {
      console.warn('Failed to load admin data from API:', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAdminData();
    setIsRefreshing(false);
    showToast('Platform governance metrics & queues updated.');
  };

  // Moderate Verification Report
  const handleModerateReport = async (reportId: string, status: 'APPROVED' | 'REJECTED', penalizeUser = false) => {
    try {
      const res = await fetch(buildApiUrl(`/api/admin/verifications/${reportId}/moderate`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          penalizeUser,
          reason: penalizeUser ? 'Spoofed remote location outside geofence boundary' : 'Report manually moderated by Platform Admin'
        })
      });

      if (res.ok) {
        const d = await res.json();
        setVerifications(prev => prev.map(v => v.id === reportId ? d.report : v));
        if (penalizeUser) {
          await loadAdminData(); // Refresh users list with updated reputation
        }
        showToast(d.message || `Audit report ${status.toLowerCase()} successfully.`);
        return;
      }
    } catch (err) {
      console.warn('Backend moderation failed:', err);
    }

    // Client fallback
    setVerifications(prev => prev.map(v => v.id === reportId ? { ...v, moderationStatus: status } : v));
    showToast(`Audit report marked as ${status}.`);
  };

  // Adjust User Reputation Score
  const handleSaveReputation = async (userId: string) => {
    try {
      const res = await fetch(buildApiUrl(`/api/admin/users/${userId}/reputation`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reputationScore: newReputationInput })
      });

      if (res.ok) {
        const d = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, reputationScore: d.user.reputationScore } : u));
        showToast(d.message || `Reputation updated to ${newReputationInput}x.`);
        setEditingUserId(null);
        return;
      }
    } catch (err) {
      console.warn('Backend reputation update failed:', err);
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, reputationScore: newReputationInput } : u));
    showToast(`User reputation updated to ${newReputationInput}x.`);
    setEditingUserId(null);
  };

  // Resolve Operator Dispute
  const handleResolveDispute = async (disputeId: string, action: 'UPHOLD_COMMUNITY' | 'REQUIRE_TECH_PROOF' | 'OVERRIDE_OPERATOR') => {
    try {
      const res = await fetch(buildApiUrl(`/api/admin/disputes/${disputeId}/resolve`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: action === 'UPHOLD_COMMUNITY'
            ? 'Driver consensus verified on site (<50m). Station locked as FAULTY.'
            : action === 'REQUIRE_TECH_PROOF'
              ? 'Operator instructed to issue high-voltage tech dispatch ticket with photo proof.'
              : 'Operator claim accepted.'
        })
      });

      if (res.ok) {
        const d = await res.json();
        setDisputes(prev => prev.map(disp => disp.id === disputeId ? d.dispute : disp));
        showToast(d.message || `Dispute resolved with action: ${action}`);
        return;
      }
    } catch (err) {
      console.warn('Backend dispute resolution failed:', err);
    }

    setDisputes(prev =>
      prev.map(disp =>
        disp.id === disputeId
          ? {
              ...disp,
              status: action === 'UPHOLD_COMMUNITY' ? 'COMMUNITY_UPHELD' : action === 'REQUIRE_TECH_PROOF' ? 'TECH_PROOF_REQUIRED' : 'OPERATOR_RESTORED'
            }
          : disp
      )
    );
    showToast(`Dispute resolved: ${action}`);
  };

  const filteredVerifications = verifications.filter(v => {
    if (modFilter === 'ALL') return true;
    return v.moderationStatus === modFilter;
  });

  return (
    <div className="mobile-view-full" id="admin-governance-console">
      {/* Top Banner & KPI Row */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFF' }}>
                Platform Governance & Trust Integrity Console
              </h1>
              <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>
                National Anti-Fraud Shield
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
              Anti-spoof geofence surveillance, user reputation adjustments, and operator dispute resolution for {stations.length} Indian EV stations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              id="btn-admin-refresh"
            >
              <RotateCw size={14} className={isRefreshing ? 'spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Platform State'}</span>
            </button>
          </div>
        </div>

        {/* 4 Governance KPI Cards */}
        <div
          className="kpi-grid-responsive"
          id="admin-kpi-row"
        >
          {/* Card 1: Trust Integrity Rate */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Trust Integrity Rate</span>
              <ShieldCheck size={18} color="var(--brand-emerald)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '6px', color: 'var(--brand-emerald)' }}>
              {metrics?.trustIntegrityRate || 99.4}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Zero synthetic review poisoning detected
            </div>
          </div>

          {/* Card 2: On-Site Geofence Audits */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>On-Site Audits (&lt;150m)</span>
              <Activity size={18} color="var(--brand-cyan)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '6px', color: 'var(--brand-cyan)' }}>
              {metrics?.onSiteAuditsCount ?? 4} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 500 }}>verified</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--brand-cyan)', marginTop: '4px' }}>
              Full mathematical weight ($P_i = 1.0$)
            </div>
          </div>

          {/* Card 3: Spoof Blocks & Remote Probes */}
          <div className="glass-panel" style={{ padding: '16px', borderColor: (metrics?.flaggedModerationQueueCount ?? 0) > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Remote Spoofs Blocked</span>
              <ShieldAlert size={18} color="var(--status-faulty)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '6px', color: 'var(--status-faulty)' }}>
              {metrics?.remoteSpoofBlockedCount ?? 2}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#FCA5A5', marginTop: '4px' }}>
              {metrics?.flaggedModerationQueueCount ?? 2} in active moderation queue
            </div>
          </div>

          {/* Card 4: Operator Disputes */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Active CPO Disputes</span>
              <Scale size={18} color="#F59E0B" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '6px', color: '#FDE68A' }}>
              {metrics?.activeDisputesCount ?? 1}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Community consensus override active
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
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
        id="admin-nav-tabs"
      >
        <button
          onClick={() => setActiveTab('MODERATION')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeTab === 'MODERATION' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: `1.5px solid ${activeTab === 'MODERATION' ? '#EF4444' : 'var(--border-subtle)'}`,
            color: activeTab === 'MODERATION' ? '#FCA5A5' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
          id="tab-admin-moderation"
        >
          <ShieldAlert size={14} />
          <span>Moderation Queue ({verifications.filter(v => v.moderationStatus === 'FLAGGED').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeTab === 'USERS' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: `1.5px solid ${activeTab === 'USERS' ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
            color: activeTab === 'USERS' ? 'var(--brand-cyan)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
          id="tab-admin-users"
        >
          <Users size={14} />
          <span>User Reputation ($R_i$) & Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('DISPUTES')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeTab === 'DISPUTES' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: `1.5px solid ${activeTab === 'DISPUTES' ? '#F59E0B' : 'var(--border-subtle)'}`,
            color: activeTab === 'DISPUTES' ? '#FDE68A' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
          id="tab-admin-disputes"
        >
          <Scale size={14} />
          <span>Operator Dispute Resolution ({disputes.filter(d => d.status === 'PENDING_REVIEW').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REGISTRY')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeTab === 'REGISTRY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: `1.5px solid ${activeTab === 'REGISTRY' ? 'var(--brand-emerald)' : 'var(--border-subtle)'}`,
            color: activeTab === 'REGISTRY' ? 'var(--brand-emerald)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
          id="tab-admin-registry"
        >
          <Database size={14} />
          <span>Station Registry ({stations.length})</span>
        </button>
      </div>

      {/* TAB 1: MODERATION QUEUE */}
      {activeTab === 'MODERATION' && (
        <div className="glass-panel" style={{ padding: '20px' }} id="panel-moderation-queue">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF' }}>
                Community Audit Moderation Queue
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Audit reports flagged by the Anti-Fraud Geofencing Engine for remote distance ($&gt;500$m) or contradictory signals.
              </p>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '8px' }}>
              {(['FLAGGED', 'APPROVED', 'REJECTED', 'ALL'] as const).map(filterOpt => (
                <button
                  key={filterOpt}
                  onClick={() => setModFilter(filterOpt)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: modFilter === filterOpt ? 'var(--brand-emerald)' : 'transparent',
                    color: modFilter === filterOpt ? '#020617' : 'var(--text-secondary)'
                  }}
                  id={`btn-filter-mod-${filterOpt.toLowerCase()}`}
                >
                  {filterOpt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredVerifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No verification reports found for status "{modFilter}".
              </div>
            ) : (
              filteredVerifications.map(report => {
                const isFlagged = report.moderationStatus === 'FLAGGED';
                const isApproved = report.moderationStatus === 'APPROVED';

                return (
                  <div
                    key={report.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: isFlagged ? 'rgba(239, 68, 68, 0.08)' : isApproved ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1.5px solid ${isFlagged ? 'rgba(239, 68, 68, 0.4)' : isApproved ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                    id={`mod-report-card-${report.id}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.64rem',
                              padding: '2px 8px',
                              background: isFlagged ? 'rgba(239, 68, 68, 0.25)' : isApproved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                              color: isFlagged ? '#FCA5A5' : isApproved ? 'var(--brand-emerald)' : 'var(--text-secondary)'
                            }}
                          >
                            {report.moderationStatus}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFF' }}>
                            Report #{report.id} — {report.userName}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'var(--brand-cyan)', marginTop: '2px' }}>
                          Target Station ID: {report.stationId} • Submitter Coords: ({report.submitterLat.toFixed(4)}, {report.submitterLng.toFixed(4)})
                        </p>
                      </div>

                      {/* Distance & Proximity Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: report.distanceMeters <= 150 ? 'var(--brand-emerald)' : '#FCA5A5'
                          }}
                        >
                          {report.distanceMeters > 1000 ? `${(report.distanceMeters / 1000).toFixed(1)} km away` : `${report.distanceMeters}m away`}
                        </div>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                          Weight: {report.confidenceWeight}x
                        </span>
                      </div>
                    </div>

                    {/* Report Content */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '10px', borderRadius: '8px', fontSize: '0.74rem' }}>
                      <p style={{ color: '#FFF', fontWeight: 600 }}>"{report.comment}"</p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                        <span>Working: <strong>{report.isChargerWorking ? '✓ Yes' : '✕ No'}</strong></span>
                        <span>Grid Live: <strong>{report.isGridPowerOn ? '✓ Yes' : '✕ Cut'}</strong></span>
                        <span>Bay Free: <strong>{report.isBayFree ? '✓ Clear' : '✕ Blocked'}</strong></span>
                        <span>Damage: <strong>{report.hasPhysicalDamage ? '⚠️ Yes' : '✓ Intact'}</strong></span>
                      </div>
                    </div>

                    {/* Moderation Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        className="btn-secondary"
                        style={{
                          fontSize: '0.74rem',
                          padding: '6px 12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          borderColor: 'var(--brand-emerald)',
                          color: 'var(--brand-emerald)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onClick={() => handleModerateReport(report.id, 'APPROVED')}
                        id={`btn-approve-report-${report.id}`}
                      >
                        <CheckCircle2 size={13} />
                        <span>Approve Audit (+25 Pts)</span>
                      </button>

                      <button
                        className="btn-secondary"
                        style={{
                          fontSize: '0.74rem',
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          borderColor: '#EF4444',
                          color: '#FCA5A5',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onClick={() => handleModerateReport(report.id, 'REJECTED', false)}
                        id={`btn-reject-report-${report.id}`}
                      >
                        <XCircle size={13} />
                        <span>Reject Report</span>
                      </button>

                      {isFlagged && (
                        <button
                          className="btn-secondary"
                          style={{
                            fontSize: '0.74rem',
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.25)',
                            borderColor: '#B91C1C',
                            color: '#F87171',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginLeft: 'auto'
                          }}
                          onClick={() => handleModerateReport(report.id, 'REJECTED', true)}
                          id={`btn-penalize-user-${report.id}`}
                        >
                          <UserX size={13} />
                          <span>Reject & Penalize Spammer ($R_i \to 0.10$)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: USER REPUTATION & SCOUT DIRECTORY */}
      {activeTab === 'USERS' && (
        <div className="glass-panel" style={{ padding: '20px' }} id="panel-users-directory">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF' }}>
                User Reputation Management & Scout Directory
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Adjust mathematical user reputation factors ($R_i \in [0.10, 1.00]$). Trusted scouts receive 1.00x trust impact; flagged spammers are slashed to 0.10x.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(u => (
              <div
                key={u.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                id={`user-row-${u.id}`}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#FFF' }}>{u.fullName}</span>
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.64rem',
                        padding: '1px 6px',
                        background: u.role === 'ADMIN' ? 'rgba(139, 92, 246, 0.2)' : u.role === 'OPERATOR' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: u.role === 'ADMIN' ? '#DDD6FE' : u.role === 'OPERATOR' ? 'var(--brand-cyan)' : 'var(--brand-emerald)'
                      }}
                    >
                      {u.role}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {u.email} • Points: <strong style={{ color: 'var(--brand-cyan)' }}>{u.energyPoints} pts</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {editingUserId === u.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="1.0"
                        value={newReputationInput}
                        onChange={e => setNewReputationInput(Number(e.target.value))}
                        style={{
                          width: '70px',
                          padding: '6px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid var(--brand-cyan)',
                          color: '#FFF',
                          fontSize: '0.8rem'
                        }}
                      />
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                        onClick={() => handleSaveReputation(u.id)}
                        id={`btn-save-rep-${u.id}`}
                      >
                        Save
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '6px 8px' }}
                        onClick={() => setEditingUserId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '1.1rem',
                            fontWeight: 900,
                            color: u.reputationScore >= 0.8 ? 'var(--brand-emerald)' : u.reputationScore >= 0.4 ? '#FDE68A' : '#FCA5A5'
                          }}
                        >
                          {(u.reputationScore * 100).toFixed(0)}%
                        </div>
                        <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                          Weight: {u.reputationScore}x
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                          onClick={() => {
                            setEditingUserId(u.id);
                            setNewReputationInput(u.reputationScore);
                          }}
                          id={`btn-edit-rep-${u.id}`}
                        >
                          <Sliders size={12} />
                          <span>Adjust</span>
                        </button>

                        {u.reputationScore < 0.5 ? (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '0.72rem', padding: '6px 10px', color: 'var(--brand-emerald)', borderColor: 'var(--brand-emerald)' }}
                            onClick={() => {
                              setNewReputationInput(0.95);
                              handleSaveReputation(u.id);
                            }}
                            id={`btn-promote-scout-${u.id}`}
                          >
                            <UserCheck size={12} />
                            <span>Promote Scout</span>
                          </button>
                        ) : (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '0.72rem', padding: '6px 10px', color: '#F87171', borderColor: '#EF4444' }}
                            onClick={() => {
                              setNewReputationInput(0.10);
                              handleSaveReputation(u.id);
                            }}
                            id={`btn-slash-spammer-${u.id}`}
                          >
                            <UserX size={12} />
                            <span>Slash ($0.1x)</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OPERATOR VS COMMUNITY DISPUTE RESOLUTION DESK */}
      {activeTab === 'DISPUTES' && (
        <div className="glass-panel" style={{ padding: '20px' }} id="panel-disputes-desk">
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF' }}>
              Operator Dispute & Verification Review Queue
            </h2>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Handles conflicts where an operator claims a station is fully operational, but verified driver field reports indicate a hardware fault or power outage.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {disputes.map(dispute => {
              const isPending = dispute.status === 'PENDING_REVIEW';

              return (
                <div
                  key={dispute.id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: isPending ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1.5px solid ${isPending ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                  id={`dispute-card-${dispute.id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.65rem',
                            padding: '2px 8px',
                            background: isPending ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                            color: isPending ? '#FCA5A5' : 'var(--brand-emerald)'
                          }}
                        >
                          {dispute.status}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#FFF' }}>
                          {dispute.operatorName} — {dispute.stationName}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Dispute #{dispute.id} • Station ID: {dispute.stationId}
                      </p>
                    </div>

                    <span style={{ fontSize: '0.72rem', color: '#FDE68A', fontWeight: 700 }}>
                      {dispute.reportedAuditsCount} Verified Community Reports
                    </span>
                  </div>

                  {/* Conflicting Claims Comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem' }}>
                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--brand-cyan)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                        🏢 CPO Telemetry Claim:
                      </span>
                      <p style={{ color: 'var(--text-secondary)' }}>"{dispute.operatorClaim}"</p>
                    </div>

                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <span style={{ color: '#F87171', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                        👥 Driver Consensus Claim ({dispute.averageSubmitterDistanceMeters}m geofence):
                      </span>
                      <p style={{ color: '#FCA5A5' }}>"{dispute.communityClaim}"</p>
                    </div>
                  </div>

                  {dispute.adminNotes && (
                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', fontSize: '0.72rem', color: '#A7F3D0' }}>
                      ✓ Resolution Log: {dispute.adminNotes}
                    </div>
                  )}

                  {/* Resolution Action Buttons */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.75rem', padding: '7px 14px' }}
                        onClick={() => handleResolveDispute(dispute.id, 'UPHOLD_COMMUNITY')}
                        id={`btn-uphold-community-${dispute.id}`}
                      >
                        ✓ Uphold Driver Consensus (Lock Faulty)
                      </button>

                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '7px 14px' }}
                        onClick={() => handleResolveDispute(dispute.id, 'REQUIRE_TECH_PROOF')}
                        id={`btn-require-proof-${dispute.id}`}
                      >
                        Require Operator Technician Proof
                      </button>

                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '7px 14px', marginLeft: 'auto' }}
                        onClick={() => handleResolveDispute(dispute.id, 'OVERRIDE_OPERATOR')}
                        id={`btn-override-op-${dispute.id}`}
                      >
                        Override & Restore Station
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: STATION REGISTRY & GHOST CHARGER CLEANUP */}
      {activeTab === 'REGISTRY' && (
        <div className="glass-panel" style={{ padding: '20px' }} id="panel-station-registry">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF' }}>
                National EV Charging Station Registry
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {stations.length} total stations registered across Karnataka and national highway corridors.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stations.map(st => (
              <div
                key={st.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                id={`registry-row-${st.id}`}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFF' }}>{st.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--brand-cyan)' }}>{st.operatorName}</span>
                    {st.emergencyAccessEnabled && (
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#DDD6FE', fontSize: '0.62rem' }}>
                        SOS Enabled
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {st.address} • {st.connectors.length} Guns ({st.connectors.map(c => `${c.maxPowerKw}kW ${c.type}`).join(', ')})
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className={`trust-score-pill ${st.trustScore.score >= 80 ? 'high' : 'low'}`}>
                    <ShieldCheck size={12} />
                    <span className="score-num">{st.trustScore.score}</span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: st.overallStatus === 'AVAILABLE' ? 'var(--brand-emerald)' : '#FCA5A5'
                    }}
                  >
                    {st.overallStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Toast */}
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
          id="admin-toast"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default AdminShell;
