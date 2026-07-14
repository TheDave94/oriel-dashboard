// ============================================================================
// Tests — upstream feature ports (#351 / #320 / #301 / #330)
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

import '../../src/views/OverviewViewStrategy';
import '../../src/views/RoomViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

async function generateOverview(config: Record<string, unknown>): Promise<any> {
  const hass = makeHass({
    areas: [{ area_id: 'office', name: 'Office' }],
    entities: [{ entity_id: 'light.desk', area_id: 'office', state: 'on' }],
  });
  const strategy = customElements.get('ll-strategy-view-oriel-overview') as any;
  return strategy.generate({ dashboardConfig: config }, hass);
}

describe('#351 — custom_sections accept a complete section config', () => {
  it('passes section-level fields (column_span, visibility) through 1:1', async () => {
    const view = await generateOverview({
      custom_sections: [
        {
          key: 'wide',
          parsed_config: {
            type: 'grid',
            column_span: 2,
            visibility: [{ condition: 'state', entity: 'sun.sun', state: 'above_horizon' }],
            cards: [{ type: 'markdown', content: 'hello' }, null],
          },
        },
      ],
      sections_order: ['wide', 'overview', 'areas'],
    });
    const section = (view.sections as any[]).find((s) =>
      s.cards?.some((c: any) => c.content === 'hello'),
    );
    expect(section).toBeDefined();
    expect(section.column_span).toBe(2);
    expect(section.visibility).toHaveLength(1);
    // null card dropped, no synthesized heading
    expect(section.cards).toHaveLength(1);
  });

  it('keeps the legacy cards-array form with synthesized heading', async () => {
    const view = await generateOverview({
      custom_sections: [
        {
          key: 'legacy',
          heading: 'My Stuff',
          parsed_config: [{ type: 'markdown', content: 'legacy' }],
        },
      ],
      lazy_sections: false,
    });
    const section = (view.sections as any[]).find((s) =>
      s.cards?.some((c: any) => c.content === 'legacy'),
    );
    expect(section.cards[0]).toMatchObject({ type: 'heading', heading: 'My Stuff' });
  });
});

describe('#301/#330 — room section keys', () => {
  const roomHass = () =>
    makeHass({
      areas: [{ area_id: 'garden', name: 'Garden' }],
      entities: [
        { entity_id: 'light.garden', area_id: 'garden', state: 'on' },
        { entity_id: 'vacuum.dusty', area_id: 'garden', state: 'docked' },
        { entity_id: 'sensor.pinned', area_id: 'garden', state: '5' },
      ],
    });

  async function generateRoom(config: Record<string, unknown>): Promise<any> {
    const hass = roomHass();
    const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
    return strategy.generate({ area: hass.areas['garden'], config: {}, dashboardConfig: config }, hass);
  }

  const headings = (view: any): string[] =>
    (view.sections as any[])
      .map((s) => s.cards?.find((c: any) => c.type === 'heading')?.heading)
      .filter(Boolean);

  it("places pins via an explicit 'pins' entry in room_section_order", async () => {
    const view = await generateRoom({
      room_pin_entities: ['sensor.pinned'],
      // lights section renders as a group card without a heading card,
      // so anchor the order assertion on misc (vacuum tile) instead.
      room_section_order: ['misc', 'pins'],
    });
    const hs = headings(view);
    const pinIdx = hs.findIndex((h) => /pin/i.test(h));
    const miscIdx = hs.findIndex((h) => /misc|sonstig/i.test(h));
    expect(miscIdx).toBeGreaterThanOrEqual(0);
    expect(pinIdx).toBeGreaterThan(miscIdx);
  });

  it('defaults pins to the top when not ordered explicitly', async () => {
    const view = await generateRoom({ room_pin_entities: ['sensor.pinned'] });
    const hs = headings(view);
    expect(/pin/i.test(hs[0] ?? '')).toBe(true);
  });

  it('splits vacuums into their own section only when opted in (#330)', async () => {
    const withOwn = await generateRoom({ show_vacuums_section_in_rooms: true });
    expect(headings(withOwn).some((h) => /vacuum|saug/i.test(h))).toBe(true);

    const without = await generateRoom({});
    expect(headings(without).some((h) => /vacuum|saug/i.test(h))).toBe(false);
    const miscTiles = (without.sections as any[])
      .flatMap((s) => s.cards ?? [])
      .filter((c: any) => c.entity === 'vacuum.dusty');
    expect(miscTiles).toHaveLength(1);
  });
});

describe('#370 — room_visibility cascades to overview area cards', () => {
  it('hides the area card when the room view is rule-hidden', async () => {
    const hass = makeHass({
      areas: [
        { area_id: 'office', name: 'Office' },
        { area_id: 'guest', name: 'Guest Room' },
      ],
      entities: [
        { entity_id: 'light.desk', area_id: 'office', state: 'on' },
        { entity_id: 'light.guest', area_id: 'guest', state: 'off' },
        { entity_id: 'input_boolean.guest_mode', state: 'off' },
      ],
    });
    const strategy = customElements.get('ll-strategy-view-oriel-overview') as any;
    const view = await strategy.generate(
      {
        dashboardConfig: {
          room_visibility: {
            guest: { entity: 'input_boolean.guest_mode', state: 'on' },
          },
          lazy_sections: false,
        },
      },
      hass,
    );
    const areaCards = (view.sections as any[])
      .flatMap((s) => s.cards ?? [])
      .filter((c: any) => c.type === 'area' || c.type === 'custom:oriel-area-card');
    const areaIds = areaCards.map((c: any) => c.area ?? c.area_card_config?.area);
    expect(areaIds).toContain('office');
    expect(areaIds).not.toContain('guest');
  });
});
