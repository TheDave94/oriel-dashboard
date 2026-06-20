// ============================================================================
// Tests — utils/domain-features (buildDomainControlFeatures)
// ============================================================================
// This is the single source of truth for "which inline tile controls can this
// entity actually drive". The Bubble pop-up drawer body and the room tiles both
// lean on it, so the gating boundaries are exactly where a feature-mapping bug
// would hide: emit a control the entity can't drive and HA renders a dead row;
// drop one it can and the drawer goes hollow again. These pin each boundary.
// ============================================================================

import { describe, it, expect } from 'vitest';

import { buildDomainControlFeatures } from '../../src/utils/domain-features';
import type { HassEntity } from '../../src/types/homeassistant';

// Minimal state stub — buildDomainControlFeatures only reads entity_id +
// attributes.supported_features / supported_color_modes.
function state(entity_id: string, attributes: Record<string, unknown> = {}): HassEntity {
  return { entity_id, state: 'on', attributes } as unknown as HassEntity;
}
const featureTypes = (e: HassEntity): string[] => buildDomainControlFeatures(e).map((f) => f.type);

// HA supported_features bits used below, named for readability.
const COVER_SET_POSITION = 4;
const COVER_SET_TILT_POSITION = 128;
const COVER_OPEN_CLOSE = 1 | 2;
const CLIMATE_TARGET_TEMPERATURE = 1;
const CLIMATE_PRESET_MODE = 16;
const FAN_SET_SPEED = 1;
const MEDIA_PAUSE = 1;
const MEDIA_VOLUME_SET = 4;
const MEDIA_PLAY = 16384;

describe('buildDomainControlFeatures — light', () => {
  it('emits brightness + colour-temp when the light has a colour-temp channel', () => {
    expect(featureTypes(state('light.a', { supported_color_modes: ['color_temp', 'hs'] }))).toEqual([
      'light-brightness',
      'light-color-temp',
    ]);
  });

  it('emits brightness only when there is no colour-temp channel', () => {
    expect(featureTypes(state('light.a', { supported_color_modes: ['brightness'] }))).toEqual([
      'light-brightness',
    ]);
  });

  it('emits nothing for an on/off-only light (a brightness row would be dead)', () => {
    expect(featureTypes(state('light.a', { supported_color_modes: ['onoff'] }))).toEqual([]);
    // missing/unknown color-mode info → also no brightness assumption
    expect(featureTypes(state('light.a', {}))).toEqual([]);
  });
});

describe('buildDomainControlFeatures — cover', () => {
  it('always offers open/close', () => {
    expect(featureTypes(state('cover.a', { supported_features: COVER_OPEN_CLOSE }))).toEqual([
      'cover-open-close',
    ]);
  });

  it('adds position only when the cover supports it', () => {
    expect(featureTypes(state('cover.a', { supported_features: COVER_SET_POSITION }))).toEqual([
      'cover-open-close',
      'cover-position',
    ]);
  });

  it('adds tilt-position only when the cover supports it', () => {
    expect(
      featureTypes(state('cover.a', { supported_features: COVER_SET_POSITION | COVER_SET_TILT_POSITION })),
    ).toEqual(['cover-open-close', 'cover-position', 'cover-tilt-position']);
  });
});

describe('buildDomainControlFeatures — climate', () => {
  it('always offers HVAC modes; adds setpoint when supported', () => {
    expect(featureTypes(state('climate.a', { supported_features: CLIMATE_TARGET_TEMPERATURE }))).toEqual([
      'target-temperature',
      'climate-hvac-modes',
    ]);
  });

  it('offers HVAC modes alone when there is no settable setpoint', () => {
    expect(featureTypes(state('climate.a', { supported_features: 0 }))).toEqual(['climate-hvac-modes']);
  });

  it('adds preset modes only when supported', () => {
    expect(
      featureTypes(state('climate.a', { supported_features: CLIMATE_TARGET_TEMPERATURE | CLIMATE_PRESET_MODE })),
    ).toEqual(['target-temperature', 'climate-hvac-modes', 'climate-preset-modes']);
  });
});

describe('buildDomainControlFeatures — fan', () => {
  it('emits a speed control only when the fan supports speed', () => {
    expect(featureTypes(state('fan.a', { supported_features: FAN_SET_SPEED }))).toEqual(['fan-speed']);
    expect(featureTypes(state('fan.a', { supported_features: 0 }))).toEqual([]);
  });
});

describe('buildDomainControlFeatures — media_player', () => {
  it('gates transport and volume independently', () => {
    expect(featureTypes(state('media_player.a', { supported_features: MEDIA_PLAY | MEDIA_VOLUME_SET }))).toEqual([
      'media-player-playback',
      'media-player-volume-slider',
    ]);
    expect(featureTypes(state('media_player.a', { supported_features: MEDIA_PAUSE }))).toEqual([
      'media-player-playback',
    ]);
    expect(featureTypes(state('media_player.a', { supported_features: MEDIA_VOLUME_SET }))).toEqual([
      'media-player-volume-slider',
    ]);
    expect(featureTypes(state('media_player.a', { supported_features: 0 }))).toEqual([]);
  });
});

describe('buildDomainControlFeatures — non-actionable domains', () => {
  it('returns no features so the caller falls back to a bare tile', () => {
    expect(featureTypes(state('switch.a', { supported_features: 1 }))).toEqual([]);
    expect(featureTypes(state('sensor.a'))).toEqual([]);
  });
});
