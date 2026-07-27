# Quickstart Validation Guide

This guide describes how to manually validate the Visual UI Crawler functionality end-to-end.

## Prerequisites

- Node.js 18+ installed
- Playwright browsers installed (`npx playwright install`)
- A local test server or public static site for crawling (e.g., `npx serve public/` with a sample HTML page that has links and a modal button).

## Validation Scenario

1. **Setup test environment**
   Create a sample `crawler.config.yaml` using the contract specified in `contracts/crawler.config.yaml`.
   Set `target.base_url` to your test site.

2. **Execute the crawler**
   ```bash
   # Build the project
   npm run build
   
   # Run the crawler with the configuration
   node dist/index.js run --config crawler.config.yaml
   ```

3. **Verify Output**
   - Check that the `./output/screenshots/` directory contains PNG files for each distinct state.
   - Open `./output/tree.json` and ensure it matches the structure in `contracts/tree.json`.
   - Ensure a "navigation" node and a "modal" node are both recorded.
   - Check for `./output/report.html` and verify that the Mermaid diagram renders and screenshots display properly.

4. **Verify PDF Export**
   - Execute the PDF export command or verify that the main command generated `./output/report.pdf` correctly, featuring the flowchart and the screens.
