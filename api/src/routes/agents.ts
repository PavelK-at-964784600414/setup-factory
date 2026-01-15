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
        // Try to find existing agent first
        const existingAgent = await prisma.agent.findFirst({
          where: { 
            name, 
            hostname 
          }
        });

        let agent;
        if (existingAgent) {
          // Update existing agent
          agent = await prisma.agent.update({
            where: { id: existingAgent.id },
            data: {
              status: 'online',
              last_seen: new Date()
            }
          });
        } else {
          // Create new agent
          agent = await prisma.agent.create({
            data: {
              name,
              hostname,
              status: 'online',
              last_seen: new Date()
            }
          });
        }

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

  // POST /api/agents/:id/execute - Send job to agent for execution
  fastify.post<{ 
    Params: { id: string };
    Body: { jobId: string; scriptId: string; parameters: Record<string, any> }
  }>('/:id/execute', async (request, reply) => {
    try {
      const { jobId, scriptId, parameters } = request.body;
      
      logger.info(`Sending job ${jobId} to agent ${request.params.id}`);
      
      // Update job in database with agent assignment and status
      await prisma.job.update({
        where: { id: jobId },
        data: {
          agent_id: request.params.id,
          status: 'pending',
          started_at: new Date()
        }
      });
      
      return { 
        success: true, 
        message: 'Job queued for agent execution',
        jobId,
        agentId: request.params.id
      };
    } catch (error) {
      logger.error('Error dispatching job to agent:', error);
      return reply.status(500).send({ error: 'Failed to dispatch job' });
    }
  });

  // GET /api/agents/:id/jobs - Agent polls for pending jobs
  fastify.get<{ Params: { id: string } }>('/:id/jobs', async (request, reply) => {
    try {
      const jobs = await prisma.job.findMany({
        where: {
          agent_id: request.params.id,
          status: 'pending'
        },
        include: {
          script: true
        },
        orderBy: { created_at: 'asc' },
        take: 1  // Agent processes one job at a time
      });
      
      // Mark job as running
      if (jobs.length > 0) {
        await prisma.job.update({
          where: { id: jobs[0].id },
          data: { status: 'running' }
        });
      }
      
      return jobs;
    } catch (error) {
      logger.error('Error fetching jobs for agent:', error);
      return reply.status(500).send({ error: 'Failed to fetch jobs' });
    }
  });

  // POST /api/agents/:id/jobs/:jobId/result - Agent reports job execution result
  fastify.post<{
    Params: { id: string; jobId: string };
    Body: { status: string; exit_code?: number; logs?: string; artifacts?: any }
  }>('/:id/jobs/:jobId/result', async (request, reply) => {
    try {
      const { status, exit_code, logs, artifacts } = request.body;
      
      logger.info(`Agent ${request.params.id} reporting result for job ${request.params.jobId}: ${status}`);
      
      // Update job with results
      await prisma.job.update({
        where: { id: request.params.jobId },
        data: {
          status,
          exit_code,
          logs,
          artifacts,
          completed_at: new Date()
        }
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error updating job result:', error);
      return reply.status(500).send({ error: 'Failed to update job result' });
    }
  });
}
