import { apiFetch } from './client.js';

const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'changeme-admin-key-at-least-32-chars';

function adminFetch(path, options = {}) {
  return apiFetch(path, {
    ...options,
    headers: { 'X-API-Key': ADMIN_KEY, ...options.headers },
  });
}

export const fetchRoles = () => adminFetch('/api/admin/roles');

export const registerDevice = (body) =>
  adminFetch('/api/admin/devices', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const pingDevice = (deviceId) =>
  adminFetch(`/api/admin/devices/${deviceId}/ping`);
