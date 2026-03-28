'use strict';

const { Router } = require('express');
const { health, ready, systemStatus } = require('../controllers/health.controller');

const router = Router();

// No auth on health endpoints — required for load balancers and monitoring
router.get('/', health);
router.get('/ready', ready);
router.get('/status', systemStatus);

module.exports = router;
