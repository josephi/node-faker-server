#!/usr/bin/env node

const path = require('path'),
 { argv } = require('yargs'),
 service = require('restana')(),
 { restanaMiddleware } = require('./FakerServer');

//TODO: Set default value for schemas path

service.use(restanaMiddleware({ schemasDirectory: argv.path, trackCollections: true, urlPrefix: '/api' }));
service.start(3000)