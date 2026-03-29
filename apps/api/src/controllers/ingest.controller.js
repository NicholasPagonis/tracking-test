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
 * POST /ingest
 * Handles multiple client formats:
 *   1. Traccar Client iOS — application/x-www-form-urlencoded flat fields
 *   2. Background Geolocation app — JSON body with rootProperty=location,
 *      nested as { location: { coords: { latitude, longitude, ... }, battery: {...}, timestamp } }
 *   3. Plain JSON flat body
 * Merge query params + body so fields work regardless of how they arrive.
 */
async function handlePost(req, res, next) {
  try {
    const deviceId = req.device.device_id;
    let source;

    const body = req.body;

    // Background Geolocation sends { location: { coords: { latitude, longitude, ... }, battery, timestamp } }
    if (body && body.location && body.location.coords) {
      const loc = body.location;
      const coords = loc.coords;
      source = {
        lat: coords.latitude,
        lon: coords.longitude,
        altitude: coords.altitude,
        speed: coords.speed,
        bearing: coords.heading,
        accuracy: coords.accuracy,
        timestamp: loc.timestamp,
        batt: loc.battery ? loc.battery.level * 100 : undefined,
        ...req.query,
      };
    } else {
      // Traccar Client (urlencoded or flat JSON) — merge query + body
      source = { ...req.query, ...body };
    }

    logger.debug({ contentType: req.headers['content-type'], source }, 'Ingest POST');
    const payload = normalise(source);
    await locationService.writeLocation({ deviceId, ...payload });
    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /owntracks
 * OwnTracks HTTP mode payload:
 *   { "_type": "location", "lat": ..., "lon": ..., "tst": <unix seconds>,
 *     "acc": <metres>, "alt": ..., "vel": <km/h>, "cog": <bearing>, "batt": <0-100> }
 * Non-location message types (e.g. _type: "lwt", "transition") are acknowledged and ignored.
 */
async function handleOwnTracks(req, res, next) {
  try {
    const body = req.body;
    if (!body || body._type !== 'location') {
      // OwnTracks expects an empty JSON array response for non-location messages
      return res.status(200).json([]);
    }

    const deviceId = req.device.device_id;
    const source = {
      lat: body.lat,
      lon: body.lon,
      altitude: body.alt,
      speed: body.vel != null ? body.vel / 3.6 : undefined, // km/h → m/s
      bearing: body.cog,
      accuracy: body.acc,
      timestamp: body.tst, // Unix epoch seconds
      batt: body.batt,
    };

    const payload = normalise(source);
    await locationService.writeLocation({ deviceId, ...payload });
    // OwnTracks expects an empty JSON array on success
    res.status(200).json([]);
  } catch (err) {
    next(err);
  }
}

module.exports = { handleGet, handlePost, handleOwnTracks };
