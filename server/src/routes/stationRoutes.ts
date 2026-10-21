import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { stationRepository, StationFilterOptions } from '../repositories/stationRepository.js';
import { verificationRepository } from '../repositories/verificationRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { calculateHaversineDistanceKm } from '../utils/geo.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { computeTrustBreakdown } from '../utils/trustScore.js';
import { realtimeHub } from '../services/realtimeHub.js';
import type { ConnectorType, OperationalStatus, PowerGridStatus } from '../../../shared/types.js';

export const stationRouter = Router();

const verificationSchema = z.object({
  isChargerWorking: z.boolean(),
  isGridPowerOn: z.boolean(),
  isBayFree: z.boolean(),
  isParkingAvailable: z.boolean(),
  hasPhysicalDamage: z.boolean(),
  submitterLat: z.number().min(-90).max(90),
  submitterLng: z.number().min(-180).max(180),
  comment: z.string().optional(),
  photoUrl: z.string().optional()
});

const statusUpdateSchema = z.object({
  overallStatus: z.enum(['AVAILABLE', 'OCCUPIED', 'PARTIALLY_AVAILABLE', 'FAULTY', 'MAINTENANCE', 'OFFLINE']).optional(),
  powerGridStatus: z.enum(['CONFIRMED_LIVE', 'REPORTED_CUT', 'VOLTAGE_FLUCTUATION', 'UNKNOWN']).optional(),
  emergencyAccessEnabled: z.boolean().optional(),
  scoreDelta: z.number().optional()
});

const createStationSchema = z.object({
  name: z.string().min(3),
  operatorId: z.string().min(2),
  operatorName: z.string().min(2),
  address: z.string().min(5),
  landmark: z.string(),
  city: z.string(),
  state: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accessType: z.enum(['PUBLIC', 'PRIVATE_AUTHORIZED', 'RESIDENTIAL_RESTRICTED']),
  emergencyAccessEnabled: z.boolean().default(false),
  operatingHours: z.string().default('24 Hours'),
  connectors: z.array(z.object({
    id: z.string(),
    stationId: z.string(),
    type: z.enum(['CCS2', 'TYPE2', 'BHARAT_DC001', 'BHARAT_AC001', 'ATHER_GRID', 'OLA_HYPERCHARGER', '15A_3PIN', 'CHADEMO']),
    maxPowerKw: z.number().positive(),
    currentType: z.enum(['AC', 'DC']),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'FAULTY', 'OFFLINE']),
    tariffPerKwhInr: z.number().nonnegative()
  })),
  amenities: z.array(z.object({
    type: z.enum(['FOOD', 'RESTROOM', 'WIFI', 'SHOPPING', 'PARKING', 'SECURITY_24_7', 'CAFE']),
    name: z.string(),
    isAvailable: z.boolean()
  })),
  powerGridStatus: z.enum(['CONFIRMED_LIVE', 'REPORTED_CUT', 'VOLTAGE_FLUCTUATION', 'UNKNOWN']).default('CONFIRMED_LIVE'),
  overallStatus: z.enum(['AVAILABLE', 'OCCUPIED', 'PARTIALLY_AVAILABLE', 'FAULTY', 'MAINTENANCE', 'OFFLINE']).default('AVAILABLE'),
  trustScore: z.object({
    score: z.number().min(0).max(100),
    reliabilityPct: z.number().min(0).max(100),
    freshness: z.enum(['LIVE', 'RECENT', 'STALE', 'UNCERTAIN']),
    lastVerifiedAt: z.string(),
    verificationCount24h: z.number().nonnegative(),
    activeComplaintsCount: z.number().nonnegative(),
    signals: z.object({
      communityConfidence: z.number(),
      operatorStatusAgreement: z.boolean(),
      gridPowerConfirmed: z.boolean(),
      staleDecayFactor: z.number()
    })
  })
});

/**
 * GET /api/stations
 * Supports spatial radius search, bounding-box viewport queries, and status filtering
 */
stationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters: StationFilterOptions = {};

    if (req.query.lat && req.query.lng) {
      filters.userLat = parseFloat(req.query.lat as string);
      filters.userLng = parseFloat(req.query.lng as string);
    }

    if (req.query.radiusKm) {
      filters.radiusKm = parseFloat(req.query.radiusKm as string);
    }

    if (req.query.minLat && req.query.maxLat && req.query.minLng && req.query.maxLng) {
      filters.minLat = parseFloat(req.query.minLat as string);
      filters.maxLat = parseFloat(req.query.maxLat as string);
      filters.minLng = parseFloat(req.query.minLng as string);
      filters.maxLng = parseFloat(req.query.maxLng as string);
    }

    if (req.query.workingOnly === 'true') {
      filters.workingOnly = true;
    }

    if (req.query.dcFastOnly === 'true') {
      filters.dcFastOnly = true;
    }

    if (req.query.emergencyOnly === 'true') {
      filters.emergencyOnly = true;
    }

    if (req.query.connectorType) {
      filters.connectorType = req.query.connectorType as ConnectorType;
    }

    if (req.query.minTrustScore) {
      filters.minTrustScore = parseInt(req.query.minTrustScore as string, 10);
    }

    if (req.query.operatorId) {
      filters.operatorId = req.query.operatorId as string;
    }

    const stations = await stationRepository.findNearby(filters);

    res.json({
      success: true,
      total: stations.length,
      referenceCoords: filters.userLat !== undefined ? { lat: filters.userLat, lng: filters.userLng } : null,
      stations
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve stations' });
  }
});

/**
 * GET /api/stations/:id
 * Retrieve full details for a single station
 */
stationRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const station = await stationRepository.findById(req.params.id);
  if (!station) {
    res.status(404).json({ success: false, error: 'Station not found' });
    return;
  }
  res.json({ success: true, station });
});

/**
 * GET /api/stations/:id/trust-breakdown
 * Returns transparent mathematical breakdown of the multi-factor trust score
 */
stationRouter.get('/:id/trust-breakdown', async (req: Request, res: Response): Promise<void> => {
  const station = await stationRepository.findById(req.params.id);
  if (!station) {
    res.status(404).json({ success: false, error: 'Station not found' });
    return;
  }
  const breakdown = computeTrustBreakdown(station);
  res.json({ success: true, breakdown });
});

/**
 * GET /api/stations/:id/connectors
 * Retrieve connector list and real-time statuses
 */
stationRouter.get('/:id/connectors', async (req: Request, res: Response): Promise<void> => {
  const connectors = await stationRepository.getConnectors(req.params.id);
  if (!connectors) {
    res.status(404).json({ success: false, error: 'Station not found' });
    return;
  }
  res.json({ success: true, connectors });
});

/**
 * POST /api/stations/:id/verify
 * Protected: Authenticated Drivers submit on-site verification audits
 * Computes Haversine distance geofencing and anti-fraud confidence weighting
 */
