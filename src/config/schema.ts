import { z } from 'zod';

export const ConfigSchema = z.object({
  target: z.object({
    base_url: z.string().url(),
    same_domain_only: z.boolean().default(true),
  }),
  navigation_rules: z.object({
    include_selectors: z.array(z.string()).default(['a[href]', 'button', '[role=button]']),
    exclude_selectors: z.array(z.string()).default([]),
    max_depth: z.number().int().min(1).default(3),
    dedupe_by: z.enum(['url', 'url+query']).default('url'),
  }).default({}),
  modal_rules: z.object({
    selectors: z.array(z.string()).default(['[role=dialog]', '[aria-modal=true]', '.modal']),
    close_strategies: z.array(z.string()).default(['Escape', '[aria-label=close]', 'backdrop_click']),
    modal_depth: z.number().int().min(1).default(1),
  }).default({}),
  auth: z.object({
    required: z.boolean().default(false),
  }).default({}),
  output: z.object({
    screenshots_dir: z.string().default('./output/screenshots'),
    data_file: z.string().default('./output/tree.json'),
    report_format: z.array(z.enum(['html', 'pdf'])).default(['html', 'pdf']),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
