import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verificationRepository } from '../repositories/verificationRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { stationRepository } from '../repositories/stationRepository.js';

export const adminRouter = Router();

const moderateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'FLAGGED']),
  penalizeUser: z.boolean().optional(),
  reason: z.string().optional()
});

const reputationSchema = z.object({
  reputationScore: z.number().min(0.1).max(1.0)
});

const resolveDisputeSchema = z.object({
  action: z.enum(['UPHOLD_COMMUNITY', 'REQUIRE_TECH_PROOF', 'OVERRIDE_OPERATOR']),
  notes: z.string().optional()
});

// In-memory Dispute Store
interface StationDispute {
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

const initialDisputes: StationDispute[] = [
  {
    id: 'dsp-01-majestic',
    stationId: 'st-blr-06',
    stationName: 'Majestic Bus Stand Public Hub',
    operatorName: 'BESCOM EV',
    operatorClaim: 'Operator marked station 100% Operational via telemetry heartbeat.',
    communityClaim: '4 consecutive physically on-site drivers reported local utility feeder line cut and dark display.',
    reportedAuditsCount: 4,
    averageSubmitterDistanceMeters: 28,
    status: 'PENDING_REVIEW'
  }
];

let activeDisputes: StationDispute[] = [...initialDisputes];

/**
 * GET /api/admin/metrics
 * System-wide governance, trust integrity, and surveillance KPIs
 */
adminRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const allReports = await verificationRepository.findAll();
    const flaggedReports = await verificationRepository.findFlagged();
    const stations = await stationRepository.findAll();
    const users = await userRepository.findAll();

    const onSiteAudits = allReports.filter(r => r.isProximityVerified).length;
    const remoteSpoofBlocked = allReports.filter(r => !r.isProximityVerified || r.distanceMeters > 500).length;
    const privateSites = stations.filter(s => s.accessType === 'PRIVATE_AUTHORIZED').length;

    res.json({
      success: true,
      metrics: {
        trustIntegrityRate: 99.4,
        totalVerifications: allReports.length,
        onSiteAuditsCount: onSiteAudits,
        remoteSpoofBlockedCount: remoteSpoofBlocked,
        flaggedModerationQueueCount: flaggedReports.length,
        activeDisputesCount: activeDisputes.filter(d => d.status === 'PENDING_REVIEW').length,
        registeredUsersCount: users.length,
        privateAuthorizedSitesCount: privateSites
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve admin metrics' });
  }
});

/**
 * GET /api/admin/verifications
 * Community report moderation queue
 */
adminRouter.get('/verifications', async (req: Request, res: Response) => {
  try {
    let reports = await verificationRepository.findAll();

    if (req.query.status) {
      reports = reports.filter(r => r.moderationStatus === req.query.status);
    }

    res.json({
      success: true,
      total: reports.length,
      verifications: reports
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve moderation queue' });
  }
});

/**
 * PUT /api/admin/verifications/:id/moderate
 * Moderate audit report (Approve or Reject spoof attempts)
 */
adminRouter.put('/verifications/:id/moderate', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = moderateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid moderation payload'
      });
      return;
    }

    const { status, penalizeUser, reason } = parseResult.data;
    const report = await verificationRepository.updateModerationStatus(req.params.id, status);

    if (!report) {
      res.status(404).json({ success: false, error: 'Verification report not found' });
      return;
    }

    // Penalize fraudulent user if requested
    let updatedReputation: number | undefined = undefined;
    if (penalizeUser) {
      const penalized = await userRepository.updateReputation(report.userId, 0.10);
      if (penalized) updatedReputation = penalized.reputationScore;
    }

    res.json({
      success: true,
      report,
      message: `Report ${report.id} marked as ${status}.${penalizeUser ? ' User reputation penalized to 0.10.' : ''}`,
      updatedReputation,
      reason
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to moderate verification report' });
  }
});

/**
 * GET /api/admin/users
 * User directory with reputation scores and reward points
 */
adminRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await userRepository.findAll();
    res.json({
      success: true,
      total: users.length,
      users
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve users' });
  }
});

/**
 * PUT /api/admin/users/:id/reputation
 * Adjust user reputation score (R_i)
 */
adminRouter.put('/users/:id/reputation', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = reputationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid reputation score'
      });
      return;
    }

    const { reputationScore } = parseResult.data;
    const updated = await userRepository.updateReputation(req.params.id, reputationScore);

    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: updated,
      message: `User ${updated.fullName} reputation updated to ${updated.reputationScore}x.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update user reputation' });
  }
});

/**
 * GET /api/admin/disputes
 * Active disputes between operators and driver consensus
 */
adminRouter.get('/disputes', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    total: activeDisputes.length,
    disputes: activeDisputes
  });
});

/**
 * PUT /api/admin/disputes/:id/resolve
 * Resolve dispute: Uphold community consensus or require technician proof
 */
adminRouter.put('/disputes/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = resolveDisputeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid dispute resolution payload'
      });
      return;
    }

    const dispute = activeDisputes.find(d => d.id === req.params.id);
    if (!dispute) {
      res.status(404).json({ success: false, error: 'Dispute record not found' });
      return;
    }

    const { action, notes } = parseResult.data;
    const now = new Date().toISOString();

    if (action === 'UPHOLD_COMMUNITY') {
      dispute.status = 'COMMUNITY_UPHELD';
      dispute.adminNotes = notes || 'Community consensus verified. Station locked as FAULTY/Power Cut until operator uploads proof.';
      await stationRepository.updateStatus(dispute.stationId, {
        overallStatus: 'FAULTY',
        powerGridStatus: 'REPORTED_CUT'
      });
    } else if (action === 'REQUIRE_TECH_PROOF') {
      dispute.status = 'TECH_PROOF_REQUIRED';
      dispute.adminNotes = notes || 'Operator issued SLA ticket. Station held in DISPUTED state until repair photo verified.';
    } else if (action === 'OVERRIDE_OPERATOR') {
      dispute.status = 'OPERATOR_RESTORED';
      dispute.adminNotes = notes || 'Operator evidence accepted. Station restored to Available.';
      await stationRepository.updateStatus(dispute.stationId, {
        overallStatus: 'AVAILABLE',
        powerGridStatus: 'CONFIRMED_LIVE'
      });
    }

    dispute.resolvedAt = now;

    res.json({
      success: true,
      dispute,
      message: `Dispute ${dispute.id} resolved with action: ${action}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to resolve dispute' });
  }
});
