import { STATUS_COLORS, STATUS_LABELS } from '../utils/status.js';

export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.offline;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 600,
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
