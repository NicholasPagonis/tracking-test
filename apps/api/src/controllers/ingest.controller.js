'use strict';

const locationService = require('../services/location.service');
const { requireFloat, requireTimestamp } = require('../middleware/validate.middleware');
const { nowUtc } = require('../utils/time');
const logger = require('../utils/logger');

/**
 * Normalise ingest payload from either:
 *   GET  /ingest?id=GTA_1&lat=...&lon=...  (Traccar OsmAnd protocol)
 *   POST /ingest  { id, lat, lon, ... }
 */
function normalise(source) {
  const lat = requireFloat(source.lat, 'lat');
  const lon = requireFloat(source.lon, 'lon');

  // Clamp coordinate range
  if (lat < -90 || lat > 90) throw Object.assign(new Error('lat out of range'), { status: 400 });
  if (lon < -180 || lon > 180) throw Object.assign(new Error('lon out of range'), { status: 400 });

  // Traccar sends Unix epoch seconds as 'timestamp', or ISO string
  let sourceTimestampUtc;
  if (source.timestamp) {
    const ts = source.timestamp;
    const n = Number(ts);
    if (!isNaN(n) && n > 1_000_000_000) {
      // Unix epoch seconds
      sourceTimestampUtc = new Date(n * 1000).toISOString();
    } else {
      sourceTimestampUtc = requireTimestamp(ts, 'timestamp');
    }
  } else {
    sourceTimestampUtc = nowUtc();
  }

  return {
    lat,
    lon,
    altitudeM: source.altitude != null ? parseFloat(source.altitude) || null : null,
    speedMs: source.speed != null ? parseFloat(source.speed) || null : null,
    bearingDeg: source.bearing != null ? parseFloat(source.bearing) || null : null,
    // hdop from OsmAnd — convert to approximate accuracy in metres (hdop * 5)
    accuracyM: source.accuracy != null
      ? parseFloat(source.accuracy) || null
      : source.hdop != null
      ? (parseFloat(source.hdop) || 0) * 5 || null
      : null,
    batteryPct: source.batt != null ? parseFloat(source.batt) || null : null,
    sourceTimestampUtc,
    receivedTimestampUtc: nowUtc(),
  };
}

/**
 * GET /ingest — Traccar OsmAnd protocol
 * Query params: id, lat, lon, timestamp, hdop, altitude, speed, bearing, batt, key
 */
async function handleGet(req, res, next) {
  try {
    const deviceId = req.device.device_id;
    const payload = normalise(req.query);
    await locationService.writeLocation({ deviceId, ...payload });
    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /ingest — JSON body
 * Body: { id, lat, lon, timestamp, altitude, speed, bearing, accuracy, batt }
 */
async function handlePost(req, res, next) {
  try {
    const deviceId = req.device.device_id;
    const payload = normalise(req.body);
    const device = await locationService.writeLocation({ deviceId, ...payload });
    res.status(200).json({ ok: true, device_id: deviceId, status: device?.status });
  } catch (err) {
    next(err);
  }
}

module.exports = { handleGet, handlePost };
