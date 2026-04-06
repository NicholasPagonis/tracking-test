'use strict';

const { Router } = require('express');
const { requireOwnTracksAuth } = require('../middleware/auth.middleware');
const { handleOwnTracks } = require('../controllers/ingest.controller');
const { health } = require('../controllers/health.controller');

const router = Router();

// OwnTracks HTTP mode — configure the app with:
//   URL:      https://tracking-api.yourdomain.com/owntracks
//   Username: <device_id>
//   Password: <api_key>
router.post('/', requireOwnTracksAuth, handleOwnTracks);
router.post('/api/v1/location-events', requireOwnTracksAuth, handleOwnTracks);
router.get('/api/v1/health', health);

module.exports = router;
