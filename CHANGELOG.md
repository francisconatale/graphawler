# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- `--automatized-test` flag to generate executable Vitest code directly from a manual browsing session.
- Documentación estandarizada siguiendo convenciones de librerías Go (Review mode).
- Intercepción de XHR/Fetch refactorizada a través de Playwright IPC events en `manual_explorer.ts`.

### Changed
- El proyecto fue renombrado de Crawlker a SnapFlow.
- Se reestructuró la documentación base para mejorar la legibilidad y separar los modos de uso (`README.md`, `commands.md`).

## [1.0.0] - 2026-06-15 (Aproximado)
### Added
- Explorador Automático basado en `crawler.config.yaml`.
- Reporteador en formato HTML estático sin dependencias para crear líneas de tiempo.
- Modos `--manual-flow` y `--manual-login`.
