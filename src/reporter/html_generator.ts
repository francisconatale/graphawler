import { CrawlResult } from '../models/types';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function generateHtmlReport(result: CrawlResult, outputPath: string) {
  // We don't need Mermaid anymore, we build a custom beautiful vertical timeline.
  
  const generateNodesHtml = () => {
    if (result.nodes.length === 0) {
      return `<div class="empty-state">No steps recorded.</div>`;
    }

    return result.nodes.map((node, index) => {
      const isFirst = index === 0;
      const relativeImgPath = node.screenshot_path.replace(/^(\.\/)?output[\\\\\\/]/, './').replace(/\\\\/g, '/');
      const actionText = node.trigger && node.trigger.selector !== 'manual_start' && node.trigger.selector !== 'auto'
        ? `Click: ${node.trigger.text || node.trigger.selector}`
        : isFirst ? 'Inicio del Flujo' : 'Navegación / Carga';
        
      const urlText = node.url || 'Modal / Overlay';

      return `
        <div class="timeline-step">
          <!-- Connection Line and Action Label -->
          ${!isFirst ? `
            <div class="connection-wrapper">
              <div class="line"></div>
              <div class="action-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <span>${actionText}</span>
              </div>
              <div class="line"></div>
            </div>
          ` : ''}

          <!-- Step Card -->
          <div class="card ${node.type === 'modal' ? 'card-modal' : ''}">
            <div class="card-header">
              <div class="step-indicator">${index + 1}</div>
              <div class="header-info">
                <h3>${node.type === 'modal' ? 'Vista Modal / Overlay' : 'Pantalla Completa'}</h3>
                <p class="url-badge">${urlText}</p>
              </div>
            </div>
            
            <div class="card-body">
              <div class="image-wrapper">
                <a href="${relativeImgPath}" target="_blank">
                  <img src="${relativeImgPath}" alt="Paso ${index + 1}" loading="lazy"/>
                </a>
              </div>
            </div>
            
            ${(node.trigger && (node.trigger.selector !== 'manual_start' || (node.trigger.api_calls && node.trigger.api_calls.length > 0))) ? `
            <div class="card-footer">
              ${node.trigger.selector !== 'manual_start' && node.trigger.selector !== 'auto' ? `
              <div class="code-snippet">
                <code>Selector: ${node.trigger.selector}</code>
              </div>
              ` : ''}
              ${node.trigger.api_calls && node.trigger.api_calls.length > 0 ? `
              <div class="api-calls" style="margin-top: 12px;">
                <h4 style="font-size: 0.85rem; color: #a1a1aa; margin-bottom: 6px;">Llamadas API Interceptadas:</h4>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${node.trigger.api_calls.map(api => `
                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); font-family: 'Fira Code', monospace; font-size: 0.8rem;">
                      <span style="color: ${api.method === 'GET' ? '#60a5fa' : api.method === 'POST' ? '#34d399' : '#f59e0b'}; font-weight: 600;">${api.method}</span>
                      <span style="color: #e2e8f0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${api.url}">${api.url.split('?')[0]}</span>
                      <span style="color: ${api.status < 400 ? '#34d399' : '#ef4444'}; font-weight: 600;">${api.status}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
              ` : ''}
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flujo de Prueba - Crawlker</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card-bg: rgba(24, 24, 27, 0.6);
      --card-border: rgba(63, 63, 70, 0.4);
      --text-main: #f4f4f5;
      --text-muted: #a1a1aa;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.15);
      --modal-accent: #f59e0b;
      --modal-glow: rgba(245, 158, 11, 0.1);
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body { 
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      line-height: 1.5;
      background-image: 
        radial-gradient(circle at 15% 50%, rgba(16, 185, 129, 0.05), transparent 25%),
        radial-gradient(circle at 85% 30%, rgba(59, 130, 246, 0.05), transparent 25%);
      min-height: 100vh;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 60px 20px;
    }

    .page-header {
      text-align: center;
      margin-bottom: 60px;
    }

    .page-header h1 {
      font-size: 3rem;
      font-weight: 700;
      letter-spacing: -1px;
      margin-bottom: 15px;
      background: linear-gradient(135deg, #34d399, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .page-header p {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .timeline-step {
      width: 100%;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Connection line & badge */
    .connection-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 10px 0;
    }

    .connection-wrapper .line {
      width: 2px;
      height: 40px;
      background: linear-gradient(to bottom, transparent, var(--accent), transparent);
      opacity: 0.5;
    }

    .action-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 0.95rem;
      font-weight: 500;
      backdrop-filter: blur(4px);
      z-index: 10;
      margin: -10px 0;
      box-shadow: 0 4px 12px var(--accent-glow);
    }

    /* Cards */
    .card {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      overflow: hidden;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
    }
    
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      border-color: rgba(63, 63, 70, 0.8);
    }

    .card-modal {
      border-style: dashed;
      border-width: 2px;
      border-color: rgba(245, 158, 11, 0.4);
      background: linear-gradient(to bottom, var(--card-bg), var(--modal-glow));
    }
    .card-modal:hover {
      border-color: rgba(245, 158, 11, 0.8);
    }

    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .step-indicator {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1.1rem;
      color: #fff;
    }

    .header-info h3 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 4px;
    }

    .url-badge {
      font-family: 'Fira Code', monospace;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .card-body {
      padding: 24px;
    }

    .image-wrapper {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.05);
      background: #000;
    }

    .image-wrapper img {
      width: 100%;
      display: block;
      transition: transform 0.4s ease;
    }

    .image-wrapper:hover img {
      transform: scale(1.03);
    }

    .card-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--card-border);
      background: rgba(0, 0, 0, 0.2);
    }

    .code-snippet {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 14px;
      border-radius: 6px;
      font-family: 'Fira Code', monospace;
      font-size: 0.85rem;
      color: #93c5fd;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="page-header">
      <h1>Flujo Grabado</h1>
      <p>Base: <strong>${result.root_url}</strong></p>
      <p style="font-size: 0.9rem; margin-top: 5px; opacity: 0.7;">Generado el: ${new Date(result.crawled_at).toLocaleString()}</p>
    </div>

    <div class="timeline">
      ${generateNodesHtml()}
    </div>
  </div>
</body>
</html>
  `;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, 'utf8');
  return outputPath;
}