stationRouter.post(
  '/:id/verify',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const station = await stationRepository.findById(req.params.id);
    if (!station) {
      res.status(404).json({ success: false, error: 'Station not found' });
      return;
    }

    const parseResult = verificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid verification payload'
      });
      return;
    }

    const data = parseResult.data;
    const user = req.user!;

    // 1. Calculate Haversine distance in meters
    const distKm = calculateHaversineDistanceKm(
      data.submitterLat,
      data.submitterLng,
      station.latitude,
      station.longitude
    );
    const distanceMeters = Math.round(distKm * 1000);

    // 2. Anti-fraud proximity evaluation:
    // <= 150m: Proximity Verified (Full weight w = 1.0 * R_u, +25 pts)
    // <= 500m: Perimeter Warning (w = 0.5 * R_u, +10 pts)
    // > 500m: Remote Flagged (w = 0.1 * R_u, 0 pts, flagged)
    let proximityFactor = 1.0;
    let isProximityVerified = true;
    let pointsToAward = 25;
    let moderationStatus: 'APPROVED' | 'FLAGGED' | 'REJECTED' = 'APPROVED';

    if (distanceMeters <= 150) {
      proximityFactor = 1.0;
      isProximityVerified = true;
      pointsToAward = 25;
      moderationStatus = 'APPROVED';
    } else if (distanceMeters <= 500) {
      proximityFactor = 0.5;
      isProximityVerified = true;
      pointsToAward = 10;
      moderationStatus = 'APPROVED';
    } else {
      proximityFactor = 0.1;
      isProximityVerified = false;
      pointsToAward = 0;
      moderationStatus = 'FLAGGED';
    }

    // 3. User reputation factor
    const userReputation = user.reputationScore || 0.8;
    const confidenceWeight = Number((userReputation * proximityFactor).toFixed(2));

    // 4. Record verification report in repository
    const report = await verificationRepository.create({
      stationId: station.id,
      userId: user.id,
      userName: user.fullName || 'Verified Driver',
      isChargerWorking: data.isChargerWorking,
      isGridPowerOn: data.isGridPowerOn,
      isBayFree: data.isBayFree,
      isParkingAvailable: data.isParkingAvailable,
      hasPhysicalDamage: data.hasPhysicalDamage,
      comment: data.comment,
      photoUrl: data.photoUrl,
      submitterLat: data.submitterLat,
      submitterLng: data.submitterLng,
      distanceMeters,
      confidenceWeight,
      isProximityVerified,
      moderationStatus
    });

    // 5. Update station status & trust score
    const updatedStation = await stationRepository.applyVerificationAudit(station.id, {
      isChargerWorking: data.isChargerWorking,
      isGridPowerOn: data.isGridPowerOn,
      isBayFree: data.isBayFree,
      confidenceWeight
    });

    if (updatedStation) {
      realtimeHub.broadcastStationStatus(updatedStation);
      realtimeHub.broadcastCommunityAudit({
        stationId: station.id,
        stationName: station.name,
        driverName: user.fullName || 'Verified Driver',
        isChargerWorking: data.isChargerWorking,
        isGridPowerOn: data.isGridPowerOn,
        submittedAt: new Date().toISOString()
      });
    }

    // 6. Award Energy Points to driver
    let updatedEnergyPoints = user.energyPoints;
    if (pointsToAward > 0) {
      updatedEnergyPoints = await userRepository.addEnergyPoints(user.id, pointsToAward);
    }

    res.status(201).json({
      success: true,
      message: isProximityVerified
        ? `Audit verified on-site (${distanceMeters}m)! +${pointsToAward} Energy Points earned.`
        : `Remote report recorded (${distanceMeters}m away). Flagged for community consensus review.`,
      verification: report,
      station: updatedStation,
      pointsAwarded: pointsToAward,
      newEnergyPoints: updatedEnergyPoints,
      distanceMeters,
      confidenceWeight
    });
  }
);

/**
 * GET /api/stations/:id/verifications
 * Retrieve recent community audit reports for a station
 */
stationRouter.get('/:id/verifications', async (req: Request, res: Response): Promise<void> => {
  const verifications = await verificationRepository.findByStationId(req.params.id);
  res.json({
    success: true,
    total: verifications.length,
    verifications
  });
});

/**
 * POST /api/stations
 * Protected: Registered Operator / Platform Admin only
 */
stationRouter.post(
  '/',
  requireAuth,
  requireRole('OPERATOR', 'ADMIN'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parseResult = createStationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid station data'
      });
      return;
    }

    const created = await stationRepository.create(parseResult.data as any);
    res.status(201).json({
      success: true,
      station: created,
      message: 'New station registered successfully.'
    });
  }
);

/**
 * PUT /api/stations/:id/status
 * Protected: Operator / Admin only
 * Allows updating operational status, power grid status, or toggling emergency access
 */
stationRouter.put(
  '/:id/status',
  requireAuth,
  requireRole('OPERATOR', 'ADMIN'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parseResult = statusUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid status updates'
      });
      return;
    }

    const updated = await stationRepository.updateStatus(req.params.id, parseResult.data as {
      overallStatus?: OperationalStatus;
      powerGridStatus?: PowerGridStatus;
      emergencyAccessEnabled?: boolean;
      scoreDelta?: number;
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Station not found' });
      return;
    }

    res.json({
      success: true,
      station: updated,
      message: `Station ${updated.name} status updated successfully.`
    });
  }
);
