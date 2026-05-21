// ============================================================================
// Tests — Extension API v2 (F-2)
// ============================================================================
// Pins the v2 contract:
//   - apiVersion bumped to 2; v1 plugins keep working
//   - return-shape validation rejects malformed v2 results
//   - v1 plugins skip return-shape validation (lenient compat)
//   - attribution footer appears on every plugin-rendered section
//   - timeout / thrown errors still skipped silently (review §S-4)
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EXTENSION_API_VERSION,
  buildExtensionSections,
  buildExtensionBadges,
  installExtensionEntryPoint,
  listSections,
  listBadges,
  _resetExtensionRegistries,
} from '../../src/extension/registry';
import type { HomeAssistant } from '../../src/types/homeassistant';

function makeCtx() {
  return {
    hass: { states: {}, entities: {}, locale: { language: 'en' } } as unknown as HomeAssistant,
    dashboardConfig: {} as Record<string, unknown>,
  };
}

beforeEach(() => {
  _resetExtensionRegistries();
  installExtensionEntryPoint();
});

describe('Extension API — version constant', () => {
  it('exposes apiVersion 2', () => {
    expect(EXTENSION_API_VERSION).toBe(2);
    expect((window as Record<string, unknown> & { oriel?: { apiVersion: number } }).oriel?.apiVersion).toBe(2);
  });
});

describe('Extension API — registration', () => {
  it('accepts v2 sections', () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    oriel.registerSection({
      apiVersion: 2,
      key: 'test-section',
      label: 'Test',
      build: () => ({ type: 'grid', cards: [] }),
    });
    expect(listSections().map((s) => s.key)).toContain('test-section');
  });

  it('accepts v1 sections (backwards compat)', () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    oriel.registerSection({
      apiVersion: 1,
      key: 'legacy-section',
      label: 'Legacy',
      build: () => ({ type: 'grid', cards: [] }),
    });
    expect(listSections().map((s) => s.key)).toContain('legacy-section');
  });

  it('rejects sections with apiVersion 3 (forward-incompat)', () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    oriel.registerSection({
      apiVersion: 3,
      key: 'too-new',
      label: 'Future',
      build: () => ({ type: 'grid', cards: [] }),
    });
    expect(listSections()).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('rejects duplicate keys (first wins)', () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    oriel.registerSection({
      apiVersion: 2,
      key: 'dup',
      label: 'A',
      build: () => ({ type: 'grid', cards: [] }),
    });
    oriel.registerSection({
      apiVersion: 2,
      key: 'dup',
      label: 'B', // would shadow but rejected
      build: () => ({ type: 'grid', cards: [] }),
    });
    expect(listSections()).toHaveLength(1);
    expect(listSections()[0]?.label).toBe('A');
    warn.mockRestore();
  });
});

describe('Extension API v2 — return-shape validation', () => {
  it('accepts a valid v2 section', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    oriel.registerSection({
      apiVersion: 2,
      key: 'ok-section',
      label: 'OK',
      build: () => ({ type: 'grid', cards: [] }),
    });
    const result = await buildExtensionSections(makeCtx());
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe('grid');
  });

  it('rejects v2 section returning a string', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    oriel.registerSection({
      apiVersion: 2,
      key: 'bad-string',
      label: 'Bad',
      build: () => 'oops' as unknown as { type: string },
    });
    const result = await buildExtensionSections(makeCtx());
    expect(result).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('bad-string'),
      expect.anything(),
    );
    warn.mockRestore();
  });

  it('rejects v2 section returning an object without type', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    oriel.registerSection({
      apiVersion: 2,
      key: 'no-type',
      label: 'NoType',
      build: () => ({ cards: [] }) as unknown as { type: string },
    });
    const result = await buildExtensionSections(makeCtx());
    expect(result).toHaveLength(0);
    warn.mockRestore();
  });

  it('accepts v1 section regardless of return shape (lenient compat)', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    oriel.registerSection({
      apiVersion: 1,
      key: 'legacy-lenient',
      label: 'Legacy',
      // Returns an object missing `type` — v2 would reject, v1 accepts
      build: () => ({ cards: [] }) as unknown as { type: string },
    });
    const result = await buildExtensionSections(makeCtx());
    expect(result).toHaveLength(1);
  });

  it('rejects v2 badge returning an array', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerBadge: (s: unknown) => void };
    }).oriel!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    oriel.registerBadge({
      apiVersion: 2,
      key: 'bad-badge',
      build: () => [] as unknown as { type: string },
    });
    const result = await buildExtensionBadges(makeCtx());
    expect(result).toHaveLength(0);
    warn.mockRestore();
  });

  it('accepts a valid v2 badge', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerBadge: (s: unknown) => void };
    }).oriel!;
    oriel.registerBadge({
      apiVersion: 2,
      key: 'ok-badge',
      build: () => ({ type: 'entity', entity: 'sensor.x' }),
    });
    const result = await buildExtensionBadges(makeCtx());
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe('entity');
  });
});

