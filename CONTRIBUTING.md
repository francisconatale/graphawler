# Contributing to SnapFlow

Agradecemos las contribuciones a SnapFlow (anteriormente Crawlker). Sigue estos pasos para levantar el entorno de desarrollo y contribuir al código.

## Prerequisitos
- Node.js 18+
- Un navegador soportado por Playwright

## Configuración del Entorno Local

El proceso completo para tener la herramienta corriendo de forma local toma menos de 5 minutos:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/YOUR_ORG/crawlker.git
   cd crawlker
   ```

2. **Instalar dependencias y binarios de Playwright:**
   ```bash
   npm install
   npx playwright install
   ```

3. **Ejecutar en modo desarrollo:**
   Si deseas probar cambios en el compilador AST o en el explorador manual, utiliza TypeScript directamente (con `ts-node` o `tsx`, dependiendo de tu setup en package.json):
   ```bash
   npm start -- --manual-flow
   ```

## Estructura del Código
- `src/crawler/`: Contiene `manual_explorer.ts` e inyectores IPC de Playwright.
- `src/reporter/`: Lógica de renderizado (`html_generator.ts`) para el timeline visual.
- `src/config/`: Parseo y validación de `crawler.config.yaml`.

## Envío de Cambios (Pull Requests)
1. Escribe o actualiza los tests (Vitest) si añades nueva funcionalidad de generación de AST.
2. Comprueba que el renderizado de `html_generator.ts` no introduzca dependencias externas (debe mantenerse standalone).
3. Abre un PR con una descripción clara de la motivación y el cambio realizado.
