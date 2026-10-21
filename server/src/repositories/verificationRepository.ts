import type { VerificationReport } from '../../../shared/types.js';

const initialVerifications: VerificationReport[] = [
  {
    id: 'vrf-flagged-01',
    stationId: 'st-blr-01',
    userId: 'usr-driver-99',
    userName: 'Akash Verma (Remote Ping)',
    isChargerWorking: true,
    isGridPowerOn: true,
    isBayFree: true,
    isParkingAvailable: true,
    hasPhysicalDamage: false,
    comment: 'Suspected remote farming: Submitted from home 4.8 km away outside geofence boundary.',
    photoUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=80',
    submittedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    submitterLat: 13.0185,
    submitterLng: 77.6809,
    distanceMeters: 4850,
    confidenceWeight: 0.08,
    isProximityVerified: false,
    moderationStatus: 'FLAGGED'
  },
  {
    id: 'vrf-flagged-02',
    stationId: 'st-blr-07',
    userId: 'usr-driver-88',
    userName: 'Rajat Sen (Sybil Probe)',
    isChargerWorking: false,
    isGridPowerOn: false,
    isBayFree: false,
    isParkingAvailable: false,
    hasPhysicalDamage: true,
    comment: 'Claimed total power cut at Shell ITPL, but 5 consecutive on-site drivers charged at 120 kW.',
    photoUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&auto=format&fit=crop&q=80',
    submittedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    submitterLat: 12.9985,
    submitterLng: 77.7409,
    distanceMeters: 1420,
    confidenceWeight: 0.12,
    isProximityVerified: false,
    moderationStatus: 'FLAGGED'
  },
  {
    id: 'vrf-01',
    stationId: 'st-blr-01',
    userId: 'usr-driver-01',
    userName: 'Rohit Sharma',
    isChargerWorking: true,
    isGridPowerOn: true,
    isBayFree: true,
    isParkingAvailable: true,
    hasPhysicalDamage: false,
    comment: 'Charging Nexon EV Max at 52 kW smoothly. Washroom clean and cafe open.',
    photoUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=80',
    submittedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    submitterLat: 12.9785,
    submitterLng: 77.6409,
    distanceMeters: 28,
    confidenceWeight: 0.94,
    isProximityVerified: true,
    moderationStatus: 'APPROVED'
  },
  {
    id: 'vrf-02',
    stationId: 'st-blr-01',
    userId: 'usr-driver-02',
    userName: 'Priya Sundaram',
    isChargerWorking: true,
    isGridPowerOn: true,
    isBayFree: true,
    isParkingAvailable: true,
    hasPhysicalDamage: false,
    comment: 'Gun 2 CCS2 working perfectly, initiated on Tata Power EZ app in 15 seconds.',
    photoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    submittedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    submitterLat: 12.9784,
    submitterLng: 77.6407,
    distanceMeters: 45,
    confidenceWeight: 0.88,
    isProximityVerified: true,
    moderationStatus: 'APPROVED'
  },
  {
    id: 'vrf-03',
    stationId: 'st-blr-06',
    userId: 'usr-driver-03',
    userName: 'Karthik Rao',
    isChargerWorking: false,
    isGridPowerOn: false,
    isBayFree: false,
    isParkingAvailable: true,
    hasPhysicalDamage: false,
    comment: 'BESCOM transformer feeder has tripped. Station completely dark. Diesel cabs parked in bay.',
    photoUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&auto=format&fit=crop&q=80',
    submittedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    submitterLat: 12.9768,
    submitterLng: 77.5714,
    distanceMeters: 38,
    confidenceWeight: 0.92,
    isProximityVerified: true,
    moderationStatus: 'APPROVED'
  },
  {
    id: 'vrf-04',
    stationId: 'st-blr-02',
    userId: 'usr-driver-01',
    userName: 'Rohit Sharma',
    isChargerWorking: true,
    isGridPowerOn: true,
    isBayFree: true,
    isParkingAvailable: true,
    hasPhysicalDamage: false,
    comment: 'Great highway stop on Expressway. 120 kW dual gun functioning at peak rate.',
    photoUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=80',
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    submitterLat: 12.8241,
    submitterLng: 77.3998,
    distanceMeters: 22,
    confidenceWeight: 0.95,
    isProximityVerified: true,
    moderationStatus: 'APPROVED'
  }
];

export class VerificationRepository {
  private verifications: VerificationReport[] = [...initialVerifications];

  public async create(
    reportData: Omit<VerificationReport, 'id' | 'submittedAt'>
  ): Promise<VerificationReport> {
    const newReport: VerificationReport = {
      ...reportData,
      id: `vrf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submittedAt: new Date().toISOString()
    };

    this.verifications.unshift(newReport);
    return newReport;
  }

  public async findAll(): Promise<VerificationReport[]> {
    return [...this.verifications];
  }

  public async findFlagged(): Promise<VerificationReport[]> {
    return this.verifications.filter(v => v.moderationStatus === 'FLAGGED');
  }

  public async findByStationId(stationId: string): Promise<VerificationReport[]> {
    return this.verifications.filter(v => v.stationId === stationId);
  }

  public async findRecent(limit = 20): Promise<VerificationReport[]> {
    return this.verifications.slice(0, limit);
  }

  public async updateModerationStatus(
    id: string,
    status: 'APPROVED' | 'FLAGGED' | 'REJECTED'
  ): Promise<VerificationReport | null> {
    const report = this.verifications.find(v => v.id === id);
    if (!report) return null;
    report.moderationStatus = status;
    return report;
  }
}

export const verificationRepository = new VerificationRepository();
