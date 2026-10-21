import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  ShieldCheck,
  Zap,
  Crosshair,
  CheckCircle2,
  Maximize2,
  Lock,
  BatteryCharging,
  Sun,
  Moon
} from 'lucide-react';
import type { ChargingStation } from '../../../shared/types';

interface MapViewProps {
  stations: ChargingStation[];
  userLat?: number;
  userLng?: number;
  selectedStationId?: string;
  onSelectStation: (station: ChargingStation) => void;
  onLocateUser?: () => void;
  filterWorkingOnly: boolean;
  onToggleWorkingOnly: () => void;
  filterDcFast: boolean;
  onToggleDcFast: () => void;
  filterEmergencyOnly: boolean;
  onToggleEmergencyOnly: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  stations,
  userLat = 12.9716,
  userLng = 77.5946,
  selectedStationId,
  onSelectStation,
  filterWorkingOnly,
  onToggleWorkingOnly,
  filterDcFast,
  onToggleDcFast,
  filterEmergencyOnly,
  onToggleEmergencyOnly
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [activeStation, setActiveStation] = useState<ChargingStation | null>(null);
  const [mapTheme, setMapTheme] = useState<'DARK' | 'STREET'>('DARK');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any stale map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Create Map Instance centered at user coordinates (Bengaluru Urban center)
    const map = L.map(mapContainerRef.current, {
      center: [userLat, userLng],
      zoom: 12,
      zoomControl: false,
      attributionControl: true
    });

