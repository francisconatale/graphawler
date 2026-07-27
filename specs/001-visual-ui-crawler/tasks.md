---

description: "Task list for Visual UI Crawler implementation"
---

# Tasks: Visual UI Crawler

**Input**: Design documents from `/specs/001-visual-ui-crawler/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Node.js project (package.json) and install TypeScript, vitest in root
- [X] T002 Install Crawlee, Playwright, Zod, and other production dependencies
- [X] T003 [P] Configure tsconfig.json and linting setup in root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create Zod schemas for user configuration in src/config/schema.ts
- [X] T005 [P] Define FlowNode and CrawlResult TypeScript interfaces in src/models/types.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure and execute web application crawl (Priority: P1) 🎯 MVP

**Goal**: Define navigation rules and execute the crawler to systematically visit pages and record state.

**Independent Test**: Can be tested by running the tool against a static test site and verifying it generates the structured output file and screenshots.

### Implementation for User Story 1

- [X] T006 [US1] Create configuration parser in src/config/parser.ts
- [X] T007 [P] [US1] Create snapshot capturing utility in src/recorder/snapshot.ts
- [X] T008 [P] [US1] Create basic JSON output logger in src/recorder/logger.ts
- [X] T009 [US1] Create base PlaywrightCrawler setup in src/crawler/explorer.ts (depends on snapshot, logger, and config)
- [X] T010 [US1] Create CLI entry point in src/index.ts wiring the configuration, crawler, and logger

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Modal and Overlay Detection (Priority: P1)

**Goal**: Detect when an interaction opens a visual overlay instead of navigating to a new URL.

**Independent Test**: Test against a page with two buttons: one navigating to a new page, and one opening a modal, verifying output distinguishes them.

### Implementation for User Story 2

- [X] T011 [P] [US2] Implement transition classification (navigation vs modal vs no_effect) in src/recorder/classifier.ts
- [X] T012 [P] [US2] Implement modal closing strategies in src/crawler/modal_handler.ts
- [X] T013 [US2] Update src/crawler/explorer.ts to use the classifier and modal_handler during element clicks

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Interactive Visual Report Generation (Priority: P2)

**Goal**: View a visual report that maps the entire navigation flow with diagrams and screenshots.

**Independent Test**: Use a pre-generated structural log to verify the report generator outputs a properly formatted visual diagram and document.

### Implementation for User Story 3

- [X] T014 [P] [US3] Create Mermaid.js diagram builder in src/reporter/mermaid_builder.ts
- [X] T015 [P] [US3] Create HTML template and generator in src/reporter/html_generator.ts
- [X] T016 [P] [US3] Create PDF exporter using Playwright in src/reporter/pdf_exporter.ts
- [X] T017 [US3] Wire the reporting modules (HTML and PDF) to execute after crawling in src/index.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T018 Code cleanup and refactoring
- [X] T019 [P] Run quickstart.md validation locally to ensure e2e works
- [X] T020 [P] Write unit tests for configuration parsing in tests/unit/config.test.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (P1 → P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Depends on US1 completion as it modifies the base crawler logic.
- **User Story 3 (P2)**: Can start after US1 is complete (does not necessarily block on US2 as it only needs the output tree format).

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Models within a story marked [P] can run in parallel
- US3 report generators can be built entirely independently of the crawler logic

---

## Parallel Example: User Story 3

```bash
# Launch all report generation tasks together:
Task: "Create Mermaid.js diagram builder in src/reporter/mermaid_builder.ts"
Task: "Create HTML template and generator in src/reporter/html_generator.ts"
Task: "Create PDF exporter using Playwright in src/reporter/pdf_exporter.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
