'use strict';

const db = require('../db/connection');
const config = require('../config');

const startTime = Date.now();

async function health(req, res, next) {
  try {
    // Quick DB connectivity check
    await db.raw('SELECT 1');
    res.json({
      status: 'ok',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      db: 'ok',
      version: '1.0.0',
      env: config.env,
    });
  } catch (err) {
    next(err);
  }
}

async function ready(req, res, next) {
  try {
    await db.raw('SELECT 1');
    res.status(200).json({ ready: true });
  } catch (err) {
    res.status(503).json({ ready: false, error: err.message });
  }
}

async function systemStatus(req, res, next) {
  try {
    const [deviceCount] = await db('devices').count('id as count').where('is_active', true);
    const [activeCount] = await db('device_status').count('device_id as count').where('status', 'active');
    const [staleCount] = await db('device_status').count('device_id as count').where('status', 'stale');
    const [offlineCount] = await db('device_status').count('device_id as count').where('status', 'offline');
    const [locationCount] = await db('locations').count('id as count');

    res.json({
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      devices: {
        total: Number(deviceCount.count),
        active: Number(activeCount.count),
        stale: Number(staleCount.count),
        offline: Number(offlineCount.count),
      },
      location_records: Number(locationCount.count),
      thresholds: {
        active_seconds: config.status.activeSeconds,
        stale_seconds: config.status.staleSeconds,
      },
      arcgis_enabled: config.arcgis.enabled,
      webeoc_enabled: config.webeoc.enabled,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { health, ready, systemStatus };
