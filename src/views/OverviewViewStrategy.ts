// ====================================================================
// VIEW STRATEGY — OVERVIEW (main dashboard view)
// ====================================================================
// Extracted from the dashboard entry point so HA can resolve this view
// concurrently with other view strategies via Promise.all, enabling
// progressive rendering instead of blocking on Registry init.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig, SectionKey, CustomCard, CustomSection } from '../types/strategy';
import { DEFAULT_SECTIONS_ORDER } from '../types/strategy';
import type { LovelaceViewConfig, LovelaceSectionConfig, LovelaceBadgeConfig, LovelaceCardConfig } from '../types/lovelace';
import { Registry } from '../Registry';
import { collectPersons, findWeatherEntity, findDummySensor } from '../utils/entity-filter';
import { getVisibleAreas } from '../utils/name-utils';
import { createPersonBadges } from '../utils/badge-builder';
import { createOverviewSection, createCustomCardsSection } from '../sections/OverviewSection';
import { createAreasSection } from '../sections/AreasSection';
import { createWeatherSection, createEnergySection } from '../sections/WeatherEnergySection';
import { createOverviewView } from '../utils/view-builder';
import { timeStart, timeEnd, debugLog } from '../utils/debug';

/** Built-in section keys (collision check for custom_sections). */
const BUILTIN_SECTION_KEYS = new Set<string>(['overview', 'custom_cards', 'areas', 'weather', 'energy']);

/**
 * Normalizes a sections_order array: removes invalid/duplicate keys,
 * appends any missing keys at the end (forward compatibility).
 *
 * Accepts user-defined custom_section keys alongside built-in SectionKeys.
 * Unknown keys (typos, removed sections) are dropped silently.
 */
function normalizeSectionsOrder(order: string[], customSectionKeys: string[]): string[] {
  const validKeys = new Set<string>([...BUILTIN_SECTION_KEYS, ...customSectionKeys]);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of order) {
    if (validKeys.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }
  // Append any missing built-ins in their default order
  for (const key of DEFAULT_SECTIONS_ORDER) {
    if (!seen.has(key)) result.push(key);
  }
  // Append any custom sections the user didn't explicitly position
  for (const key of customSectionKeys) {
    if (!seen.has(key)) result.push(key);
  }
  return result;
}

/**
 * Build a LovelaceSectionConfig from a user-declared CustomSection.
 * Returns null when the section has no cards (auto-hide).
 *
 * Defensive: only accepts an array of card configs (the editor parses YAML
 * to that shape). Malformed entries are dropped.
 */
function buildCustomSection(section: CustomSection): LovelaceSectionConfig | null {
  if (!Array.isArray(section.parsed_config) || section.parsed_config.length === 0) return null;
  const validCards = section.parsed_config.filter(
    (c): c is LovelaceCardConfig => typeof c === 'object' && c !== null && typeof (c as { type?: unknown }).type === 'string'
  );
  if (validCards.length === 0) return null;
  const cards: LovelaceCardConfig[] = [];
  if (section.heading) {
    cards.push({
      type: 'heading',
      heading: section.heading,
      heading_style: 'title',
      ...(section.icon ? { icon: section.icon } : {}),
    });
  }
  cards.push(...validCards);
  return { type: 'grid', cards };
}

/**
 * Renders custom cards into an array of LovelaceCardConfigs (without section wrapper).
 * Used to append assigned custom cards to existing sections.
 */
function renderCustomCards(cards: CustomCard[]): LovelaceCardConfig[] {
  const result: LovelaceCardConfig[] = [];
  for (const card of cards) {
    if (!card.parsed_config) continue;
    if (Array.isArray(card.parsed_config)) {
      result.push(...card.parsed_config);
    } else {
      if (card.title) {
        result.push({ type: 'heading', heading: card.title, heading_style: 'subtitle' });
      }
      result.push(card.parsed_config as LovelaceCardConfig);
    }
  }
  return result;
}

