#!/usr/bin/env node

const path = require('path'),
 { argv } = require('yargs'),
 service = require('restana')(),
 SCHEMA_DIR = path.resolve(__dirname ,argv.path),
 { restanaMiddleware } = require('./FakerServer');

//TODO: Set default value for schemas path

service.use(restanaMiddleware({ schemasDirectory: path.resolve(__dirname, SCHEMA_DIR) }));
service.start(3000)