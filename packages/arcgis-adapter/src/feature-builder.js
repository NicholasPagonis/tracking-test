'use strict';

/**
 * Maps a DeviceWithStatus record to an ArcGIS Feature Service feature JSON.
 *
 * The feature layer must have these fields configured:
 *   OBJECTID (auto), device_id (string), role_code (string), display_name (string),
 *   role_label (string), platform (string), status (string), battery_pct (double),
 *   accuracy_m (double), speed_ms (double), bearing_deg (double), zone_name (string),
 *   last_seen_utc (string), source_timestamp_utc (string), notes (string)
 */
function buildFeature(device, objectId = null) {
  const feature = {
    geometry: {
      x: device.lon,
      y: device.lat,
      spatialReference: { wkid: 4326 },
    },
    attributes: {
      device_id: device.device_id,
      role_code: device.role_code || '',
      display_name: device.display_name || '',
      role_label: device.role_label || '',
      platform: device.platform || '',
      status: device.status || 'offline',
      battery_pct: device.battery_pct ?? null,
      accuracy_m: device.accuracy_m ?? null,
      speed_ms: device.speed_ms ?? null,
      bearing_deg: device.bearing_deg ?? null,
      zone_name: device.zone_name || '',
      last_seen_utc: device.last_seen_utc || '',
      source_timestamp_utc: device.source_timestamp_utc || '',
      notes: device.notes || '',
      source: 'airport-tracking-poc',
    },
  };

  if (objectId !== null) {
    feature.attributes.OBJECTID = objectId;
  }

  return feature;
}

module.exports = { buildFeature };
