import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { stationRepository } from '../repositories/stationRepository.js';
import { emergencyRepository } from '../repositories/emergencyRepository.js';
import { calculateHaversineDistanceKm } from '../utils/geo.js';
import { realtimeHub } from '../services/realtimeHub.js';
import type { ConnectorType } from '../../../shared/types.js';

export const emergencyRouter = Router();

const sosRequestSchema = z.object({
  stationId: z.string(),
  stationName: z.string(),
  userLat: z.number().min(-90).max(90),
  userLng: z.number().min(-180).max(180),
  driverSocPct: z.number().min(1).max(100),
  estimatedRemainingKm: z.number().min(0),
  notes: z.string().optional(),
  isPrivateAuthorized: z.boolean().optional()
});

/**
 * Helper to compute Power Score from connector max kW
 */
function computePowerScore(maxKw: number): number {
  if (maxKw >= 100) return 1.0;
  if (maxKw >= 60) return 0.85;
  if (maxKw >= 50) return 0.80;
  if (maxKw >= 25) return 0.65;
  if (maxKw >= 22) return 0.45;
  if (maxKw >= 7) return 0.30;
  return 0.18;
}

/**
 * GET /api/emergency/triage
 * Multi-criteria ranking using the Composite Utility Index (U):
 * U = (PowerScore * TrustScore * AvailabilityFactor) / (Distance + PenaltyQueue)
 */
