import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type {
  WebSocketEventType,
  WebSocketMessage,
  ChargingStation,
  EmergencyAccessBroadcast
} from '../../../shared/types.js';

class RealtimeHub {
  private static instance: RealtimeHub;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): RealtimeHub {
    if (!RealtimeHub.instance) {
      RealtimeHub.instance = new RealtimeHub();
    }
    return RealtimeHub.instance;
  }

  /**
   * Initializes the WebSocket Server attached to the shared Express HTTP server
   */
  public init(httpServer: HttpServer): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      const clientIp = req.socket.remoteAddress || 'unknown';
      console.log(`[RealtimeHub] Client connected from ${clientIp}. Total active clients: ${this.clients.size}`);

      // Send initial welcome message
      const welcome: WebSocketMessage<{ connectedAt: string; clientCount: number }> = {
        type: 'CONNECTED',
        payload: {
          connectedAt: new Date().toISOString(),
          clientCount: this.clients.size
        },
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(welcome));

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'SYSTEM_HEARTBEAT', payload: { pong: true }, timestamp: new Date().toISOString() }));
          }
        } catch {
          // ignore invalid client packets
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[RealtimeHub] Client disconnected. Remaining active: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.warn('[RealtimeHub] Client socket error:', err.message);
        this.clients.delete(ws);
      });
    });

    // Start 30-second ping heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('SYSTEM_HEARTBEAT', {
        serverTime: new Date().toISOString(),
        activeClients: this.clients.size
      });
    }, 30000);

    console.log('[RealtimeHub] WebSocket live event broker mounted on /ws');
  }

  /**
   * Broadcast typed payload to all active WebSocket clients
   */
  public broadcast<T>(type: WebSocketEventType, payload: T): void {
    const message: WebSocketMessage<T> = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };

    const serialized = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(serialized);
        } catch (err) {
          console.warn('[RealtimeHub] Error sending message to client:', err);
        }
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  // --- Specialized Event Helpers ---

  public broadcastStationStatus(station: ChargingStation): void {
    this.broadcast('STATION_STATUS_CHANGED', { station });
  }

  public broadcastEmergencySubmitted(request: EmergencyAccessBroadcast): void {
    this.broadcast('EMERGENCY_REQUEST_SUBMITTED', { request });
  }

  public broadcastEmergencyApproved(approval: EmergencyAccessBroadcast): void {
    this.broadcast('EMERGENCY_REQUEST_APPROVED', { approval });
  }

  public broadcastCommunityAudit(audit: any): void {
    this.broadcast('COMMUNITY_AUDIT_SUBMITTED', { audit });
  }

  public broadcastPreventiveDispatch(ticket: any): void {
    this.broadcast('PREVENTIVE_DISPATCH_SCHEDULED', { ticket });
  }
}

export const realtimeHub = RealtimeHub.getInstance();
