import { apiFetch } from './client.js';

export const fetchDevices = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/devices${qs ? `?${qs}` : ''}`);
};

export const fetchDevice = (deviceId) => apiFetch(`/api/devices/${deviceId}`);

export const fetchTrail = (deviceId, minutes = 60) =>
  apiFetch(`/api/devices/${deviceId}/trail?minutes=${minutes}`);

export const fetchHistory = (deviceId, limit = 100) =>
  apiFetch(`/api/devices/${deviceId}/history?limit=${limit}`);
