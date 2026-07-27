# Cheat Sheet de Comandos SnapFlow

Esta guía enumera los comandos y *flags* disponibles para ejecutar la herramienta a través de `npm start -- [argumentos]`.

### 1. Grabación de Test Automatizado (Recomendado)
Abre el navegador para que interactúes con la interfaz. Genera automáticamente un test de Vitest y habilita el reporte visual interactivo.
```bash
npm start -- --automatized-test "nombre-del-flujo"
```

### 2. Exploración Manual Interactiva
Inicia el modo de captura manual. Permite navegar libremente sin grabar hasta que decidas iniciarlo presionando `s` en la consola. Presiona `f` para finalizar. Genera los reportes JSON/HTML pero *no* el archivo de test de Vitest.
```bash
npm start -- --manual-flow
```

### 3. Exploración Manual por Flujos Específicos
Igual que el modo manual, pero agrupa los reportes y capturas de pantalla bajo un nombre específico (ej. `login_report.html`, `output/screenshots/login/`).
```bash
npm start -- --manual-flow --flow-name "login"
```

### 4. Exploración 100% Automática
Ejecuta el rastreador de forma autónoma, descubriendo enlaces y elementos basándose exclusivamente en las reglas de tu `crawler.config.yaml`.
```bash
npm start
```

### 5. Exploración Automática con Login Manual
Abre el navegador, pausa la ejecución para que inicies sesión de forma manual. Tras presionar Enter en la consola, retoma la navegación autónoma.
```bash
npm start -- --manual-login
```

### 6. Archivos de Configuración Personalizados
Sobrescribe el `crawler.config.yaml` por defecto con otro archivo. Puede combinarse con cualquier otro flag.
```bash
npm start -- --config "staging.config.yaml"
```

---

### Ejemplos combinados útiles:

**Grabar un test automatizado en el entorno de producción:**
```bash
npm start -- --config prod.config.yaml --automatized-test "checkout"
```

**Exploración autónoma tras login manual en staging:**
```bash
npm start -- --config staging.config.yaml --manual-login
```
