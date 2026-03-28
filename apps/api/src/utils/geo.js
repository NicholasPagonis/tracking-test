'use strict';

const EARTH_RADIUS_M = 6371000;

/**
 * Haversine distance between two lat/lon points, returns metres.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ray-casting point-in-polygon test.
 * polygon: array of [lat, lon] pairs forming a closed ring.
 */
function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Find which named zone (if any) a lat/lon falls within.
 * zones: array of { name, type, coordinates } where:
 *   polygon type: coordinates = [[lat,lon], ...]
 *   circle type:  coordinates = { center: [lat,lon], radius: metres }
 */
function findZone(lat, lon, zones) {
  for (const zone of zones) {
    if (!zone.active) continue;
    let coords;
    try {
      coords = typeof zone.coordinates === 'string' ? JSON.parse(zone.coordinates) : zone.coordinates;
    } catch {
      continue;
    }

    if (zone.type === 'circle') {
      const d = haversineDistance(lat, lon, coords.center[0], coords.center[1]);
      if (d <= coords.radius) return zone.name;
    } else {
      // polygon
      if (pointInPolygon(lat, lon, coords)) return zone.name;
    }
  }
  return null;
}

/**
 * Bearing between two lat/lon points in degrees (0=N, 90=E).
 */
function bearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Move a point by distance metres in a given bearing.
 * Returns [lat, lon].
 */
function movePoint(lat, lon, distanceM, bearingDeg) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lon);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return [toDeg(φ2), toDeg(λ2)];
}

module.exports = { haversineDistance, pointInPolygon, findZone, bearing, movePoint };
