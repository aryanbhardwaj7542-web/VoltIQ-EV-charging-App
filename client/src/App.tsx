import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider, useRealtime } from './context/RealtimeContext';
import { Header } from './components/Header';
import { DriverShell } from './components/DriverShell';
import { OperatorShell } from './components/OperatorShell';
import { AdminShell } from './components/AdminShell';
import { StationDetailModal } from './components/StationDetailModal';
import { EmergencyModal } from './components/EmergencyModal';
import { VerificationModal } from './components/VerificationModal';
import { AuthModal } from './components/AuthModal';
import { RealtimeDock } from './components/RealtimeDock';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { VivaTestingModal } from './components/VivaTestingModal';
import { PwaOfflineModal } from './components/PwaOfflineModal';
import { VivaDossierModal } from './components/VivaDossierModal';
import { OfflineBanner } from './components/OfflineBanner';
import { OfflineStorageEngine } from './services/offlineStorage';
import { buildApiUrl } from './config/api';
import type { ChargingStation, UserRole } from '../../shared/types';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { setOnStationStatusChanged } = useRealtime();
  const [currentPersona, setCurrentPersona] = useState<UserRole>('DRIVER');
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyTargetStation, setVerifyTargetStation] = useState<ChargingStation | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isVivaOpen, setIsVivaOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(OfflineStorageEngine.isSimulatedOffline());
  const [isDeviceOffline, setIsDeviceOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [filterWorkingOnly, setFilterWorkingOnly] = useState(false);
  const [filterDcFast, setFilterDcFast] = useState(false);
  const [filterEmergencyOnly, setFilterEmergencyOnly] = useState(false);

  // Sync persona with logged-in user role on initial login
  useEffect(() => {
    if (user?.role) {
      if (user.role === 'OPERATOR') setCurrentPersona('OPERATOR');
      else if (user.role === 'ADMIN') setCurrentPersona('ADMIN');
      else setCurrentPersona('DRIVER');
    }
  }, [user?.role]);

  // Listen to browser network connectivity transitions
  useEffect(() => {
    const handleOnline = () => {
      setIsDeviceOffline(false);
      showToast('📶 Cellular Network Restored: Online sync active');
    };
    const handleOffline = () => {
      setIsDeviceOffline(true);
      showToast('⚠️ Network connection dropped: Highway Dead-Zone cache active');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch stations from backend with default user coordinates (Bengaluru Urban center)
  useEffect(() => {
    const fetchStations = async () => {
      if (isSimulatedOffline || !navigator.onLine) {
        const offlineStations = OfflineStorageEngine.getOfflineStations();
        setStations(offlineStations);
        return;
      }

      try {
        const res = await fetch(buildApiUrl('/api/stations?lat=12.9716&lng=77.5946'));
        if (res.ok) {
          const data = await res.json();
          const loaded = data.stations || [];
          setStations(loaded);
          OfflineStorageEngine.saveStations(loaded);
        } else {
          setStations(OfflineStorageEngine.getOfflineStations());
        }
      } catch (err) {
        console.warn('Backend connecting...', err);
        setStations(OfflineStorageEngine.getOfflineStations());
      }
    };

    fetchStations();
  }, [isSimulatedOffline]);

  // Hook up WebSocket live station status updates with zero page refresh
  useEffect(() => {
    setOnStationStatusChanged((updatedStation: ChargingStation) => {
      setStations(prev => prev.map(s => s.id === updatedStation.id ? updatedStation : s));
      setSelectedStation(prev => (prev && prev.id === updatedStation.id ? updatedStation : prev));
      showToast(`⚡ Live Sync: ${updatedStation.name} status updated.`);
    });
  }, [setOnStationStatusChanged]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Community Verification Submission
  const handleVerificationSubmit = async (stationId: string, payload: any) => {
    const storedToken = localStorage.getItem('voltiq_jwt_token');

    try {
      if (storedToken) {
        const res = await fetch(buildApiUrl(`/api/stations/${stationId}/verify`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          // Update station with fresh state returned from server
          if (data.station) {
            setStations(prev => prev.map(st => st.id === stationId ? data.station : st));
          }
          showToast(data.message || '🎉 Verified audit submitted! +25 Energy Points credited.');
          return;
        }
      }
    } catch (err) {
      console.warn('Backend verification call failed, applying client fallback:', err);
    }

    // Client fallback if offline or no token
    const isWorking = payload.isChargerWorking && payload.isGridPowerOn;
    const scoreDelta = isWorking ? 4 : -18;
    setStations(prev =>
      prev.map(st => {
        if (st.id === stationId) {
          const newScore = Math.max(10, Math.min(100, st.trustScore.score + scoreDelta));
          return {
            ...st,
            powerGridStatus: payload.isGridPowerOn ? 'CONFIRMED_LIVE' : 'REPORTED_CUT',
            overallStatus: payload.isChargerWorking ? 'AVAILABLE' : 'FAULTY',
            trustScore: {
              ...st.trustScore,
              score: newScore,
              freshness: 'LIVE',
              lastVerifiedAt: new Date().toISOString(),
              verificationCount24h: st.trustScore.verificationCount24h + 1
            }
          };
        }
        return st;
      })
    );
    showToast('🎉 Audit recorded! Station trust score updated & +25 Energy Points awarded!');
  };

  // Handle Operator Status Toggle (synced with backend)
  const handleToggleStationStatus = async (stationId: string) => {
    const target = stations.find(s => s.id === stationId);
    if (!target) return;

    const isCurrentlyFaulty = target.overallStatus === 'FAULTY';
    const newStatus = isCurrentlyFaulty ? 'AVAILABLE' : 'FAULTY';
    const newPower = isCurrentlyFaulty ? 'CONFIRMED_LIVE' : 'REPORTED_CUT';

    // Local state update
    setStations(prev =>
      prev.map(st => {
        if (st.id === stationId) {
          return {
            ...st,
            overallStatus: newStatus,
            powerGridStatus: newPower,
            trustScore: {
              ...st.trustScore,
              score: isCurrentlyFaulty ? 88 : 20,
              freshness: 'LIVE',
              lastVerifiedAt: new Date().toISOString()
            }
          };
        }
        return st;
      })
    );

    // Sync with backend API
    const storedToken = localStorage.getItem('voltiq_jwt_token');
    if (storedToken) {
      try {
        await fetch(buildApiUrl(`/api/stations/${stationId}/status`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`
          },
          body: JSON.stringify({
            overallStatus: newStatus,
            powerGridStatus: newPower
          })
        });
      } catch (err) {
        console.warn('Could not sync status update with backend:', err);
      }
    }

    showToast(`Operator status updated: Station marked ${newStatus}`);
  };

  const handleToggleSimulatedOffline = (active: boolean) => {
    setIsSimulatedOffline(active);
    OfflineStorageEngine.setSimulatedOffline(active);
    if (active) {
      setStations(OfflineStorageEngine.getOfflineStations());
      showToast('⚠️ 0-Bar Highway Dead-Zone Simulation Activated');
    } else {
      fetch(buildApiUrl('/api/stations?lat=12.9716&lng=77.5946'))
        .then(r => r.json())
        .then(d => {
          setStations(d.stations || []);
          showToast('📶 Cellular Network Restored: Online sync active');
        })
        .catch(() => {});
    }
  };

  const activeVehicle = user?.primaryVehicle;

  return (
    <div className="app-container" id="voltiq-app-root">
      {/* Offline Highway Dead-Zone Resilience Banner */}
      <OfflineBanner
        isOffline={isDeviceOffline}
        isSimulated={isSimulatedOffline}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onExitSimulated={() => handleToggleSimulatedOffline(false)}
        cachedStationCount={stations.length}
      />

      {/* Top Navigation */}
      <Header
        currentPersona={currentPersona}
        onPersonaChange={setCurrentPersona}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSecurityAudit={() => setIsSecurityOpen(true)}
        onOpenVivaModal={() => setIsVivaOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onOpenDossierModal={() => setIsDossierOpen(true)}
        isOffline={isDeviceOffline || isSimulatedOffline}
      />

      {/* Main Persona Content View */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
        {currentPersona === 'DRIVER' && (
          <DriverShell
            stations={stations}
            primaryVehicle={activeVehicle}
            onSelectStation={(st) => setSelectedStation(st)}
            onTriggerEmergency={() => setIsEmergencyOpen(true)}
            filterWorkingOnly={filterWorkingOnly}
            onToggleWorkingOnly={() => setFilterWorkingOnly(p => !p)}
            filterDcFast={filterDcFast}
            onToggleDcFast={() => setFilterDcFast(p => !p)}
            filterEmergencyOnly={filterEmergencyOnly}
            onToggleEmergencyOnly={() => setFilterEmergencyOnly(p => !p)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {currentPersona === 'OPERATOR' && (
          <OperatorShell
            stations={stations}
            onToggleStationStatus={handleToggleStationStatus}
          />
        )}

        {currentPersona === 'ADMIN' && (
          <AdminShell stations={stations} />
        )}
      </main>

      {/* Modals */}
      {selectedStation && (
        <StationDetailModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onOpenVerify={() => {
            setVerifyTargetStation(selectedStation);
            setSelectedStation(null);
            setIsVerifyOpen(true);
          }}
        />
      )}

      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        stations={stations}
        vehicle={activeVehicle}
        onSelectStation={(st) => setSelectedStation(st)}
      />

      {verifyTargetStation && isVerifyOpen && (
        <VerificationModal
          station={verifyTargetStation}
          onClose={() => {
            setIsVerifyOpen(false);
            setVerifyTargetStation(null);
          }}
          onSubmitVerification={handleVerificationSubmit}
        />
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={currentPersona}
      />

      <SecurityAuditModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      <VivaTestingModal
        isOpen={isVivaOpen}
        onClose={() => setIsVivaOpen(false)}
      />

      <PwaOfflineModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        stations={stations}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
      />

      <VivaDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#020617',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: 'var(--brand-emerald-glow)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          id="toast-notification"
        >
          {toastMessage}
        </div>
      )}

      {/* Realtime WebSocket Event Dock & Live Simulator */}
      <RealtimeDock />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </AuthProvider>
  );
};

export default App;
