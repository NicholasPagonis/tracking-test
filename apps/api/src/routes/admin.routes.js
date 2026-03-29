'use strict';

const crypto = require('crypto');
const { Router } = require('express');
const { requireAdminKey } = require('../middleware/auth.middleware');
const deviceRepo = require('../repositories/device.repository');
const logger = require('../utils/logger');

const router = Router();

// ── Device registration ───────────────────────────────────────────────────────

// List all roles (used by wizard dropdown)
router.get('/roles', requireAdminKey, async (req, res, next) => {
  try {
    const roles = await deviceRepo.findAllRoles();
    res.json({ data: roles });
  } catch (err) { next(err); }
});

// Register a new device
router.post('/devices', requireAdminKey, async (req, res, next) => {
  try {
    const { device_id, role_id, display_name, platform, api_key, notes } = req.body;

    if (!device_id || !role_id || !display_name || !platform || !api_key) {
      return res.status(400).json({ error: 'device_id, role_id, display_name, platform, api_key are required' });
    }
    if (!/^[A-Za-z0-9_-]+$/.test(device_id)) {
      return res.status(400).json({ error: 'device_id may only contain letters, numbers, underscores and hyphens' });
    }

    const existing = await deviceRepo.findById(device_id);
    if (existing) {
      return res.status(409).json({ error: `Device ID '${device_id}' is already registered` });
    }

    const api_key_hash = crypto.createHash('sha256').update(api_key).digest('hex');
    const device = await deviceRepo.create({ device_id, role_id: parseInt(role_id, 10), display_name, platform, api_key_hash, notes: notes || null });

    logger.info({ device_id }, 'Device registered via wizard');
    res.status(201).json({ data: device });
  } catch (err) { next(err); }
});

// Ping test — poll for a recent ingest from this device (wizard step 3)
// Returns whether a location has been received in the last 30 seconds
router.get('/devices/:deviceId/ping', requireAdminKey, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const row = await deviceRepo.latestIngestTime(deviceId);
    if (!row) {
      return res.json({ received: false });
    }
    const ageMs = Date.now() - new Date(row.received_timestamp_utc).getTime();
    res.json({ received: ageMs < 30_000, received_at: row.received_timestamp_utc, age_seconds: Math.floor(ageMs / 1000) });
  } catch (err) { next(err); }
});

// Manual ArcGIS sync trigger
router.post('/sync/arcgis', requireAdminKey, async (req, res, next) => {
  try {
    // Lazy-load to avoid circular deps at startup
    const { syncToArcGIS } = require('../jobs/arcgis-sync.job');
    const result = await syncToArcGIS();
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

// Manual WebEOC push trigger (stub)
router.post('/sync/webeoc', requireAdminKey, async (req, res, next) => {
  try {
    const { pushToWebEOC } = require('../jobs/webeoc-push.job');
    const result = await pushToWebEOC();
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
