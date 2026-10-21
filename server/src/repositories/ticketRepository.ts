import type { MaintenanceTicket } from '../../../shared/types.js';

export interface CreateTicketPayload {
  stationId: string;
  stationName: string;
  operatorId: string;
  reportedBy: string;
  faultCategory: MaintenanceTicket['faultCategory'];
  priority: MaintenanceTicket['priority'];
  description: string;
  assignedTechnician?: string;
  slaTargetHours?: number;
}

const seedTickets: MaintenanceTicket[] = [
  {
    id: 'tkt-01-majestic',
    stationId: 'st-blr-06',
    stationName: 'Majestic Bus Stand Public Hub',
    operatorId: 'op-bescom-01',
    reportedBy: 'Driver Community Verification (Vinod K.)',
    faultCategory: 'GRID_TRIPPED',
    priority: 'CRITICAL',
    status: 'OPEN',
    description: 'Local utility distribution transformer cut. Station power dropped to 0V. Screen dark.',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    slaTargetHours: 2,
    slaDeadline: new Date(Date.now() + 80 * 60 * 1000).toISOString()
  },
  {
    id: 'tkt-02-koramangala',
    stationId: 'st-blr-04',
    stationName: 'Koramangala 5th Block EV Hub',
    operatorId: 'op-statiq-01',
    reportedBy: 'Driver Field Audit (Pooja R.)',
    faultCategory: 'GUN_DAMAGED',
    priority: 'HIGH',
    status: 'INVESTIGATING',
    description: 'CCS2 Gun #2 latch cracked and fails to lock onto EV inlet. Gun #1 operating normally.',
    createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    assignedTechnician: 'Ramesh Kumar (HV Senior Tech)',
    slaTargetHours: 4,
    slaDeadline: new Date(Date.now() + 130 * 60 * 1000).toISOString()
  },
  {
    id: 'tkt-03-indiranagar',
    stationId: 'st-blr-01',
    stationName: 'Indiranagar Metro Hub Fast Charger',
    operatorId: 'op-tata-01',
    reportedBy: 'Routine Operator Telemetry Check',
    faultCategory: 'BAY_OBSTRUCTED',
    priority: 'LOW',
    status: 'RESOLVED',
    description: 'Commercial petrol taxi parked over Bay 1. Cleared by Metro security guard on duty.',
    createdAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    assignedTechnician: 'Metro Station Security',
    slaTargetHours: 12,
    resolutionNotes: 'Security cones deployed. Bay cleared and free for charging.',
    repairProofUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80'
  }
];

class TicketRepository {
  private tickets: MaintenanceTicket[] = [...seedTickets];

  public async findAll(): Promise<MaintenanceTicket[]> {
    return [...this.tickets];
  }

  public async findById(id: string): Promise<MaintenanceTicket | null> {
    const t = this.tickets.find(ticket => ticket.id === id);
    return t || null;
  }

  public async findByStationId(stationId: string): Promise<MaintenanceTicket[]> {
    return this.tickets.filter(t => t.stationId === stationId);
  }

  public async create(payload: CreateTicketPayload): Promise<MaintenanceTicket> {
    const id = `tkt-${Date.now()}`;
    const now = new Date();
    const slaHours = payload.slaTargetHours || (payload.priority === 'CRITICAL' ? 2 : payload.priority === 'HIGH' ? 4 : 12);
    const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000).toISOString();

    const newTicket: MaintenanceTicket = {
      id,
      stationId: payload.stationId,
      stationName: payload.stationName,
      operatorId: payload.operatorId,
      reportedBy: payload.reportedBy,
      faultCategory: payload.faultCategory,
      priority: payload.priority,
      status: payload.assignedTechnician ? 'INVESTIGATING' : 'OPEN',
      description: payload.description,
      createdAt: now.toISOString(),
      assignedTechnician: payload.assignedTechnician,
      slaTargetHours: slaHours,
      slaDeadline
    };

    this.tickets.unshift(newTicket);
    return newTicket;
  }

  public async dispatchTechnician(
    id: string,
    technicianName: string,
    slaHours: number
  ): Promise<MaintenanceTicket | null> {
    const ticket = this.tickets.find(t => t.id === id);
    if (!ticket) return null;

    ticket.assignedTechnician = technicianName;
    ticket.status = 'INVESTIGATING';
    ticket.slaTargetHours = slaHours;
    ticket.slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

    return ticket;
  }

  public async resolveTicket(
    id: string,
    resolutionNotes: string,
    repairProofUrl?: string
  ): Promise<MaintenanceTicket | null> {
    const ticket = this.tickets.find(t => t.id === id);
    if (!ticket) return null;

    ticket.status = 'RESOLVED';
    ticket.resolvedAt = new Date().toISOString();
    ticket.resolutionNotes = resolutionNotes;
    if (repairProofUrl) {
      ticket.repairProofUrl = repairProofUrl;
    }

    return ticket;
  }
}

export const ticketRepository = new TicketRepository();
