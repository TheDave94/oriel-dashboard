// ============================================================================
// Auto-hide audit — empty-input contract for every section builder
// ============================================================================
// The project's principle: a section auto-hides when nothing belongs in it.
// "Auto-hide" here means returning null, NOT an empty section with just a
// heading card. The latter looks broken in the UI (lonely title, no
// content). This file pins each builder to the null-on-empty contract so
// regressions are caught at PR time, not by users.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import {
  createCustomCardsSection,
  createOverviewSection,
} from '../../src/sections/OverviewSection';
import { createAreasSection } from '../../src/sections/AreasSection';
import {
  createEnergySection,
  createWeatherSection,
} from '../../src/sections/WeatherEnergySection';
import { makeHass } from '../fixtures/hass';

beforeEach(() => {
  Registry.resetForTesting();
});

describe('auto-hide contract', () => {
  describe('createWeatherSection', () => {
    it('returns null when no weather entity is available', () => {
      expect(createWeatherSection(null, true)).toBeNull();
    });

    it('returns null when show_weather is false', () => {
      expect(createWeatherSection('weather.home', false)).toBeNull();
    });
  });

  describe('createEnergySection', () => {
    it('returns null when show_energy is false', () => {
      expect(createEnergySection(false)).toBeNull();
    });
  });

  describe('createCustomCardsSection', () => {
    it('returns null on an empty list', () => {
      expect(createCustomCardsSection([])).toBeNull();
    });

    it('returns null when every entry lacks parsed_config', () => {
      expect(
        createCustomCardsSection([
          { yaml: 'invalid' as unknown as string },
        ])
      ).toBeNull();
    });
  });

  describe('createAreasSection', () => {
    it('returns null when no areas are visible (flat mode)', () => {
      // Previously this returned a section with just a heading card and no
      // area tiles — a "lonely title" in the UI. Now properly auto-hides.
      expect(createAreasSection([], false)).toBeNull();
    });

    it('returns null when no areas are visible (group_by_floors mode)', () => {
      const hass = makeHass({});
      Registry.initialize(hass, {});
      expect(createAreasSection([], true, hass)).toBeNull();
    });
  });

  describe('createOverviewSection', () => {
    it('still returns the overview section even with minimal config', () => {
      // Overview is intentionally always present — it carries the clock and
      // person chips, which are not "feature" content. Pinning this so a
      // future "auto-hide on empty" refactor doesn't accidentally vanish
      // the user's primary control surface.
      const hass = makeHass({});
      Registry.initialize(hass, {});
      const section = createOverviewSection({
        someSensorId: 'sensor.dummy',
        showSearchCard: false,
        config: {},
        hass,
      });
      expect(section).not.toBeNull();
    });
  });
});
