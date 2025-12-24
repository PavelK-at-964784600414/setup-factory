import axios from 'axios';
import { logger } from '../lib/logger';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export async function executeAgentJob(
  jobId: string,
  scriptId: string,
  parameters: Record<string, any>
): Promise<void> {
  logger.info(`Dispatching agent job ${jobId} for script ${scriptId}`);

  try {
    // Get available agents
    const agentsResponse = await axios.get(`${API_URL}/api/agents`);
    const agents = agentsResponse.data;

    if (agents.length === 0) {
      throw new Error('No agents available');
    }

    // Pick first available agent (could implement more sophisticated selection)
    const agent = agents[0];
    logger.info(`Selected agent ${agent.id} for job ${jobId}`);

    // Send task to agent (via API which will use Redis pubsub or direct HTTP)
    await axios.post(`${API_URL}/api/agents/${agent.id}/execute`, {
      jobId,
      scriptId,
      parameters,
    });

    logger.info(`Job ${jobId} dispatched to agent ${agent.id}`);

    // Agent will report progress and completion asynchronously
    // Worker's job is done once task is dispatched
  } catch (error) {
    logger.error(`Failed to dispatch agent job ${jobId}:`, error);
    throw error;
  }
}
