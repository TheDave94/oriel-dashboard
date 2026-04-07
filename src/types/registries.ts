// ====================================================================
// Registry Entry Types for Home Assistant
// ====================================================================
// Typed representations of HA's entity, device, area, and floor registries.
// Based on home-assistant/frontend source via mushroom-strategy reference.
// ====================================================================

// -- Entity Registry --------------------------------------------------

export type EntityCategory = 'config' | 'diagnostic';

export interface EntityRegistryEntry {
  id: string;
  entity_id: string;
  unique_id: string;
  name?: string | null;
  icon?: string | null;
  device_id?: string | null;
  area_id?: string | null;
  config_entry_id?: string | null;
  labels: string[];
  hidden?: boolean;
  hidden_by?: 'user' | 'integration' | null;
  disabled_by?: 'user' | 'device' | 'integration' | 'config_entry' | null;
  entity_category?: EntityCategory | null;
  platform?: string;
  has_entity_name?: boolean;
  display_precision?: number;
  translation_key?: string | null;
  original_name?: string | null;
  categories: Record<string, string>;
}

// -- Device Registry --------------------------------------------------

export interface DeviceRegistryEntry {
  id: string;
  config_entries: string[];
  connections: [string, string][];
  identifiers: [string, string][];
  manufacturer: string | null;
  model: string | null;
  model_id: string | null;
  name: string | null;
  name_by_user: string | null;
  labels: string[];
  sw_version: string | null;
  hw_version: string | null;
  serial_number: string | null;
  via_device_id: string | null;
  area_id: string | null;
  entry_type: 'service' | null;
  disabled_by: 'user' | 'integration' | 'config_entry' | null;
  configuration_url: string | null;
  primary_config_entry: string | null;
}

// -- Area Registry ----------------------------------------------------

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  icon: string | null;
  floor_id: string | null;
  labels: string[];
  aliases: string[];
  picture: string | null;
  temperature_entity_id: string | null;
  humidity_entity_id: string | null;
}

// -- Floor Registry ---------------------------------------------------

export interface FloorRegistryEntry {
  floor_id: string;
  name: string;
  level: number | null;
  icon: string | null;
  aliases: string[];
}
