'use strict';

exports.seed = async function (knex) {
  await knex('roles').del();
  await knex('roles').insert([
    { code: 'GTA', label: 'Ground Transport Agent', color_hex: '#2563eb', icon_name: 'truck' },
    { code: 'TDM', label: 'Terminal Duty Manager',  color_hex: '#16a34a', icon_name: 'building' },
    { code: 'ADM', label: 'Airport Duty Manager',   color_hex: '#dc2626', icon_name: 'star' },
    { code: 'SEC', label: 'Security Supervisor',    color_hex: '#9333ea', icon_name: 'shield' },
  ]);
};
