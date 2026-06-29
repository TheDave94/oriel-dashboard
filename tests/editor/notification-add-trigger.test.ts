// ============================================================================
// Tests — Notification banners "Add trigger" button (#156)
// ============================================================================
// The Add-trigger button appends a placeholder row with an empty entity. The
// tab's update() previously stripped empty-entity triggers before calling
// onChange, so the new row was removed before it could render — the button was
// a no-op. update() now passes rows through unchanged so the placeholder
// persists for the user to fill in.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { render } from 'lit';

import { renderNotificationsTab } from '../../src/editor/tabs/NotificationsTab';
import { makeHass } from '../fixtures/hass';
import type { OrielConfig } from '../../src/types/strategy';

function renderTab(config: OrielConfig, onChange: (t: any[]) => void): HTMLDivElement {
  const host = document.createElement('div');
  render(renderNotificationsTab({ hass: makeHass(), config, onChange }), host);
  return host;
}

describe('NotificationsTab — Add trigger', () => {
  it('appends a placeholder trigger when there are none yet', () => {
    let received: any[] | undefined;
    const host = renderTab({}, (t) => (received = t));
    const addBtn = host.querySelector('button.btn-primary') as HTMLButtonElement;
    expect(addBtn).toBeTruthy();

    addBtn.click();

    expect(received).toEqual([{ entity: '' }]);
  });

  it('appends to existing triggers without dropping the new empty row', () => {
    let received: any[] | undefined;
    const config: OrielConfig = { notification_triggers: [{ entity: 'binary_sensor.smoke' }] } as any;
    const host = renderTab(config, (t) => (received = t));
    const addBtn = host.querySelector('button.btn-primary') as HTMLButtonElement;

    addBtn.click();

    expect(received).toEqual([{ entity: 'binary_sensor.smoke' }, { entity: '' }]);
  });
});
