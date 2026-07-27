import fs from 'node:fs/promises';
import path from 'node:path';
import { CrawlResult, FlowNode } from '../models/types';

export class Logger {
  private result: CrawlResult;
  private dataFile: string;

  constructor(rootUrl: string, dataFile: string) {
    this.dataFile = dataFile;
    this.result = {
      root_url: rootUrl,
      crawled_at: new Date().toISOString(),
      nodes: [],
      skipped: [],
    };
  }

  public addNode(node: FlowNode) {
    this.result.nodes.push(node);
  }

  public hasNode(nodeId: string): boolean {
    return this.result.nodes.some(n => n.id === nodeId);
  }

  public addSkipped(url: string, reason: string) {
    this.result.skipped.push({ url, reason });
  }

  public async save() {
    await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
    await fs.writeFile(this.dataFile, JSON.stringify(this.result, null, 2), 'utf8');
  }

  public getResult(): CrawlResult {
    return this.result;
  }
}
