import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { WebSocketMessage, EmergencyAccessBroadcast, ChargingStation } from '../../../shared/types';
import { getWsUrl, buildApiUrl } from '../config/api';

interface RealtimeContextType {
  isConnected: boolean;
  clientCount: number;
  lastMessage: WebSocketMessage | null;
  liveIncomingEmergency: EmergencyAccessBroadcast | null;
  clearIncomingEmergency: () => void;
  approvedEmergencyPass: EmergencyAccessBroadcast | null;
  clearApprovedPass: () => void;
  simulateEvent: (eventType: string, payload?: any) => Promise<boolean>;
  sendPing: () => void;
  onStationStatusChanged?: (station: ChargingStation) => void;
  setOnStationStatusChanged: (cb: (station: ChargingStation) => void) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [clientCount, setClientCount] = useState<number>(1);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [liveIncomingEmergency, setLiveIncomingEmergency] = useState<EmergencyAccessBroadcast | null>(null);
  const [approvedEmergencyPass, setApprovedEmergencyPass] = useState<EmergencyAccessBroadcast | null>(null);

  const onStationStatusCallbackRef = useRef<((station: ChargingStation) => void) | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    try {
      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('[Realtime] WebSocket connected to VoltIQ Live Event Hub');
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(msg);

          if (msg.type === 'CONNECTED') {
            if (msg.payload?.clientCount) {
              setClientCount(msg.payload.clientCount);
            }
          } else if (msg.type === 'STATION_STATUS_CHANGED') {
            const station = msg.payload?.station;
            if (station && onStationStatusCallbackRef.current) {
              onStationStatusCallbackRef.current(station);
            }
          } else if (msg.type === 'EMERGENCY_REQUEST_SUBMITTED') {
            const req = msg.payload?.request;
            if (req) {
              setLiveIncomingEmergency(req);
            }
          } else if (msg.type === 'EMERGENCY_REQUEST_APPROVED') {
            const approval = msg.payload?.approval;
            if (approval) {
              setApprovedEmergencyPass(approval);
              // Clear incoming if matching
              setLiveIncomingEmergency(prev => (prev?.requestId === approval.requestId ? null : prev));
            }
          }
        } catch (err) {
          console.warn('[Realtime] Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('[Realtime] WebSocket disconnected. Attempting auto-reconnect in 3s...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.warn('[Realtime] WebSocket error:', err);
        ws.close();
      };
    } catch (err) {
      console.warn('[Realtime] WebSocket connection attempt failed:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 4000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  const setOnStationStatusChanged = useCallback((cb: (station: ChargingStation) => void) => {
    onStationStatusCallbackRef.current = cb;
  }, []);

  const sendPing = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'PING' }));
    }
  }, []);

  const simulateEvent = useCallback(async (eventType: string, payload?: any): Promise<boolean> => {
    try {
      const res = await fetch(buildApiUrl('/api/realtime/simulate-event'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, customPayload: payload })
      });
      return res.ok;
    } catch (err) {
      console.error('[Realtime] Failed to simulate event:', err);
      return false;
    }
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        clientCount,
        lastMessage,
        liveIncomingEmergency,
        clearIncomingEmergency: () => setLiveIncomingEmergency(null),
        approvedEmergencyPass,
        clearApprovedPass: () => setApprovedEmergencyPass(null),
        simulateEvent,
        sendPing,
        setOnStationStatusChanged
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
