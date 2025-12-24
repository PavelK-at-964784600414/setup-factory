import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import { logger } from '../lib/logger';

const SCRIPTS_PATH = process.env.SCRIPTS_REPO_PATH || '/var/lib/setup-factory/scripts';
const BITBUCKET_URL = process.env.BITBUCKET_URL || '';
const BITBUCKET_USERNAME = process.env.BITBUCKET_USERNAME || '';
const BITBUCKET_APP_PASSWORD = process.env.BITBUCKET_APP_PASSWORD || '';

const git: SimpleGit = simpleGit();

export async function syncScripts(): Promise<void> {
  try {
    const repoUrl = BITBUCKET_URL.replace(
      'https://',
      `https://${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}@`
    );

    const exists = await git.cwd(SCRIPTS_PATH).checkIsRepo();
    
    if (!exists) {
      logger.info(`Cloning scripts repo to ${SCRIPTS_PATH}`);
      await git.clone(repoUrl, SCRIPTS_PATH);
    } else {
      logger.info(`Pulling latest scripts from ${BITBUCKET_URL}`);
      await git.cwd(SCRIPTS_PATH).pull();
    }

    logger.info('Scripts synced successfully');
  } catch (error) {
    logger.error('Error syncing scripts:', error);
    throw error;
  }
}

export async function handleWebhook(payload: any): Promise<void> {
  logger.info('Received Bitbucket webhook', payload);
  
  // Verify webhook signature if configured
  // Then trigger sync
  await syncScripts();
}

export async function getCurrentCommit(): Promise<string> {
  try {
    const log = await git.cwd(SCRIPTS_PATH).log({ maxCount: 1 });
    return log.latest?.hash || 'unknown';
  } catch (error) {
    logger.error('Error getting current commit:', error);
    return 'unknown';
  }
}
