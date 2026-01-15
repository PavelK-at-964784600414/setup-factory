import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/database';
import { logger } from '../lib/logger';

export async function agentsRoutes(fastify: FastifyInstance) {
  // GET /api/agents - List all agents
  fastify.get('/', async (request, reply) => {
    try {
      const agents = await prisma.agent.findMany({
        where: { status: 'online' },
        orderBy: { last_seen: 'desc' }
      });
      return agents;
    } catch (error) {
      logger.error('Error fetching agents:', error);
      return reply.status(500).send({ error: 'Failed to fetch agents' });
    }
  });

  // POST /api/agents/register - Register a new agent
  fastify.post<{ Body: { name: string; hostname: string; secret: string } }>(
    '/register',
    async (request, reply) => {
      try {
        const { name, hostname, secret } = request.body;
        
        // Log for debugging
        logger.info(`Agent registration attempt - Expected: "${process.env.AGENT_REGISTRATION_SECRET}", Received: "${secret}"`);
        
        // Verify registration secret
        if (secret !== process.env.AGENT_REGISTRATION_SECRET) {
          logger.warn(`Agent registration failed - secret mismatch`);
          return reply.status(401).send({ error: 'Invalid registration secret' });
        }

        // Create or update agent in database
        const agent = await prisma.agent.upsert({
          where: { 
            name_hostname: { 
              name, 
              hostname 
            } 
          },
          update: {
            status: 'online',
            last_seen: new Date()
          },
          create: {
            name,
            hostname,
            status: 'online',
            last_seen: new Date()
          }
        });

        logger.info(`Agent registered: ${name} (${hostname}) - ID: ${agent.id}`);
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
      const agent = await prisma.agent.update({
        where: { id: request.params.id },
        data: { 
          last_seen: new Date(),
          status: 'online'
        }
      });
      return { success: true, agent };
    } catch (error) {
      logger.error('Error processing heartbeat:', error);
      return reply.status(500).send({ error: 'Failed to process heartbeat' });
    }
  });
}
