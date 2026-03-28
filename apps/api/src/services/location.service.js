'use strict';

const locationRepo = require('../repositories/location.repository');
const deviceRepo = require('../repositories/device.repository');
const geofenceService = require('./geofence.service');
const statusService = require('./status.service');
const broadcast = require('./broadcast.service');
const { nowUtc } = require('../utils/time');
const logger = require('../utils/logger');

/**
 * Normalise and write a location update.
 * Called from the ingest controller.
 *
 * payload fields (all normalised before arriving here):
 *   deviceId, lat, lon, altitudeM, speedMs, bearingDeg, accuracyM,
 *   batteryPct, sourceTimestampUtc, receivedTimestampUtc
 */
async function writeLocation(payload) {
  const {
    deviceId,
    lat,
    lon,
    altitudeM,
    speedMs,
    bearingDeg,
    accuracyM,
    batteryPct,
    sourceTimestampUtc,
    receivedTimestampUtc,
  } = payload;

  // Evaluate geofence membership (handles enter/exit events internally)
  const zoneName = await geofenceService.evaluate(deviceId, lat, lon);

  // Write to location history
  await locationRepo.insert({
    device_id: deviceId,
    lat,
    lon,
    altitude_m: altitudeM ?? null,
    speed_ms: speedMs ?? null,
    bearing_deg: bearingDeg ?? null,
    accuracy_m: accuracyM ?? null,
    battery_pct: batteryPct ?? null,
    source_timestamp_utc: sourceTimestampUtc,
    received_timestamp_utc: receivedTimestampUtc ?? nowUtc(),
    zone_name: zoneName,
  });

  const now = nowUtc();
  const status = statusService.classify(sourceTimestampUtc);

  // Upsert the materialised latest status row
  await deviceRepo.upsertStatus(deviceId, {
    lat,
    lon,
    speed_ms: speedMs ?? null,
    bearing_deg: bearingDeg ?? null,
    battery_pct: batteryPct ?? null,
    accuracy_m: accuracyM ?? null,
    zone_name: zoneName,
    last_seen_utc: now,
    source_timestamp_utc: sourceTimestampUtc,
    status,
  });

  // Fetch the full device+status record for broadcasting
  const device = await deviceRepo.findById(deviceId);

  // Push live update to all dashboard WebSocket subscribers
  broadcast.emit('position_update', device);

  logger.debug({ deviceId, lat, lon, zone: zoneName, status }, 'Location written');

  return device;
}

module.exports = { writeLocation };
