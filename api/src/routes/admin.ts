import { FastifyInstance } from 'fastify';
import { syncScripts } from '../services/gitSync';
import { logger } from '../lib/logger';

export async function adminRoutes(fastify: FastifyInstance) {
  // POST /api/admin/sync-scripts - Trigger Bitbucket sync
  fastify.post('/sync-scripts', async (request, reply) => {
    try {
      await syncScripts();
      return { success: true, message: 'Scripts synced successfully' };
    } catch (error) {
      logger.error('Error syncing scripts:', error);
      return reply.status(500).send({ error: 'Failed to sync scripts' });
    }
  });

  // GET /api/admin/agents - List registered agents
  fastify.get('/agents', async (request, reply) => {
    // TODO: Implement agent listing
    return [];
  });

  // GET /api/admin/metrics - Get platform metrics
  fastify.get('/metrics', async (request, reply) => {
    // TODO: Implement metrics
    return {
      jobs: { total: 0, pending: 0, running: 0, failed: 0, succeeded: 0 },
      agents: { total: 0, online: 0, offline: 0 },
    };
  });
}
