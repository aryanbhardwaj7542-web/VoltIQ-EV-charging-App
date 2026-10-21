import bcrypt from 'bcryptjs';
import type { UserAccount, UserSession, VehicleProfile, RegisterPayload, UpdateVehiclePayload } from '../../../shared/types.js';

// Pre-hashed passwords generated with bcrypt.hashSync('...', 10)
// Driver@123 -> $2a$10$w6DqWkC0Bsz7M8p2J8J0O.mK4P2Q0P0O0P0O0P0O0P0O0P0O0P0O0 (we can use bcrypt.hashSync at startup for guaranteed validity)
const driverHash = bcrypt.hashSync('Driver@123', 10);
const operatorHash = bcrypt.hashSync('Operator@123', 10);
const adminHash = bcrypt.hashSync('Admin@123', 10);

const initialUsers: UserAccount[] = [
  {
    id: 'usr-driver-01',
    email: 'driver@voltiq.in',
    passwordHash: driverHash,
    fullName: 'Rohit Sharma',
    phone: '+91 98765 43210',
    role: 'DRIVER',
    reputationScore: 0.94,
    energyPoints: 480,
    createdAt: new Date('2026-01-15T09:00:00Z').toISOString(),
    updatedAt: new Date().toISOString(),
    primaryVehicle: {
      id: 'veh-01',
      userId: 'usr-driver-01',
      make: 'Tata',
      model: 'Nexon EV Max',
      category: '4W',
      supportedConnectors: ['CCS2', 'TYPE2'],
      batteryCapacityKwh: 40.5,
      maxChargeRateKw: 50,
      currentEstimatedSocPct: 18,
      estimatedRangeKm: 52,
      isPrimary: true
    }
  },
  {
    id: 'usr-operator-01',
    email: 'operator@tatapower.in',
    passwordHash: operatorHash,
    fullName: 'Ananya Deshmukh',
    phone: '+91 98111 22334',
    role: 'OPERATOR',
    reputationScore: 0.98,
    energyPoints: 1250,
    createdAt: new Date('2025-11-10T10:30:00Z').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'usr-operator-02',
    email: 'operator@voltiq.in',
    passwordHash: operatorHash,
    fullName: 'Ananya Deshmukh',
    phone: '+91 98111 22334',
    role: 'OPERATOR',
    reputationScore: 0.98,
    energyPoints: 1250,
    createdAt: new Date('2025-11-10T10:30:00Z').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'usr-admin-01',
    email: 'admin@voltiq.in',
    passwordHash: adminHash,
    fullName: 'Vikramaditya Rao',
    phone: '+91 99000 88776',
    role: 'ADMIN',
    reputationScore: 1.0,
    energyPoints: 5000,
    createdAt: new Date('2025-08-01T08:00:00Z').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'usr-driver-99',
    email: 'akash.verma@example.com',
    passwordHash: driverHash,
    fullName: 'Akash Verma',
    phone: '+91 98450 11223',
    role: 'DRIVER',
    reputationScore: 0.20,
    energyPoints: 90,
    createdAt: new Date('2026-02-01T10:00:00Z').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'usr-driver-88',
    email: 'rajat.sen@example.com',
    passwordHash: driverHash,
    fullName: 'Rajat Sen',
    phone: '+91 98451 99887',
    role: 'DRIVER',
    reputationScore: 0.15,
    energyPoints: 40,
    createdAt: new Date('2026-02-15T14:00:00Z').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class UserRepository {
  private users: UserAccount[] = [...initialUsers];

  public async findAll(): Promise<UserSession[]> {
    return this.users.map(u => this.toSession(u));
  }

  public async updateReputation(userId: string, newScore: number): Promise<UserSession | null> {
    const user = this.users.find(u => u.id === userId);
    if (!user) return null;
    user.reputationScore = Math.max(0.1, Math.min(1.0, Number(newScore.toFixed(2))));
    user.updatedAt = new Date().toISOString();
    return this.toSession(user);
  }

  public async findByEmail(email: string): Promise<UserAccount | null> {
    const normalized = email.trim().toLowerCase();
    const user = this.users.find(u => u.email.toLowerCase() === normalized);
    return user || null;
  }

  public async findById(id: string): Promise<UserAccount | null> {
    const user = this.users.find(u => u.id === id);
    return user || null;
  }

  public async create(
    payload: RegisterPayload,
    passwordHash: string
  ): Promise<UserAccount> {
    const newId = `usr-${Date.now()}`;
    const now = new Date().toISOString();

    let primaryVehicle: VehicleProfile | undefined = undefined;
    if (payload.vehicle) {
      primaryVehicle = {
        id: `veh-${Date.now()}`,
        userId: newId,
        make: payload.vehicle.make,
        model: payload.vehicle.model,
        category: payload.vehicle.category,
        supportedConnectors: payload.vehicle.supportedConnectors || ['CCS2'],
        batteryCapacityKwh: payload.vehicle.batteryCapacityKwh || 40,
        maxChargeRateKw: payload.vehicle.maxChargeRateKw || 50,
        currentEstimatedSocPct: payload.vehicle.currentEstimatedSocPct ?? 50,
        estimatedRangeKm: payload.vehicle.estimatedRangeKm || 120,
        isPrimary: true
      };
    }

    const newUser: UserAccount = {
      id: newId,
      email: payload.email.trim().toLowerCase(),
      passwordHash,
      fullName: payload.fullName.trim(),
      phone: payload.phone,
      role: payload.role,
      reputationScore: payload.role === 'DRIVER' ? 0.50 : 0.80,
      energyPoints: 50, // Welcome bonus points
      createdAt: now,
      updatedAt: now,
      primaryVehicle
    };

    this.users.push(newUser);
    return newUser;
  }

  public async updateVehicle(
    userId: string,
    vehicleData: UpdateVehiclePayload
  ): Promise<VehicleProfile | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    if (!user.primaryVehicle) {
      user.primaryVehicle = {
        id: `veh-${Date.now()}`,
        userId: user.id,
        make: vehicleData.make || 'Tata',
        model: vehicleData.model || 'EV',
        category: vehicleData.category || '4W',
        supportedConnectors: vehicleData.supportedConnectors || ['CCS2'],
        batteryCapacityKwh: vehicleData.batteryCapacityKwh || 40,
        maxChargeRateKw: vehicleData.maxChargeRateKw || 50,
        currentEstimatedSocPct: vehicleData.currentEstimatedSocPct ?? 50,
        estimatedRangeKm: vehicleData.estimatedRangeKm || 120,
        isPrimary: true
      };
    } else {
      user.primaryVehicle = {
        ...user.primaryVehicle,
        ...vehicleData
      };
    }

    user.updatedAt = new Date().toISOString();
    return user.primaryVehicle;
  }

  public async addEnergyPoints(userId: string, points: number): Promise<number> {
    const user = await this.findById(userId);
    if (!user) return 0;
    user.energyPoints = (user.energyPoints || 0) + points;
    user.updatedAt = new Date().toISOString();
    return user.energyPoints;
  }

  public toSession(user: UserAccount): UserSession {
    const { passwordHash: _, ...session } = user;
    return session;
  }
}

export const userRepository = new UserRepository();
