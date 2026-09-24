import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { taskRouter } from './routes/taskRoutes.js';
import { actionRouter } from './routes/actionRoutes.js';
import { proxyRouter } from './routes/proxyRoutes.js';
import { monitorRouter } from './routes/monitorRoutes.js';

/**
 * ============================================================================
 * NODE.JS / EXPRESS BACKEND SERVER (Perception Requirements & Planning API)
 * ============================================================================
 */

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware configuration
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Root information route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Perception Requirements & Planning API',
    status: 'ONLINE',
    version: '1.0.0',
    endpoints: {
      submitTask: 'POST /api/tasks',
      listTasks: 'GET /api/tasks',
      getTask: 'GET /api/tasks/:id',
      simulatePerception: 'POST /api/tasks/:id/simulate',
      deleteTask: 'DELETE /api/tasks/:id',
      proxyExtract: 'POST /api/proxy/extract',
      proxyPage: 'GET /api/proxy/page',
      health: 'GET /api/health',
    },
  });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount task, perception, proxy, action guard, and live website monitor routes
app.use('/api', taskRouter);
app.use('/api', actionRouter);
app.use('/api', proxyRouter);
app.use('/api', monitorRouter);

// Fallback 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err instanceof Error ? err.message : String(err),
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`\n🚀 Perception Engine Server running on: http://localhost:${PORT}`);
  console.log(`📡 API Endpoints available under: http://localhost:${PORT}/api/tasks\n`);
});

export default app;
