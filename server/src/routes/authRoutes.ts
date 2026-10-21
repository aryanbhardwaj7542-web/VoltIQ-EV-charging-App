import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { userRepository } from '../repositories/userRepository.js';
import { generateToken, requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import type { RegisterPayload, UpdateVehiclePayload } from '../../../shared/types.js';

export const authRouter = Router();

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['DRIVER', 'OPERATOR', 'TECHNICIAN', 'ADMIN']).default('DRIVER'),
  phone: z.string().optional(),
  vehicle: z.object({
    make: z.string(),
    model: z.string(),
    category: z.enum(['2W', '3W', '4W']),
    supportedConnectors: z.array(z.string() as any),
    batteryCapacityKwh: z.number().positive(),
    maxChargeRateKw: z.number().positive(),
    currentEstimatedSocPct: z.number().min(0).max(100).optional(),
    estimatedRangeKm: z.number().positive().optional()
  }).optional()
});

const updateVehicleSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  category: z.enum(['2W', '3W', '4W']).optional(),
  supportedConnectors: z.array(z.string() as any).optional(),
  batteryCapacityKwh: z.number().positive().optional(),
  maxChargeRateKw: z.number().positive().optional(),
  currentEstimatedSocPct: z.number().min(0).max(100).optional(),
  estimatedRangeKm: z.number().positive().optional()
});

/**
 * POST /api/auth/login
 */
authRouter.post('/login', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0]?.message || 'Invalid login details'
    });
    return;
  }

  const { email, password } = parseResult.data;
  const user = await userRepository.findByEmail(email);

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials. User with this email does not exist.'
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials. Incorrect password.'
    });
    return;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  const session = userRepository.toSession(user);

  res.json({
    success: true,
    token,
    user: session,
    message: `Welcome back, ${session.fullName}!`
  });
});

/**
 * POST /api/auth/register
 */
authRouter.post('/register', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0]?.message || 'Validation error'
    });
    return;
  }

  const payload: RegisterPayload = parseResult.data as RegisterPayload;
  const existingUser = await userRepository.findByEmail(payload.email);

  if (existingUser) {
    res.status(400).json({
      success: false,
      error: 'An account with this email already exists. Please sign in instead.'
    });
    return;
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const newUser = await userRepository.create(payload, passwordHash);

  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role
  });

  const session = userRepository.toSession(newUser);

  res.status(201).json({
    success: true,
    token,
    user: session,
    message: 'Account created successfully! +50 Welcome Energy Points awarded.'
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user session
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * PUT /api/auth/vehicle
 * Allows a driver to update their active EV specifications (e.g. SoC slider, battery capacity)
 */
authRouter.put(
  '/vehicle',
  requireAuth,
  requireRole('DRIVER'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parseResult = updateVehicleSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid vehicle specs'
      });
      return;
    }

    const updatedVehicle = await userRepository.updateVehicle(
      req.user!.id,
      parseResult.data as UpdateVehiclePayload
    );

    if (!updatedVehicle) {
      res.status(404).json({ success: false, error: 'Vehicle profile not found' });
      return;
    }

    res.json({
      success: true,
      vehicle: updatedVehicle,
      message: 'Vehicle specifications updated successfully.'
    });
  }
);
