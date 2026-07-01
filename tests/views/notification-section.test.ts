// ============================================================================
// Tests — Notification banner section only reserves layout while active (#164)
// ============================================================================
// The overview prepends a `oriel-notification-card` grid section when
// `notification_triggers` are configured. Previously the section was emitted
// unconditionally, so its empty grid cell still reserved a masonry column and
// shoved the first ("Übersicht") overview section sideways even when no trigger
// had fired. The section now carries a `visibility` condition (OR over the
// trigger active-states) so HA hides it — and frees the column — until a
// trigger fires, plus `column_span` so it renders as a full-width banner row
// when active rather than a single-column block.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

import '../../src/views/OverviewViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

async function generate(dashboardConfig: Record<string, unknown>): Promise<any> {
  const hass = makeHass({
    areas: [{ area_id: 'living', name: 'Living Room' }],
    entities: [{ entity_id: 'light.living', area_id: 'living' }],
  });
  const strategy = customElements.get('ll-strategy-view-oriel-overview') as any;
  return strategy.generate({ dashboardConfig }, hass);
}

function notificationSection(view: any): any {
  return (view?.sections ?? []).find((s: any) =>
    (s?.cards ?? []).some((c: any) => c?.type === 'custom:oriel-notification-card'),
  );
}

describe('Overview — notification banner section (#164)', () => {
  it('emits no notification section when no triggers are configured', async () => {
    const view = await generate({});
    expect(notificationSection(view)).toBeUndefined();
  });

  it('gates a single-trigger section behind its active-state visibility', async () => {
    const view = await generate({
      notification_triggers: [{ entity: 'binary_sensor.smoke' }],
    });
    const section = notificationSection(view);
    expect(section).toBeDefined();
    // Single trigger → the state condition sits bare in the visibility array
    // (no `or` wrapper needed since conditions are AND-ed).
    expect(section.visibility).toEqual([
      { condition: 'state', entity: 'binary_sensor.smoke', state: 'on' },
    ]);
    // Full-width row rather than a single-column block.
    expect(section.column_span).toBe(4);
  });

  it('honors a custom active_state in the visibility condition', async () => {
    const view = await generate({
      notification_triggers: [
        { entity: 'alarm_control_panel.home', active_state: 'triggered' },
      ],
    });
    expect(notificationSection(view).visibility).toEqual([
      { condition: 'state', entity: 'alarm_control_panel.home', state: 'triggered' },
    ]);
  });

  it('ORs multiple triggers so the banner shows if any one fires', async () => {
    const view = await generate({
      notification_triggers: [
        { entity: 'binary_sensor.smoke' },
        { entity: 'binary_sensor.leak', active_state: 'wet' },
      ],
    });
    expect(notificationSection(view).visibility).toEqual([
      {
        condition: 'or',
        conditions: [
          { condition: 'state', entity: 'binary_sensor.smoke', state: 'on' },
          { condition: 'state', entity: 'binary_sensor.leak', state: 'wet' },
        ],
      },
    ]);
  });

  it('places the notification section first, before the area cards', async () => {
    const view = await generate({
      notification_triggers: [{ entity: 'binary_sensor.smoke' }],
    });
    const first = view.sections[0];
    expect((first?.cards ?? []).some((c: any) => c?.type === 'custom:oriel-notification-card')).toBe(
      true,
    );
  });
});
