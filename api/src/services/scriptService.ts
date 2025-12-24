import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../lib/logger';

const SCRIPTS_PATH = process.env.SCRIPTS_REPO_PATH || '/var/lib/setup-factory/scripts';

interface ScriptManifest {
  id: string;
  name: string;
  description: string;
  repo: string;
  path: string;
  default_runner?: 'agent' | 'server';
  parameters?: any[];
  capture?: any;
}

export async function getScripts(): Promise<ScriptManifest[]> {
  try {
    const manifestsPath = path.join(SCRIPTS_PATH, 'manifests');
    const files = await fs.readdir(manifestsPath);
    
    const scripts: ScriptManifest[] = [];
    
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = await fs.readFile(path.join(manifestsPath, file), 'utf-8');
        const manifest = yaml.load(content) as ScriptManifest;
        scripts.push(manifest);
      }
    }
    
    return scripts;
  } catch (error) {
    logger.error('Error reading scripts:', error);
    return [];
  }
}

export async function getScriptById(id: string): Promise<ScriptManifest | null> {
  const scripts = await getScripts();
  return scripts.find((s) => s.id === id) || null;
}

export async function getScriptSchema(id: string): Promise<any> {
  const script = await getScriptById(id);
  if (!script) return null;
  
  return {
    parameters: script.parameters || [],
    capture: script.capture || {},
  };
}

export async function getScriptContent(scriptPath: string): Promise<string> {
  const fullPath = path.join(SCRIPTS_PATH, scriptPath);
  return await fs.readFile(fullPath, 'utf-8');
}
