import fs from 'node:fs/promises';
import yaml from 'yaml'; // We need to install yaml
import { ConfigSchema, Config } from './schema';

export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const fileContents = await fs.readFile(configPath, 'utf8');
    const parsedYaml = yaml.parse(fileContents);
    return ConfigSchema.parse(parsedYaml);
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw error;
  }
}
