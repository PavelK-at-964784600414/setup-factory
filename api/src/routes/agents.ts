import { FastifyInstance } from 'fastify';
import { logger } from '../lib/logger';

export async function agentsRoutes(fastify: FastifyInstance) {
  // GET /api/agents - List all agents
  fastify.get('/', async (request, reply) => {
    // TODO: Implement agent listing from database
    return [];
  });

  // POST /api/agents/register - Register a new agent
  fastify.post<{ Body: { name: string; hostname: string; secret: string } }>(
    '/register',
    async (request, reply) => {
      try {
        const { name, hostname, secret } = request.body;
        
        // Verify registration secret
        if (secret !== process.env.AGENT_REGISTRATION_SECRET) {
          return reply.status(401).send({ error: 'Invalid registration secret' });
        }

        // TODO: Create agent in database
        const agent = {
          id: `agent-${Date.now()}`,
          name,
          hostname,
          status: 'online',
          registered_at: new Date(),
        };

        logger.info(`Agent registered: ${name} (${hostname})`);
        return reply.status(201).send(agent);
      } catch (error) {
        logger.error('Error registering agent:', error);
        return reply.status(500).send({ error: 'Failed to register agent' });
      }
    }
  );

  // POST /api/agents/:id/heartbeat - Agent heartbeat
  fastify.post<{ Params: { id: string } }>('/:id/heartbeat', async (request, reply) => {
    try {
      // TODO: Update agent last_seen timestamp
      return { success: true };
    } catch (error) {
      logger.error('Error processing heartbeat:', error);
      return reply.status(500).send({ error: 'Failed to process heartbeat' });
    }
  });
}
