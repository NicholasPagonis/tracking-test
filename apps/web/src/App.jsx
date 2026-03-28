import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { useDevices } from './hooks/useDevices.js';
import { useGeofences } from './hooks/useGeofences.js';

import { DeviceMarker } from './components/DeviceMarker.jsx';
import { GeofenceLayer } from './components/GeofenceLayer.jsx';
import { TrailLayer } from './components/TrailLayer.jsx';
import { DeviceList } from './components/DeviceList.jsx';
import { FilterPanel } from './components/FilterPanel.jsx';
import { StatusSummary } from './components/StatusSummary.jsx';

const CENTER_LAT = parseFloat(import.meta.env.VITE_MAP_CENTER_LAT || '-33.9399');
const CENTER_LON = parseFloat(import.meta.env.VITE_MAP_CENTER_LON || '151.1753');
const DEFAULT_ZOOM = parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM || '14', 10);

export default function App() {
  const { devices, loading, error, lastSync } = useDevices();
  const { geofences } = useGeofences();

  const [selectedId, setSelectedId] = useState(null);
  const [showTrails, setShowTrails] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedDevice = useMemo(() => devices.find((d) => d.device_id === selectedId), [devices, selectedId]);

  const handleSelectDevice = (device) => {
    setSelectedId(device.device_id === selectedId ? null : device.device_id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-header)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 16px',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 1000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: '#e2e4ed' }}>
            Airport Operations Tracker
          </span>
          <span style={{ fontSize: 10, background: '#2563eb22', color: '#60a5fa', padding: '2px 6px', borderRadius: 3, border: '1px solid #2563eb44', fontWeight: 600 }}>
            POC
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <MapToggle active={showZones} onClick={() => setShowZones(!showZones)} label="Zones" />
          <MapToggle active={showTrails} onClick={() => setShowTrails(!showTrails)} label="Trails" />
          <MapToggle active={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} label="Sidebar" />
        </div>
      </header>

      {/* Status bar */}
      <StatusSummary devices={devices} lastSync={lastSync} />

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 280,
            flexShrink: 0,
            background: 'var(--c-surface)',
            borderRight: '1px solid var(--c-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <FilterPanel
              filterRole={filterRole}
              filterStatus={filterStatus}
              search={search}
              onRoleChange={setFilterRole}
              onStatusChange={setFilterStatus}
              onSearchChange={setSearch}
            />
            {loading && (
              <div style={{ padding: 16, color: 'var(--c-text-muted)', textAlign: 'center' }}>Loading...</div>
            )}
            {error && (
              <div style={{ padding: 16, color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>
            )}
            {!loading && (
              <DeviceList
                devices={devices}
                selectedId={selectedId}
                onSelect={handleSelectDevice}
                filterRole={filterRole}
                filterStatus={filterStatus}
                search={search}
              />
            )}
          </div>
        )}

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={[CENTER_LAT, CENTER_LON]}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="bottomright" />

            {showZones && <GeofenceLayer geofences={geofences} />}

            {devices.map((device) => (
              <div key={device.device_id}>
                <DeviceMarker
                  device={device}
                  selected={device.device_id === selectedId}
                  onClick={handleSelectDevice}
                />
                {showTrails && (
                  <TrailLayer
                    deviceId={device.device_id}
                    color={device.color_hex}
                    minutes={60}
                    enabled={showTrails}
                  />
                )}
              </div>
            ))}
          </MapContainer>

          {/* Map overlay info when device selected */}
          {selectedDevice && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              zIndex: 1000,
              background: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              borderRadius: 6,
              padding: '10px 14px',
              minWidth: 220,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{selectedDevice.display_name}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
                {selectedDevice.lat?.toFixed(6)}, {selectedDevice.lon?.toFixed(6)}
              </div>
              <button
                onClick={() => setSelectedId(null)}
                style={{ marginTop: 8, fontSize: 11, background: 'none', border: 'none', color: 'var(--c-text-muted)', padding: 0 }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MapToggle({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 4,
        border: `1px solid ${active ? '#3b82f6' : 'var(--c-border)'}`,
        background: active ? '#3b82f622' : 'transparent',
        color: active ? '#60a5fa' : 'var(--c-text-muted)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
