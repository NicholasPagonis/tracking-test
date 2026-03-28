'use strict';

const locationRepo = require('../repositories/location.repository');
const config = require('../config');
const logger = require('../utils/logger');

function startPruneJob() {
  const intervalMs = config.history.pruneIntervalMinutes * 60 * 1000;

  async function prune() {
    try {
      const deleted = await locationRepo.pruneOld(config.history.retentionHours);
      if (deleted > 0) {
        logger.info({ deleted, retentionHours: config.history.retentionHours }, 'Location history pruned');
      }
    } catch (err) {
      logger.error({ err }, 'Prune job failed');
    }
  }

  // Run immediately then on interval
  prune();
  return setInterval(prune, intervalMs);
}

module.exports = { startPruneJob };
