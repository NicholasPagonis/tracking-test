export const STATUS_COLORS = {
  active: '#22c55e',
  stale: '#f59e0b',
  offline: '#6b7280',
};

export const STATUS_LABELS = {
  active: 'Active',
  stale: 'Stale',
  offline: 'Offline',
};

export function ageLabel(isoTimestamp) {
  if (!isoTimestamp) return 'Never';
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export function speedKph(speedMs) {
  if (speedMs == null) return null;
  return Math.round(speedMs * 3.6);
}

export function formatTimestamp(isoTimestamp) {
  if (!isoTimestamp) return '—';
  return new Date(isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
