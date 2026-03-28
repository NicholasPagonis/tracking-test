import { StatusBadge } from './StatusBadge.jsx';
import { ageLabel, speedKph, formatTimestamp } from '../utils/status.js';

export function DeviceList({ devices, selectedId, onSelect, filterRole, filterStatus, search }) {
  const filtered = devices.filter((d) => {
    if (filterRole && d.role_code !== filterRole) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.device_id.toLowerCase().includes(q) && !d.display_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return <div style={{ padding: '16px', color: 'var(--c-text-muted)', textAlign: 'center' }}>No devices match filters</div>;
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {filtered.map((device) => (
        <DeviceRow key={device.device_id} device={device} selected={device.device_id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function DeviceRow({ device, selected, onSelect }) {
  const bg = selected ? 'rgba(255,255,255,0.06)' : 'transparent';
  const borderLeft = selected ? `3px solid ${device.color_hex || '#3388ff'}` : '3px solid transparent';

  return (
    <div
      onClick={() => onSelect(device)}
      style={{
        padding: '10px 14px',
        cursor: 'pointer',
        background: bg,
        borderLeft,
        borderBottom: '1px solid var(--c-border)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{device.display_name}</span>
          <span style={{ color: 'var(--c-text-muted)', marginLeft: 6, fontSize: 11 }}>{device.device_id}</span>
        </div>
        <StatusBadge status={device.status} />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: 'var(--c-text-muted)', fontSize: 11 }}>
        <span title="Zone">{device.zone_name || 'No zone'}</span>
        <span title="Last seen">{ageLabel(device.last_seen_utc)}</span>
        {device.battery_pct != null && (
          <span title="Battery" style={{ color: device.battery_pct < 20 ? 'var(--c-danger)' : 'inherit' }}>
            🔋 {Math.round(device.battery_pct)}%
          </span>
        )}
        {device.speed_ms != null && (
          <span title="Speed">{speedKph(device.speed_ms)} km/h</span>
        )}
        <span title="Platform" style={{ textTransform: 'capitalize' }}>{device.platform}</span>
      </div>
    </div>
  );
}
