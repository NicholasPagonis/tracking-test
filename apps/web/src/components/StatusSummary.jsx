import { STATUS_COLORS } from '../utils/status.js';
import { formatTimestamp } from '../utils/status.js';

export function StatusSummary({ devices, lastSync }) {
  const counts = { active: 0, stale: 0, offline: 0 };
  devices.forEach((d) => { if (counts[d.status] !== undefined) counts[d.status]++; });

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: '8px 14px',
      background: 'var(--c-header)',
      borderBottom: '1px solid var(--c-border)',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {Object.entries(counts).map(([status, count]) => (
        <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status], display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
            <strong style={{ color: 'var(--c-text)' }}>{count}</strong> {status}
          </span>
        </div>
      ))}
      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--c-text-muted)' }}>
        Last sync: {formatTimestamp(lastSync)}
      </div>
    </div>
  );
}
