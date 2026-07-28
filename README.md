# Graphawler

Graphawler es un motor de pruebas E2E basado en Playwright para Node.js. \
Registra las interacciones manuales del navegador y genera automáticamente archivos de test ejecutables en Vitest, acompañados de un reporte HTML en formato de línea de tiempo con capturas de pantalla de la interfaz de usuario.

## Demo

```typescript
// Test generado automáticamente por Graphawler tras una sesión de usuario
import { test, expect } from 'vitest';

test('Flujo de prueba de contador', async () => {
  // configuración base inyectada automáticamente
  await page.goto('http://localhost:3000/');
  
  // click en donde se encuentra el valor inicial
  const counter_initial = await page.locator('[data-testid="counter-value"]').textContent();
  expect(counter_initial).toContain('0');

  // interacciones registradas
  await page.click('[data-testid="increment-btn"]');
  await page.waitForTimeout(1500);
  
  // click en donde se encuentra el valor valor final
  const counter_final = await page.locator('[data-testid="counter-value"]').textContent();
  expect(counter_final).toContain('1');
  
  // Graphawler captura el DOM, red y toma el screenshot de cada paso.
});
```

## Getting Started

Se requiere Node.js 18 o superior.

```bash
# 1. Instalar dependencias
npm install
npx playwright install

# 2. Configurar la URL base editando crawler.config.yaml

# 3. Iniciar la grabación de un flujo de prueba
npm run start -- --automatized-test "mi-primer-test"

# 4. Ejecutar el test generado (genera el reporte HTML en output/)
npx vitest tests/e2e/mi-primer-test.test.ts
```

## Features / Modos de Ejecución

Graphawler ofrece cuatro modos de ejecución mediante parámetros CLI (`npm start -- [flags]`):

- **`--automatized-test <nombre>`** (Recomendado): Abre una sesión interactiva. Cada navegación y clic se convierte en código TypeScript (Vitest) y se captura visualmente. Además, permite registrar **aserciones (`expects`)** de forma interactiva haciendo `Alt+Click` sobre cualquier elemento de la página.
- **`--manual-flow [--flow-name <nombre>]`**: Registra interacciones y genera un reporte HTML/JSON, pero omite la creación del archivo de test. Útil para auditoría visual sin testing.
- **Sin flags (Automático Clásico)**: Explora la aplicación autónomamente descubriendo enlaces y componentes basado en reglas definidas en `crawler.config.yaml`.
- **`--manual-login`**: Pausa la ejecución automática inicial para permitir el ingreso de credenciales de usuario. Continúa de forma autónoma al presionar Enter en la consola.

Todos los modos admiten el flag `--config <archivo.yaml>` para cargar configuraciones específicas por entorno.

## Arquitectura

La herramienta opera en tres capas principales:

1. **Explorador Interactivo (`src/crawler/manual_explorer.ts`)**: Inyecta scripts en el contexto de Playwright (`page.addInitScript`) para interceptar clics y observar mutaciones del DOM. Envía eventos a Node mediante IPC (`page.exposeFunction`). Controla contadores de peticiones (`fetch`/`xhr`) para garantizar capturas estables.
2. **Generador de Código (AST)**: Transforma la bitácora de eventos del navegador en sintaxis válida de TypeScript para Vitest.
3. **Generador de Reportes HTML (`src/reporter/html_generator.ts`)**: Renderiza un *timeline* responsivo a partir de las bitácoras JSON y capturas de pantalla, sin dependencias externas de interfaz.

## Contributing

Para contribuir, por favor lee el archivo [CONTRIBUTING.md](./CONTRIBUTING.md). La arquitectura local requiere compilar TypeScript usando `npm run build` o ejecutar directamente mediante `npx ts-node`.

## License

[MIT](./LICENSE)
