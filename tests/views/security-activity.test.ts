// ============================================================================
// Tests — Security view: activity log, no_seclog label, cameras section
// ============================================================================
// Ported from upstream simon42 #336. The Security view gains:
//  - a 24h `logbook` section over all security entities + persons (default
//    on; leads the view, or trails with security_activity_position: 'end';
//    auto-omitted when the logbook integration isn't loaded),
//  - the `no_seclog` label: entity stays in the view sections but is
//    excluded from the logbook target,
//  - an opt-in lean camera section (show_cameras_in_security) whose heading
//    deep-links to the camera view when that view is enabled.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass, type HassFixtureSpec } from '../fixtures/hass';

import '../../src/views/SecurityViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

const BASE_SPEC: HassFixtureSpec = {
  areas: [{ area_id: 'entry', name: 'Entry' }],
  entities: [
    { entity_id: 'lock.front', area_id: 'entry', state: 'locked' },
    {
      entity_id: 'binary_sensor.front_window',
      area_id: 'entry',
      state: 'off',
      attributes: { device_class: 'window' },
    },
    { entity_id: 'person.dave', state: 'home' },
  ],
  components: ['logbook'],
};

async function generate(
  config: Record<string, unknown> = {},
  spec: HassFixtureSpec = BASE_SPEC,
): Promise<any> {
  const hass = makeHass(spec);
  const strategy = customElements.get('ll-strategy-view-oriel-security') as any;
  return strategy.generate({ config }, hass);
}

function logbookSection(view: any): any {
  return (view?.sections ?? []).find((s: any) =>
    (s?.cards ?? []).some((c: any) => c?.type === 'logbook'),
  );
}

function logbookTarget(view: any): string[] {
  const card = (logbookSection(view)?.cards ?? []).find((c: any) => c?.type === 'logbook');
  return card?.target?.entity_id ?? [];
}

function camerasSection(view: any): any {
  return (view?.sections ?? []).find((s: any) =>
    (s?.cards ?? []).some((c: any) => c?.camera_image !== undefined),
  );
}

describe('Security view — activity log (24h logbook)', () => {
  it('leads the view by default and targets security entities + persons', async () => {
    const view = await generate();
    const section = logbookSection(view);
    expect(section).toBeDefined();
    expect(view.sections[0]).toBe(section);
    const target = logbookTarget(view);
    expect(target).toContain('lock.front');
    expect(target).toContain('binary_sensor.front_window');
    expect(target).toContain('person.dave');
    const card = section.cards.find((c: any) => c.type === 'logbook');
    expect(card.hours_to_show).toBe(24);
  });

  it('trails the view with security_activity_position: end', async () => {
    const view = await generate({ security_activity_position: 'end' });
    const section = logbookSection(view);
    expect(view.sections[view.sections.length - 1]).toBe(section);
  });

  it('is omitted when show_security_activity is false', async () => {
    const view = await generate({ show_security_activity: false });
    expect(logbookSection(view)).toBeUndefined();
  });

  it('is omitted when the logbook integration is not loaded', async () => {
    const view = await generate({}, { ...BASE_SPEC, components: [] });
    expect(logbookSection(view)).toBeUndefined();
  });

  it('excludes no_seclog-labeled entities from the log but keeps them in the view', async () => {
    const spec: HassFixtureSpec = {
      ...BASE_SPEC,
      entities: [
        ...BASE_SPEC.entities!.filter((e) => e.entity_id !== 'binary_sensor.front_window'),
        {
          entity_id: 'binary_sensor.front_window',
          area_id: 'entry',
          state: 'off',
          attributes: { device_class: 'window' },
          labels: ['no_seclog'],
        },
      ],
    };
    const view = await generate({}, spec);
    expect(logbookTarget(view)).not.toContain('binary_sensor.front_window');
    // Still present in the windows section of the view itself.
    const allTileEntities = (view.sections as any[])
      .flatMap((s) => s.cards ?? [])
      .filter((c: any) => c.type === 'tile')
      .map((c: any) => c.entity);
    expect(allTileEntities).toContain('binary_sensor.front_window');
  });
});

describe('Security view — cameras section (opt-in)', () => {
  const CAM_SPEC: HassFixtureSpec = {
    ...BASE_SPEC,
    entities: [...BASE_SPEC.entities!, { entity_id: 'camera.door', area_id: 'entry', state: 'idle' }],
  };

  it('is absent by default', async () => {
    const view = await generate({}, CAM_SPEC);
    expect(camerasSection(view)).toBeUndefined();
  });

  it('emits lean still-image cards when enabled, and cameras join the logbook', async () => {
    const view = await generate({ show_cameras_in_security: true }, CAM_SPEC);
    const section = camerasSection(view);
    expect(section).toBeDefined();
    const cam = section.cards.find((c: any) => c.type === 'picture-entity');
    expect(cam).toMatchObject({
      entity: 'camera.door',
      camera_image: 'camera.door',
      show_name: false,
      show_state: false,
      grid_options: { columns: 6, rows: 2 },
    });
    // No deep link while the camera view is disabled.
    const heading = section.cards.find((c: any) => c.type === 'heading');
    expect(heading.tap_action).toBeUndefined();
    expect(logbookTarget(view)).toContain('camera.door');
  });

  it('deep-links the heading to the camera view when that view is enabled', async () => {
    const view = await generate(
      { show_cameras_in_security: true, show_camera_view: true },
      CAM_SPEC,
    );
    const heading = camerasSection(view).cards.find((c: any) => c.type === 'heading');
    expect(heading.tap_action).toEqual({ action: 'navigate', navigation_path: 'cameras' });
  });
});
