'use strict';

const crypto = require('crypto');

// These are the demo API keys for each device.
// In production, generate unique keys and store only the SHA-256 hash.
// The simulator uses these same raw keys in packages/simulator/config/devices.json
const DEMO_DEVICES = [
  {
    device_id: 'GTA_1',
    role_code: 'GTA',
    display_name: 'Ground Transport Agent 1',
    platform: 'android',
    api_key: 'gta1-demo-key-airporttracking',
    notes: 'Patrol vehicle Alpha',
  },
  {
    device_id: 'GTA_2',
    role_code: 'GTA',
    display_name: 'Ground Transport Agent 2',
    platform: 'ios',
    api_key: 'gta2-demo-key-airporttracking',
    notes: 'Patrol vehicle Bravo',
  },
  {
    device_id: 'TDM_1',
    role_code: 'TDM',
    display_name: 'Terminal Duty Manager',
    platform: 'ios',
    api_key: 'tdm1-demo-key-airporttracking',
    notes: 'T1 duty manager on shift',
  },
  {
    device_id: 'ADM_1',
    role_code: 'ADM',
    display_name: 'Airport Duty Manager',
    platform: 'android',
    api_key: 'adm1-demo-key-airporttracking',
    notes: 'ADM on duty',
  },
  {
    device_id: 'SEC_1',
    role_code: 'SEC',
    display_name: 'Security Supervisor 1',
    platform: 'android',
    api_key: 'sec1-demo-key-airporttracking',
    notes: 'Airside security supervisor',
  },
];

exports.seed = async function (knex) {
  await knex('devices').del();

  const roles = await knex('roles').select('id', 'code');
  const roleMap = Object.fromEntries(roles.map((r) => [r.code, r.id]));

  const rows = DEMO_DEVICES.map(({ device_id, role_code, display_name, platform, api_key, notes }) => ({
    device_id,
    role_id: roleMap[role_code],
    display_name,
    platform,
    api_key_hash: crypto.createHash('sha256').update(api_key).digest('hex'),
    notes,
    is_active: 1,
  }));

  await knex('devices').insert(rows);

  // Initialise device_status rows so the dashboard shows devices immediately
  const statusRows = DEMO_DEVICES.map(({ device_id }) => ({
    device_id,
    status: 'offline',
  }));
  await knex('device_status').insert(statusRows).onConflict('device_id').merge();
};
