import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { stationRepository } from '../repositories/stationRepository.js';
import { realtimeHub } from '../services/realtimeHub.js';

export const ticketRouter = Router();

const createTicketSchema = z.object({
  stationId: z.string().min(1),
  stationName: z.string().min(1),
  operatorId: z.string().min(1),
  reportedBy: z.string().default('Operator Manual Dispatch'),
  faultCategory: z.enum(['GUN_DAMAGED', 'SCREEN_DEAD', 'GRID_TRIPPED', 'SOFTWARE_LOCK', 'BAY_OBSTRUCTED']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  description: z.string().min(5),
  assignedTechnician: z.string().optional(),
  slaTargetHours: z.number().positive().optional()
});

const dispatchSchema = z.object({
  technicianName: z.string().min(2),
  slaHours: z.number().positive().default(4)
});

const resolveSchema = z.object({
  resolutionNotes: z.string().min(5),
  repairProofUrl: z.string().optional()
});

/**
 * GET /api/tickets
 * List all maintenance tickets
 */
ticketRouter.get('/', async (req: Request, res: Response) => {
  try {
    let tickets = await ticketRepository.findAll();

    if (req.query.status) {
      tickets = tickets.filter(t => t.status === req.query.status);
    }
    if (req.query.stationId) {
      tickets = tickets.filter(t => t.stationId === req.query.stationId);
    }
    if (req.query.priority) {
      tickets = tickets.filter(t => t.priority === req.query.priority);
    }

    res.json({
      success: true,
      total: tickets.length,
      tickets
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve tickets' });
  }
});

/**
 * POST /api/tickets
 * Create a new maintenance ticket
 */
ticketRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid ticket payload'
      });
      return;
    }

    const ticket = await ticketRepository.create(parseResult.data);

    // If critical fault, set station to FAULTY / MAINTENANCE
    if (ticket.priority === 'CRITICAL' || ticket.faultCategory === 'GRID_TRIPPED') {
      await stationRepository.updateStatus(ticket.stationId, {
        overallStatus: 'FAULTY',
        powerGridStatus: ticket.faultCategory === 'GRID_TRIPPED' ? 'REPORTED_CUT' : undefined
      });
    }

    res.status(201).json({
      success: true,
      ticket,
      message: `Incident Ticket ${ticket.id} created with ${ticket.slaTargetHours}h SLA.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

/**
 * PUT /api/tickets/:id/dispatch
 * Dispatch high-voltage technician to site with SLA window
 */
ticketRouter.put('/:id/dispatch', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = dispatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid dispatch payload'
      });
      return;
    }

    const { technicianName, slaHours } = parseResult.data;
    const updated = await ticketRepository.dispatchTechnician(req.params.id, technicianName, slaHours);

    if (!updated) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    res.json({
      success: true,
      ticket: updated,
      message: `Technician ${technicianName} dispatched. Target SLA: ${slaHours} hours.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to dispatch technician' });
  }
});

/**
 * PUT /api/tickets/:id/resolve
 * Verify technician repair proof, resolve ticket, and restore station trust score
 */
ticketRouter.put('/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = resolveSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid resolution payload'
      });
      return;
    }

    const { resolutionNotes, repairProofUrl } = parseResult.data;
    const ticket = await ticketRepository.resolveTicket(req.params.id, resolutionNotes, repairProofUrl);

    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    // Automatically recover station operational health and trust score!
    const restoredStation = await stationRepository.updateStatus(ticket.stationId, {
      overallStatus: 'AVAILABLE',
      powerGridStatus: 'CONFIRMED_LIVE',
      scoreDelta: 45 // Recover trust score
    });

    if (restoredStation) {
      realtimeHub.broadcastStationStatus(restoredStation);
    }

    res.json({
      success: true,
      ticket,
      station: restoredStation,
      message: `Ticket ${ticket.id} resolved with verified repair proof. Station ${restoredStation?.name || ''} trust restored to operational!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to resolve ticket' });
  }
});
