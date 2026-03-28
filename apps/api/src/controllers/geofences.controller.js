'use strict';

const geofenceRepo = require('../repositories/geofence.repository');
const geofenceService = require('../services/geofence.service');

async function listGeofences(req, res, next) {
  try {
    const zones = await geofenceRepo.findAll(false);
    res.json({ data: zones, count: zones.length });
  } catch (err) {
    next(err);
  }
}

async function getGeofence(req, res, next) {
  try {
    const zone = await geofenceRepo.findById(req.params.id);
    if (!zone) return res.status(404).json({ error: 'Geofence not found' });
    res.json({ data: zone });
  } catch (err) {
    next(err);
  }
}

async function createGeofence(req, res, next) {
  try {
    const { name, type, coordinates, color_hex } = req.body;
    if (!name || !type || !coordinates) {
      return res.status(400).json({ error: 'name, type, coordinates required' });
    }
    // Validate coordinates is valid JSON
    const coordStr = typeof coordinates === 'string' ? coordinates : JSON.stringify(coordinates);
    try { JSON.parse(coordStr); } catch {
      return res.status(400).json({ error: 'coordinates must be valid JSON' });
    }

    const zone = await geofenceRepo.create({ name, type, coordinates: coordStr, color_hex, active: 1 });
    geofenceService.invalidateCache();
    res.status(201).json({ data: zone });
  } catch (err) {
    next(err);
  }
}

async function updateGeofence(req, res, next) {
  try {
    const allowed = {};
    const { name, type, coordinates, color_hex, active } = req.body;
    if (name !== undefined) allowed.name = name;
    if (type !== undefined) allowed.type = type;
    if (coordinates !== undefined) allowed.coordinates = typeof coordinates === 'string' ? coordinates : JSON.stringify(coordinates);
    if (color_hex !== undefined) allowed.color_hex = color_hex;
    if (active !== undefined) allowed.active = active ? 1 : 0;

    const zone = await geofenceRepo.update(req.params.id, allowed);
    if (!zone) return res.status(404).json({ error: 'Geofence not found' });
    geofenceService.invalidateCache();
    res.json({ data: zone });
  } catch (err) {
    next(err);
  }
}

async function deleteGeofence(req, res, next) {
  try {
    const zone = await geofenceRepo.findById(req.params.id);
    if (!zone) return res.status(404).json({ error: 'Geofence not found' });
    await geofenceRepo.remove(req.params.id);
    geofenceService.invalidateCache();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listEvents(req, res, next) {
  try {
    const { device_id, geofence_id, from, to, limit } = req.query;
    const events = await geofenceRepo.findEvents({ deviceId: device_id, geofenceId: geofence_id, from, to, limit: parseInt(limit, 10) || 100 });
    res.json({ data: events, count: events.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { listGeofences, getGeofence, createGeofence, updateGeofence, deleteGeofence, listEvents };
