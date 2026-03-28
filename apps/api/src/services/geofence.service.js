'use strict';

const geofenceRepo = require('../repositories/geofence.repository');
const { findZone } = require('../utils/geo');
const broadcast = require('./broadcast.service');
const logger = require('../utils/logger');

// In-memory cache of geofences to avoid repeated DB reads on every ingest
let cachedZones = [];
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

// Per-device last known zone membership (device_id → zone_name | null)
const lastZone = new Map();

async function getZones() {
  if (Date.now() > cacheExpiry) {
    cachedZones = await geofenceRepo.findAll(true);
    cacheExpiry = Date.now() + CACHE_TTL_MS;
  }
  return cachedZones;
}

/** Invalidate the zone cache (called when geofences are mutated via admin API) */
function invalidateCache() {
  cacheExpiry = 0;
}

/**
 * Evaluate geofence membership for a device at a given lat/lon.
 * Detects enter/exit transitions and broadcasts events.
 * Returns the current zone name (or null).
 */
async function evaluate(deviceId, lat, lon) {
  const zones = await getZones();
  const currentZone = findZone(lat, lon, zones);
  const previousZone = lastZone.get(deviceId) ?? null;

  if (currentZone !== previousZone) {
    lastZone.set(deviceId, currentZone);

    // Find the geofence object for event recording
    if (previousZone) {
      const fence = zones.find((z) => z.name === previousZone);
      if (fence) {
        try {
          await geofenceRepo.insertEvent({ device_id: deviceId, geofence_id: fence.id, event_type: 'exit', lat, lon });
          broadcast.emit('geofence_events', { device_id: deviceId, geofence_name: previousZone, event_type: 'exit', lat, lon });
        } catch (err) {
          logger.warn({ err }, 'Failed to record geofence exit event');
        }
      }
    }

    if (currentZone) {
      const fence = zones.find((z) => z.name === currentZone);
      if (fence) {
        try {
          await geofenceRepo.insertEvent({ device_id: deviceId, geofence_id: fence.id, event_type: 'enter', lat, lon });
          broadcast.emit('geofence_events', { device_id: deviceId, geofence_name: currentZone, event_type: 'enter', lat, lon });
          logger.info({ deviceId, zone: currentZone }, 'Geofence enter');
        } catch (err) {
          logger.warn({ err }, 'Failed to record geofence enter event');
        }
      }
    }
  }

  return currentZone;
}

module.exports = { evaluate, invalidateCache };
