import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchHistory } from '../api/devices.js';
import { ageLabel } from '../utils/status.js';

const POLL_INTERVAL_MS = 5000;

export function LocationHistoryModal({ device, onClose }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const prevTopId = useRef(null);
  const intervalRef = useRef(null);

  const load = useCallback(async (isInitial = false) => {
    try {
      const data = await fetchHistory(device.device_id, 100);
      setPoints((prev) => {
        const incoming = data.points || [];
        if (!isInitial && incoming.length > 0 && prev.length > 0) {
          const topId = incoming[0].id;
          if (topId !== prevTopId.current) {
            const existingIds = new Set(prev.map((p) => p.id));
            const freshIds = new Set(incoming.filter((p) => !existingIds.has(p.id)).map((p) => p.id));
            setNewIds(freshIds);
            setTimeout(() => setNewIds(new Set()), 2000);
          }
        }
        if (incoming.length > 0) prevTopId.current = incoming[0].id;
        return incoming;
      });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [device.device_id]);

  useEffect(() => {
    load(true);
    intervalRef.current = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 8,
        width: '100%',
        maxWidth: 780,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--c-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{device.display_name}</span>
            <span style={{ color: 'var(--c-text-muted)', marginLeft: 8, fontSize: 12 }}>{device.device_id}</span>
            <span style={{
              marginLeft: 10, fontSize: 10, padding: '2px 7px',
              borderRadius: 10, border: '1px solid #2563eb44',
              background: '#2563eb18', color: '#60a5fa', fontWeight: 600,
            }}>
              Location Feed
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
              Live · refreshes every {POLL_INTERVAL_MS / 1000}s
            </span>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid var(--c-border)',
                color: 'var(--c-text-muted)', borderRadius: 4,
                padding: '3px 10px', cursor: 'pointer', fontSize: 12,
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {loading && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--c-text-muted)' }}>Loading...</div>
          )}
          {error && (
            <div style={{ padding: 16, color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>
          )}
          {!loading && points.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--c-text-muted)' }}>
              No location pings received yet.
            </div>
          )}
          {points.map((point, idx) => (
            <PingRow
              key={point.id ?? idx}
              point={point}
              isNew={newIds.has(point.id)}
              expanded={expandedIdx === idx}
              onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 18px',
          borderTop: '1px solid var(--c-border)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--c-text-muted)',
        }}>
          <span>Showing last {points.length} pings</span>
          <span>Click any row to expand raw data</span>
        </div>
      </div>
    </div>
  );
}

function PingRow({ point, isNew, expanded, onToggle }) {
  const ts = point.source_timestamp_utc || point.received_timestamp_utc;
  const receivedTs = point.received_timestamp_utc;

  const fields = [
    { label: 'Lat', value: point.lat?.toFixed(7) },
    { label: 'Lon', value: point.lon?.toFixed(7) },
    point.altitude_m != null && { label: 'Alt', value: `${point.altitude_m.toFixed(1)} m` },
    point.speed_ms != null && { label: 'Speed', value: `${(point.speed_ms * 3.6).toFixed(1)} km/h` },
    point.bearing_deg != null && { label: 'Heading', value: `${Math.round(point.bearing_deg)}°` },
    point.accuracy_m != null && { label: 'Accuracy', value: `±${point.accuracy_m.toFixed(1)} m` },
    point.battery_pct != null && { label: 'Battery', value: `${Math.round(point.battery_pct)}%` },
  ].filter(Boolean);

  return (
    <div
      onClick={onToggle}
      style={{
        borderBottom: '1px solid var(--c-border)',
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: isNew ? 'rgba(34,197,94,0.08)' : 'transparent',
        outline: isNew ? '1px solid rgba(34,197,94,0.25)' : 'none',
      }}
      onMouseEnter={(e) => { if (!isNew) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { if (!isNew) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Summary row */}
      <div style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Timestamp */}
        <div style={{ flexShrink: 0, minWidth: 160 }}>
          <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: '#e2e4ed' }}>
            {ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>
            {ts ? new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''} · {ageLabel(receivedTs)}
          </div>
        </div>

        {/* Coords */}
        <div style={{ flexShrink: 0, minWidth: 170, fontFamily: 'monospace', fontSize: 11, color: 'var(--c-text-muted)' }}>
          {point.lat?.toFixed(5)}, {point.lon?.toFixed(5)}
        </div>

        {/* Pill fields */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {fields.slice(2).map((f) => (
            <span key={f.label} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 10,
              border: '1px solid var(--c-border)',
              color: 'var(--c-text-muted)', background: 'rgba(255,255,255,0.04)',
            }}>
              {f.label}: {f.value}
            </span>
          ))}
        </div>

        {/* New badge */}
        {isNew && (
          <span style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 10,
            background: '#16a34a33', color: '#4ade80',
            border: '1px solid #16a34a55', fontWeight: 700, flexShrink: 0,
          }}>
            NEW
          </span>
        )}

        {/* Expand chevron */}
        <span style={{ color: 'var(--c-text-muted)', fontSize: 11, flexShrink: 0, marginLeft: 4 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded raw data */}
      {expanded && (
        <div style={{
          margin: '0 18px 10px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--c-border)',
          borderRadius: 5,
          padding: '10px 14px',
        }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>RAW FIELDS</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              {Object.entries(point).map(([key, val]) => (
                val != null && (
                  <tr key={key}>
                    <td style={{
                      padding: '3px 12px 3px 0',
                      color: '#64748b',
                      fontFamily: 'monospace',
                      verticalAlign: 'top',
                      whiteSpace: 'nowrap',
                      width: '30%',
                    }}>
                      {key}
                    </td>
                    <td style={{
                      padding: '3px 0',
                      color: '#cbd5e1',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}>
                      {String(val)}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
