import { Router, Request, Response } from 'express';
import { predictiveEngine } from '../services/predictiveEngine.js';

export const analyticsRouter = Router();

/**
 * GET /api/analytics/predictive
 * Returns platform-wide predictive analytics, failure patterns, and risk breakdown
 */
analyticsRouter.get('/predictive', async (_req: Request, res: Response) => {
  try {
    const summary = await predictiveEngine.getNetworkSummary();
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching predictive network summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute predictive network analytics'
    });
  }
});

/**
 * GET /api/analytics/predictive/:stationId
 * Returns station-specific 24-hour demand forecast and failure pattern diagnostics
 */
analyticsRouter.get('/predictive/:stationId', async (req: Request, res: Response) => {
  try {
    const { stationId } = req.params;
    const analysis = await predictiveEngine.getAnalysisForStation(stationId);
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error fetching station predictive analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute station predictive analysis'
    });
  }
});

/**
 * POST /api/analytics/predictive/:stationId/preventive-dispatch
 * Dispatches a preventive maintenance technician before failure occurs
 */
analyticsRouter.post('/predictive/:stationId/preventive-dispatch', async (req: Request, res: Response) => {
  try {
    const { stationId } = req.params;
    const { technicianName, notes } = req.body;

    const result = await predictiveEngine.schedulePreventiveDispatch(stationId, technicianName, notes);
    res.json({
      success: true,
      message: 'Preventive service technician dispatched successfully. Pre-fault risk index mitigated.',
      analysis: result.updatedAnalysis,
      ticketId: result.ticketId
    });
  } catch (error) {
    console.error('Error dispatching preventive technician:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule preventive service dispatch'
    });
  }
});
