import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import walletsRoutes from './routes/wallets';
import subscriptionsRoutes from './routes/subscriptions';
import recommendationsRoutes from './routes/recommendations';
import positionsRoutes from './routes/positions';
import vaultRoutes from './routes/vault';
import './jobs/sync-positions'; // Start background jobs

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Stripe webhooks need raw body
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

// JSON body parser for other routes
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallets', walletsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/vault', vaultRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`✅ YieldShift Pro API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL}`);
});
