'use strict';

// Notional airport zones — loosely based on Sydney Airport layout
// Coordinates are [lat, lon] pairs forming clockwise polygons
// Adjust these to match your actual airport geometry
const AIRPORT_ZONES = [
  {
    name: 'Terminal 1 (International)',
    type: 'polygon',
    color_hex: '#2563eb',
    coordinates: JSON.stringify([
      [-33.9310, 151.1730],
      [-33.9310, 151.1790],
      [-33.9350, 151.1790],
      [-33.9350, 151.1730],
      [-33.9310, 151.1730],
    ]),
  },
  {
    name: 'Terminal 2 (Domestic)',
    type: 'polygon',
    color_hex: '#16a34a',
    coordinates: JSON.stringify([
      [-33.9355, 151.1760],
      [-33.9355, 151.1820],
      [-33.9395, 151.1820],
      [-33.9395, 151.1760],
      [-33.9355, 151.1760],
    ]),
  },
  {
    name: 'Terminal 3 (Domestic)',
    type: 'polygon',
    color_hex: '#0891b2',
    coordinates: JSON.stringify([
      [-33.9395, 151.1760],
      [-33.9395, 151.1820],
      [-33.9430, 151.1820],
      [-33.9430, 151.1760],
      [-33.9395, 151.1760],
    ]),
  },
  {
    name: 'Airside East',
    type: 'polygon',
    color_hex: '#dc2626',
    coordinates: JSON.stringify([
      [-33.9310, 151.1790],
      [-33.9310, 151.1870],
      [-33.9450, 151.1870],
      [-33.9450, 151.1790],
      [-33.9310, 151.1790],
    ]),
  },
  {
    name: 'Airside West',
    type: 'polygon',
    color_hex: '#ea580c',
    coordinates: JSON.stringify([
      [-33.9310, 151.1640],
      [-33.9310, 151.1730],
      [-33.9450, 151.1730],
      [-33.9450, 151.1640],
      [-33.9310, 151.1640],
    ]),
  },
  {
    name: 'Landside Arrivals',
    type: 'polygon',
    color_hex: '#9333ea',
    coordinates: JSON.stringify([
      [-33.9250, 151.1730],
      [-33.9250, 151.1820],
      [-33.9310, 151.1820],
      [-33.9310, 151.1730],
      [-33.9250, 151.1730],
    ]),
  },
  {
    name: 'Ground Transport Hub',
    type: 'circle',
    color_hex: '#ca8a04',
    coordinates: JSON.stringify({ center: [-33.9340, 151.1710], radius: 200 }),
  },
];

exports.seed = async function (knex) {
  await knex('geofences').del();
  await knex('geofences').insert(AIRPORT_ZONES);
};
