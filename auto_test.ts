import { runManualExplorer } from './src/crawler/manual_explorer.js';
import { Logger } from './src/recorder/logger.js';
import { loadConfig } from './src/config/parser.js';

(async () => {
  const config = await loadConfig('crawler.config.yaml');
  const logger = new Logger(config.target.base_url, './output/test.json');
  
  // mock process.stdin
  const PassThrough = require('stream').PassThrough;
  const mockStdin = new PassThrough();
  Object.defineProperty(process, 'stdin', { get: () => mockStdin });
  
  setTimeout(() => {
    console.log('Sending start...');
    mockStdin.write('start\n');
  }, 3000);
  
  setTimeout(() => {
    console.log('Sending finish...');
    mockStdin.write('finish\n');
  }, 10000);

  await runManualExplorer(config, logger, 'automated-test');
})();