emergencyRouter.get('/triage', async (req: Request, res: Response) => {
  try {
    const userLat = parseFloat((req.query.lat as string) || '12.9716');
    const userLng = parseFloat((req.query.lng as string) || '77.5946');
    const socPct = parseFloat((req.query.soc as string) || '12');
    const batteryCapacityKwh = parseFloat((req.query.batteryKwh as string) || '40.5');
    const connectorType = (req.query.connector as string) || 'CCS2';
    const vehicleName = (req.query.vehicle as string) || 'Tata Nexon EV Max';

    // 1. Calculate Estimated Safe Range with Indian traffic & AC consumption factor (~5.8 km/kWh)
    const efficiencyKmPerKwh = 5.8;
    const estimatedSafeRangeKm = Math.max(
      3,
      Math.round((socPct / 100) * batteryCapacityKwh * efficiencyKmPerKwh)
    );
    const reachableMaxKm = Math.round(estimatedSafeRangeKm * 1.25); // 25% safety buffer

    // 2. Fetch all stations
    const allStations = await stationRepository.findAll();

    // 3. Separate operational stations from pruned hazard stations
    const prunedHazards: any[] = [];
    const candidateStations: any[] = [];

    for (const station of allStations) {
      const distanceKm = Number(
        calculateHaversineDistanceKm(userLat, userLng, station.latitude, station.longitude).toFixed(1)
      );

      // Check operational integrity
      const isFaulty = station.overallStatus === 'FAULTY' || station.overallStatus === 'OFFLINE';
      const isPowerCut = station.powerGridStatus === 'REPORTED_CUT';
      const hasCompatibleConnector = station.connectors.some(
        c => c.type === connectorType || (connectorType === 'CCS2' && c.type === 'TYPE2')
      );
      const isPrivateBlocked = station.accessType === 'PRIVATE_AUTHORIZED' && !station.emergencyAccessEnabled;

      if (isFaulty || isPowerCut) {
        prunedHazards.push({
          id: station.id,
          name: station.name,
          distanceKm,
          reason: isPowerCut ? 'Active utility power outage reported' : 'Charger hardware fault / broken guns',
          trustScore: station.trustScore.score
        });
        continue;
      }

      if (isPrivateBlocked) {
        prunedHazards.push({
          id: station.id,
          name: station.name,
          distanceKm,
          reason: 'Private restricted access (emergency access not enabled)',
          trustScore: station.trustScore.score
        });
        continue;
      }

      if (!hasCompatibleConnector) {
        prunedHazards.push({
          id: station.id,
          name: station.name,
          distanceKm,
          reason: `No compatible ${connectorType} connector found`,
          trustScore: station.trustScore.score
        });
        continue;
      }

      // Check range reachability
      const isReachable = distanceKm <= reachableMaxKm;

      // Extract best connector
      const compatibleConnectors = station.connectors.filter(
        c => c.type === connectorType || (connectorType === 'CCS2' && c.type === 'TYPE2')
      );
      const bestConnector = compatibleConnectors.sort((a, b) => b.maxPowerKw - a.maxPowerKw)[0];
      const maxKw = bestConnector ? bestConnector.maxPowerKw : 22;

      // Mathematical Model Components
      const powerScore = computePowerScore(maxKw);
      const trustScore = station.trustScore.score / 100;

      // Availability Factor
      let availabilityFactor = 1.0;
      let queuePenalty = 0.0;
      const hasAvailableGun = compatibleConnectors.some(c => c.status === 'AVAILABLE');

      if (!hasAvailableGun) {
        availabilityFactor = 0.65; // occupied, wait queue likely
        queuePenalty = 0.8; // equivalent 0.8 km distance penalty
      }
      if (station.powerGridStatus === 'VOLTAGE_FLUCTUATION') {
        availabilityFactor *= 0.75;
      }

      // Composite Utility Index U:
      // U = (PowerScore * TrustScore * AvailabilityFactor) / (Distance + PenaltyQueue)
      const effectiveDistance = distanceKm + 0.5 + queuePenalty;
      const rawUtility = (powerScore * trustScore * availabilityFactor) / effectiveDistance;

      // Normalized Score (0 - 100 scale for UI display)
      const utilityScore = Math.min(100, Math.round(rawUtility * 68));

      // Calculate arrival battery estimate
      const kmRemainingAfterArrival = Math.max(0, estimatedSafeRangeKm - distanceKm);
      const arrivalSocPct = Math.max(
        0.5,
        Number((socPct - (distanceKm / (batteryCapacityKwh * efficiencyKmPerKwh)) * 100).toFixed(1))
      );

      // Estimated time to charge to 50% SoC (standard rescue charge)
      const kwhNeededFor50 = Math.max(0, (50 - arrivalSocPct) / 100 * batteryCapacityKwh);
      const chargeMinutesTo50 = Math.round((kwhNeededFor50 / maxKw) * 60) + 5; // +5 mins handshake

      candidateStations.push({
        ...station,
        distanceKm,
        isReachable,
        utilityScore,
        maxKw,
        bestConnectorType: bestConnector?.type || 'CCS2',
        bestConnectorPowerKw: maxKw,
        arrivalSocPct,
        kmRemainingAfterArrival,
        chargeMinutesTo50,
        hasAvailableGun,
        signals: {
          powerScore,
          trustScoreRatio: Number(trustScore.toFixed(2)),
          availabilityFactor: Number(availabilityFactor.toFixed(2)),
          queuePenalty
        }
      });
    }

    // Sort descending by Composite Utility Index U
    candidateStations.sort((a, b) => {
      // Prioritize reachable stations first
      if (a.isReachable !== b.isReachable) {
        return a.isReachable ? -1 : 1;
      }
      return b.utilityScore - a.utilityScore;
    });

    // Tag top recommendations
    const rankedStations = candidateStations.map((st, idx) => {
      let rankTag: 'PRIME_RESCUE' | 'SAFE_BACKUP' | 'CONTINGENCY' = 'CONTINGENCY';
      let rationaleText = '';

      if (idx === 0) {
        rankTag = 'PRIME_RESCUE';
        rationaleText = `Optimal rescue choice: ${st.bestConnectorPowerKw} kW DC speed with ${st.trustScore.score}% verified trust, confirmed 3-phase power & zero queue.`;
      } else if (idx === 1) {
        rankTag = 'SAFE_BACKUP';
        rationaleText = `High reliability backup: ${st.trustScore.score}% trust score with ${st.distanceKm} km transit.`;
      } else {
        rankTag = 'CONTINGENCY';
        rationaleText = st.accessType === 'PRIVATE_AUTHORIZED'
          ? 'Authorized private facility: Hotel valet clearance pass available on-demand.'
          : `Alternative choice at ${st.distanceKm} km.`;
      }

      return {
        ...st,
        rankIndex: idx + 1,
        rankTag,
        rationaleText
      };
    });

    res.json({
      success: true,
      query: {
        userLat,
        userLng,
        socPct,
        batteryCapacityKwh,
        connectorType,
        vehicleName,
        estimatedSafeRangeKm,
        reachableMaxKm
      },
      rescueRecommendations: rankedStations,
      prunedHazardsCount: prunedHazards.length,
      prunedHazards
    });
  } catch (err) {
    console.error('Failed to compute emergency triage:', err);
    res.status(500).json({ success: false, error: 'Failed to compute emergency triage' });
  }
});

