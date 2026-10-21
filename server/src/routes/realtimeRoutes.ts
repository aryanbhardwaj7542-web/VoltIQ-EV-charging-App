import { Router, Request, Response } from 'express';
import { realtimeHub } from '../services/realtimeHub.js';
import { stationRepository } from '../repositories/stationRepository.js';

export const realtimeRouter = Router();

/**
 * GET /api/realtime/status
 * Returns WebSocket hub health and connected client count
 */
realtimeRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ACTIVE',
    wsEndpoint: '/ws',
    activeClients: realtimeHub.getConnectedClientsCount(),
    supportedEvents: [
      'STATION_STATUS_CHANGED',
      'EMERGENCY_REQUEST_SUBMITTED',
      'EMERGENCY_REQUEST_APPROVED',
      'COMMUNITY_AUDIT_SUBMITTED',
      'PREVENTIVE_DISPATCH_SCHEDULED',
      'SYSTEM_HEARTBEAT'
    ]
  });
});

/**
 * POST /api/realtime/simulate-event
 * Triggers a real-time WebSocket event for demonstration and testing
 */
realtimeRouter.post('/simulate-event', async (req: Request, res: Response) => {
  try {
    const { eventType, stationId, customPayload } = req.body;

    if (eventType === 'STATION_STATUS_CHANGED') {
      const targetId = stationId || 'st-blr-01';
      const station = await stationRepository.findById(targetId);
      if (station) {
        // Toggle power or status for test
        const newStatus = station.overallStatus === 'AVAILABLE' ? 'PARTIALLY_AVAILABLE' : 'AVAILABLE';
        station.overallStatus = newStatus;
        realtimeHub.broadcastStationStatus(station);
        res.json({
          success: true,
          message: `Broadcasted STATION_STATUS_CHANGED for ${station.name}`,
          station
        });
        return;
      }
    } else if (eventType === 'EMERGENCY_REQUEST_SUBMITTED') {
      const payload = customPayload || {
        requestId: `sos-sim-${Date.now()}`,
        stationId: 'st-blr-10',
        stationName: 'The Oberoi Prestige Suites',
        driverName: 'Rohit Sharma (Nexon EV)',
        driverPhone: '+91 98765 43210',
        driverSocPct: 8,
        reason: 'Critically low SoC (8% remaining). Seeking SOS clearance to access private hotel DC fast charger.',
        status: 'PENDING'
      };
      realtimeHub.broadcastEmergencySubmitted(payload);
      res.json({
        success: true,
        message: 'Broadcasted EMERGENCY_REQUEST_SUBMITTED',
        payload
      });
      return;
    } else if (eventType === 'EMERGENCY_REQUEST_APPROVED') {
      const payload = customPayload || {
        requestId: `sos-sim-${Date.now()}`,
        stationId: 'st-blr-10',
        stationName: 'The Oberoi Prestige Suites',
        driverName: 'Rohit Sharma',
        driverPhone: '+91 98765 43210',
        driverSocPct: 8,
        reason: 'SOS hotel pass granted',
        status: 'APPROVED',
        pin: '9842',
        qrPayload: 'VOLTIQ-SOS-OBEROI-9842'
      };
      realtimeHub.broadcastEmergencyApproved(payload);
      res.json({
        success: true,
        message: 'Broadcasted EMERGENCY_REQUEST_APPROVED',
        payload
      });
      return;
    } else if (eventType === 'COMMUNITY_AUDIT_SUBMITTED') {
      const payload = customPayload || {
        stationId: stationId || 'st-blr-07',
        stationName: 'Shell Recharge - ITPL Main Rd',
        driverName: 'Pooja R. (Scout)',
        isChargerWorking: true,
        isGridPowerOn: true,
        submittedAt: new Date().toISOString()
      };
      realtimeHub.broadcastCommunityAudit(payload);
      res.json({
        success: true,
        message: 'Broadcasted COMMUNITY_AUDIT_SUBMITTED',
        payload
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: `Unknown or unhandled eventType: ${eventType}`
    });
  } catch (error) {
    console.error('Error simulating realtime event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to simulate realtime event'
    });
  }
});
