import { Polyline } from 'react-leaflet';
import { useTrail } from '../hooks/useTrail.js';

export function TrailLayer({ deviceId, color, minutes = 60, enabled }) {
  const { trail } = useTrail(deviceId, minutes, enabled);

  if (!trail || !trail.geometry?.coordinates?.length) return null;

  // GeoJSON coordinates are [lon, lat] — Leaflet wants [lat, lon]
  const positions = trail.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  return (
    <Polyline
      positions={positions}
      pathOptions={{ color: color || '#ffffff', weight: 2, opacity: 0.6, dashArray: '4 6' }}
    />
  );
}
