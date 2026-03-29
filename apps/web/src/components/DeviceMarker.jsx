import { useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { STATUS_COLORS, ageLabel, speedKph, formatTimestamp } from '../utils/status.js';

const ROLE_INITIALS = { GTA: 'GTA', TDM: 'TDM', ADM: 'ADM', SEC: 'SEC' };

function buildIcon(device) {
  const color = device.color_hex || '#3388ff';
  const status = device.status || 'offline';
  const statusColor = STATUS_COLORS[status];
  const initials = ROLE_INITIALS[device.role_code] || '?';
  const opacity = status === 'offline' ? 0.4 : status === 'stale' ? 0.75 : 1;

  // Bearing arrow rotation
  const bearing = device.bearing_deg ?? 0;

  const html = `
    <div class="device-marker ${status}" style="
      width:36px;height:36px;
      background:${color};
      opacity:${opacity};
      position:relative;
    ">
      ${initials}
      <div style="
        position:absolute;bottom:-7px;left:50%;
        transform:translateX(-50%) rotate(${bearing}deg);
        width:0;height:0;
        border-left:4px solid transparent;
        border-right:4px solid transparent;
        border-top:7px solid ${statusColor};
      "></div>
    </div>
  `;

  return L.divIcon({ html, className: '', iconSize: [36, 44], iconAnchor: [18, 44], popupAnchor: [0, -46] });
}

function FlyTo({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [lat, lon, map]);
  return null;
}

export function DeviceMarker({ device, selected, onClick }) {
  if (!device.lat || !device.lon) return null;

  const icon = buildIcon(device);

  return (
    <>
      {selected && <FlyTo lat={device.lat} lon={device.lon} />}
      <Marker
        position={[device.lat, device.lon]}
        icon={icon}
        eventHandlers={{ click: () => onClick?.(device) }}
        zIndexOffset={device.status === 'active' ? 1000 : device.status === 'stale' ? 500 : 0}
      >
        <Popup minWidth={220}>
          <div style={{ fontFamily: 'var(--font)', fontSize: 12, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{device.display_name}</div>
            <div style={{ color: '#888', marginBottom: 8 }}>{device.role_label} · {device.platform}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <Row label="Role ID" value={device.device_id} />
                <Row label="Status" value={<StatusPill status={device.status} />} />
                <Row label="Zone" value={device.zone_name || '—'} />
                <Row label="Last fix" value={formatTimestamp(device.source_timestamp_utc)} />
                <Row label="Age" value={ageLabel(device.last_seen_utc)} />
                <Row label="Speed" value={speedKph(device.speed_ms) != null ? `${speedKph(device.speed_ms)} km/h` : '—'} />
                <Row label="Accuracy" value={device.accuracy_m != null ? `±${Math.round(device.accuracy_m)}m` : '—'} />
                <Row label="Battery" value={device.battery_pct != null ? `${Math.round(device.battery_pct)}%` : '—'} />
                <Row label="Platform" value={device.platform} />
              </tbody>
            </table>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td style={{ color: '#888', paddingRight: 8, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{label}</td>
      <td style={{ fontWeight: 500 }}>{value}</td>
    </tr>
  );
}

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || '#888';
  return <span style={{ color: c, fontWeight: 600 }}>{status?.toUpperCase()}</span>;
}
