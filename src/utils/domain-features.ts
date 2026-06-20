// ====================================================================
// Per-domain tile-feature knowledge (single source of truth)
// ====================================================================
// HA's tile card renders inline controls via `features: [{ type }]`.
// Which features a given entity can usefully show depends on its
// `supported_features` bitmask / `supported_color_modes`. This module
// centralises that knowledge so every surface that wants real controls
// for an entity — compact room tiles AND the Bubble pop-up drawers —
// derives them the same way, instead of each call site re-encoding
// "which control does a fan/climate/cover support".
//
// Two consumers today:
//   - RoomViewStrategy: support predicates for its compact (single-
//     feature) tiles.
//   - bubble-integration.buildPopupContent: the full control set for a
//     pop-up body (a drawer has the vertical room for every supported
//     control, so it stacks them — real more-info-equivalent parity).
// ====================================================================

import type { HassEntity } from '../types/homeassistant';

// HA supported_features bitmask values (per the entity-feature enums).
const FAN_SET_SPEED = 1;

const MEDIA_PAUSE = 1;
const MEDIA_VOLUME_SET = 4;
const MEDIA_STOP = 4096;
const MEDIA_PLAY = 16384;

const COVER_SET_POSITION = 4;
const COVER_SET_TILT_POSITION = 128;

const CLIMATE_TARGET_TEMPERATURE = 1;
const CLIMATE_PRESET_MODE = 16;

function supportedFeatures(state: HassEntity): number {
  return (state.attributes?.supported_features as number) || 0;
}

/** A light that can do more than on/off (has a brightness-bearing colour mode). */
export function lightSupportsBrightness(state: HassEntity): boolean {
  const modes = state.attributes?.supported_color_modes as string[] | undefined;
  if (!Array.isArray(modes)) return false;
  // 'onoff'/'unknown' are the only modes with no brightness channel.
  return modes.some((m) => m !== 'onoff' && m !== 'unknown');
}

/** A light with a colour-temperature channel (drives the `light-color-temp` feature). */
export function lightSupportsColorTemp(state: HassEntity): boolean {
  const modes = state.attributes?.supported_color_modes as string[] | undefined;
  return Array.isArray(modes) && modes.includes('color_temp');
}

/** Fan with a settable speed/percentage. */
export function fanSupportsSpeed(state: HassEntity): boolean {
  return (supportedFeatures(state) & FAN_SET_SPEED) !== 0;
}

/** Media player exposing transport (play / pause / stop). */
export function mediaPlayerSupportsPlayback(state: HassEntity): boolean {
  return (supportedFeatures(state) & (MEDIA_PAUSE | MEDIA_PLAY | MEDIA_STOP)) !== 0;
}

/** Media player with a settable volume level. */
export function mediaPlayerSupportsVolume(state: HassEntity): boolean {
  return (supportedFeatures(state) & MEDIA_VOLUME_SET) !== 0;
}

/** Cover with a settable position (0–100%). */
export function coverSupportsPosition(state: HassEntity): boolean {
  return (supportedFeatures(state) & COVER_SET_POSITION) !== 0;
}

/** Cover with a settable tilt position. */
export function coverSupportsTilt(state: HassEntity): boolean {
  return (supportedFeatures(state) & COVER_SET_TILT_POSITION) !== 0;
}

/** Climate exposing a single target temperature setpoint. */
export function climateSupportsTargetTemp(state: HassEntity): boolean {
  return (supportedFeatures(state) & CLIMATE_TARGET_TEMPERATURE) !== 0;
}

/** Climate exposing selectable preset modes. */
export function climateSupportsPresetModes(state: HassEntity): boolean {
  return (supportedFeatures(state) & CLIMATE_PRESET_MODE) !== 0;
}

/** A single HA tile-card feature config. */
export interface TileFeature {
  type: string;
}

/**
 * The full set of inline tile-card features that give an entity real,
 * more-info-equivalent controls — gated on what the entity actually
 * supports so we never emit a feature the entity can't drive (which HA
 * would render as an empty/dead row).
 *
 * This is the rich set for a drawer/pop-up body, where there's room to
 * stack every supported control. Compact tiles deliberately use a
 * smaller subset (see RoomViewStrategy) — they share the support
 * predicates above, not this list.
 *
 * Domains outside the Bubble-actionable set return `[]`: a bare tile
 * still offers a toggle + tap-through to more-info, which is the right
 * minimum for an unsupported domain.
 */
export function buildDomainControlFeatures(state: HassEntity): TileFeature[] {
  const domain = state.entity_id.split('.')[0];
  const features: TileFeature[] = [];
  switch (domain) {
    case 'light':
      if (lightSupportsBrightness(state)) features.push({ type: 'light-brightness' });
      if (lightSupportsColorTemp(state)) features.push({ type: 'light-color-temp' });
      break;
    case 'cover':
      features.push({ type: 'cover-open-close' });
      if (coverSupportsPosition(state)) features.push({ type: 'cover-position' });
      if (coverSupportsTilt(state)) features.push({ type: 'cover-tilt-position' });
      break;
    case 'climate':
      if (climateSupportsTargetTemp(state)) features.push({ type: 'target-temperature' });
      features.push({ type: 'climate-hvac-modes' });
      if (climateSupportsPresetModes(state)) features.push({ type: 'climate-preset-modes' });
      break;
    case 'fan':
      if (fanSupportsSpeed(state)) features.push({ type: 'fan-speed' });
      break;
    case 'media_player':
      if (mediaPlayerSupportsPlayback(state)) features.push({ type: 'media-player-playback' });
      if (mediaPlayerSupportsVolume(state)) features.push({ type: 'media-player-volume-slider' });
      break;
    default:
      break;
  }
  return features;
}
