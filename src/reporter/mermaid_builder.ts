import { CrawlResult } from '../models/types';

export function buildMermaidDiagram(result: CrawlResult): string {
  let diagram = 'graph TD\n';
  // Add some styling for the graph nodes
  diagram += `  classDef default fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;\n`;
  diagram += `  classDef modal fill:#1e293b,stroke:#f59e0b,stroke-width:2px,color:#f8fafc,stroke-dasharray: 5 5;\n`;

  for (const node of result.nodes) {
    // Relative path for HTML (assuming HTML is inside output/)
    const relativeImgPath = node.screenshot_path.replace(/^output[\\\/]/, './').replace(/\\/g, '/');
    const imgTag = `<img src='${relativeImgPath}' width='250' style='border-radius: 6px; margin-bottom: 8px;' />`;

    if (node.parent_id) {
      // Escape any double quotes in edge labels
      let edgeLabel = node.trigger ? node.trigger.text.replace(/"/g, "'") : 'nav';
      if (edgeLabel.length > 35) edgeLabel = edgeLabel.substring(0, 35) + '...';
      
      const shortUrl = node.url && node.url.length > 40 ? node.url.substring(0, 40) + '...' : (node.url || 'Page');

      if (node.type === 'modal') {
        diagram += `  ${node.parent_id} -.->|"${edgeLabel}"| ${node.id}(["${imgTag}<br/><span style='font-size:12px; color:#fcd34d;'>Modal</span>"])\n`;
        diagram += `  class ${node.id} modal;\n`;
      } else {
        diagram += `  ${node.parent_id} -->|"${edgeLabel}"| ${node.id}["${imgTag}<br/><span style='font-size:12px; color:#93c5fd;'>${shortUrl}</span>"]\n`;
      }
    } else {
      const shortUrl = node.url && node.url.length > 40 ? node.url.substring(0, 40) + '...' : (node.url || 'Root');
      diagram += `  ${node.id}["${imgTag}<br/><span style='font-size:14px; color:#a78bfa; font-weight:bold;'>Root: ${shortUrl}</span>"]\n`;
    }
  }

  return diagram;
}
