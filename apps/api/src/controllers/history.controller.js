'use strict';

const locationRepo = require('../repositories/location.repository');
const config = require('../config');

async function getHistory(req, res, next) {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 1000);
    const retentionFloor = new Date(Date.now() - config.history.retentionHours * 60 * 60 * 1000).toISOString();

    const from = req.query.from
      ? new Date(Math.max(new Date(req.query.from).getTime(), new Date(retentionFloor).getTime())).toISOString()
      : retentionFloor;
    const to = req.query.to ? new Date(req.query.to).toISOString() : new Date().toISOString();

    const points = await locationRepo.findHistory(deviceId, { from, to, limit });
    res.json({ device_id: deviceId, count: points.length, points });
  } catch (err) {
    next(err);
  }
}

async function getTrail(req, res, next) {
  try {
    const { deviceId } = req.params;
    const minutes = Math.min(parseInt(req.query.minutes, 10) || 60, 1440);
    const points = await locationRepo.findTrail(deviceId, minutes);

    // Return as GeoJSON LineString for direct Leaflet consumption
    const geojson = {
      type: 'Feature',
      properties: { device_id: deviceId, minutes },
      geometry: {
        type: 'LineString',
        coordinates: points.map((p) => [p.lon, p.lat]),
      },
    };

    res.json({ data: geojson, point_count: points.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHistory, getTrail };
