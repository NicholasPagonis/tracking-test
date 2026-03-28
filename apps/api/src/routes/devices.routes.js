'use strict';

const { Router } = require('express');
const { requireDashboardKey, requireAdminKey } = require('../middleware/auth.middleware');
const { listDevices, getDevice, updateDevice } = require('../controllers/devices.controller');
const { getHistory, getTrail } = require('../controllers/history.controller');

const router = Router();

router.get('/', requireDashboardKey, listDevices);
router.get('/:deviceId', requireDashboardKey, getDevice);
router.put('/:deviceId', requireAdminKey, updateDevice);
router.get('/:deviceId/history', requireDashboardKey, getHistory);
router.get('/:deviceId/trail', requireDashboardKey, getTrail);

module.exports = router;
