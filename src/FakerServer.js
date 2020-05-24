const path = require('path'),
    fs = require('fs'),
    jsf = require('json-schema-faker'),
    CONSTANTS = {
        SCHEMA_NOT_FOUND: 'SCHEMA_NOT_FOUND',
        INVALID_SCHEMA: 'INVALID_SCHEMA',
        API_NOT_FOUND: 'API_NOT_FOUND',
        LIMITER: '@',
        HEADER: 'X-Faker-Server-ID'
    };

jsf.extend('faker', () => require('faker'));

class FakerServer {
    constructor({ schemasDirectory }) {
        this.schemasDirectory = schemasDirectory;
        this.collections = {}
    }

    get schemasDirectory () {
        return this.__schemasDirectory;
    }

    reset() {
        this.collections = {}
    }

    set schemasDirectory (schemasDirectory) {
        this.__schemasDirectory = path.resolve(__dirname, schemasDirectory);
        if(!fs.existsSync(this.__schemasDirectory)) {
            this.__schemasDirectory = null;
            throw new Error(CONSTANTS.SCHEMA_NOT_FOUND);
        }
    }

    loadCollection(collectionId) {
        return new Promise((resolve, reject) => {
            let collectionKey = `collection_${collectionId}`
            fs.readFile(path.resolve(this.schemasDirectory, `${collectionKey}.json`), 'utf8', (err, data) => {
                if (err) {
                  return reject(new Error(CONSTANTS.SCHEMA_NOT_FOUND));
                }

                try {
                    this.collections[collectionKey] = JSON.parse(data) 
                    resolve(this.collections[collectionKey]);
                }
                catch(ex) {
                    delete this.collections[collectionKey];
                    reject(new Error(CONSTANTS.INVALID_SCHEMA));
                }
            });
        })
    }

    collectionExists(collectionId) {
        return this.collections.hasOwnProperty(`collection_${collectionId}`);
    }

    getCollection(collectionId) {
        if(this.collectionExists(collectionId))
            return Promise.resolve(this.collections[`collection_${collectionId}`]);
        
        return this.loadCollection(collectionId);
    }

    async findApiSettings({ method, segment, collectionId }) {
        let key = method.toLowerCase() + CONSTANTS.LIMITER + segment.toLowerCase(),
            collection = await this.getCollection(collectionId),
            objectKey;
        
        if(!collection)
            throw new Error(CONSTANTS.SCHEMA_NOT_FOUND);
        
        objectKey = Object.keys(collection).find(k => k.toLowerCase() === key);

        if(!collection[objectKey])
            throw CONSTANTS.API_NOT_FOUND

        return collection[objectKey];
    }

    async getData(collectionId, { method, segment }) {
        let settings = await this.findApiSettings({ collectionId, segment, method }); 
        return jsf.resolve(settings);
    }
}

module.exports.FakerServer = FakerServer;

function getHTTPErrorMessage(errorCode, exception, collectionId) {
    switch(errorCode) {
        case CONSTANTS.API_NOT_FOUND:
            return { code: 404, msg: 'Page not found' };
        case CONSTANTS.INVALID_SCHEMA:
            return { code: 500, msg: 'Faker Server schema is not valid' }                
        case CONSTANTS.SCHEMA_NOT_FOUND:
            return { code: 403, msg: "Faker Server can't find collection " + collectionId + '.' };
        default:
            return { code: 500, msg: exception.toString() }
    }
}

function setDefaultHeaders(res) {
    res.setHeader('Is-Faker-Server', true)
    res.setHeader('Content-Type', 'application/json');
}

module.exports.expressMiddleware =
function FakerServerMiddlewareInitializer(settings) {
    let fakerServer = new FakerServer(settings);
    const logger = settings.hasOwnProperty('logger') ? settings.logger : console.info;
    //TODO: Add options to send request to simulate server error
    
    return async function FakerServerMiddleware(req, res, next) {
        let collectionId = req.headers[CONSTANTS.HEADER];

        if(!collectionId) { 
            next();
            return;
        }
        //TODO: Allow set the content type from the configuration 
        setDefaultHeaders(res);

        try {
            let content = await fakerServer.getData(collectionId, { segment: req.originalUrl, method: req.method });
            res.status(200)
               .send(content);
        }
        catch(ex) {
            let errMsg = ex instanceof Error ? ex.message : ex.toString(),
                data = getHTTPErrorMessage(errMsg, ex, collectionId);
            logger(ex.toString(), ex, collectionId);

            res.status(data.code).send(data.msg);
        }
    } 
}

module.exports.restanaMiddleware = function FakerServerMiddlewareInitializer(settings) {
    let fakerServer = new FakerServer(settings);
    const logger = settings.hasOwnProperty('logger') ? settings.logger : console.info;
    //TODO: Add options to send request to simulate server error
    
    return async function FakerServerMiddleware(req, res, next) {
        let collectionId = req.headers[CONSTANTS.HEADER.toLowerCase()];

        if(!collectionId) { 
            next();
            return;
        }
        //TODO: Allow set the content type from the configuration 
        setDefaultHeaders(res);

        try {
            let content = await fakerServer.getData(collectionId, { segment: req.originalUrl, method: req.method });
            res.send(content, 200)
        }
        catch(ex) {
            let errMsg = ex instanceof Error ? ex.message : ex.toString(),
                data = getHTTPErrorMessage(errMsg, ex, collectionId);
            logger(ex.toString(), ex, collectionId);

            res.send(data.msg, data.code);
        }
    } 
}