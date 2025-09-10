import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateEnvironment } from './config/environment';
import { connectDatabase } from './config/database';
import { createMondayApiService, createCalculationService } from './services';
import { createMondayWebhookHandler } from './webhooks';
import { createItemsRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware';

// Service initialization functions
const initializeServices = () => {
  validateEnvironment();
  
  const mondayApi = createMondayApiService({ apiToken: config.mondayApiToken! });
  const calculationService = createCalculationService({
    mondayApi,
    inputColumnId: config.inputNumberColumnId!,
    resultColumnId: config.resultNumberColumnId!,
  });
  const webhookHandler = createMondayWebhookHandler({
    mondayApi,
    calculationService,
    inputColumnId: config.inputNumberColumnId!,
  });

  return { mondayApi, calculationService, webhookHandler };
};

// Middleware setup function
const setupMiddleware = (app: express.Application): void => {
  // Trust proxy for rate limiting (needed for ngrok/webhooks)
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet());

  // CORS middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') 
      : true,
    credentials: true,
  }));

  // Rate limiting
  app.use(rateLimit(config.apiRateLimit));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
};

// Routes setup function
const setupRoutes = (app: express.Application, services: ReturnType<typeof initializeServices>): void => {
  const { calculationService, webhookHandler } = services;

  // API routes
  app.use('/api/items', createItemsRouter(calculationService));

  // Webhook routes
  app.post('/webhooks/monday', (req, res) => {
    webhookHandler.handleWebhook(req, res);
  });

  app.post('/webhooks/monday/verify', (req, res) => {
    webhookHandler.handleWebhookVerification(req, res);
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Monday.com Backend API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        items: '/api/items',
        webhooks: '/webhooks/monday',
      },
    });
  });
};

// Error handling setup function
const setupErrorHandling = (app: express.Application): void => {
  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);
};

// Main application factory function
const createApp = (): express.Application => {
  const app = express();
  const services = initializeServices();

  setupMiddleware(app);
  setupRoutes(app, services);
  setupErrorHandling(app);

  return app;
};

// Server startup function
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Create app
    const app = createApp();

    // Start server
    app.listen(config.port, () => {
      console.log(`[Server] Server running on port ${config.port}`);
      console.log(`[Server] Environment: ${config.nodeEnv}`);
      console.log(`[Server] API docs: http://localhost:${config.port}/`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

// Error handlers
const setupErrorHandlers = (): void => {
  process.on('uncaughtException', (error) => {
    console.error('[Process] Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
};

// Initialize and start the application
const main = async (): Promise<void> => {
  setupErrorHandlers();
  await startServer();
};

// Start the application
main().catch((error) => {
  console.error('[App] Failed to start application:', error);
  process.exit(1);
});

export { createApp };
export default main;
