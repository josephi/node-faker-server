# Node Faker Server

> Faker nodeJS server that combines [JSON Schema Faker](https://github.com/json-schema-faker/json-schema-faker) and [faker.js](https://github.com/marak/Faker.js/) to supply easy and complex fake data

Node Faker Server allow to easily create fake data for API separeted by URL.

The library allow to organize the inteface for each API URL + method by JSON schema standarts and [JSON Schema Faker](https://github.com/json-schema-faker/json-schema-faker) and [faker.js](https://github.com/marak/Faker.js/) features.

The library provides middlewares for express and restana framework or can run as a standalone server.

## Installation

### Third Party Library

> `npm install node-faker-server --save`.

The library supplies middlewares for Express and Restana frameworks or FakerServer class 

### Standalone Server

> `npm install node-faker-server --save --global`.

## CLI Command

`faker-server --path ./schema-directory --port 3000 --track --urlPrefix /api`

* `--path`: Path to schema directory. If track is `true` path will point to the root of API file system.
* `--port`: Port to run the Faker Server (default: 3000).
* `--track`: If specified the server will look for `.fakerserver` schema files based on the URL path.
* `--urlPrefix`: URL prefix that will be ignored for the directory path / API key in schema file.  

## Schema File

The library supply 2 options for file names:

### For tracked option

The thinking is to place the APIs schema for the fakes server together with the API file system, in those cases each schema file will be called `.fakerserver`.

### For untracked option

In this case all the filed will be located in the same folder and we want to organize them in such way it is easy to find the schema we want. 

So the file will be composed by the collection ID in the following format: `collection_{COLLECTION_ID}.json`.

## Schema Format

In the schema file each API URL will be represented by a different key in the JSON file, combining the method + the URL (e.g. `POST@/users`)

The schema is based on [JSON-schema specification](http://json-schema.org/draft-04/json-schema-core.html) implemented by [JSON Schema Faker](https://github.com/json-schema-faker/json-schema-faker) with it features

The schema supports use of the same URL with different methods

Example:
```
{
  "GET@/users": {
    "type": "array",
    "minItems": 100,
    "maxItems": 200,
    "items": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "faker": "random.uuid"
        },
        "fullName": {
          "type": "string",
          "faker": {
            "fake": "{{name.lastName}}, {{name.firstName}} {{name.suffix}}"
          }
        },
        "email": {
          "type": "string",
          "faker": "internet.email"
        }
      },
      "required": ["fullName", "id" ]
    }
  },
  "GET@/find": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "faker": "random.uuid"
      },
      "fullName": {
        "type": "string",
        "faker": {
          "fake": "{{name.lastName}}, {{name.firstName}} {{name.suffix}}"
        }
      },
      "email": {
        "type": "string",
        "faker": "internet.email"
      }
    },
    "required": ["fullName", "id", "email" ]
  },
  "POST@/user": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "faker": "random.uuid"
      },
      "fullName": {
        "type": "string",
        "faker": {
          "fake": "{{name.lastName}}, {{name.firstName}} {{name.suffix}}"
        }
      },
      "email": {
        "type": "string",
        "faker": "internet.email"
      }
    },
    "required": ["fullName", "id", "email" ]
  },
  "DELETE@/user": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "faker": "random.uuid"
      }
    },
    "required": ["id"]
  }
}

```

## TODOs:

* Allow pass more options to FakerServer.getData method 
    * Simulate server error
    * Set the content type from the configuration 
    * Support `ref`