import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env, isProd } from './config/env.js';
import { openapiSpec } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import teamsRoutes from './modules/teams/teams.routes.js';
import tasksRoutes from './modules/tasks/tasks.routes.js';
import activityRoutes from './modules/activity/activity.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import insightsRoutes from './modules/insights/insights.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (!isProd) app.use(morgan('dev'));

  app.use(
    rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false })
  );
  const authLimiter = rateLimit({ windowMs: 60_000, max: 20 });

  app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/teams', teamsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/insights', insightsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { env };
