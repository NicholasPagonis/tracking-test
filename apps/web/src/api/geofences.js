import { apiFetch } from './client.js';

export const fetchGeofences = () => apiFetch('/api/geofences');
export const fetchGeofenceEvents = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/geofences/events${qs ? `?${qs}` : ''}`);
};
