import { WifiOff, Radio, HardDrive } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
  isSimulated: boolean;
  onOpenPwaModal: () => void;
  onExitSimulated?: () => void;
  cachedStationCount: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  isSimulated,
  onOpenPwaModal,
  onExitSimulated,
  cachedStationCount
}) => {
  if (!isOffline && !isSimulated) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #7F1D1D 0%, #991B1B 50%, #7F1D1D 100%)',
        color: '#FEE2E2',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
        fontSize: '0.82rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 900
      }}
      id="offline-highway-banner"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isSimulated ? <Radio size={16} color="#FCA5A5" /> : <WifiOff size={16} color="#FCA5A5" />}
        </div>
        <div>
          <strong style={{ fontWeight: 800, color: '#FFF' }}>
            {isSimulated ? 'SIMULATED HIGHWAY DEAD-ZONE (0 CELL BARS)' : 'CELLULAR NETWORK LOST — HIGHWAY DEAD-ZONE MODE'}
          </strong>
          <span style={{ marginLeft: '8px', opacity: 0.9 }}>
            Serving {cachedStationCount} emergency chargers from local device storage with offline directions & gate codes.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isSimulated && onExitSimulated && (
          <button
            onClick={onExitSimulated}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#FFF',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            id="btn-exit-simulated-offline"
          >
            Reconnect Network
          </button>
        )}

        <button
          onClick={onOpenPwaModal}
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFF',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          id="btn-banner-view-cache"
        >
          <HardDrive size={13} />
          <span>PWA Storage</span>
        </button>
      </div>
    </div>
  );
};