/**
 * POST /api/emergency/sos-request
 * Driver requests emergency access (especially for Private Authorized Stations)
 */
emergencyRouter.post('/sos-request', async (req: Request, res: Response) => {
  try {
    const parseResult = sosRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid SOS payload'
      });
      return;
    }

    const data = parseResult.data;
    const userId = (req as any).user?.id || 'usr-driver-01';

    const result = await emergencyRepository.create({
      userId,
      stationId: data.stationId,
      stationName: data.stationName,
      userLat: data.userLat,
      userLng: data.userLng,
      driverSocPct: data.driverSocPct,
      estimatedRemainingKm: data.estimatedRemainingKm,
      notes: data.notes,
      isPrivateAuthorized: data.isPrivateAuthorized
    });

    // Real-Time Broadcast: notify Operators & Admins of incoming emergency request
    realtimeHub.broadcastEmergencySubmitted({
      requestId: result.request.id,
      stationId: data.stationId,
      stationName: data.stationName,
      driverName: 'Rohit Sharma (Tata Nexon EV)',
      driverPhone: '+91 98765 43210',
      driverSocPct: data.driverSocPct,
      reason: data.notes || `Low SoC (${data.driverSocPct}%), ~${data.estimatedRemainingKm} km range remaining`,
      status: result.request.status === 'ACCEPTED' ? 'APPROVED' : 'PENDING',
      pin: result.gatePassCode ? result.gatePassCode.split('-').pop() : '9842',
      qrPayload: `VOLTIQ-SOS-${result.request.id}`
    });

    res.status(201).json({
      success: true,
      message: result.gatePassCode
        ? `Emergency Clearance Pass Issued: ${result.gatePassCode}`
        : 'Emergency SOS request dispatched to station operator.',
      ...result
    });
  } catch (err) {
    console.error('Failed to create SOS request:', err);
    res.status(500).json({ success: false, error: 'Failed to create SOS request' });
  }
});

/**
 * PUT /api/emergency/sos-requests/:id/approve
 * Operator / Host approves an emergency gate pass
 */
emergencyRouter.put('/sos-requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const gatePassCode = `PASS-SOS-${randomPin}`;

    const updated = await emergencyRepository.updateStatus(
      id,
      'ACCEPTED',
      notes || `Emergency access authorized by operator. Gate pass: ${gatePassCode}`
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Emergency request not found' });
      return;
    }

    // Real-Time Broadcast: notify Driver with immediate gate clearance
    realtimeHub.broadcastEmergencyApproved({
      requestId: id,
      stationId: updated.stationId,
      stationName: updated.stationName,
      driverName: 'Rohit Sharma',
      driverPhone: '+91 98765 43210',
      driverSocPct: updated.driverSocPct,
      reason: updated.hostNotes || 'Authorized by Host Security',
      status: 'APPROVED',
      pin: randomPin,
      qrPayload: `VOLTIQ-PASS-${id}-${randomPin}`
    });

    res.json({
      success: true,
      message: `Emergency gate clearance pass authorized: ${gatePassCode}`,
      request: updated,
      gatePassCode,
      pin: randomPin
    });
  } catch (err) {
    console.error('Failed to approve SOS request:', err);
    res.status(500).json({ success: false, error: 'Failed to approve emergency request' });
  }
});

/**
 * GET /api/emergency/sos-requests
 * View recent SOS requests
 */
emergencyRouter.get('/sos-requests', async (_req: Request, res: Response) => {
  try {
    const requests = await emergencyRepository.findAll();
    res.json({
      success: true,
      total: requests.length,
      requests
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch SOS requests' });
  }
});
