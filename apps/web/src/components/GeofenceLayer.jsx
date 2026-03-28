import { Polygon, Circle, Tooltip } from 'react-leaflet';

export function GeofenceLayer({ geofences }) {
  return geofences.map((zone) => {
    let coords;
    try {
      coords = typeof zone.coordinates === 'string' ? JSON.parse(zone.coordinates) : zone.coordinates;
    } catch {
      return null;
    }

    const color = zone.color_hex || '#ff7800';
    const label = <Tooltip sticky>{zone.name}</Tooltip>;

    if (zone.type === 'circle') {
      return (
        <Circle
          key={zone.id}
          center={[coords.center[0], coords.center[1]]}
          radius={coords.radius}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 1.5, dashArray: '4 4' }}
        >
          {label}
        </Circle>
      );
    }

    // Polygon: coords are [lat, lon] pairs
    return (
      <Polygon
        key={zone.id}
        positions={coords}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.06, weight: 1.5, dashArray: '4 4' }}
      >
        {label}
      </Polygon>
    );
  });
}