class Simon42ViewOverviewStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    timeStart('overview-generate');
    const dashboardConfig: Simon42StrategyConfig = config.dashboardConfig || {};

    // Initialize Registry (idempotent — skips if already done by another view)
    Registry.initialize(hass, dashboardConfig);

    // Visible areas (filtered + sorted by config)
    const visibleAreas = getVisibleAreas(Registry.areas, dashboardConfig.areas_display, dashboardConfig.use_default_area_sort);

    // Collect data for overview
    const persons = collectPersons(hass, dashboardConfig);
    const weatherEntity = findWeatherEntity(hass);
    const someSensorId = findDummySensor(hass);

    // Person badges
    const personBadges = createPersonBadges(persons, hass);

    // Config flags
    const showWeather = dashboardConfig.show_weather !== false;
    const showEnergy = dashboardConfig.show_energy !== false;
    const showSearchCard = dashboardConfig.show_search_card === true;
    const groupByFloors = dashboardConfig.group_by_floors === true;

    // Group custom cards by target section (built-in OR user-defined custom_sections key)
    const allCustomCards = dashboardConfig.custom_cards || [];
    const customCardsBySection = new Map<string, CustomCard[]>();
    for (const card of allCustomCards) {
      const target = card.target_section || 'custom_cards';
      const list = customCardsBySection.get(target) || [];
      list.push(card);
      customCardsBySection.set(target, list);
    }

    // Process custom_sections: validate keys (no collision with built-ins, no duplicates)
    // and pre-build their LovelaceSectionConfig. Invalid entries are dropped silently.
    const rawCustomSections = dashboardConfig.custom_sections || [];
    const seenCustomKeys = new Set<string>();
    const customSections: { key: string; section: LovelaceSectionConfig | null }[] = [];
    for (const cs of rawCustomSections) {
      if (!cs.key || typeof cs.key !== 'string') continue;
      if (BUILTIN_SECTION_KEYS.has(cs.key)) continue; // can't shadow built-ins
      if (seenCustomKeys.has(cs.key)) continue; // first wins on duplicates
      seenCustomKeys.add(cs.key);
      customSections.push({ key: cs.key, section: buildCustomSection(cs) });
    }
    const customSectionKeys = customSections.map((s) => s.key);

    // Build built-in sections
    const overviewSection = createOverviewSection({ someSensorId, showSearchCard, config: dashboardConfig, hass });
    const customCardsSection = createCustomCardsSection(
      customCardsBySection.get('custom_cards') || [],
      dashboardConfig.custom_cards_heading,
      dashboardConfig.custom_cards_icon
    );
    const areasSections = createAreasSection(visibleAreas, groupByFloors, hass);

    // Section map: key → section(s) or null. Keyed by string so custom keys fit alongside built-ins.
    const sectionMap = new Map<string, LovelaceSectionConfig | LovelaceSectionConfig[] | null>([
      ['overview', overviewSection],
      ['custom_cards', customCardsSection],
      ['areas', areasSections],
      ['weather', createWeatherSection(weatherEntity ?? null, showWeather)],
      ['energy', createEnergySection(showEnergy, dashboardConfig.energy_link_dashboard !== false)],
    ]);
    for (const { key, section } of customSections) {
      sectionMap.set(key, section);
    }

    // Assemble in configured order, appending assigned custom cards to each section
    const sectionsOrder = normalizeSectionsOrder(
      (dashboardConfig.sections_order as string[] | undefined) ?? DEFAULT_SECTIONS_ORDER,
      customSectionKeys,
    );
    const overviewSections: LovelaceSectionConfig[] = [];
    for (const key of sectionsOrder) {
      const result = sectionMap.get(key);
      if (!result) continue;
      if (Array.isArray(result)) {
        overviewSections.push(...result);
      } else {
        overviewSections.push(result);
      }
      // Append custom cards assigned to this section (skip 'custom_cards' — handled by createCustomCardsSection)
      if (key !== 'custom_cards') {
        const assigned = customCardsBySection.get(key);
        if (assigned && assigned.length > 0) {
          const extraCards = renderCustomCards(assigned);
          if (extraCards.length > 0) {
            // Append to the last section added (handles array sections like areas)
            const lastSection = overviewSections[overviewSections.length - 1];
            if (lastSection.cards) {
              lastSection.cards.push(...extraCards);
            }
          }
        }
      }
    }

    const totalCards = overviewSections.reduce((sum, s) => sum + (s.cards?.length || 0), 0);
    timeEnd('overview-generate');
    debugLog(`Overview: ${overviewSections.length} sections, ${totalCards} cards, ${personBadges.length} badges`);

    // Custom badges from YAML config
    const customBadges = (dashboardConfig.custom_badges || [])
      .filter((b) => b.parsed_config)
      .map((b) => b.parsed_config as LovelaceBadgeConfig);

    return createOverviewView(overviewSections, [...personBadges, ...customBadges]);
  }
}

customElements.define('ll-strategy-simon42-view-overview', Simon42ViewOverviewStrategy);
