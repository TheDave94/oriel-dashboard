// ============================================================================
// Tests — floors_display.order reorders floor sections on the overview (#129)
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { createAreasSection } from '../../src/sections/AreasSection';
import { makeHass } from '../fixtures/hass';

beforeEach(() => {
  Registry.resetForTesting();
});

function floorHeadings(sections: any): string[] {
  const arr = Array.isArray(sections) ? sections : [sections];
  const out: string[] = [];
  for (const s of arr) {
    const heading = (s?.cards ?? []).find((c: any) => c.type === 'heading');
    if (heading) out.push(heading.heading);
  }
  return out;
}

function setup() {
  const hass = makeHass({
    floors: [
      { floor_id: 'ground', name: 'Ground' },
      { floor_id: 'first', name: 'First' },
      { floor_id: 'attic', name: 'Attic' },
    ],
    areas: [
      { area_id: 'a_g', name: 'Kitchen', floor_id: 'ground' },
      { area_id: 'a_1', name: 'Bedroom', floor_id: 'first' },
      { area_id: 'a_a', name: 'Loft', floor_id: 'attic' },
    ],
  });
  Registry.initialize(hass, {});
  const areas = Object.values(hass.areas as Record<string, any>);
  return { hass, areas };
}

describe('createAreasSection — floor order (#129)', () => {
  it('uses HA registry order by default', () => {
    const { hass, areas } = setup();
    const sections = createAreasSection(areas as any, true, hass, false, false, undefined);
    expect(floorHeadings(sections)).toEqual(['Ground', 'First', 'Attic']);
  });

  it('honors floors_display.order', () => {
    const { hass, areas } = setup();
    const sections = createAreasSection(areas as any, true, hass, false, false, {
      order: ['attic', 'ground', 'first'],
    });
    expect(floorHeadings(sections)).toEqual(['Attic', 'Ground', 'First']);
  });
});