    // 100% Free OpenStreetMap Standard Tiles (No API Key Required)
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      subdomains: ['a', 'b', 'c'],
      className: mapTheme === 'DARK' ? 'voltiq-map-tile-dark' : 'voltiq-map-tile-street'
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Zoom Controls top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      tileLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Responsive Map Resize Observer & Window Listeners
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let resizeTimer: any = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 50);
    };

    // Recalculate Leaflet size immediately after DOM render
    handleResize();

    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(mapContainerRef.current);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Center and highlight station when selected externally (e.g. from desktop sidebar)
  useEffect(() => {
    if (!selectedStationId || !mapInstanceRef.current) return;
    const target = stations.find(s => s.id === selectedStationId);
    if (target) {
      mapInstanceRef.current.flyTo([target.latitude, target.longitude], 14, { duration: 1 });
      setActiveStation(target);
    }
  }, [selectedStationId, stations]);

  // Dynamically update tile CSS filter when mapTheme changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const container = tileLayerRef.current.getContainer();
    if (container) {
      if (mapTheme === 'DARK') {
        container.classList.add('voltiq-map-tile-dark');
        container.classList.remove('voltiq-map-tile-street');
      } else {
        container.classList.add('voltiq-map-tile-street');
        container.classList.remove('voltiq-map-tile-dark');
      }
    }
  }, [mapTheme]);

  // Update User Location Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px;">
            <div style="width: 14px; height: 14px; background: #06B6D4; border: 2.5px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 14px #06B6D4; position: absolute; top: 4px; left: 4px;"></div>
            <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: pulse-ring 2s infinite ease-out;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(mapInstanceRef.current)
        .bindTooltip('Your Vehicle Location (SoC: 18%)', { direction: 'top', offset: [0, -10] });
    }
  }, [userLat, userLng]);

  // Update Station Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    stations.forEach(station => {
      const isHighTrust = station.trustScore.score >= 80;
      const isPowerCut = station.powerGridStatus === 'REPORTED_CUT';
      const isPrivate = station.accessType === 'PRIVATE_AUTHORIZED';

      let markerColor = '#10B981'; // High Trust Emerald
      let pulseRing = 'rgba(16, 185, 129, 0.4)';

      if (isPowerCut || station.overallStatus === 'FAULTY') {
        markerColor = '#EF4444'; // Danger Red
        pulseRing = 'rgba(239, 68, 68, 0.4)';
      } else if (isPrivate) {
        markerColor = '#8B5CF6'; // Private Purple
        pulseRing = 'rgba(139, 92, 246, 0.4)';
      } else if (!isHighTrust) {
        markerColor = '#F59E0B'; // Moderate Amber
        pulseRing = 'rgba(245, 158, 11, 0.4)';
      }

      const customIcon = L.divIcon({
        className: 'custom-station-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; cursor: pointer;">
            <div style="
              width: 28px;
              height: 28px;
              background: ${markerColor};
              border: 2px solid #FFFFFF;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              margin: 3px 0 0 3px;
            ">
              <span style="transform: rotate(45deg); font-size: 11px; font-weight: 800; color: #020617; font-family: Outfit, sans-serif;">
                ${station.trustScore.score}
              </span>
            </div>
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 34px;
              height: 34px;
              border-radius: 50%;
              background: ${pulseRing};
              animation: pulse-ring 2.5s infinite ease-out;
              pointer-events: none;
            "></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });

      marker.on('click', () => {
        setActiveStation(station);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [stations]);

  // Handle Recenter on User
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLat, userLng], 13, { duration: 1.2 });
    }
  };

  // Handle Fit Bounds across all stations
  const handleFitBounds = () => {
    if (mapInstanceRef.current && stations.length > 0) {
      const bounds = L.latLngBounds(stations.map(s => [s.latitude, s.longitude]));
      bounds.extend([userLat, userLng]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Floating Map Filter Bar */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          right: '54px', // Avoid zoom buttons on top right
          maxWidth: 'calc(100% - 68px)',
          zIndex: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          padding: '4px',
          WebkitOverflowScrolling: 'touch'
        }}
        id="map-floating-filters"
      >
        <button
          onClick={onToggleWorkingOnly}
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            background: filterWorkingOnly ? 'rgba(16, 185, 129, 0.9)' : 'rgba(13, 19, 34, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${filterWorkingOnly ? 'var(--brand-emerald)' : 'var(--border-subtle)'}`,
            color: filterWorkingOnly ? '#020617' : 'var(--text-primary)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-md)'
          }}
          id="map-filter-working"
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
            fontWeight: 700,
            background: filterDcFast ? 'rgba(6, 182, 212, 0.9)' : 'rgba(13, 19, 34, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${filterDcFast ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
            color: filterDcFast ? '#020617' : 'var(--text-primary)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-md)'
          }}
          id="map-filter-dc-fast"
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
            fontWeight: 700,
            background: filterEmergencyOnly ? 'rgba(239, 68, 68, 0.9)' : 'rgba(13, 19, 34, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${filterEmergencyOnly ? 'var(--emergency-red)' : 'var(--border-subtle)'}`,
            color: filterEmergencyOnly ? '#FFFFFF' : 'var(--text-primary)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-md)'
          }}
          id="map-filter-emergency"
        >
          <Lock size={12} />
          <span>Emergency Access</span>
        </button>
      </div>

      {/* Floating Action Controls on Right Bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: activeStation ? '180px' : '20px',
          right: '16px',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          transition: 'bottom 250ms ease'
        }}
      >
        {/* Map Theme Toggle (Dark / Street) */}
        <button
          onClick={() => setMapTheme(prev => prev === 'DARK' ? 'STREET' : 'DARK')}
          title={mapTheme === 'DARK' ? 'Switch to Street Map' : 'Switch to Dark Cyber Map'}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(13, 19, 34, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            color: mapTheme === 'DARK' ? '#F59E0B' : 'var(--brand-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer'
          }}
          id="btn-map-toggle-theme"
        >
          {mapTheme === 'DARK' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={handleRecenter}
          title="Locate My EV"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(13, 19, 34, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--brand-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}
          id="btn-map-locate-me"
        >
          <Crosshair size={18} />
        </button>

        <button
          onClick={handleFitBounds}
          title="Fit All Stations"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(13, 19, 34, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}
          id="btn-map-fit-bounds"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Actual Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        id="voltiq-leaflet-map"
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
          background: '#060911',
          zIndex: 1
        }}
      />

      {/* Bottom Floating Station Drawer Card (When a marker is tapped) */}
      {activeStation && (
        <div
          className="map-active-station-card"
          id="map-active-station-card"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                  {activeStation.operatorName}
                </span>
                {activeStation.powerGridStatus === 'REPORTED_CUT' && (
                  <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', fontSize: '0.62rem', padding: '1px 6px' }}>
                    Power Cut
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                {activeStation.name}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {activeStation.landmark} • {activeStation.distanceKm} km away
              </p>
            </div>

            {/* Trust Pill */}
            <div className={`trust-score-pill ${activeStation.trustScore.score >= 80 ? 'high' : 'low'}`}>
              <ShieldCheck size={14} />
              <span className="score-num">{activeStation.trustScore.score}</span>
              <span className="score-total">/100</span>
            </div>
          </div>

          {/* Quick Specs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <BatteryCharging size={13} color="var(--brand-cyan)" />
              {activeStation.connectors.map(c => `${c.maxPowerKw}kW ${c.type}`).join(', ')}
            </span>
            <span style={{ fontWeight: 700, color: '#FFF' }}>
              ₹{activeStation.connectors[0]?.tariffPerKwhInr}/kWh
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              className="btn-secondary"
              style={{ flex: 1, padding: '8px', fontSize: '0.78rem' }}
              onClick={() => setActiveStation(null)}
            >
              Close
            </button>
            <button
              className="btn-primary"
              style={{ flex: 2, padding: '8px', fontSize: '0.78rem' }}
              onClick={() => onSelectStation(activeStation)}
              id="btn-map-inspect-station"
            >
              <Navigation size={13} />
              <span>Inspect & Verify</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
