# Feature Specification: Visual UI Crawler

**Feature Branch**: `[001-visual-ui-crawler]`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "spec-crawler-flujo-ui.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and execute web application crawl (Priority: P1)

As a QA tester or developer, I want to define navigation rules (base URL, inclusion/exclusion rules) and execute the crawler so that it systematically visits all pages and records their visual state.

**Why this priority**: Core product value. Without exploring and capturing screens, there is no report to generate.

**Independent Test**: Can be tested by running the tool against a static test site and verifying it generates the structured output file and screenshots for the expected number of unique states.

**Acceptance Scenarios**:

1. **Given** a valid configuration file and a target web application, **When** the crawler is executed, **Then** it navigates through the pages respecting the maximum depth, captures a screenshot of each state, and outputs a structured log of the flow.
2. **Given** exclusion rules for specific interactive elements, **When** the crawler encounters those elements, **Then** it ignores them and does not trigger interactions.

---

### User Story 2 - Modal and Overlay Detection (Priority: P1)

As a QA tester, I want the tool to detect when an interaction opens a visual overlay (modal, drawer) instead of navigating to a new URL, so that I can document secondary flows on the same page.

**Why this priority**: Key differentiator for modern web applications where many interactions happen without URL changes.

**Independent Test**: Test against a page with two buttons: one navigating to a new page, and one opening a modal. Verify that the output distinguishes between the navigation event and the modal overlay event.

**Acceptance Scenarios**:

1. **Given** a page with a modal triggered by a button, **When** the tool clicks the trigger, **Then** it detects the new visual overlay, logs the state as a modal type, and closes it using predefined strategies.
2. **Given** a limit on modal nesting depth, **When** nested modals are encountered, **Then** the tool respects the limit to avoid infinite loops.

---

### User Story 3 - Interactive Visual Report Generation (Priority: P2)

As a team member reviewing the app, I want to view a visual report that maps the entire navigation flow with diagrams and screenshots, so that I can easily audit the UI state machine.

**Why this priority**: This transforms raw navigation logs into a valuable, consumable format for stakeholders.

**Independent Test**: Use a pre-generated structural log to verify the report generator outputs a properly formatted visual diagram and document.

**Acceptance Scenarios**:

1. **Given** a completed crawl with a structured log and screenshots, **When** the reporting phase runs, **Then** it generates an interactive document containing a flowchart of connected states and thumbnail images.
2. **Given** the generated interactive report, **When** I request a portable document export, **Then** it creates a paginated PDF version.

### Edge Cases

- Navigation loops (e.g., circular menus or redirects).
- Handling protected pages requiring user authentication.
- Interactions that trigger slow animations or network delays before stabilizing.
- Dynamic, non-deterministic content (e.g., rotating banners, randomized feeds) causing inconsistent captures.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST read configuration from a file to determine inclusion/exclusion selectors, maximum depth, and modal closing strategies.
- **FR-002**: The system MUST systematically queue, deduplicate, and process URLs and interactions automatically.
- **FR-003**: The system MUST capture the visual state (screenshot) for every visited node.
- **FR-004**: The system MUST classify every interaction as either: navigation (URL change), modal (new overlay), or no visual effect.
- **FR-005**: The system MUST be able to dismiss opened modals using predefined strategies (e.g., Escape key, close buttons, background clicks).
- **FR-006**: The system MUST output an intermediate structured data file representing the flow hierarchy.
- **FR-007**: The system MUST generate an interactive visual report (e.g., HTML) displaying the flow diagram with integrated screenshots.
- **FR-008**: The system MUST provide an export feature to convert the visual report into a paginated portable document.

### Key Entities *(include if feature involves data)*

- **Flow Node**: Represents a distinct state in the application flow. Contains a unique identifier, type (navigation or modal), associated URL or parent context, the interaction trigger, a path to the visual capture, and depth level.
- **Configuration**: User-defined rules for target scoping, navigation paths, modal handling, and output preferences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The system successfully maps an application with at least 50 distinct visual states (navigational and modal) without failure.
- **SC-002**: The detection engine correctly identifies modal opening and closing interactions in 95% of standard web overlay patterns.
- **SC-003**: The visual report generator correctly parses a valid structural log and produces a complete visual flow document 100% of the time.
- **SC-004**: Interactions that result in no visual changes are logged as warnings and do not stall the crawling process.

## Assumptions

- The target applications rely on standard web DOM interactions (excluding entirely canvas-based or non-standard interfaces).
- Visual states stabilize within a reasonable timeframe after interactions.
- The user can provide a pre-authenticated session state if testing protected flows.
- The environment has necessary dependencies for browser automation installed.
