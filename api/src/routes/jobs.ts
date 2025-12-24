import { FastifyInstance } from 'fastify';
import { createJob, getJobs, getJobById, getJobLogs, createReproductionBundle } from '../services/jobService';
import { createJiraIssue } from '../services/jira';
import { logger } from '../lib/logger';

export async function jobsRoutes(fastify: FastifyInstance) {
  // POST /api/jobs - Create new job
  fastify.post<{ Body: { script_id: string; parameters: Record<string, any>; runner: 'agent' | 'server' } }>(
    '/',
    async (request, reply) => {
      try {
        const job = await createJob(
          request.body.script_id,
          request.body.parameters,
          request.body.runner,
          'user-id' // TODO: Get from auth context
        );
        return reply.status(201).send(job);
      } catch (error) {
        logger.error('Error creating job:', error);
        return reply.status(500).send({ error: 'Failed to create job' });
      }
    }
  );

  // GET /api/jobs - List jobs
  fastify.get<{ Querystring: { status?: string; limit?: number } }>(
    '/',
    async (request, reply) => {
      try {
        const jobs = await getJobs({
          status: request.query.status,
          limit: request.query.limit,
        });
        return jobs;
      } catch (error) {
        logger.error('Error fetching jobs:', error);
        return reply.status(500).send({ error: 'Failed to fetch jobs' });
      }
    }
  );

  // GET /api/jobs/:id - Get job details
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const job = await getJobById(request.params.id);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      return job;
    } catch (error) {
      logger.error('Error fetching job:', error);
      return reply.status(500).send({ error: 'Failed to fetch job' });
    }
  });

  // GET /api/jobs/:id/logs - Stream logs (SSE)
  fastify.get<{ Params: { id: string } }>('/:id/logs', async (request, reply) => {
    try {
      const logs = await getJobLogs(request.params.id);
      
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      // Send existing logs
      logs.forEach((log: string) => {
        reply.raw.write(`data: ${JSON.stringify({ message: log })}\n\n`);
      });

      // TODO: Subscribe to Redis pubsub for live logs
      
      request.raw.on('close', () => {
        reply.raw.end();
      });
    } catch (error) {
      logger.error('Error streaming logs:', error);
      return reply.status(500).send({ error: 'Failed to stream logs' });
    }
  });

  // GET /api/jobs/:id/bundle - Download reproduction bundle
  fastify.get<{ Params: { id: string } }>('/:id/bundle', async (request, reply) => {
    try {
      const bundlePath = await createReproductionBundle(request.params.id);
      return reply.sendFile(bundlePath);
    } catch (error) {
      logger.error('Error creating reproduction bundle:', error);
      return reply.status(500).send({ error: 'Failed to create reproduction bundle' });
    }
  });

  // POST /api/jobs/:id/create-jira - Create Jira issue from job
  fastify.post<{ Params: { id: string }; Body: { description?: string } }>(
    '/:id/create-jira',
    async (request, reply) => {
      try {
        const job = await getJobById(request.params.id);
        if (!job) {
          return reply.status(404).send({ error: 'Job not found' });
        }

        const bundlePath = await createReproductionBundle(request.params.id);
        const issue = await createJiraIssue(job, bundlePath, request.body.description);
        
        return { issue };
      } catch (error) {
        logger.error('Error creating Jira issue:', error);
        return reply.status(500).send({ error: 'Failed to create Jira issue' });
      }
    }
  );
}
