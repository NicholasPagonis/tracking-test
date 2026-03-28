'use strict';

const { Router } = require('express');
const { requireAdminKey } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const router = Router();

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
