import { loadConfig } from './config/parser';
import { Logger } from './recorder/logger';
import { runExplorer } from './crawler/explorer';
import { generateHtmlReport } from './reporter/html_generator';
import { exportToPdf } from './reporter/pdf_exporter';
import path from 'node:path';

async function main() {
  const args = process.argv.slice(2);
  
  const inspectIndex = args.indexOf('--inspect');
  if (inspectIndex !== -1) {
    const nextArg = args[inspectIndex + 1];
    if (nextArg && nextArg.startsWith('http')) {
      const { runInspector } = await import('./crawler/inspector');
      await runInspector(nextArg);
      return;
    }
  }

  let configPath = 'crawler.config.yaml'; // Default
  let manualLogin = false;
  let manualFlow = false;
  let flowName = '';

  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    configPath = args[configIndex + 1];
  }

  const flowIndex = args.indexOf('--flow-name');
  if (flowIndex !== -1 && args[flowIndex + 1]) {
    flowName = args[flowIndex + 1];
  }

  if (args.includes('--manual-login')) {
    manualLogin = true;
  }
  
  if (args.includes('--manual-flow')) {
    manualFlow = true;
  }

  let automatizedTestName = '';
  const testIndex = args.indexOf('--automatized-test');
  if (testIndex !== -1 && args[testIndex + 1]) {
    automatizedTestName = args[testIndex + 1];
    manualFlow = true;
  }

  console.log(`Loading configuration from ${configPath}...`);
  const config = await loadConfig(configPath);

  if (args.includes('--inspect')) {
    config.inspect = true;
  }

  // Adjust output paths if flowName is provided
  let outputPrefix = '';
  if (flowName) {
    outputPrefix = `${flowName}_`;
    config.output.screenshots_dir = path.join(config.output.screenshots_dir, flowName);
    
    const parsedDataFile = path.parse(config.output.data_file);
    config.output.data_file = path.join(parsedDataFile.dir, `${outputPrefix}${parsedDataFile.name}${parsedDataFile.ext}`);
  }

  console.log(`Starting crawl at ${config.target.base_url}${flowName ? ` (Flow: ${flowName})` : ''}`);
  const logger = new Logger(config.target.base_url, config.output.data_file);

  if (manualFlow) {
    const { runManualExplorer } = await import('./crawler/manual_explorer');
    await runManualExplorer(config, logger, automatizedTestName);
  } else {
    await runExplorer(config, logger, manualLogin);
  }

  console.log(`Crawl finished. Output saved to ${config.output.data_file}`);

  const result = logger.getResult();
  const htmlPath = path.join(path.dirname(config.output.data_file), `${outputPrefix}report.html`);
  
  if (config.output.report_format.includes('html')) {
    console.log(`Generating HTML report...`);
    await generateHtmlReport(result, htmlPath);
    console.log(`HTML report saved to ${htmlPath}`);
  }

  if (config.output.report_format.includes('pdf')) {
    const pdfPath = path.join(path.dirname(config.output.data_file), `${outputPrefix}report.pdf`);
    console.log(`Exporting report to PDF...`);
    await exportToPdf(htmlPath, pdfPath);
    console.log(`PDF report saved to ${pdfPath}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
