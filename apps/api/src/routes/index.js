'use strict';

const { Router } = require('express');
const ingestRoutes = require('./ingest.routes');
const deviceRoutes = require('./devices.routes');
const geofenceRoutes = require('./geofences.routes');
const healthRoutes = require('./health.routes');
const adminRoutes = require('./admin.routes');

const router = Router();

// Ingest endpoint — at root for Traccar Client compatibility
router.use('/ingest', ingestRoutes);

// REST API
router.use('/api/devices', deviceRoutes);
router.use('/api/geofences', geofenceRoutes);
router.use('/api/health', healthRoutes);
router.use('/api/admin', adminRoutes);

module.exports = router;
