// ============================================================================
// Tests — LivePreviewRunner (F-5)
// ============================================================================
// Pins the debounce + summary behavior. We don't hit the real
// Oriel.generate() (it requires a fully-set-up custom element + heavy
// HA fixtures); instead we register a stub element under the same tag
// that returns a known LovelaceConfig, and assert the runner
// re-renders on schedule + clamps concurrent calls.
// ============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LivePreviewRunner } from '../../src/editor/LivePreview';
import type { HomeAssistant } from '../../src/types/homeassistant';
import type { OrielConfig } from '../../src/types/strategy';

const STRATEGY_TAG = 'll-strategy-dashboard-oriel';

let generateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Register a stub strategy element that returns a known config.
  generateSpy = vi.fn(async (_cfg: OrielConfig, _hass: HomeAssistant) => ({
    views: [
      {
        sections: [
          { type: 'grid', cards: [{ type: 'tile' }, { type: 'tile' }] },
          { type: 'grid', cards: [{ type: 'tile' }] },
        ],
      },
      { sections: [{ type: 'grid', cards: [] }] },
    ],
  }));
  // customElements is global in happy-dom; redefine each test.
  if (!customElements.get(STRATEGY_TAG)) {
    class Stub extends HTMLElement {
      static async generate(cfg: OrielConfig, hass: HomeAssistant) {
        return generateSpy(cfg, hass);
      }
    }
    customElements.define(STRATEGY_TAG, Stub);
  } else {
    // The class is already registered (likely from a sibling test);
    // replace its static method so this test owns the assertions.
    const existing = customElements.get(STRATEGY_TAG) as unknown as {
      generate?: typeof generateSpy;
    };
    existing.generate = generateSpy;
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LivePreviewRunner — debounce', () => {
  it('debounces multiple schedule() calls into one generate', async () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    const onBusy = vi.fn();
    const runner = new LivePreviewRunner(onResult, onBusy);

    const hass = { states: {} } as unknown as HomeAssistant;
    runner.schedule({} as OrielConfig, hass);
    runner.schedule({ density: 'cozy' } as OrielConfig, hass);
    runner.schedule({ density: 'compact' } as OrielConfig, hass);

    // Nothing has fired yet
    expect(generateSpy).not.toHaveBeenCalled();

    // Advance past the 500ms debounce
    await vi.advanceTimersByTimeAsync(600);

    expect(generateSpy).toHaveBeenCalledTimes(1);
    // Only the LATEST config makes it through
    expect(generateSpy.mock.calls[0]?.[0]).toEqual({ density: 'compact' });
  });

  it('cancel() prevents a pending generate', async () => {
    vi.useFakeTimers();
    const runner = new LivePreviewRunner(vi.fn(), vi.fn());
    runner.schedule({} as OrielConfig, { states: {} } as unknown as HomeAssistant);
    runner.cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(generateSpy).not.toHaveBeenCalled();
  });
});

describe('LivePreviewRunner — summary', () => {
  it('produces the right view/section/card counts + yaml output', async () => {
    let captured: { yaml: string; summary: { views: number; sections: number; cards: number; ms: number } } | undefined;
    const onResult = vi.fn((result) => {
      captured = result;
    });
    const runner = new LivePreviewRunner(onResult, vi.fn());

    runner.schedule({} as OrielConfig, { states: {} } as unknown as HomeAssistant);
    // Real timers — debounce + async generate need to flush
    await new Promise((r) => setTimeout(r, 600));

    expect(captured).toBeDefined();
    expect(captured?.summary.views).toBe(2);
    expect(captured?.summary.sections).toBe(3);
    expect(captured?.summary.cards).toBe(3);
    expect(captured?.yaml).toContain('views:');
  });
});

describe('LivePreviewRunner — error surfacing', () => {
  it('forwards generate() errors via onResult', async () => {
    generateSpy.mockImplementation(async () => {
      throw new Error('generate exploded');
    });
    let receivedError: string | undefined;
    const onResult = vi.fn((_result, error) => {
      receivedError = error;
    });
    const runner = new LivePreviewRunner(onResult, vi.fn());
    runner.schedule({} as OrielConfig, { states: {} } as unknown as HomeAssistant);
    await new Promise((r) => setTimeout(r, 600));
    expect(receivedError).toBe('generate exploded');
  });
});
