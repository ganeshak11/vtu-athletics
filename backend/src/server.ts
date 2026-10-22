import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { supabase } from './config/supabase';
import { authRouter } from './routes/auth.routes';
import { squadRouter } from './routes/squad.routes';
import { adminRouter } from './routes/admin.routes';
import { financeRouter } from './routes/finance.routes';
import { accreditationRouter } from './routes/accreditation.routes';
import { accommodationRouter } from './routes/accommodation.routes';
import { scheduleRouter } from './routes/schedule.routes';
import { callRoomRouter } from './routes/callroom.routes';
import { fieldRouter } from './routes/field.routes';
import { trackRouter } from './routes/track.routes';
import { leaderboardRouter } from './routes/leaderboard.routes';
import { publicRouter } from './routes/public.routes';
import { athleteRouter } from './routes/athlete.routes';
import { cateringRouter } from './routes/catering.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS configuration (allowing web and mobile app clients)
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 3. Body parsers with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Rate Limiting: High-throughput capacity for 3000 concurrent users + brute-force protection
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // 60 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please wait 15 minutes.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// 5. Deep Health Check (DEPLOY-02)
app.get('/health', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { error } = await supabase.from('meet_settings').select('id').limit(1);
    const latencyMs = Date.now() - startTime;

    if (error) {
      return res.status(503).json({
        status: 'degraded',
        database: 'unreachable',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      status: 'healthy',
      database: 'connected',
      latencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 6. Mount modular API routes
app.use('/api/auth', authRouter);
app.use('/api/squad', squadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/finance', financeRouter);
app.use('/api/accreditation', accreditationRouter);
app.use('/api/accommodation', accommodationRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/callroom', callRoomRouter);
app.use('/api/field', fieldRouter);
app.use('/api/track', trackRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/athlete', athleteRouter);
app.use('/api/catering', cateringRouter);
app.use('/api', publicRouter);

// 7. Global 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 8. Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
});

// 9. Start Server with Graceful Shutdown
const server = app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 VTU SportsOS Backend API running`);
  console.log(`   Port: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`=============================================`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed cleanly.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
