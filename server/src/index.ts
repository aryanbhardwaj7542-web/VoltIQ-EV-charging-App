import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authRouter } from './routes/authRoutes.js';
import { stationRouter } from './routes/stationRoutes.js';
import { emergencyRouter } from './routes/emergencyRoutes.js';
import { ticketRouter } from './routes/ticketRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import { analyticsRouter } from './routes/analyticsRoutes.js';
import { realtimeRouter } from './routes/realtimeRoutes.js';
import { securityRouter } from './routes/securityRoutes.js';
import { systemRouter } from './routes/systemRoutes.js';
import { stationRepository } from './repositories/stationRepository.js';
import { realtimeHub } from './services/realtimeHub.js';
import { helmetSecurity, apiRateLimiter, authRateLimiter, sanitizeInput } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Defensive Security Middleware (OWASP Top 10)
app.use(helmetSecurity);
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(sanitizeInput);
app.use('/api', apiRateLimiter);
app.use('/api/auth', authRateLimiter);

// API Routers
app.use('/api/auth', authRouter);
app.use('/api/stations', stationRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/realtime', realtimeRouter);
app.use('/api/security', securityRouter);
app.use('/api/system', systemRouter);

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    service: 'VoltIQ EV Intelligence Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Platform Overview / Fleet Metrics for Operator & Admin
app.get('/api/overview', async (_req: Request, res: Response) => {
  try {
    const metrics = await stationRepository.getFleetMetrics();
    res.json({
      success: true,
      metrics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute fleet metrics' });
  }
});

// Production Static Client Serving & SPA Fallback
const clientDistCandidates = [
  process.env.CLIENT_DIST_PATH,
  path.resolve(__dirname, '../../../../client/dist'), // when running from dist/server/src
  path.resolve(__dirname, '../../../client/dist'),   // when running from dist/server
  path.resolve(process.cwd(), '../client/dist'),     // when running from server/
  path.resolve(process.cwd(), 'client/dist'),        // when running from root
].filter(Boolean) as string[];

let resolvedClientDist: string | null = null;
for (const candidate of clientDistCandidates) {
  if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
    resolvedClientDist = candidate;
    break;
  }
}

if (resolvedClientDist) {
  console.log(`[Production Static] Serving frontend client from: ${resolvedClientDist}`);
  app.use(express.static(resolvedClientDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(resolvedClientDist!, 'index.html'));
  });
} else {
  console.log('[Dev Mode] Static client not served by Express (Vite dev server active on port 5173)');
}

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Create shared HTTP server and attach WebSocket RealtimeHub
const server = http.createServer(app);
realtimeHub.init(server);

server.listen(PORT, () => {
  console.log(`VoltIQ Intelligence Engine running on http://localhost:${PORT}`);
  console.log(`VoltIQ Realtime WebSocket Hub available on ws://localhost:${PORT}/ws`);
});
