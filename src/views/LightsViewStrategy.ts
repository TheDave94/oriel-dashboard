// ====================================================================
// VIEW STRATEGY — LIGHTS (reactive group cards)
// ====================================================================

import type { LovelaceViewConfig } from '../types/lovelace';

class Simon42ViewLightsStrategy extends HTMLElement {
  static async generate(config: any, hass: any): Promise<LovelaceViewConfig> {
    return {
      type: 'sections',
      sections: [
        {
          type: 'grid',
          cards: [
            {
              type: 'custom:simon42-lights-group-card',
              entities: config.entities,
              config: config.config,
              group_type: 'on',
            },
            {
              type: 'custom:simon42-lights-group-card',
              entities: config.entities,
              config: config.config,
              group_type: 'off',
            },
          ],
        },
      ],
    };
  }
}

customElements.define('ll-strategy-simon42-view-lights', Simon42ViewLightsStrategy);
