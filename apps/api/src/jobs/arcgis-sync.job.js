'use strict';

const config = require('../config');
const deviceRepo = require('../repositories/device.repository');
const logger = require('../utils/logger');

let arcgisAdapter = null;

async function getAdapter() {
  if (!arcgisAdapter) {
    try {
      // Loaded lazily so the API starts even without the package installed
      const { ArcGISAdapter } = require('@airport/arcgis-adapter');
      arcgisAdapter = new ArcGISAdapter({
        featureServiceUrl: config.arcgis.featureServiceUrl,
        clientId: config.arcgis.clientId,
        clientSecret: config.arcgis.clientSecret,
        tokenUrl: config.arcgis.tokenUrl,
      });
    } catch (err) {
      logger.warn({ err }, 'Could not load arcgis-adapter package');
      return null;
    }
  }
  return arcgisAdapter;
}

async function syncToArcGIS() {
  if (!config.arcgis.enabled) {
    return { skipped: true, reason: 'ARCGIS_ENABLED=false' };
  }

  const adapter = await getAdapter();
  if (!adapter) return { skipped: true, reason: 'Adapter unavailable' };

  const devices = await deviceRepo.findAll();
  const results = { synced: 0, errors: 0 };

  for (const device of devices) {
    if (!device.lat || !device.lon) continue;
    try {
      await adapter.upsertDevice(device);
      results.synced++;
    } catch (err) {
      logger.warn({ err, deviceId: device.device_id }, 'ArcGIS upsert failed');
      results.errors++;
    }
  }

  logger.info(results, 'ArcGIS sync complete');
  return results;
}

function startArcGISSyncJob() {
  if (!config.arcgis.enabled) {
    logger.info('ArcGIS sync disabled');
    return null;
  }

  const intervalMs = config.arcgis.syncIntervalSeconds * 1000;
  syncToArcGIS(); // initial run
  return setInterval(syncToArcGIS, intervalMs);
}

module.exports = { startArcGISSyncJob, syncToArcGIS };
