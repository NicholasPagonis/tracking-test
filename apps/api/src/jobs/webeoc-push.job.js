'use strict';

const config = require('../config');
const deviceRepo = require('../repositories/device.repository');
const logger = require('../utils/logger');

async function pushToWebEOC() {
  if (!config.webeoc.enabled) {
    return { skipped: true, reason: 'WEBEOC_ENABLED=false' };
  }

  let adapter;
  try {
    const { WebEOCAdapter } = require('@airport/webeoc-adapter');
    adapter = new WebEOCAdapter({
      baseUrl: config.webeoc.baseUrl,
      username: config.webeoc.username,
      password: config.webeoc.password,
      boardName: config.webeoc.boardName,
    });
  } catch (err) {
    logger.warn({ err }, 'Could not load webeoc-adapter package');
    return { skipped: true, reason: 'Adapter unavailable' };
  }

  const devices = await deviceRepo.findAll();
  const result = await adapter.pushResourceStatus(devices);
  logger.info(result, 'WebEOC push complete');
  return result;
}

module.exports = { pushToWebEOC };
