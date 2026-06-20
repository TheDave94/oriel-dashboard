// ============================================================================
// Tests — idle-nav home-path computation
// ============================================================================
// Regression for the wrong idle-nav target: swapping the LAST path segment
// dropped the dashboard on a 1-segment path (`/<dashboard>` → `/home`) and
// mis-nested on deeper paths. The target must anchor to the dashboard root.
// ============================================================================

import { describe, it, expect } from 'vitest';

import { homePathFor } from '../../src/utils/idle-nav';

describe('homePathFor — idle-nav anchors to the dashboard root + overview path', () => {
  it('standard /<dashboard>/<view> → /<dashboard>/home', () => {
    expect(homePathFor('/oriel-dashboard/bedroom')).toBe('/oriel-dashboard/home');
  });

  it('already on the overview → same path (caller then skips the nav)', () => {
    expect(homePathFor('/oriel-dashboard/home')).toBe('/oriel-dashboard/home');
  });

  it('1-segment /<dashboard> keeps the dashboard (regression: was → /home)', () => {
    expect(homePathFor('/oriel-dashboard')).toBe('/oriel-dashboard/home');
  });

  it('deeper /<dashboard>/<view>/<x> does not mis-nest (regression: was → /<dashboard>/<view>/home)', () => {
    expect(homePathFor('/oriel-dashboard/bedroom/detail')).toBe('/oriel-dashboard/home');
  });

  it('empty path → /home', () => {
    expect(homePathFor('/')).toBe('/home');
  });
});
