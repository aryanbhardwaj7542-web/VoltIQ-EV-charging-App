import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';
import type { UserRole, UserSession } from '../../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'voltiq-production-secret-key-2026-btech';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️ [SECURITY WARNING]: Running in production mode without explicit JWT_SECRET environment variable! Using fallback key. Provide JWT_SECRET in production deployment.');
}
const TOKEN_EXPIRY = '7d';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Authentication Middleware: Validates Bearer JWT Token
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({
      success: false,
      error: 'Session expired or token invalid. Please log in again.'
    });
    return;
  }

  const user = await userRepository.findById(decoded.id);
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'User associated with this token no longer exists.'
    });
    return;
  }

  req.user = userRepository.toSession(user);
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware: Validates user role
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`
      });
      return;
    }

    next();
  };
}
