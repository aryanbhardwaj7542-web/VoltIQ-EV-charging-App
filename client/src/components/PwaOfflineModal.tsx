import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Smartphone,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Download,
  Trash2,
  X,
  Zap,
  Radio
} from 'lucide-react';
import { OfflineStorageEngine, type OfflineCacheMeta } from '../services/offlineStorage';
import { getSwStatus, type SwStatus } from '../serviceWorkerRegistration';
import type { ChargingStation } from '../../../shared/types';

interface PwaOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: ChargingStation[];
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: (active: boolean) => void;
}

export const PwaOfflineModal: React.FC<PwaOfflineModalProps> = ({
  isOpen,
  onClose,
  stations,
  isSimulatedOffline,
  onToggleSimulatedOffline
}) => {
  const [swStatus, setSwStatus] = useState<SwStatus | null>(null);
  const [cacheMeta, setCacheMeta] = useState<OfflineCacheMeta | null>(null);
  const [storageSizeKb, setStorageSizeKb] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Check SW status
    getSwStatus().then(status => setSwStatus(status));

    // Check Cache metadata
    const meta = OfflineStorageEngine.getCacheMeta();
    setCacheMeta(meta);
    setStorageSizeKb(OfflineStorageEngine.getStorageSizeKb());
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle manual offline cache sync
  const handleForceSync = () => {
    setIsSyncing(true);
    setSyncFeedback(null);

    setTimeout(() => {
      OfflineStorageEngine.saveStations(stations);
      setCacheMeta(OfflineStorageEngine.getCacheMeta());
      setStorageSizeKb(OfflineStorageEngine.getStorageSizeKb());
      setIsSyncing(false);
      setSyncFeedback(`✓ Cache updated! ${stations.length} stations cached locally.`);
      setTimeout(() => setSyncFeedback(null), 3000);
    }, 400);
  };

  // Handle clear cache
  const handleClearCache = () => {
    OfflineStorageEngine.clearCache();
    setCacheMeta(null);
    setStorageSizeKb(0);
    setSyncFeedback('Cache cleared.');
    setTimeout(() => setSyncFeedback(null), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} id="pwa-offline-modal-backdrop">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden'
        }}
        id="pwa-offline-modal"
      >
        {/* Header */}
        <div style={{
          padding: '22px 28px',
          background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
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
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Smartphone size={26} color="var(--brand-cyan)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  PWA & Highway Offline Resilience Hub
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: 'var(--brand-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.4)'
                }}>
                  SERVICE WORKER ACTIVE
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Zero-connectivity highway dead-zone caching, app installability, and asset performance
              </p>
            </div>
          </div>

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
            id="btn-close-pwa-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Diagnostic Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Service Worker</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <CheckCircle2 size={16} color="var(--brand-emerald)" />
                <strong style={{ fontSize: '0.85rem', color: 'var(--brand-emerald)' }}>
                  {swStatus?.isRegistered ? 'Active & Controlling' : 'Active (sw.js Ready)'}
                </strong>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Offline Storage Size</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <HardDrive size={16} color="var(--brand-cyan)" />
                <strong style={{ fontSize: '0.85rem', color: 'var(--brand-cyan)' }}>
                  {storageSizeKb > 0 ? `${storageSizeKb} KB Cached` : 'Pre-Cached Ready'}
                </strong>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Highway Cache Inventory</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Zap size={16} color="#F59E0B" />
                <strong style={{ fontSize: '0.85rem', color: '#FCD34D' }}>
                  {cacheMeta ? `${cacheMeta.stationCount} Stations (25km)` : `${stations.length} Active Stations`}
                </strong>
              </div>
            </div>
          </div>

          {/* Highway Dead-Zone Simulator Control */}
          <div style={{
            background: isSimulatedOffline ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${isSimulatedOffline ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-subtle)'}`,
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isSimulatedOffline ? (
                  <WifiOff size={22} color="#EF4444" />
                ) : (
                  <Wifi size={22} color="var(--brand-emerald)" />
                )}
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Indian Highway Dead-Zone Simulator (0 Cell Bars)
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Simulates total 4G/5G cellular signal drop on Indian expressways (e.g. NH-275, Mumbai-Goa Ghats)
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => onToggleSimulatedOffline(!isSimulatedOffline)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: isSimulatedOffline ? '1px solid #EF4444' : '1px solid var(--brand-emerald)',
                  background: isSimulatedOffline ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                  color: isSimulatedOffline ? '#FCA5A5' : 'var(--brand-emerald)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                id="btn-toggle-simulate-offline"
              >
                {isSimulatedOffline ? <Radio size={14} /> : <Wifi size={14} />}
                <span>{isSimulatedOffline ? 'SIMULATION ACTIVE (OFFLINE)' : 'SIMULATE DEAD-ZONE'}</span>
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.45 }}>
              When activated, VoltIQ disconnects all live network calls and serves station discovery, emergency triage, gate codes, and offline phone numbers strictly from local device storage without failing.
            </p>
          </div>

          {/* Cache Maintenance Actions */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
              Offline Cache Maintenance
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleForceSync}
                disabled={isSyncing}
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                id="btn-sync-offline-cache"
              >
                <RefreshCw size={14} className={isSyncing ? 'spin-animation' : ''} />
                <span>Sync Emergency Stations Now</span>
              </button>

              <button
                onClick={handleClearCache}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#F87171' }}
                id="btn-clear-offline-cache"
              >
                <Trash2 size={14} />
                <span>Clear Local Cache</span>
              </button>

              {syncFeedback && (
                <span style={{ fontSize: '0.78rem', color: 'var(--brand-emerald)', fontWeight: 600 }}>
                  {syncFeedback}
                </span>
              )}
            </div>

            {cacheMeta && (
              <div style={{ marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Last synced at: {new Date(cacheMeta.savedAt).toLocaleString()} • Radius: {cacheMeta.radiusKm} km • Coordinate Origin: ({cacheMeta.userLat}, {cacheMeta.userLng})
              </div>
            )}
          </div>

          {/* PWA Installation & Add to Home Screen */}
          <div style={{
            background: 'rgba(167, 139, 250, 0.04)',
            border: '1px solid rgba(167, 139, 250, 0.25)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Download size={20} color="#A78BFA" />
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Install VoltIQ as Standalone Native PWA
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Runs in dedicated fullscreen window, launches from home screen / taskbar, works offline without address bars.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  alert('VoltIQ PWA Manifest is active! To install on desktop/mobile: Click the "Install" icon in your browser address bar or select "Add to Home Screen" in your browser menu.');
                }}
                style={{
                  background: 'rgba(167, 139, 250, 0.2)',
                  border: '1px solid rgba(167, 139, 250, 0.4)',
                  color: '#C4B5FD',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                id="btn-install-pwa"
              >
                Install Instructions
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
