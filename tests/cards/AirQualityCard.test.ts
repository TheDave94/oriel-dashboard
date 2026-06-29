// ============================================================================
// oriel-air-quality-card — unit tests
// ============================================================================

import { describe, it, expect, afterEach, beforeEach } from 'vitest';

import '../../src/cards/AirQualityCard';
import { setupLocalize } from '../../src/utils/localize';

beforeEach(() => {
  setupLocalize();
});

type AirCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  hass: unknown;
  updateComplete: Promise<unknown>;
  shadowRoot: ShadowRoot | null;
};

const _mounted: AirCardEl[] = [];
function mount(): AirCardEl {
  const el = document.createElement('oriel-air-quality-card') as AirCardEl;
  document.body.appendChild(el);
  _mounted.push(el);
  return el;
}
afterEach(() => {
  while (_mounted.length) _mounted.pop()!.remove();
});

function consensus(state: string, attrs: Record<string, unknown> = {}) {
  return { state, attributes: attrs };
}

async function render(
  pollutants: string[],
  states: Record<string, { state: string; attributes?: Record<string, unknown> }>,
  showGood = true
): Promise<ShadowRoot> {
  const el = mount();
  el.setConfig({ pollutants, show_good: showGood });
  el.hass = { states, locale: { language: 'en' } };
  await el.updateComplete;
  return el.shadowRoot!;
}

describe('oriel-air-quality-card', () => {
  it('localizes from the live hass language standalone, without an explicit setupLocalize (#157)', async () => {
    // beforeEach reset the global localize to default English, simulating a
    // standalone dashboard where the strategy never called setupLocalize. The
    // card must still follow HA's locale by re-resolving language from hass on
    // render — otherwise its text wrongly stays English.
    const el = mount();
    el.setConfig({ pollutants: [] });
    el.hass = { states: {}, locale: { language: 'de' } };
    await el.updateComplete;
    const text = el.shadowRoot!.textContent || '';
    expect(text).toContain('gesamt'); // de for editor.air_quality_overall
    expect(text).not.toContain('overall'); // would appear if it fell back to English
  });

  it('renders a row per pollutant with the N-of-M source badge', async () => {
    const root = await render(['pm2_5', 'ozone'], {
      'sensor.airwatch_analytics_pm2_5_consensus': consensus('elevated', {
        source_count: 2,
        max_possible_sources: 3,
        source_levels: { open_meteo: 1, sensor_community: 1 },
      }),
      'sensor.airwatch_analytics_ozone_consensus': consensus('high', {
        source_count: 2,
        max_possible_sources: 2,
        source_levels: { open_meteo: 2, land_steiermark: 2 },
      }),
    });
    const rows = root.querySelectorAll('.row');
    expect(rows.length).toBe(2);
    const badges = [...root.querySelectorAll('.row-sources')].map((b) => b.textContent?.trim());
    expect(badges).toEqual(['2/3', '2/2']);
  });

  it('shows the explicit divergence flag when the binary_sensor is on', async () => {
    const root = await render(['pm2_5'], {
      'sensor.airwatch_analytics_pm2_5_consensus': consensus('mixed', {
        source_count: 3,
        max_possible_sources: 3,
        source_levels: { open_meteo: 0, sensor_community: 2, land_steiermark: 1 },
      }),
      'binary_sensor.airwatch_analytics_pm2_5_divergence': { state: 'on' },
    });
    const differ = root.querySelector('.differ');
    expect(differ).not.toBeNull();
    expect(differ!.getAttribute('title')).toContain('sensor community: high');
  });

  it('renders carbon monoxide honestly — real level + a no-EAQI note, no divergence flag', async () => {
    const root = await render(['carbon_monoxide'], {
      'sensor.airwatch_analytics_carbon_monoxide_consensus': consensus('good', {
        source_count: 2,
        max_possible_sources: 2,
      }),
    });
    expect(root.querySelector('.co-note')).not.toBeNull();
    expect(root.querySelector('.differ')).toBeNull();
    expect(root.querySelector('.row-level')!.textContent?.trim()).toBe('Good');
  });

  it('headline names the worst pollutant from the overall entity', async () => {
    const root = await render(['pm2_5', 'ozone'], {
      'sensor.airwatch_analytics_pm2_5_consensus': consensus('good', { source_count: 2, max_possible_sources: 3 }),
      'sensor.airwatch_analytics_ozone_consensus': consensus('high', { source_count: 2, max_possible_sources: 2 }),
      'sensor.airwatch_analytics_overall': consensus('high', {
        worst_pollutant: 'ozone',
        diverged_pollutants: [],
      }),
    });
    const headline = root.querySelector('.headline')!.textContent ?? '';
    expect(headline).toContain('High');
    expect(headline).toContain('Ozone');
  });

  it('hides good (non-diverged) pollutants when show_good is off', async () => {
    const root = await render(
      ['pm2_5', 'ozone'],
      {
        'sensor.airwatch_analytics_pm2_5_consensus': consensus('good', { source_count: 2, max_possible_sources: 3 }),
        'sensor.airwatch_analytics_ozone_consensus': consensus('high', { source_count: 2, max_possible_sources: 2 }),
      },
      false // show_good off
    );
    const names = [...root.querySelectorAll('.row-name')].map((n) => n.textContent?.trim());
    expect(names).toEqual(['Ozone']); // pm2_5 (good) hidden
  });

  it('keeps a good pollutant visible when it is diverged', async () => {
    const root = await render(
      ['pm2_5'],
      {
        'sensor.airwatch_analytics_pm2_5_consensus': consensus('good', { source_count: 2, max_possible_sources: 3 }),
        'binary_sensor.airwatch_analytics_pm2_5_divergence': { state: 'on' },
      },
      false
    );
    expect(root.querySelector('.row-name')!.textContent?.trim()).toBe('PM2.5');
    expect(root.querySelector('.differ')).not.toBeNull();
  });
});