describe('Extension API — attribution footer', () => {
  it('appends attribution to section emitted by v2 plugin', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    oriel.registerSection({
      apiVersion: 2,
      key: 'my-plugin',
      label: 'Mine',
      build: () => ({
        type: 'grid',
        cards: [{ type: 'tile', entity: 'light.x' }],
      }),
    });
    const result = await buildExtensionSections(makeCtx());
    const section = result[0]!;
    // Last card is the attribution footer
    const cards = section.cards as Array<{ type: string; content?: string }>;
    expect(cards).toHaveLength(2);
    expect(cards[1]?.type).toBe('markdown');
    expect(cards[1]?.content).toContain('via my-plugin');
  });

  it('appends attribution to v1 plugin section too (uniform UX)', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    oriel.registerSection({
      apiVersion: 1,
      key: 'legacy',
      label: 'Legacy',
      build: () => ({ type: 'grid', cards: [] }),
    });
    const result = await buildExtensionSections(makeCtx());
    const cards = result[0]?.cards as Array<{ content?: string }>;
    expect(cards.some((c) => c.content?.includes('via legacy'))).toBe(true);
  });
});

describe('Extension API — attribution footer XSS safety (v2 trust model)', () => {
  it('escapes hostile HTML in plugin keys before interpolating into markdown content', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    // Plugin keys are attacker-controlled under v2 — anything can be
    // registered. The strategy must escape on its side; we don't rely
    // on HA's markdown sanitizer downstream.
    oriel.registerSection({
      apiVersion: 2,
      key: '<img src=x onerror=alert(1)>',
      label: 'Hostile',
      build: () => ({ type: 'grid', cards: [] }),
    });
    const result = await buildExtensionSections(makeCtx());
    const cards = result[0]?.cards as Array<{ type: string; content?: string }>;
    const footer = cards.find((c) => c.type === 'markdown');
    expect(footer).toBeDefined();
    const content = footer?.content ?? '';
    // The raw `<img` tag must NOT appear in the emitted content —
    // would render as an actual image element through HA's markdown.
    // (The word "onerror" as escaped text is harmless: it's literal
    // text, not an HTML attribute. What matters is no unescaped < or >.)
    expect(content).not.toContain('<img');
    expect(content).not.toMatch(/<\/?img/);
    // The escaped form is what we want to see
    expect(content).toContain('&lt;img');
    expect(content).toContain('&gt;');
    // The original quote characters in the user-controlled portion are
    // escaped — confirm by checking that the surrounding template quotes
    // (legitimate use) appear only in the expected places. Hostile keys
    // with quotes would otherwise break out of the style attribute.
    const userControlledPortion = content.split('via ')[1] ?? '';
    expect(userControlledPortion).not.toMatch(/(?<!&#39;|&quot;|&amp;)["']/);
  });

  it('escapes ampersand + quote variants in plugin keys', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    oriel.registerSection({
      apiVersion: 2,
      key: 'a&b"c\'d',
      label: 'Special',
      build: () => ({ type: 'grid', cards: [] }),
    });
    const result = await buildExtensionSections(makeCtx());
    const cards = result[0]?.cards as Array<{ type: string; content?: string }>;
    const footer = cards.find((c) => c.type === 'markdown');
    const content = footer?.content ?? '';
    expect(content).toContain('a&amp;b');
    expect(content).toContain('&quot;c');
    expect(content).toContain('&#39;d');
    // Original unescaped chars must NOT appear in user-controlled portion
    // (the surrounding HTML uses quotes legitimately so check for the
    // dangerous-context-specific encoding instead)
    expect(content).not.toContain('a&b');
    expect(content).not.toContain('"c');
  });

  it('regular ASCII plugin keys render unchanged', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    oriel.registerSection({
      apiVersion: 2,
      key: 'oriel-energy-plugin',
      label: 'Energy',
      build: () => ({ type: 'grid', cards: [] }),
    });
    const result = await buildExtensionSections(makeCtx());
    const cards = result[0]?.cards as Array<{ type: string; content?: string }>;
    const footer = cards.find((c) => c.type === 'markdown');
    expect(footer?.content).toContain('via oriel-energy-plugin');
  });
});

describe('Extension API — robustness (review §S-4)', () => {
  it('isolates a throwing plugin from the others', async () => {
    const oriel = (window as Record<string, unknown> & {
      oriel?: { registerSection: (s: unknown) => void };
    }).oriel!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    oriel.registerSection({
      apiVersion: 2,
      key: 'thrower',
      label: 'Throws',
      build: () => {
        throw new Error('oops');
      },
    });
    oriel.registerSection({
      apiVersion: 2,
      key: 'survivor',
      label: 'Survivor',
      build: () => ({ type: 'grid', cards: [] }),
    });
    const result = await buildExtensionSections(makeCtx());
    expect(result).toHaveLength(1); // survivor's section + attribution
    warn.mockRestore();
  });
});
