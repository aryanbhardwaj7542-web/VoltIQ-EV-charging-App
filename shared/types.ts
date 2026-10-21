/**
 * VoltIQ - Indian EV Charging Intelligence & Reliability Platform
 * Shared Domain Models & Type Definitions
 */

export type UserRole = 'DRIVER' | 'OPERATOR' | 'TECHNICIAN' | 'ADMIN';

export type FreshnessState = 'LIVE' | 'RECENT' | 'STALE' | 'UNCERTAIN';

export type PowerGridStatus = 'CONFIRMED_LIVE' | 'REPORTED_CUT' | 'VOLTAGE_FLUCTUATION' | 'UNKNOWN';

export type OperationalStatus = 'AVAILABLE' | 'OCCUPIED' | 'PARTIALLY_AVAILABLE' | 'FAULTY' | 'MAINTENANCE' | 'OFFLINE';

export type ConnectorType =
  | 'CCS2'
  | 'TYPE2'
  | 'BHARAT_DC001'
  | 'BHARAT_AC001'
  | 'ATHER_GRID'
  | 'OLA_HYPERCHARGER'
  | '15A_3PIN'
  | 'CHADEMO';

export type VehicleCategory = '2W' | '3W' | '4W';

export interface VehicleProfile {
  id: string;
  userId: string;
  make: string;
  model: string;
  category: VehicleCategory;
  supportedConnectors: ConnectorType[];
  batteryCapacityKwh: number;
  maxChargeRateKw: number;
  currentEstimatedSocPct: number; // State of Charge (e.g. 12%)
  estimatedRangeKm: number;
  isPrimary: boolean;
}

export interface Connector {
  id: string;
  stationId: string;
  type: ConnectorType;
  maxPowerKw: number;
  currentType: 'AC' | 'DC';
  status: 'AVAILABLE' | 'OCCUPIED' | 'FAULTY' | 'OFFLINE';
  tariffPerKwhInr: number;
}

export interface Amenity {
  type: 'FOOD' | 'RESTROOM' | 'WIFI' | 'SHOPPING' | 'PARKING' | 'SECURITY_24_7' | 'CAFE';
  name: string;
  isAvailable: boolean;
}

export interface DynamicTrustScore {
  score: number; // 0 to 100
  reliabilityPct: number; // 0 to 100%
  freshness: FreshnessState;
  lastVerifiedAt: string; // ISO string
  verificationCount24h: number;
  activeComplaintsCount: number;
  signals: {
    communityConfidence: number; // 0-100
    operatorStatusAgreement: boolean;
    gridPowerConfirmed: boolean;
    staleDecayFactor: number; // 0.0 to 1.0
  };
}

export interface ChargingStation {
  id: string;
  operatorId: string;
  operatorName: string;
  name: string;
  address: string;
  landmark: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  accessType: 'PUBLIC' | 'PRIVATE_AUTHORIZED' | 'RESIDENTIAL_RESTRICTED';
  emergencyAccessEnabled: boolean;
  operatingHours: string;
  connectors: Connector[];
  amenities: Amenity[];
  powerGridStatus: PowerGridStatus;
  overallStatus: OperationalStatus;
  trustScore: DynamicTrustScore;
  distanceKm?: number;
  isSimulatedData?: boolean;
}

export interface VerificationAnswer {
  isChargerWorking: boolean;
  isGridPowerOn: boolean;
  isBayFree: boolean;
  isParkingAvailable: boolean;
  hasPhysicalDamage: boolean;
  comment?: string;
  photoUrl?: string;
}

export interface VerificationReport extends VerificationAnswer {
  id: string;
  stationId: string;
  userId: string;
  userName: string;
  submittedAt: string;
  submitterLat: number;
  submitterLng: number;
  distanceMeters: number;
  confidenceWeight: number; // 0.0 to 1.0
  isProximityVerified: boolean;
  moderationStatus: 'APPROVED' | 'FLAGGED' | 'REJECTED';
}

export interface EmergencyRequest {
  id: string;
  userId: string;
  stationId: string;
  stationName: string;
  userLat: number;
  userLng: number;
  driverSocPct: number;
  estimatedRemainingKm: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  requestedAt: string;
  respondedAt?: string;
  hostNotes?: string;
}

