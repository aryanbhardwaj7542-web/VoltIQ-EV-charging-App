import type { EmergencyRequest } from '../../../shared/types.js';

export interface CreateSosPayload {
  userId: string;
  stationId: string;
  stationName: string;
  userLat: number;
  userLng: number;
  driverSocPct: number;
  estimatedRemainingKm: number;
  notes?: string;
  isPrivateAuthorized?: boolean;
}

export interface SosResponseWithPass {
  request: EmergencyRequest;
  gatePassCode?: string;
  instructions?: string;
}

class EmergencyRepository {
  private requests: EmergencyRequest[] = [
    {
      id: 'sos-req-seed-01',
      userId: 'usr-driver-01',
      stationId: 'st-blr-10',
      stationName: 'The Oberoi Prestige Suites - MG Road',
      userLat: 12.9734,
      userLng: 77.6186,
      driverSocPct: 8,
      estimatedRemainingKm: 14,
      status: 'ACCEPTED',
      requestedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      respondedAt: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
      hostNotes: 'Temporary gate access authorized by Hotel Valet Security. Bay 2 cleared.'
    }
  ];

  public async findAll(): Promise<EmergencyRequest[]> {
    return [...this.requests];
  }

  public async findByUserId(userId: string): Promise<EmergencyRequest[]> {
    return this.requests.filter(r => r.userId === userId);
  }

  public async findByStationId(stationId: string): Promise<EmergencyRequest[]> {
    return this.requests.filter(r => r.stationId === stationId);
  }

  public async create(payload: CreateSosPayload): Promise<SosResponseWithPass> {
    const id = `sos-${Date.now()}`;
    const now = new Date().toISOString();

    // Generate 4-digit security code for hotel/society gate clearance
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const gatePassCode = `PASS-SOS-${randomCode}`;

    const newRequest: EmergencyRequest = {
      id,
      userId: payload.userId,
      stationId: payload.stationId,
      stationName: payload.stationName,
      userLat: payload.userLat,
      userLng: payload.userLng,
      driverSocPct: payload.driverSocPct,
      estimatedRemainingKm: payload.estimatedRemainingKm,
      status: payload.isPrivateAuthorized ? 'ACCEPTED' : 'PENDING',
      requestedAt: now,
      respondedAt: payload.isPrivateAuthorized ? now : undefined,
      hostNotes: payload.isPrivateAuthorized
        ? `Emergency Gate Clearance Issued (${gatePassCode}). Valid for 60 minutes.`
        : payload.notes
    };

    this.requests.unshift(newRequest);

    return {
      request: newRequest,
      gatePassCode: payload.isPrivateAuthorized ? gatePassCode : undefined,
      instructions: payload.isPrivateAuthorized
        ? 'Show this clearance pass to the hotel valet or society security guard. The emergency 22 kW Type 2 bay is reserved for your vehicle.'
        : 'Emergency alert dispatched to station operator. Stand by for operator confirmation.'
    };
  }

  public async updateStatus(id: string, status: EmergencyRequest['status'], notes?: string): Promise<EmergencyRequest | null> {
    const req = this.requests.find(r => r.id === id);
    if (!req) return null;
    req.status = status;
    req.respondedAt = new Date().toISOString();
    if (notes) req.hostNotes = notes;
    return req;
  }
}

export const emergencyRepository = new EmergencyRepository();
