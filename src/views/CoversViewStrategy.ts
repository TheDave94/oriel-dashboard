// ====================================================================
// VIEW STRATEGY — COVERS (reactive group cards)
// ====================================================================

import type { LovelaceViewConfig } from '../types/lovelace';

class Simon42ViewCoversStrategy extends HTMLElement {
  static async generate(config: any, hass: any): Promise<LovelaceViewConfig> {
    return {
      type: 'sections',
      sections: [
        {
          type: 'grid',
          cards: [
            {
              type: 'custom:simon42-covers-group-card',
              entities: config.entities,
              config: config.config,
              device_classes: config.device_classes || ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'],
              group_type: 'open',
            },
            {
              type: 'custom:simon42-covers-group-card',
              entities: config.entities,
              config: config.config,
              device_classes: config.device_classes || ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'],
              group_type: 'closed',
            },
          ],
        },
      ],
    };
  }
}

customElements.define('ll-strategy-simon42-view-covers', Simon42ViewCoversStrategy);
