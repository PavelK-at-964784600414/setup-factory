import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/database';
import { logger } from '../lib/logger';

export async function userParametersRoutes(fastify: FastifyInstance) {
  // GET /api/user-parameters - Get all parameters for current user
  fastify.get('/', async (request, reply) => {
    try {
      // TODO: Get user from session/token - for now using mock user
      const userId = 'mock-user-id';
      
      const parameters = await prisma.userParameter.findMany({
        where: { user_id: userId },
        orderBy: [
          { category: 'asc' },
          { key: 'asc' }
        ]
      });
      
      return parameters;
    } catch (error) {
      logger.error('Error fetching user parameters:', error);
      return reply.status(500).send({ error: 'Failed to fetch parameters' });
    }
  });

  // GET /api/user-parameters/:key - Get specific parameter
  fastify.get<{ Params: { key: string } }>('/:key', async (request, reply) => {
    try {
      const userId = 'mock-user-id';
      
      const parameter = await prisma.userParameter.findUnique({
        where: {
          user_id_key: {
            user_id: userId,
            key: request.params.key
          }
        }
      });
      
      if (!parameter) {
        return reply.status(404).send({ error: 'Parameter not found' });
      }
      
      return parameter;
    } catch (error) {
      logger.error('Error fetching parameter:', error);
      return reply.status(500).send({ error: 'Failed to fetch parameter' });
    }
  });

  // POST /api/user-parameters - Create or update parameter
  fastify.post<{
    Body: {
      key: string;
      value: string;
      description?: string;
      category?: string;
    }
  }>('/', async (request, reply) => {
    try {
      const userId = 'mock-user-id';
      const { key, value, description, category } = request.body;

      if (!key || !value) {
        return reply.status(400).send({ error: 'Key and value are required' });
      }

      const parameter = await prisma.userParameter.upsert({
        where: {
          user_id_key: {
            user_id: userId,
            key
          }
        },
        update: {
          value,
          description,
          category,
          updated_at: new Date()
        },
        create: {
          user_id: userId,
          key,
          value,
          description,
          category
        }
      });

      logger.info(`User parameter ${key} saved for user ${userId}`);
      return parameter;
    } catch (error) {
      logger.error('Error saving parameter:', error);
      return reply.status(500).send({ error: 'Failed to save parameter' });
    }
  });

  // PUT /api/user-parameters/:key - Update parameter
  fastify.put<{
    Params: { key: string };
    Body: {
      value: string;
      description?: string;
      category?: string;
    }
  }>('/:key', async (request, reply) => {
    try {
      const userId = 'mock-user-id';
      const { value, description, category } = request.body;

      const parameter = await prisma.userParameter.update({
        where: {
          user_id_key: {
            user_id: userId,
            key: request.params.key
          }
        },
        data: {
          value,
          description,
          category,
          updated_at: new Date()
        }
      });

      return parameter;
    } catch (error) {
      logger.error('Error updating parameter:', error);
      return reply.status(500).send({ error: 'Failed to update parameter' });
    }
  });

  // DELETE /api/user-parameters/:key - Delete parameter
  fastify.delete<{ Params: { key: string } }>('/:key', async (request, reply) => {
    try {
      const userId = 'mock-user-id';

      await prisma.userParameter.delete({
        where: {
          user_id_key: {
            user_id: userId,
            key: request.params.key
          }
        }
      });

      logger.info(`User parameter ${request.params.key} deleted for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting parameter:', error);
      return reply.status(500).send({ error: 'Failed to delete parameter' });
    }
  });

  // DELETE /api/user-parameters - Delete all parameters
  fastify.delete('/', async (request, reply) => {
    try {
      const userId = 'mock-user-id';

      const result = await prisma.userParameter.deleteMany({
        where: { user_id: userId }
      });

      logger.info(`Deleted ${result.count} parameters for user ${userId}`);
      return { success: true, count: result.count };
    } catch (error) {
      logger.error('Error deleting parameters:', error);
      return reply.status(500).send({ error: 'Failed to delete parameters' });
    }
  });

  // GET /api/user-parameters/export/json - Export parameters as JSON
  fastify.get('/export/json', async (request, reply) => {
    try {
      const userId = 'mock-user-id';
      
      const parameters = await prisma.userParameter.findMany({
        where: { user_id: userId }
      });

      const exportData = parameters.reduce((acc, param) => {
        acc[param.key] = {
          value: param.value,
          description: param.description,
          category: param.category
        };
        return acc;
      }, {} as Record<string, any>);

      return exportData;
    } catch (error) {
      logger.error('Error exporting parameters:', error);
      return reply.status(500).send({ error: 'Failed to export parameters' });
    }
  });
}
