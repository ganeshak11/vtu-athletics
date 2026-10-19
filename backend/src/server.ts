import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.routes';
import { squadRouter } from './routes/squad.routes';
import { adminRouter } from './routes/admin.routes';
import { financeRouter } from './routes/finance.routes';
import { accreditationRouter } from './routes/accreditation.routes';
import { accommodationRouter } from './routes/accommodation.routes';
import { scheduleRouter } from './routes/schedule.routes';
import { callRoomRouter } from './routes/callroom.routes';
import { fieldRouter } from './routes/field.routes';
import { publicRouter } from './routes/public.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for web and mobile frontends
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers with larger limit for screenshot uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'vtu-athletics-backend',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRouter);
app.use('/api/squad', squadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/finance', financeRouter);
app.use('/api/accreditation', accreditationRouter);
app.use('/api/accommodation', accommodationRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/callroom', callRoomRouter);
app.use('/api/field', fieldRouter);
app.use('/api', publicRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 VTU SportsOS Backend API running`);
  console.log(`   Port: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`=============================================`);
});

export default app;
