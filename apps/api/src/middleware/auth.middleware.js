'use strict';

const crypto = require('crypto');
const config = require('../config');
const deviceRepo = require('../repositories/device.repository');

/**
 * Dashboard / read API key auth.
 * Checks X-API-Key header against the configured dashboard key.
 */
function requireDashboardKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== config.auth.dashboardKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * Admin API key auth.
 */
function requireAdminKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== config.auth.adminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * Per-device ingest auth.
 * Checks X-Device-Key header against the SHA-256 hash stored in devices table.
 * Attaches device to req.device on success.
 */
async function requireDeviceKey(req, res, next) {
  const rawKey = req.headers['x-device-key'] || req.query.key;
  if (!rawKey) {
    return res.status(401).json({ error: 'Device key required' });
  }
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const device = await deviceRepo.findByApiKeyHash(hash);
  if (!device) {
    return res.status(401).json({ error: 'Unknown or inactive device' });
  }
  req.device = device;
  next();
}

/**
 * OwnTracks HTTP mode auth.
 * OwnTracks sends HTTP Basic Auth where username = device_id, password = api_key.
 * Attaches device to req.device on success.
 */
async function requireOwnTracksAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="OwnTracks"');
    return res.status(401).json({ error: 'Basic auth required' });
  }
  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  if (colon === -1) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const username = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1);

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const device = await deviceRepo.findByApiKeyHash(hash);
  if (!device || device.device_id !== username) {
    return res.status(401).json({ error: 'Unknown or inactive device' });
  }
  req.device = device;
  next();
}

module.exports = { requireDashboardKey, requireAdminKey, requireDeviceKey, requireOwnTracksAuth };
