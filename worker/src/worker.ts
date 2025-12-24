import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { logger } from './lib/logger';
import { executeServerJob } from './runners/serverRunner';
import { executeAgentJob } from './runners/agentRunner';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

const worker = new Worker(
  'jobs',
  async (job: Job) => {
    logger.info(`Processing job ${job.data.jobId}`, { jobId: job.data.jobId });

    try {
      const { jobId, scriptId, parameters, runner } = job.data;

      if (runner === 'server') {
        await executeServerJob(jobId, scriptId, parameters);
      } else if (runner === 'agent') {
        await executeAgentJob(jobId, scriptId, parameters);
      } else {
        throw new Error(`Unknown runner type: ${runner}`);
      }

      logger.info(`Job ${jobId} completed successfully`);
    } catch (error) {
      logger.error(`Job ${job.data.jobId} failed:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency,
  }
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await worker.close();
  process.exit(0);
});

logger.info(`Worker started with concurrency ${concurrency}`);
