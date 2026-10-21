import { calculateHaversineDistanceKm, isWithinBoundingBox } from '../utils/geo.js';
import { computeTrustBreakdown } from '../utils/trustScore.js';
import type {
  ChargingStation,
  Connector,
  ConnectorType,
  OperationalStatus,
  PowerGridStatus
} from '../../../shared/types.js';

export interface StationFilterOptions {
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  workingOnly?: boolean;
  dcFastOnly?: boolean;
  emergencyOnly?: boolean;
  connectorType?: ConnectorType;
  minTrustScore?: number;
  operatorId?: string;
}

const seedStations: ChargingStation[] = [
  {
    id: 'st-blr-01',
    operatorId: 'op-tata-01',
    operatorName: 'Tata Power EZ Charge',
    name: 'Indiranagar Metro Hub Fast Charger',
    address: '100ft Road, Near Indiranagar Metro Station',
    landmark: 'Opposite Toit Brewpub',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9784,
    longitude: 77.6408,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: true,
    operatingHours: '24 Hours',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 94,
      reliabilityPct: 96,
      freshness: 'LIVE',
      lastVerifiedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      verificationCount24h: 18,
      activeComplaintsCount: 0,
      signals: {
        communityConfidence: 96,
        operatorStatusAgreement: true,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.98
      }
    },
    connectors: [
      {
        id: 'conn-01-a',
        stationId: 'st-blr-01',
        type: 'CCS2',
        maxPowerKw: 60,
        currentType: 'DC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 19.5
      },
      {
        id: 'conn-01-b',
        stationId: 'st-blr-01',
        type: 'CCS2',
        maxPowerKw: 60,
        currentType: 'DC',
        status: 'OCCUPIED',
        tariffPerKwhInr: 19.5
      }
    ],
    amenities: [
      { type: 'RESTROOM', name: 'Metro Public Washroom', isAvailable: true },
      { type: 'FOOD', name: 'Multiple Cafes within 50m', isAvailable: true },
      { type: 'SECURITY_24_7', name: 'CCTV & Guard on Site', isAvailable: true },
      { type: 'PARKING', name: 'Dedicated EV Bays (2)', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-02',
    operatorId: 'op-zeon-01',
    operatorName: 'Zeon Charging',
    name: 'Bangalore-Mysore Expressway Highway Oasis',
    address: 'NH 275, Bidadi Bypass Service Rd',
    landmark: 'Adjacent to McDonald\'s & HPCL Pump',
    city: 'Ramanagara',
    state: 'Karnataka',
    latitude: 12.7842,
    longitude: 77.4118,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: true,
    operatingHours: '24 Hours',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 97,
      reliabilityPct: 99,
      freshness: 'LIVE',
      lastVerifiedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      verificationCount24h: 34,
      activeComplaintsCount: 0,
      signals: {
        communityConfidence: 98,
        operatorStatusAgreement: true,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.99
      }
    },
    connectors: [
      {
        id: 'conn-02-a',
        stationId: 'st-blr-02',
        type: 'CCS2',
        maxPowerKw: 120,
        currentType: 'DC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 22.0
      },
      {
        id: 'conn-02-b',
        stationId: 'st-blr-02',
        type: 'CCS2',
        maxPowerKw: 120,
        currentType: 'DC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 22.0
      },
      {
        id: 'conn-02-c',
        stationId: 'st-blr-02',
        type: 'TYPE2',
        maxPowerKw: 22,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 15.0
      }
    ],
    amenities: [
      { type: 'FOOD', name: 'Food Court & Drive-thru', isAvailable: true },
      { type: 'RESTROOM', name: 'Clean Restrooms (Maintained)', isAvailable: true },
      { type: 'CAFE', name: 'Coffee Day Express', isAvailable: true },
      { type: 'PARKING', name: 'Wide 4-Bay EV Parking', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-03',
    operatorId: 'op-jio-01',
    operatorName: 'Jio-bp pulse',
    name: 'Electronic City Phase 1 Tech Corridor',
    address: 'Hosur Road, Electronics City Phase 1',
    landmark: 'Behind Infosys Gate 1',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.8452,
    longitude: 77.6602,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: true,
    operatingHours: '06:00 AM - 11:30 PM',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'PARTIALLY_AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 82,
      reliabilityPct: 88,
      freshness: 'RECENT',
      lastVerifiedAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
      verificationCount24h: 12,
      activeComplaintsCount: 1,
      signals: {
        communityConfidence: 85,
        operatorStatusAgreement: true,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.92
      }
    },
    connectors: [
      {
        id: 'conn-03-a',
        stationId: 'st-blr-03',
        type: 'CCS2',
        maxPowerKw: 50,
        currentType: 'DC',
        status: 'OCCUPIED',
        tariffPerKwhInr: 18.0
      },
      {
        id: 'conn-03-b',
        stationId: 'st-blr-03',
        type: 'TYPE2',
        maxPowerKw: 11,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 14.0
      }
    ],
    amenities: [
      { type: 'WIFI', name: 'Free Plaza Wi-Fi', isAvailable: true },
      { type: 'FOOD', name: 'Subway & Chai Point', isAvailable: true },
      { type: 'PARKING', name: 'Basement Visitor Parking', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-04',
    operatorId: 'op-statiq-01',
    operatorName: 'Statiq',
    name: 'Koramangala 5th Block EV Hub',
    address: 'Jyoti Nivas College Rd, 5th Block Koramangala',
    landmark: 'Near Empire Restaurant',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9348,
    longitude: 77.6189,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: false,
    operatingHours: '24 Hours',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'PARTIALLY_AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 64,
      reliabilityPct: 71,
      freshness: 'RECENT',
      lastVerifiedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      verificationCount24h: 8,
      activeComplaintsCount: 2,
      signals: {
        communityConfidence: 62,
        operatorStatusAgreement: false,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.94
      }
    },
    connectors: [
      {
        id: 'conn-04-a',
        stationId: 'st-blr-04',
        type: 'CCS2',
        maxPowerKw: 60,
        currentType: 'DC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 20.0
      },
      {
        id: 'conn-04-b',
        stationId: 'st-blr-04',
        type: 'CCS2',
        maxPowerKw: 60,
        currentType: 'DC',
        status: 'FAULTY',
        tariffPerKwhInr: 20.0
      }
    ],
    amenities: [
      { type: 'FOOD', name: 'Empire & Multiple Eateries', isAvailable: true },
      { type: 'PARKING', name: 'Street Level EV Bay', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-05',
    operatorId: 'op-ather-01',
    operatorName: 'Ather Grid',
    name: 'Koramangala 4th Block 2W Fast Hub',
    address: '80 Feet Road, 4th Block Koramangala',
    landmark: 'Next to Third Wave Coffee Roasters',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9345,
    longitude: 77.6256,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: true,
    operatingHours: '07:00 AM - 12:00 AM',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 89,
      reliabilityPct: 93,
      freshness: 'LIVE',
      lastVerifiedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      verificationCount24h: 21,
      activeComplaintsCount: 0,
      signals: {
        communityConfidence: 91,
        operatorStatusAgreement: true,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.97
      }
    },
    connectors: [
      {
        id: 'conn-05-a',
        stationId: 'st-blr-05',
        type: 'ATHER_GRID',
        maxPowerKw: 3.3,
        currentType: 'DC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 0.0
      },
      {
        id: 'conn-05-b',
        stationId: 'st-blr-05',
        type: '15A_3PIN',
        maxPowerKw: 3.3,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 10.0
      }
    ],
    amenities: [
      { type: 'CAFE', name: 'Third Wave Coffee Roasters', isAvailable: true },
      { type: 'PARKING', name: 'Dedicated 2W EV Bays (4)', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-06',
    operatorId: 'op-bescom-01',
    operatorName: 'BESCOM EV',
    name: 'Majestic Bus Stand Public Hub',
    address: 'Subhash Nagar, Tank Bund Rd',
    landmark: 'Near City Railway Station Exit 3',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9772,
    longitude: 77.5708,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: false,
    operatingHours: '24 Hours',
    powerGridStatus: 'REPORTED_CUT',
    overallStatus: 'FAULTY',
    isSimulatedData: false,
    trustScore: {
      score: 24,
      reliabilityPct: 41,
      freshness: 'LIVE',
      lastVerifiedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      verificationCount24h: 9,
      activeComplaintsCount: 4,
      signals: {
        communityConfidence: 15,
        operatorStatusAgreement: false,
        gridPowerConfirmed: false,
        staleDecayFactor: 0.98
      }
    },
    connectors: [
      {
        id: 'conn-06-a',
        stationId: 'st-blr-06',
        type: 'BHARAT_DC001',
        maxPowerKw: 15,
        currentType: 'DC',
        status: 'FAULTY',
        tariffPerKwhInr: 12.0
      },
      {
        id: 'conn-06-b',
        stationId: 'st-blr-06',
        type: 'CCS2',
        maxPowerKw: 25,
        currentType: 'DC',
        status: 'OFFLINE',
        tariffPerKwhInr: 16.0
      }
    ],
    amenities: [
      { type: 'RESTROOM', name: 'Bus Stand Public Facility', isAvailable: true },
      { type: 'FOOD', name: 'Railway Canteen', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-07',
    operatorId: 'op-shell-01',
    operatorName: 'Shell Recharge',
    name: 'Whitefield ITPL Main Road Hub',
    address: 'ITPL Main Road, Whitefield',
    landmark: 'Shell Petrol Station opposite Prestige Shantiniketan',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9865,
    longitude: 77.7289,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: true,
    operatingHours: '24 Hours',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 96,
      reliabilityPct: 98,
      freshness: 'LIVE',
      lastVerifiedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      verificationCount24h: 28,
      activeComplaintsCount: 0,
      signals: {
        communityConfidence: 97,
        operatorStatusAgreement: true,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.99
      }
    },
    connectors: [
      {
        id: 'conn-07-a',
        stationId: 'st-blr-07',
        type: 'CCS2',
        maxPowerKw: 120,
        currentType: 'DC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 23.5
      },
      {
        id: 'conn-07-b',
        stationId: 'st-blr-07',
        type: 'CCS2',
        maxPowerKw: 120,
        currentType: 'DC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 23.5
      },
      {
        id: 'conn-07-c',
        stationId: 'st-blr-07',
        type: 'TYPE2',
        maxPowerKw: 22,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 16.0
      }
    ],
    amenities: [
      { type: 'CAFE', name: 'Shell Select Deli2go Cafe', isAvailable: true },
      { type: 'RESTROOM', name: 'Clean Restroom with Baby Care', isAvailable: true },
      { type: 'SECURITY_24_7', name: '24/7 Station Lighting & Guard', isAvailable: true },
      { type: 'PARKING', name: 'Canopy Covered EV Bays', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-08',
    operatorId: 'op-kazam-01',
    operatorName: 'Kazam EV',
    name: 'HSR Layout Sector 2 Community Hub',
    address: '19th Main Rd, Sector 2, HSR Layout',
    landmark: 'Adjacent to Sector 2 BDA Complex',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9121,
    longitude: 77.6445,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: true,
    operatingHours: '06:00 AM - 11:00 PM',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 88,
      reliabilityPct: 91,
      freshness: 'RECENT',
      lastVerifiedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      verificationCount24h: 15,
      activeComplaintsCount: 0,
      signals: {
        communityConfidence: 90,
        operatorStatusAgreement: true,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.96
      }
    },
    connectors: [
      {
        id: 'conn-08-a',
        stationId: 'st-blr-08',
        type: 'TYPE2',
        maxPowerKw: 7.4,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 14.5
      },
      {
        id: 'conn-08-b',
        stationId: 'st-blr-08',
        type: '15A_3PIN',
        maxPowerKw: 3.3,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 11.0
      },
      {
        id: 'conn-08-c',
        stationId: 'st-blr-08',
        type: '15A_3PIN',
        maxPowerKw: 3.3,
        currentType: 'AC',
        status: 'OCCUPIED',
        tariffPerKwhInr: 11.0
      }
    ],
    amenities: [
      { type: 'FOOD', name: 'Udupi Upahar adjacent', isAvailable: true },
      { type: 'PARKING', name: 'Open Community Parking', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-09',
    operatorId: 'op-tata-01',
    operatorName: 'Tata Power EZ Charge',
    name: 'NH 275 Maddur Highway Dhaba Rest Stop',
    address: 'NH 275 Bengaluru-Mysuru Expressway, Maddur',
    landmark: 'Maddur Tiffany\'s Food Hub',
    city: 'Maddur',
    state: 'Karnataka',
    latitude: 12.5842,
    longitude: 77.0428,
    accessType: 'PUBLIC',
    emergencyAccessEnabled: true,
    operatingHours: '24 Hours',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 91,
      reliabilityPct: 94,
      freshness: 'RECENT',
      lastVerifiedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      verificationCount24h: 22,
      activeComplaintsCount: 0,
      signals: {
        communityConfidence: 93,
        operatorStatusAgreement: true,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.95
      }
    },
    connectors: [
      {
        id: 'conn-09-a',
        stationId: 'st-blr-09',
        type: 'CCS2',
        maxPowerKw: 60,
        currentType: 'DC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 21.0
      },
      {
        id: 'conn-09-b',
        stationId: 'st-blr-09',
        type: 'TYPE2',
        maxPowerKw: 7.2,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 15.0
      }
    ],
    amenities: [
      { type: 'FOOD', name: 'Famous Maddur Vada & Tiffany\'s', isAvailable: true },
      { type: 'RESTROOM', name: 'Dhaba Washrooms', isAvailable: true },
      { type: 'PARKING', name: 'Wide Highway Forecourt', isAvailable: true }
    ]
  },
  {
    id: 'st-blr-10',
    operatorId: 'op-private-01',
    operatorName: 'The Oberoi Prestige Suites',
    name: 'MG Road Executive Guest Charger',
    address: '37-39, MG Road, Ashok Nagar',
    landmark: 'Inside Hotel Valet Parking Area',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9734,
    longitude: 77.6186,
    accessType: 'PRIVATE_AUTHORIZED',
    emergencyAccessEnabled: true,
    operatingHours: '24 Hours (Guest & Authorized Emergency)',
    powerGridStatus: 'CONFIRMED_LIVE',
    overallStatus: 'AVAILABLE',
    isSimulatedData: false,
    trustScore: {
      score: 91,
      reliabilityPct: 94,
      freshness: 'RECENT',
      lastVerifiedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      verificationCount24h: 5,
      activeComplaintsCount: 0,
      signals: {
        communityConfidence: 92,
        operatorStatusAgreement: true,
        gridPowerConfirmed: true,
        staleDecayFactor: 0.96
      }
    },
    connectors: [
      {
        id: 'conn-10-a',
        stationId: 'st-blr-10',
        type: 'TYPE2',
        maxPowerKw: 22,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 25.0
      },
      {
        id: 'conn-10-b',
        stationId: 'st-blr-10',
        type: '15A_3PIN',
        maxPowerKw: 3.3,
        currentType: 'AC',
        status: 'AVAILABLE',
        tariffPerKwhInr: 15.0
      }
    ],
    amenities: [
      { type: 'SECURITY_24_7', name: 'Hotel 5-Star Valet & Security', isAvailable: true },
      { type: 'RESTROOM', name: 'Lobby Restroom (Authorized)', isAvailable: true },
      { type: 'CAFE', name: 'Lobby Lounge & Bakery', isAvailable: true }
    ]
  }
];

class StationRepository {
  private stations: ChargingStation[] = [...seedStations];

  public async findAll(): Promise<ChargingStation[]> {
    return [...this.stations];
  }

  public async findById(id: string): Promise<ChargingStation | null> {
    const station = this.stations.find(s => s.id === id);
    return station || null;
  }

  public async findNearby(filters: StationFilterOptions): Promise<ChargingStation[]> {
    let results = [...this.stations];

    // Bounding Box Filter (for Map Viewports)
    if (
      filters.minLat !== undefined &&
      filters.maxLat !== undefined &&
      filters.minLng !== undefined &&
      filters.maxLng !== undefined
    ) {
      results = results.filter(s =>
        isWithinBoundingBox(
          s.latitude,
          s.longitude,
          filters.minLat!,
          filters.maxLat!,
          filters.minLng!,
          filters.maxLng!
        )
      );
    }

    // Working Only Filter
    if (filters.workingOnly) {
      results = results.filter(
        s => s.overallStatus !== 'FAULTY' && s.overallStatus !== 'OFFLINE' && s.powerGridStatus !== 'REPORTED_CUT'
      );
    }

    // DC Fast Filter
    if (filters.dcFastOnly) {
      results = results.filter(s =>
        s.connectors.some(c => c.currentType === 'DC' && c.maxPowerKw >= 50)
      );
    }

    // Emergency Access Only Filter
    if (filters.emergencyOnly) {
      results = results.filter(s => s.emergencyAccessEnabled);
    }

    // Specific Connector Type Filter
    if (filters.connectorType) {
      results = results.filter(s =>
        s.connectors.some(c => c.type === filters.connectorType)
      );
    }

    // Minimum Trust Score Filter
    if (filters.minTrustScore !== undefined) {
      results = results.filter(s => s.trustScore.score >= filters.minTrustScore!);
    }

    // Operator ID Filter
    if (filters.operatorId) {
      results = results.filter(s => s.operatorId === filters.operatorId);
    }

    // Compute Haversine distance and sort if user coordinates provided
    if (filters.userLat !== undefined && filters.userLng !== undefined) {
      const uLat = filters.userLat;
      const uLng = filters.userLng;

      results = results.map(s => ({
        ...s,
        distanceKm: calculateHaversineDistanceKm(uLat, uLng, s.latitude, s.longitude)
      }));

      // Radial Distance Filter
      if (filters.radiusKm !== undefined) {
        results = results.filter(s => (s.distanceKm || 0) <= filters.radiusKm!);
      }

      // Sort ascending by distance
      results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return results;
  }

  public async create(newStation: Omit<ChargingStation, 'id'>): Promise<ChargingStation> {
    const id = `st-custom-${Date.now()}`;
    const station: ChargingStation = {
      ...newStation,
      id
    };
    this.stations.push(station);
    return station;
  }

  public async updateStatus(
    id: string,
    updates: {
      overallStatus?: OperationalStatus;
      powerGridStatus?: PowerGridStatus;
      emergencyAccessEnabled?: boolean;
      scoreDelta?: number;
    }
  ): Promise<ChargingStation | null> {
    const station = this.stations.find(s => s.id === id);
    if (!station) return null;

    if (updates.overallStatus) station.overallStatus = updates.overallStatus;
    if (updates.powerGridStatus) station.powerGridStatus = updates.powerGridStatus;
    if (updates.emergencyAccessEnabled !== undefined) {
      station.emergencyAccessEnabled = updates.emergencyAccessEnabled;
    }

    if (updates.scoreDelta !== undefined) {
      station.trustScore.score = Math.max(10, Math.min(100, station.trustScore.score + updates.scoreDelta));
      station.trustScore.lastVerifiedAt = new Date().toISOString();
      station.trustScore.freshness = 'LIVE';
      station.trustScore.verificationCount24h += 1;
    }

    return station;
  }

  public async applyVerificationAudit(
    stationId: string,
    audit: {
      isChargerWorking: boolean;
      isGridPowerOn: boolean;
      isBayFree: boolean;
      confidenceWeight: number;
    }
  ): Promise<ChargingStation | null> {
    const station = this.stations.find(s => s.id === stationId);
    if (!station) return null;

    const isWorking = audit.isChargerWorking && audit.isGridPowerOn;

    // Shift community confidence signal
    const confidenceShift = isWorking ? 6 * audit.confidenceWeight : -22 * audit.confidenceWeight;
    station.trustScore.signals.communityConfidence = Math.max(
      10,
      Math.min(100, Math.round(station.trustScore.signals.communityConfidence + confidenceShift))
    );

    // Update power & status
    if (!audit.isGridPowerOn) {
      station.powerGridStatus = 'REPORTED_CUT';
      station.overallStatus = 'FAULTY';
      station.trustScore.signals.gridPowerConfirmed = false;
    } else {
      station.powerGridStatus = 'CONFIRMED_LIVE';
      station.trustScore.signals.gridPowerConfirmed = true;
      if (audit.isChargerWorking) {
        station.overallStatus = station.connectors.some(c => c.status === 'FAULTY')
          ? 'PARTIALLY_AVAILABLE'
          : 'AVAILABLE';
      } else {
        station.overallStatus = 'FAULTY';
      }
    }

    // Refresh state
    station.trustScore.lastVerifiedAt = new Date().toISOString();
    station.trustScore.freshness = 'LIVE';
    station.trustScore.verificationCount24h += 1;
    station.trustScore.signals.staleDecayFactor = 1.0; // reset decay

    // Recompute trust score using mathematical model
    const breakdown = computeTrustBreakdown(station);
    station.trustScore.score = breakdown.overallScore;
    station.trustScore.reliabilityPct = breakdown.reliabilityPct;

    return station;
  }

  public async getConnectors(stationId: string): Promise<Connector[] | null> {
    const station = await this.findById(stationId);
    return station ? station.connectors : null;
  }

  public async getFleetMetrics() {
    const total = this.stations.length;
    const operational = this.stations.filter(
      s => s.overallStatus === 'AVAILABLE' || s.overallStatus === 'PARTIALLY_AVAILABLE'
    ).length;
    const degraded = this.stations.filter(
      s => s.overallStatus === 'PARTIALLY_AVAILABLE' || s.trustScore.score < 70
    ).length;
    const critical = this.stations.filter(
      s => s.overallStatus === 'FAULTY' || s.powerGridStatus === 'REPORTED_CUT'
    ).length;
    const avgTrustScore = Math.round(
      this.stations.reduce((acc, s) => acc + s.trustScore.score, 0) / (total || 1)
    );

    return {
      totalStations: total,
      operationalCount: operational,
      degradedCount: degraded,
      criticalCount: critical,
      averageTrustScore: avgTrustScore,
      powerCutsReported: this.stations.filter(s => s.powerGridStatus === 'REPORTED_CUT').length,
      emergencyAccessPoints: this.stations.filter(s => s.emergencyAccessEnabled).length
    };
  }
}

export const stationRepository = new StationRepository();
