import { FastifyInstance } from 'fastify';
import { getScripts, getScriptById, getScriptSchema } from '../services/scriptService';
import { logger } from '../lib/logger';

export async function scriptsRoutes(fastify: FastifyInstance) {
  // GET /api/scripts - List all scripts
  fastify.get('/', async (request, reply) => {
    try {
      const scripts = await getScripts();
      return scripts;
    } catch (error) {
      logger.error('Error fetching scripts:', error);
      return reply.status(500).send({ error: 'Failed to fetch scripts' });
    }
  });

  // GET /api/scripts/:id - Get script details
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const script = await getScriptById(request.params.id);
      if (!script) {
        return reply.status(404).send({ error: 'Script not found' });
      }
      return script;
    } catch (error) {
      logger.error('Error fetching script:', error);
      return reply.status(500).send({ error: 'Failed to fetch script' });
    }
  });

  // GET /api/scripts/:id/schema - Get parameter schema from manifest
  fastify.get<{ Params: { id: string } }>('/:id/schema', async (request, reply) => {
    try {
      const schema = await getScriptSchema(request.params.id);
      if (!schema) {
        return reply.status(404).send({ error: 'Script manifest not found' });
      }
      return schema;
    } catch (error) {
      logger.error('Error fetching script schema:', error);
      return reply.status(500).send({ error: 'Failed to fetch script schema' });
    }
  });
}
