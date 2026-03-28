'use strict';

const deviceRepo = require('../repositories/device.repository');

async function listDevices(req, res, next) {
  try {
    const { role, status } = req.query;
    const devices = await deviceRepo.findAll({ roleCode: role, status });
    res.json({ data: devices, count: devices.length });
  } catch (err) {
    next(err);
  }
}

async function getDevice(req, res, next) {
  try {
    const device = await deviceRepo.findById(req.params.deviceId);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json({ data: device });
  } catch (err) {
    next(err);
  }
}

async function updateDevice(req, res, next) {
  try {
    const { display_name, notes, is_active } = req.body;
    const allowed = {};
    if (display_name !== undefined) allowed.display_name = display_name;
    if (notes !== undefined) allowed.notes = notes;
    if (is_active !== undefined) allowed.is_active = is_active ? 1 : 0;

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const device = await deviceRepo.update(req.params.deviceId, allowed);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json({ data: device });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDevices, getDevice, updateDevice };
