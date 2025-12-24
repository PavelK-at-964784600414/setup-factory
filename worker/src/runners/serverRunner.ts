import Docker from 'dockerode';
import { logger } from '../lib/logger';

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });
const RUNNER_IMAGE = process.env.RUNNER_IMAGE || 'setup-factory/runner:latest';
const RUNNER_NETWORK = process.env.RUNNER_NETWORK || 'setup-factory';
const CLEANUP = process.env.RUNNER_CLEANUP === 'true';

export async function executeServerJob(
  jobId: string,
  scriptId: string,
  parameters: Record<string, any>
): Promise<void> {
  logger.info(`Executing server job ${jobId} for script ${scriptId}`);

  const containerName = `job-${jobId}`;

  try {
    // Create container
    const container = await docker.createContainer({
      Image: RUNNER_IMAGE,
      name: containerName,
      Env: [
        `JOB_ID=${jobId}`,
        `SCRIPT_ID=${scriptId}`,
        `PARAMETERS=${JSON.stringify(parameters)}`,
      ],
      HostConfig: {
        NetworkMode: RUNNER_NETWORK,
        AutoRemove: CLEANUP,
      },
    });

    logger.info(`Created container ${containerName}`);

    // Start container
    await container.start();
    logger.info(`Started container ${containerName}`);

    // Wait for container to finish
    const result = await container.wait();
    logger.info(`Container ${containerName} finished with status code ${result.StatusCode}`);

    // Get logs
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
    });

    logger.info(`Container logs: ${logs.toString()}`);

    if (result.StatusCode !== 0) {
      throw new Error(`Container exited with code ${result.StatusCode}`);
    }

    // Cleanup (if not auto-removed)
    if (!CLEANUP) {
      await container.remove();
      logger.info(`Removed container ${containerName}`);
    }
  } catch (error) {
    logger.error(`Server job ${jobId} failed:`, error);
    
    // Attempt cleanup on error
    try {
      const container = docker.getContainer(containerName);
      await container.remove({ force: true });
    } catch (cleanupError) {
      logger.error('Failed to cleanup container:', cleanupError);
    }

    throw error;
  }
}
