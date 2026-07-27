# Interceptación de Red

Crawler UI captura peticiones de red para generar reportes y evitar tomar capturas de pantalla mientras la página carga.

## Mecanismo Actual

El archivo `manual_explorer.ts` inyecta scripts mediante `page.addInitScript` para escuchar clics y mutaciones del DOM. Las peticiones se procesan en dos niveles:

1. **Sincronización de estado:** Escucha `request`, `requestfinished` y `requestfailed` para mantener un contador (`activeRequests`). La captura de pantalla se pausa hasta que el contador llega a cero.
2. **Almacenamiento de datos:** Escucha `page.on('response')` para registrar las peticiones en `pendingApiCalls`.
   - **Restricción de tipo:** Solo captura `resourceType` `fetch` o `xhr`.
   - **Exclusión de estáticos:** Ignora URLs que contienen `.js`, `.css` o `_next/`.
   - **Registro:** Guarda el método HTTP, URL y código de estado.

## Limitaciones Conocidas

- **Pérdida de POSTs nativos:** Las peticiones desde formularios HTML (`<form>`) generan un `resourceType` de tipo `document` y son ignoradas.
- **Dependencia de la respuesta:** Las peticiones que fallan por timeout o navegación temprana no disparan `response` y nunca se registran.
- **Condición de carrera:** `pendingApiCalls` se vacía globalmente en cada clic. Clics rápidos sobrescriben peticiones previas antes de que se guarden en el reporte.

## Solución Propuesta

Para garantizar la captura de todas las acciones de red:

1. **Registrar en inicio:** Capturar las peticiones en el evento `request` y actualizar su estado en `response` o `requestfailed`.
2. **Permitir peticiones document:** Ampliar el filtro para aceptar `resourceType === 'document'` cuando el método sea distinto de `GET`.
3. **Aislamiento por acción:** Asociar las peticiones a un ID de clic específico en lugar de usar un estado global mutado sincrónicamente.
