import { describe, it, expect } from 'vitest';
import { ConfigSchema } from '../../src/config/schema';

describe('Config Parser', () => {
  it('should apply defaults for minimal valid config', () => {
    const minimalConfig = {
      target: { base_url: 'https://example.com' }
    };
    const parsed = ConfigSchema.parse(minimalConfig);
    
    expect(parsed.target.base_url).toBe('https://example.com');
    expect(parsed.target.same_domain_only).toBe(true);
    expect(parsed.navigation_rules.max_depth).toBe(3);
    expect(parsed.output.data_file).toBe('./output/tree.json');
  });

  it('should throw on missing base_url', () => {
    expect(() => ConfigSchema.parse({ target: {} })).toThrow();
  });
});
