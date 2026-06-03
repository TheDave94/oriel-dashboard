// ============================================================================
// Tests — F3 custom-* `card`/`config` → `parsed_config` normalization
// ============================================================================
// The render path reads only `parsed_config`; a YAML-direct author reaches
// for `card:`/`config:`. normalizeCustomEntries backfills parsed_config from
// those aliases once at strategy entry (parsed_config wins), and warns when an
// entry resolves to nothing. This is the F3 required-gate analogue of the F4
// SparklineCard unit test.
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { normalizeCustomEntries } from '../../src/utils/normalize-custom';
import type { OrielConfig } from '../../src/types/strategy';

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  warnSpy.mockRestore();
});

const markdown = { type: 'markdown', content: 'Hello' };

// The single-object custom-* arrays behave identically — parametrize across
// them so the alias contract is proven uniform.
const SINGLE_KINDS: Array<{ key: keyof OrielConfig; label: string }> = [
  { key: 'custom_cards', label: 'card' },
  { key: 'custom_badges', label: 'badge' },
  { key: 'custom_views', label: 'view' },
];

describe('normalizeCustomEntries — `card`/`config` aliases (F3)', () => {
  for (const { key, label } of SINGLE_KINDS) {
    describe(`${key}`, () => {
      it('fills parsed_config from `card`', () => {
        const cfg = { [key]: [{ title: 'T', path: 'p', card: markdown }] } as unknown as OrielConfig;
        const out = normalizeCustomEntries(cfg);
        expect((out[key] as any[])[0].parsed_config).toEqual(markdown);
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it('fills parsed_config from `config`', () => {
        const cfg = { [key]: [{ title: 'T', path: 'p', config: markdown }] } as unknown as OrielConfig;
        const out = normalizeCustomEntries(cfg);
        expect((out[key] as any[])[0].parsed_config).toEqual(markdown);
      });

      it('parsed_config WINS when both are present', () => {
        const winner = { type: 'entities' };
        const cfg = {
          [key]: [{ title: 'T', path: 'p', parsed_config: winner, card: markdown }],
        } as unknown as OrielConfig;
        const out = normalizeCustomEntries(cfg);
        expect((out[key] as any[])[0].parsed_config).toEqual(winner);
      });

      it(`warns and drops (parsed_config stays absent) when the ${label} resolves to nothing`, () => {
        const cfg = { [key]: [{ title: 'T', path: 'p' }] } as unknown as OrielConfig;
        const out = normalizeCustomEntries(cfg);
        expect((out[key] as any[])[0].parsed_config).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(String(warnSpy.mock.calls[0][0])).toContain('[oriel]');
        expect(String(warnSpy.mock.calls[0][0])).toContain(label);
      });

      it('does not mutate the input entry', () => {
        const entry = { title: 'T', path: 'p', card: markdown } as Record<string, unknown>;
        const cfg = { [key]: [entry] } as unknown as OrielConfig;
        normalizeCustomEntries(cfg);
        expect(entry.parsed_config).toBeUndefined();
      });
    });
  }

  describe('custom_sections (parsed_config is an array)', () => {
    it('wraps a single aliased object into an array', () => {
      const cfg = {
        custom_sections: [{ key: 's', card: markdown }],
      } as unknown as OrielConfig;
      const out = normalizeCustomEntries(cfg);
      expect(out.custom_sections![0].parsed_config).toEqual([markdown]);
    });

    it('passes an aliased array through unchanged', () => {
      const arr = [markdown, { type: 'entities' }];
      const cfg = {
        custom_sections: [{ key: 's', config: arr }],
      } as unknown as OrielConfig;
      const out = normalizeCustomEntries(cfg);
      expect(out.custom_sections![0].parsed_config).toEqual(arr);
    });

    it('parsed_config wins; warns when a section resolves to nothing', () => {
      const cfg = {
        custom_sections: [{ key: 'a', parsed_config: [markdown], card: [{ type: 'x' }] }, { key: 'b' }],
      } as unknown as OrielConfig;
      const out = normalizeCustomEntries(cfg);
      expect(out.custom_sections![0].parsed_config).toEqual([markdown]);
      expect(out.custom_sections![1].parsed_config).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0][0])).toContain('section');
    });
  });

  describe('custom_views — reference mode is not an empty entry', () => {
    it('does NOT warn for a ref-mode view with no parsed_config/card/config', () => {
      const cfg = {
        custom_views: [{ title: 'T', path: 'p', ref_dashboard: 'lovelace', ref_view: 'home' }],
      } as unknown as OrielConfig;
      const out = normalizeCustomEntries(cfg);
      expect(out.custom_views![0].parsed_config).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does NOT warn for an incomplete skeleton view (no title/path)', () => {
      const cfg = { custom_views: [{}] } as unknown as OrielConfig;
      const out = normalizeCustomEntries(cfg);
      expect(warnSpy).not.toHaveBeenCalled();
      void out;
    });
  });

  it('returns config unchanged shape when there are no custom-* arrays', () => {
    const cfg = { show_pollen: true } as unknown as OrielConfig;
    const out = normalizeCustomEntries(cfg);
    expect(out.show_pollen).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
