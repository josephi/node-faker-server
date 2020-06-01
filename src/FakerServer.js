const path = require('path'),
    fs = require('fs'),
    jsf = require('json-schema-faker'),
    faker = require('faker')
    CONSTANTS = {
        SCHEMA_NOT_FOUND: 'SCHEMA_NOT_FOUND',
        INVALID_SCHEMA: 'INVALID_SCHEMA',
        API_NOT_FOUND: 'API_NOT_FOUND',
        LIMITER: '@',
        HEADER: 'x-faker-server'
    };



class FakerServer {
    constructor({ 
        schemasDirectory, 
        customFormats = {}, 
        jsfOptions, 
        extendFaker, 
        shouldCacheCollections = true, 
        trackCollections = false,
        urlPrefix = ''
    }) {
        
        this.schemasDirectory = schemasDirectory;
        this.collections = {}
        this.cacheCollections = shouldCacheCollections;
        this.trackCollections = trackCollections;
        this.urlPrefix = urlPrefix;
        
        for(let formatName in customFormats) {
            jsf.format(formatName, customFormats[formatName]);
        }

        if(jsfOptions) {
            jsf.option(jsfOptions);
        }

        if(typeof extendFaker === 'function') {
            jsf.extend('faker', () => extendFaker(faker));
        }
        else {
            jsf.extend('faker', () => faker);
        }
    }

    get schemasDirectory () {
        return this.__schemasDirectory;
    }
    
    set schemasDirectory (schemasDirectory) {
        this.__schemasDirectory = path.resolve(process.cwd(), schemasDirectory);
        if(!fs.existsSync(this.__schemasDirectory)) {
            this.__schemasDirectory = null;
            throw new Error(CONSTANTS.SCHEMA_NOT_FOUND);
        }
    }

    reset() {
        this.collections = {}
    }

    loadCollection(collectionId, segment = null) {
        return new Promise((resolve, reject) => {
            let collectionKey, dirPath;
                
            if(this.trackCollections) {
                collectionKey= '.fakerserver';
                let _p = 
                    (segment.lastIndexOf('/') === segment.length - 1 ? segment.substring(0, segment.length - 1) : segment)
                        .replace(this.urlPrefix, '')
                        .substring(1)
                        .split('/');

                if(_p.length > 1) {
                    _p = '/' + _p.slice(0, _p.length - 1).join('/');
                }
                else {
                    _p = '/' + _p.join('/')
                }
                dirPath = path.resolve(this.schemasDirectory, '.' + _p, collectionKey);
            }
            else {
                collectionKey= `collection_${collectionId}`;
                dirPath = path.resolve(this.schemasDirectory, `${collectionKey}.json`);
            }

            fs.readFile(dirPath, 'utf8', (err, data) => {
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

    getCollection(collectionId, segment) {
        if(!this.trackCollections && this.cacheCollections && this.collectionExists(collectionId))
            return Promise.resolve(this.collections[`collection_${collectionId}`]);
        
        return this.loadCollection(collectionId, segment);
    }

    async findApiSettings({ method, segment, collectionId }) {
        let key = (segment.lastIndexOf('/') === segment.length - 1 ? segment.substring(0, segment.length - 1) : segment).toLowerCase(),
            collection = await this.getCollection(collectionId, segment),
            objectKey;

        if(this.trackCollections) {
            key = method.toLowerCase() + CONSTANTS.LIMITER + key.substring(key.lastIndexOf('/'));
        }
        else {
            key = method.toLowerCase() + CONSTANTS.LIMITER + key;
        }
        
        if(!collection)
            throw new Error(CONSTANTS.SCHEMA_NOT_FOUND);
        
        objectKey = Object.keys(collection).find(k => k.toLowerCase() === key);

        if(!collection[objectKey])
            throw new Error(CONSTANTS.API_NOT_FOUND)

        return collection[objectKey];
    }

    async getData(collectionId, { method, segment }) {
        let _cid = this.trackCollections ? segment.replace(this.urlPrefix, '') : collectionId,
            settings = await this.findApiSettings({ _cid, segment, method }); 
        return jsf.resolve(settings);
    }
}

module.exports.FakerServer = FakerServer;

function getHTTPErrorMessage(errorCode, exception) {
    switch(errorCode) {
        case CONSTANTS.API_NOT_FOUND:
            return { code: 404, msg: 'Page not found' };
        case CONSTANTS.INVALID_SCHEMA:
            return { code: 500, msg: 'Faker Server schema is not valid' }                
        case CONSTANTS.SCHEMA_NOT_FOUND:
            return { code: 403, msg: "Faker Server can't find collection " };
        default:
            return { code: 500, msg: exception.toString() }
    }
}

function setDefaultHeaders(res) {
    res.setHeader('Is-Faker-Server', true)
    res.setHeader('Content-Type', 'application/json');
}

function genericMiddleware(type, settings) {    
    let fakerServer = new FakerServer(settings);
    const logger = settings.hasOwnProperty('logger') ? settings.logger : console.info;

    return async function FakerServerMiddleware(req, res, next) {
        let props = req.headers[CONSTANTS.HEADER], collectionId, options;
        
        if(!props) { 
            next();
            return;
        }
        else {
            try {
                options = JSON.parse(props);
                collectionId = options.collectionId 
            }
            catch(ex) {
                collectionId = props;
                options = {}
            }
        }
        
        setDefaultHeaders(res);

        try {
            let content = await fakerServer.getData(collectionId, { segment: req.originalUrl, method: req.method });

            switch(type) {
                case 'restana':
                    res.send(content, 200)
                    break;
                default:
                    res.status(200)
                       .send(content);
            }
        }
        catch(ex) {
            let errMsg = ex instanceof Error ? ex.message : ex.toString(),
                data = getHTTPErrorMessage(errMsg, ex);
            logger(ex.toString(), ex, collectionId);

            switch(type) {
                case 'restana':
                    res.send(data.msg, data.code);
                    break;
                default:
                    res.status(data.code).send(data.msg);
            }
            
        }
    } 
}

module.exports.expressMiddleware = function FakerServerMiddlewareInitializer(settings) {
    return genericMiddleware('express', settings); 
}

module.exports.restanaMiddleware = function FakerServerMiddlewareInitializer(settings) {    
    return genericMiddleware('restana', settings); 
}