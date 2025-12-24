import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { logger } from './lib/logger';
import { scriptsRoutes } from './routes/scripts';
import { jobsRoutes } from './routes/jobs';
import { adminRoutes } from './routes/admin';
import { agentsRoutes } from './routes/agents';
import { authRoutes } from './routes/auth';
import { initDatabase } from './lib/database';

dotenv.config();

const PORT = parseInt(process.env.API_PORT || '3001', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({
  logger: false, // Using winston instead
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    });

    await fastify.register(cookie);

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      cookie: {
        cookieName: 'token',
        signed: false,
      },
    });

    await fastify.register(websocket);

    // Initialize database
    await initDatabase();

    // Health check
    fastify.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(scriptsRoutes, { prefix: '/api/scripts' });
    await fastify.register(jobsRoutes, { prefix: '/api/jobs' });
    await fastify.register(agentsRoutes, { prefix: '/api/agents' });
    await fastify.register(adminRoutes, { prefix: '/api/admin' });

    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    logger.info(`API server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

start();
