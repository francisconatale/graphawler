# Data Model

## Entities

### Config
Represents the user configuration for the crawler.
- `target`: Contains `base_url` and `same_domain_only`
- `navigation_rules`: Contains `include_selectors`, `exclude_selectors`, `max_depth`, `dedupe_by`
- `modal_rules`: Contains `selectors`, `close_strategies`, `modal_depth`
- `auth`: Contains `required`
- `output`: Contains `screenshots_dir`, `data_file`, `report_format`

### FlowNode
Represents a recorded state in the UI flow.
- `id`: `string` - Hash of URL and trigger (unique identifier).
- `type`: `string` - "navigation" or "modal".
- `url`: `string | null` - The current URL. Null if it's a modal over the same URL.
- `parent_id`: `string | null` - ID of the parent node. Null for the root landing page.
- `trigger`: `object | null` - The element that triggered this node (contains `text` and `selector`).
- `screenshot_path`: `string` - Relative path to the captured screenshot.
- `closes_via`: `string[]` (optional) - How the modal can be closed (only for `type: "modal"`).
- `depth`: `number` - Current depth level from the root.
- `visited_at`: `string` - ISO timestamp.
- `warnings`: `string[]` (optional) - E.g. "clicked but no visual effect detected".

### CrawlResult
Represents the final structured log of the crawl.
- `root_url`: `string`
- `crawled_at`: `string`
- `nodes`: `FlowNode[]` - Flat list of flow nodes, hierarchy reconstructed via `parent_id`.
- `skipped`: `object[]` - List of URLs/actions skipped and the reason.
