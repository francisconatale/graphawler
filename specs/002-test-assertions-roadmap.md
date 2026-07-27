# Roadmap: Siguientes Pasos y Mejoras

Ahora que la herramienta base puede capturar interacciones de red e inyectar el código en archivos TypeScript ejecutables por Vitest, el siguiente paso evolutivo de SnapFlow (Crawlker) es mejorar la robustez de los tests generados.

Actualmente el código generado es principalmente de "Navegación" y "Click". Para que sea una verdadera herramienta de testing E2E, se deben integrar mecánicas de aserciones y validaciones.

## 1. Generación de Aserciones Automáticas (Smart Asserts)

Cuando el usuario hace clic o navega, SnapFlow podría deducir qué estado debería comprobarse.

### Posibles Implementaciones:
- **Aserción de Visibilidad:** Después de hacer clic en un botón que abre un modal, inyectar código para verificar que el modal o la nueva página exista:
  ```typescript
  await expect(page.locator('.modal-abierto')).toBeVisible();
  ```
- **Aserción de Red (Network Asserts):** Dado que ya estamos capturando las peticiones a la API (ver `network_interception.md`), podemos inyectar aserciones que aseguren que el servidor respondió con un 200 OK a esa acción específica:
  ```typescript
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/checkout') && res.status() === 200),
    page.click('button#comprar')
  ]);
  await expect(response.ok()).toBeTruthy();
  ```
  *(Nota: El código actual en `manual_explorer.ts` ya hace un esbozo de esto en la generación del AST, pero debe pulirse con el manejo de POSTs).*

## 2. Aserciones Manuales (Modo Interactivo)

El usuario debería poder "pausar" la grabación y decirle a SnapFlow que quiere verificar un texto específico en pantalla.

### Flujo de UX propuesto:
1. El usuario está navegando.
2. Presiona una tecla especial en el teclado (ej. `v` para *Verify*) en la consola, o usa una combinación de clics (ej. *Alt + Click* en un elemento).
3. SnapFlow captura el selector y el `innerText` de ese elemento y genera automáticamente:
  ```typescript
  await expect(page.locator('.total-price')).toHaveText('$150.00');
  ```

## 3. Parametrización y Data-Driven Tests

En vez de quemar los valores (hardcodear) en el test autogenerado, la herramienta podría extraer los *inputs* tipeados por el usuario y extraerlos a variables al principio del test, haciendo más fácil modificarlos luego.

**Antes:**
```typescript
await page.fill('input[name="email"]', 'test@test.com');
```

**Futuro:**
```typescript
// Al inicio del archivo
const testData = { email: 'test@test.com' };

// En el flujo
await page.fill('input[name="email"]', testData.email);
```

## 4. Sugerencias de Formulación de Tests E2E para el Usuario final

Incluso si la herramienta genera el 90% del código, es importante enseñar al usuario a estructurarlos bien. Podríamos incluir un `tests/e2e/README.md` generado automáticamente con estas buenas prácticas:

1. **Aislamiento:** Cada archivo de test generado por SnapFlow debe ser independiente. No depender de que un test haya corrido antes.
2. **Setup y Teardown:** Usar hooks (`beforeAll`, `afterAll`) para limpiar la base de datos (o resetear estados) antes de que corra el flujo autogenerado.
3. **Selectores Resilientes:** SnapFlow ya intenta usar `data-testid`. El desarrollador debe fomentar el uso de estos atributos en su código de frontend para que el crawler no dependa de clases CSS que cambian constantemente.
