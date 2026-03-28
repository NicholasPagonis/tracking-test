'use strict';

const deviceRepo = require('../repositories/device.repository');
const statusService = require('../services/status.service');
const broadcast = require('../services/broadcast.service');
const logger = require('../utils/logger');

/**
 * Periodically re-evaluate status for all non-offline devices.
 * This transitions active→stale and stale→offline for devices that
 * have stopped reporting without a new ingest message triggering the change.
 */
function startStatusSweepJob() {
  const INTERVAL_MS = 30_000; // 30 seconds

  async function sweep() {
    try {
      const devices = await deviceRepo.findActiveOrStale();
      for (const d of devices) {
        const newStatus = statusService.classify(d.last_seen_utc);
        if (newStatus !== d.status) {
          await deviceRepo.updateStatus(d.device_id, newStatus);
          logger.info({ deviceId: d.device_id, from: d.status, to: newStatus }, 'Device status transitioned');
          // Fetch full device record for broadcast
          const full = await deviceRepo.findById(d.device_id);
          broadcast.emit('position_update', full);
        }
      }
    } catch (err) {
      logger.error({ err }, 'Status sweep job failed');
    }
  }

  return setInterval(sweep, INTERVAL_MS);
}

module.exports = { startStatusSweepJob };
