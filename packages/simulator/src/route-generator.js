'use strict';

/**
 * Generates looping patrol routes within a zone or between waypoints.
 * All positions are [lat, lon] pairs.
 */

function randomOffset(radiusM) {
  // Convert metres to approximate degrees (rough, good enough for simulation)
  const deg = radiusM / 111_320;
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random()) * deg;
  return [r * Math.cos(angle), r * Math.sin(angle)];
}

/**
 * Generate N random waypoints within a circular area.
 */
function generatePatrolRoute(centerLat, centerLon, radiusM, waypointCount = 6) {
  const waypoints = [];
  for (let i = 0; i < waypointCount; i++) {
    const [dLat, dLon] = randomOffset(radiusM);
    waypoints.push([centerLat + dLat, centerLon + dLon]);
  }
  return waypoints;
}

/**
 * Generate a route that moves between multiple zones.
 */
function generateTransitRoute(zones, airportBounds) {
  const zoneNames = Object.keys(zones);
  // Pick 3-4 random zones to visit
  const count = 3 + Math.floor(Math.random() * 2);
  const selected = [];
  const shuffled = [...zoneNames].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const z = zones[shuffled[i]];
    const [dLat, dLon] = randomOffset(z.patrol_radius_m * 0.5);
    selected.push([z.center.lat + dLat, z.center.lon + dLon]);
  }
  return selected;
}

module.exports = { generatePatrolRoute, generateTransitRoute };
