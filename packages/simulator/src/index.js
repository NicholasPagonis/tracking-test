'use strict';

require('dotenv').config();

const { Simulator } = require('./simulator');

const args = process.argv.slice(2);
const scenarioArg = args.find((a) => a.startsWith('--scenario='));
const scenario = scenarioArg ? scenarioArg.split('=')[1] : undefined;

const sim = new Simulator({ scenario });
sim.start();
