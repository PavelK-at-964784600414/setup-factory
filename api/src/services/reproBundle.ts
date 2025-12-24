import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { getJobById, getJobLogs } from './jobService';
import { getScriptById, getScriptContent } from './scriptService';
import { logger } from '../lib/logger';

const BUNDLES_PATH = process.env.BUNDLES_PATH || '/var/lib/setup-factory/bundles';

export async function createReproductionBundle(jobId: string): Promise<string> {
  try {
    const job = await getJobById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const script = await getScriptById(job.script_id);
    if (!script) {
      throw new Error('Script not found');
    }

    const bundleName = `repro-${jobId}-${Date.now()}.zip`;
    const bundlePath = path.join(BUNDLES_PATH, bundleName);

    // Ensure bundles directory exists
    await fs.mkdir(BUNDLES_PATH, { recursive: true });

    // Create ZIP archive
    const output = createWriteStream(bundlePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // Add manifest
    const manifestContent = JSON.stringify(script, null, 2);
    archive.append(manifestContent, { name: 'manifest.json' });

    // Add parameters
    const paramsContent = JSON.stringify(job.parameters, null, 2);
    archive.append(paramsContent, { name: 'parameters.json' });

    // Add script source
    const scriptContent = await getScriptContent(script.path);
    archive.append(scriptContent, { name: path.basename(script.path) });

    // Add job metadata
    const jobMeta = {
      id: job.id,
      status: job.status,
      runner: job.runner,
      created_at: job.created_at,
      user_id: job.user_id,
    };
    archive.append(JSON.stringify(jobMeta, null, 2), { name: 'job-metadata.json' });

    // Add logs
    const logs = await getJobLogs(jobId);
    archive.append(logs.join('\n'), { name: 'logs.txt' });

    // Add environment snapshot (if available)
    // TODO: Get from job execution data
    const envSnapshot = {
      os: process.platform,
      node_version: process.version,
      timestamp: new Date().toISOString(),
    };
    archive.append(JSON.stringify(envSnapshot, null, 2), { name: 'environment.json' });

    // Finalize archive
    await archive.finalize();

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });

    logger.info(`Created reproduction bundle: ${bundlePath}`);
    return bundlePath;
  } catch (error) {
    logger.error('Error creating reproduction bundle:', error);
    throw error;
  }
}
