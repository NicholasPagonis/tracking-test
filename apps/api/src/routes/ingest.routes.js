'use strict';

const { Router } = require('express');
const { requireDeviceKey } = require('../middleware/auth.middleware');
const { handleGet, handlePost } = require('../controllers/ingest.controller');

const router = Router();

// Traccar OsmAnd protocol — client sends GET with query params
// Traccar Client app is configured with URL: http://<host>/ingest?key=<device-api-key>
router.get('/', requireDeviceKey, handleGet);

// JSON POST — used by simulator and future integrations
router.post('/', requireDeviceKey, handlePost);

module.exports = router;
