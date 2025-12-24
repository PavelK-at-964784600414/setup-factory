import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../lib/logger';

const JIRA_URL = process.env.JIRA_URL || '';
const JIRA_USERNAME = process.env.JIRA_USERNAME || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'REPRO';
const JIRA_ISSUE_TYPE = process.env.JIRA_ISSUE_TYPE || 'Bug';

const jiraClient = axios.create({
  baseURL: JIRA_URL,
  auth: {
    username: JIRA_USERNAME,
    password: JIRA_API_TOKEN,
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function createJiraIssue(
  job: any,
  bundlePath: string,
  customDescription?: string
): Promise<any> {
  try {
    const summary = `Reproduction: ${job.script_id} - Job ${job.id}`;
    const description = customDescription || `
Automated reproduction job failed.

*Job ID:* ${job.id}
*Script:* ${job.script_id}
*Status:* ${job.status}
*Runner:* ${job.runner}

*Parameters:*
${JSON.stringify(job.parameters, null, 2)}

See attached reproduction bundle for complete details.
    `;

    // Create issue
    const issueResponse = await jiraClient.post('/rest/api/3/issue', {
      fields: {
        project: {
          key: JIRA_PROJECT_KEY,
        },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description,
                },
              ],
            },
          ],
        },
        issuetype: {
          name: JIRA_ISSUE_TYPE,
        },
      },
    });

    const issueKey = issueResponse.data.key;
    logger.info(`Created Jira issue ${issueKey}`);

    // Attach reproduction bundle
    await attachReproBundle(issueKey, bundlePath);

    return {
      key: issueKey,
      url: `${JIRA_URL}/browse/${issueKey}`,
    };
  } catch (error) {
    logger.error('Error creating Jira issue:', error);
    throw error;
  }
}

export async function attachReproBundle(issueKey: string, bundlePath: string): Promise<void> {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(bundlePath));

    await jiraClient.post(`/rest/api/3/issue/${issueKey}/attachments`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Atlassian-Token': 'no-check',
      },
    });

    logger.info(`Attached bundle to ${issueKey}`);
  } catch (error) {
    logger.error('Error attaching bundle:', error);
    throw error;
  }
}
