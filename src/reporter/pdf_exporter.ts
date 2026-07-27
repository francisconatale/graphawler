import { chromium } from 'playwright';
import path from 'node:path';

export async function exportToPdf(htmlPath: string, pdfPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const absoluteHtmlPath = `file://${path.resolve(htmlPath)}`;
  await page.goto(absoluteHtmlPath, { waitUntil: 'networkidle' });
  
  // Wait a bit more for mermaid to render
  await page.waitForTimeout(2000);
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
  });
  
  await browser.close();
}
