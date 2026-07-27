# Implementation Plan: Visual UI Crawler

**Branch**: `001-visual-ui-crawler` | **Date**: 2026-07-27 | **Spec**: [spec.md](file:///C:/Users/compu/OneDrive/Desktop/crawlker/specs/001-visual-ui-crawler/spec.md)

**Input**: Feature specification from `/specs/001-visual-ui-crawler/spec.md`

## Summary

Build a crawler (Explorer + Recorder + Reporter) to generate a visual report (HTML/PDF) documenting the navigation tree of a web application, including navigation by URLs and modal overlays.

## Technical Context

**Language/Version**: TypeScript / Node.js
**Primary Dependencies**: Crawlee (PlaywrightCrawler), Playwright, Mermaid.js, Zod
**Storage**: JSON file (`tree.json`)
**Testing**: Vitest, Playwright (for testing the tool itself)
**Target Platform**: Node.js CLI
**Project Type**: CLI tool
**Performance Goals**: N/A
**Constraints**: Needs to handle dynamic elements and modal resolution robustly.
**Scale/Scope**: Ability to crawl 50+ states without crashing.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Constitution is generic; no specific violations found.

## Project Structure

### Documentation (this feature)

```text
specs/001-visual-ui-crawler/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── config/            # Zod schemas, config parser
├── crawler/           # Crawlee Explorer, handlers
├── recorder/          # State classification, screenshot logic
├── reporter/          # Mermaid.js tree builder, HTML/PDF generation
└── index.ts           # CLI entry point

tests/
├── unit/
└── e2e/
```

**Structure Decision**: Single CLI project. Decoupled modules for Config, Crawler, Recorder, and Reporter.

## Complexity Tracking

No violations.
