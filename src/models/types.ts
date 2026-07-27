export type NodeType = 'navigation' | 'modal' | 'sin_efecto';

export interface FlowNode {
  id: string; // hash of url+trigger
  type: NodeType;
  url: string | null;
  parent_id: string | null;
  trigger: {
    text: string;
    selector: string;
    api_calls?: { method: string; url: string; status: number }[];
  } | null;
  screenshot_path: string;
  closes_via?: string[];
  depth: number;
  visited_at: string; // ISO timestamp
  warnings?: string[];
}

export interface CrawlResult {
  root_url: string;
  crawled_at: string;
  nodes: FlowNode[];
  skipped: { url: string; reason: string }[];
}
