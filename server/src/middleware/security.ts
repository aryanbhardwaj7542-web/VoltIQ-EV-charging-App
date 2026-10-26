import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Helmet HTTP Security Headers Middleware
 */
export const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://tile.openstreetmap.org",
        "https://*.tile.openstreetmap.org"
      ],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"]
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  xPoweredBy: false
});

/**
 * Rate Limiter for Authentication Endpoints (Brute Force Protection)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * General API Rate Limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Strict Demo Rate Limiter for Interactive Penetration Testing (max 3 req / 30s)
 */
export const testPenetrationRateLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: '🔒 OWASP A07 Defense Triggered: Rate limit threshold exceeded (3 req / 30s). HTTP 429 Too Many Requests.',
    code: 'DEMO_RATE_LIMIT_EXCEEDED',
    status: 429
  }
});

/**
 * Recursive String Sanitizer preventing XSS and Script Injection
 */
function sanitizeValue(value: any): { sanitized: any; intercepted: boolean } {
  if (typeof value === 'string') {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /onerror\s*=/gi,
      /onload\s*=/gi,
      /onclick\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi
    ];

    let intercepted = false;
    let cleaned = value;

    for (const pattern of dangerousPatterns) {
      if (pattern.test(cleaned)) {
        intercepted = true;
        cleaned = cleaned.replace(pattern, '[SANITIZED_SCRIPT]');
      }
    }

    return { sanitized: cleaned, intercepted };
  } else if (Array.isArray(value)) {
    let anyIntercepted = false;
    const sanitizedArray = value.map(item => {
      const res = sanitizeValue(item);
      if (res.intercepted) anyIntercepted = true;
      return res.sanitized;
    });
    return { sanitized: sanitizedArray, intercepted: anyIntercepted };
  } else if (value !== null && typeof value === 'object') {
    let anyIntercepted = false;
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const res = sanitizeValue(value[key]);
      if (res.intercepted) anyIntercepted = true;
      sanitizedObj[key] = res.sanitized;
    }
    return { sanitized: sanitizedObj, intercepted: anyIntercepted };
  }

  return { sanitized: value, intercepted: false };
}

/**
 * XSS & Injection Sanitization Middleware
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    const result = sanitizeValue(req.body);
    req.body = result.sanitized;
    if (result.intercepted) {
      (req as any).xssNeutralized = true;
      console.warn(`[Security] Neutralized potential XSS script injection in request to ${req.path}`);
    }
  }
  next();
};