export interface MaintenanceTicket {
  id: string;
  stationId: string;
  stationName: string;
  operatorId: string;
  reportedBy: string;
  faultCategory: 'GUN_DAMAGED' | 'SCREEN_DEAD' | 'GRID_TRIPPED' | 'SOFTWARE_LOCK' | 'BAY_OBSTRUCTED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'PARTS_ORDERED' | 'RESOLVED';
  description: string;
  createdAt: string;
  resolvedAt?: string;
  assignedTechnician?: string;
  slaTargetHours?: number;
  slaDeadline?: string;
  repairProofUrl?: string;
  resolutionNotes?: string;
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  reputationScore: number;
  energyPoints: number;
  primaryVehicle?: VehicleProfile;
}

export interface UserAccount extends UserSession {
  passwordHash: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserSession;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  vehicle?: Omit<VehicleProfile, 'id' | 'userId' | 'isPrimary'>;
}

export interface UpdateVehiclePayload {
  make?: string;
  model?: string;
  category?: VehicleCategory;
  supportedConnectors?: ConnectorType[];
  batteryCapacityKwh?: number;
  maxChargeRateKw?: number;
  currentEstimatedSocPct?: number;
  estimatedRangeKm?: number;
}

// ==========================================
// PHASE 10: PREDICTIVE ANALYTICS & PATTERN DETECTION
// ==========================================
export type FailureModeCode =
  | 'GRID_VOLTAGE_SAG_PHASE_DROP'
  | 'THERMAL_DERATING_AND_OVERHEAT'
  | 'DISPENSER_COMM_TIMEOUT_OCPP'
  | 'BAY_ICING_AND_OBSTRUCTION'
  | 'CONNECTOR_LATCH_SOLENOID_JAM';

export type PredictiveRiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface HourlyDemandPrediction {
  hour: number; // 0 - 23
  expectedOccupancyPct: number; // 0 - 100
  expectedWaitMinutes: number;
  gridSagRiskPct: number;
}

export interface FailurePatternAnalysis {
  stationId: string;
  stationName: string;
  failureRiskPct: number; // 0 - 100
  riskTier: PredictiveRiskTier;
  primaryFailureSignature: FailureModeCode;
  signatureTitle: string;
  signatureDescription: string;
  rootCauseTelemetry: {
    voltageStabilityScore: number; // 0 - 100 (e.g. 74% = frequent sag below 380V)
    thermalDerateRiskPct: number;  // 0 - 100
    ocppHeartbeatLatencyMs: number; // ping latency (ms)
    recurrentFailureIntervalHours: number; // e.g. every 16 hrs
  };
  recommendedIntervention: string;
  suggestedActionDeadline: string;
  preventiveMaintStatus: 'SCHEDULED' | 'PENDING' | 'OVERDUE' | 'NORMAL';
  hourlyDemandForecast: HourlyDemandPrediction[];
  peakWindow: {
    startHour: number;
    endHour: number;
    peakWaitMinutes: number;
    recommendedAlternativeTime: string;
  };
}

export interface PredictiveAnalyticsSummary {
  networkHealthIndex: number; // 0 - 100 (e.g. 88.5%)
  stationsAtHighRiskCount: number;
  preventiveInterventionsRequiredCount: number;
  topFailureMode: FailureModeCode;
  topFailureModeLabel: string;
  patternInsights: string[];
  stationPredictions: FailurePatternAnalysis[];
}

// ==========================================
// PHASE 11: REAL-TIME COMMUNICATION (WEBSOCKETS)
// ==========================================
export type WebSocketEventType =
  | 'STATION_STATUS_CHANGED'
  | 'EMERGENCY_REQUEST_SUBMITTED'
  | 'EMERGENCY_REQUEST_APPROVED'
  | 'COMMUNITY_AUDIT_SUBMITTED'
  | 'PREVENTIVE_DISPATCH_SCHEDULED'
  | 'SYSTEM_HEARTBEAT'
  | 'CONNECTED';

export interface WebSocketMessage<T = any> {
  type: WebSocketEventType;
  payload: T;
  timestamp: string;
}

export interface EmergencyAccessBroadcast {
  requestId: string;
  stationId: string;
  stationName: string;
  driverName: string;
  driverPhone: string;
  driverSocPct: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  pin?: string;
  qrPayload?: string;
}
