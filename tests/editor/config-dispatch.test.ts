// ============================================================================
// Tests — _fireConfigChanged internal-field stripping (review wave)
// ============================================================================
// Two pins on the config-dispatch path:
//   1. `_yaml_error` must survive on `this._config` (the in-memory
//      editing state) — the tabs render their error banners from it.
//      Stripping it there made invalid YAML fail silently (data-drop).
//   2. The EMITTED `config-changed` detail (what HA saves) must carry
//      no `_yaml_error` for ANY of the four custom_* families —
//      including custom_sections, which used to leak into saved YAML.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';

// Side effect: registers the <oriel-editor> custom element.
import '../../src/editor/StrategyEditor';

import type { OrielConfig } from '../../src/types/strategy';

function makeEditor(): any {
  return document.createElement('oriel-editor') as any;
}

function captureConfigChanged(editor: any): { detail: { config: OrielConfig } | null } {
  const captured: { detail: { config: OrielConfig } | null } = { detail: null };
  editor.addEventListener('config-changed', (e: Event) => {
    captured.detail = (e as CustomEvent).detail;
  });
  return captured;
}

const CUSTOM_FAMILIES = ['custom_views', 'custom_cards', 'custom_sections', 'custom_badges'] as const;

describe('_fireConfigChanged — internal-field stripping', () => {
  it('keeps _yaml_error on this._config after invalid YAML in a custom card', () => {
    const editor = makeEditor();
    editor._config = { custom_cards: [{ yaml: '' }] } as OrielConfig;
    const captured = captureConfigChanged(editor);

    editor._updateCustomCardYaml(0, 'foo: [unclosed');

    // Editing state keeps the error so the banner can render…
    expect(editor._config.custom_cards[0]._yaml_error).toBeTruthy();
    // …but the raw YAML string is still preserved for the user to fix.
    expect(editor._config.custom_cards[0].yaml).toBe('foo: [unclosed');

    // The emitted/saved config carries no internal error field.
    expect(captured.detail).not.toBeNull();
    expect(captured.detail!.config.custom_cards![0]._yaml_error).toBeUndefined();
  });

  it('strips _yaml_error from the emitted detail for all four custom_* families, keeping it on _config', () => {
    const editor = makeEditor();
    const config = {
      custom_views: [{ title: 'v', yaml: 'x: [', _yaml_error: 'bad' }],
      custom_cards: [{ yaml: 'x: [', _yaml_error: 'bad' }],
      custom_sections: [{ key: 'k', yaml: 'x: [', _yaml_error: 'bad' }],
      custom_badges: [{ yaml: 'x: [', _yaml_error: 'bad' }],
    } as OrielConfig;
    const captured = captureConfigChanged(editor);

    editor._fireConfigChanged(config);

    expect(captured.detail).not.toBeNull();
    for (const family of CUSTOM_FAMILIES) {
      const emitted = (captured.detail!.config as any)[family];
      expect(emitted[0]._yaml_error, `${family}: emitted detail must be clean`).toBeUndefined();
      // Other fields survive the strip untouched.
      expect(emitted[0].yaml).toBe('x: [');
      // In-memory editing state keeps the flag for the error banners.
      expect((editor._config as any)[family][0]._yaml_error, `${family}: _config keeps flag`).toBe('bad');
    }
  });
});
