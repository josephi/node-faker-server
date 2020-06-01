#!/usr/bin/env node

const path = require('path'),
 { argv } = require('yargs'),
 service = require('restana')(),
 { restanaMiddleware } = require('./FakerServer');

service.use(
    restanaMiddleware({ 
        schemasDirectory: argv.path, 
        trackCollections: !!argv.track, 
        urlPrefix: argv.urlPrefix || '' 
    })
);
service.start(argv.port || 3000)