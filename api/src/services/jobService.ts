import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../lib/database';
import { logger } from '../lib/logger';
import { getScriptById } from './scriptService';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const jobQueue = new Queue('jobs', { connection: redis });

export async function createJob(
  scriptId: string,
  parameters: Record<string, any>,
  runner: 'agent' | 'server',
  userId: string
) {
  try {
    const script = await getScriptById(scriptId);
    if (!script) {
      throw new Error('Script not found');
    }

    // Create job in database (mock implementation)
    const job = {
      id: `job-${Date.now()}`,
      script_id: scriptId,
      parameters,
      runner,
      user_id: userId,
      status: 'pending',
      created_at: new Date(),
    };

    // Add to job queue
    await jobQueue.add('execute', {
      jobId: job.id,
      scriptId,
      parameters,
      runner,
    });

    logger.info(`Created job ${job.id} for script ${scriptId}`);
    return job;
  } catch (error) {
    logger.error('Error creating job:', error);
    throw error;
  }
}

export async function getJobs(filters: { status?: string; limit?: number }) {
  // Mock implementation - would query database
  return [];
}

export async function getJobById(id: string) {
  // Mock implementation - would query database
  return {
    id,
    script_id: 'example',
    parameters: {},
    status: 'pending',
    created_at: new Date(),
  };
}

export async function getJobLogs(id: string): Promise<string[]> {
  // Mock implementation - would read from file or Redis
  return ['Starting job...', 'Executing script...'];
}

export async function updateJobStatus(id: string, status: string, result?: any) {
  logger.info(`Updated job ${id} status to ${status}`);
  // Mock implementation - would update database
}

export async function appendJobLog(id: string, log: string) {
  // Mock implementation - would append to file or Redis
  logger.debug(`Job ${id} log: ${log}`);
}

export async function createReproductionBundle(id: string): Promise<string> {
  // Import here to avoid circular dependency
  const { createReproductionBundle: createBundle } = await import('./reproBundle');
  return createBundle(id);
}
