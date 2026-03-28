'use strict';

const { Router } = require('express');
const { requireDashboardKey, requireAdminKey } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/geofences.controller');

const router = Router();

router.get('/', requireDashboardKey, ctrl.listGeofences);
router.get('/events', requireDashboardKey, ctrl.listEvents);
router.get('/:id', requireDashboardKey, ctrl.getGeofence);
router.post('/', requireAdminKey, ctrl.createGeofence);
router.put('/:id', requireAdminKey, ctrl.updateGeofence);
router.delete('/:id', requireAdminKey, ctrl.deleteGeofence);

module.exports = router;
