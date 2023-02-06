# Various JSON files of load-easy api.

## Introduction

Required request path will be of the form:
> /\<`versionIdentifier`\>/\<`categoryName`\>/\<`requestName`>/\~\<`supportKey`>=\<`supportValues`>\~\<`supportKey2`>=\<`supportValues`>

* versionIdentifier: identifies the api version which will be used for handling of request. eg:- v1, v2
* categoryName: identifies the entity that this request will interact with or directly relates with. eg:- User, Truck
* requestName: identifies the flow of actions that will be executed on the given category. eg:- login, request-delivery.
* support: provides dynamic but essential details for the request. These details can be used to provide specific data to the request. eg:-   ~userDetails=name,phoneNumber,userId  
  

This structure needs to be clearly defined, so that it can be validated programmatically for each request.
Hence the requirement for json files which can define this schema.

### List of essential JSON files
1. [path-schema.json](#path-schema)
2. [params-schema.json](#params-schema)
3. [paths.json](#paths)
4. [config.json](#config)
5. [response-schema.json](#response-schema)
<br></br>
## Path Schema 
---
This file determines the names of various segments of request path. Each segment of request path is separated by `/`. 

Path-schema.json helps us by providing some valuable metadata to each segment of the path.

### Example:
```json
{
    "version": {
        "type": "string",
        "required": true,
        "sequence": 0,
        "default": "default",
        "description": "API version"
    }
}
```
By looking at the above example, following conclusions can be made about the request path:
  * `version` will be a segment of request path
  * It shall always be present, since `required: true`
  * It will be the 1st segment of request path, because `sequence: 0`
  * The **default** value for `version` will be `default`

### Location

This file should be placed in `api` directory.  
path-schema.json is version independant, so it can be placed outside of `version` subdirectories.
> /api/path-schema.json

### Accessing path schema from Request
From Request class, values received for path-schema can be accesses by calling request.getPathVariables() function.
Internally path-schema is always parsed as soon as Request class is instantiated.
> /v1/User/handlers.js
```js 
exports.login = async (request) => {
    const pathVariables = request.getPathVariables();
    console.log(pathVariables);
}
```
> Output
```js
{
  version: 'v1',
  category: 'user',
  request: 'login',
  support: undefined
}
```
<br></br>
## Params Schema
---
`params-shcema.json` file determines the sub-structures of some segments of request path.
`params-schema.json` can help us define structures for the dynamic key-value pairs in request path.

### Example
```json
{
    "support": {
        "client": {
            "type": "string",
            "required": true,
            "default": "web",
            "description": "Client name"
      },
}
```
This example defines param-schema for `support` segment.
After studying the schema, the following conclusions can be made:
* `client` is a type of support which will be received from support segment in request path.
* `client` is required for all request.
* if  `client` support is not present, **default** value of `web` will be used.
* the structure for support could be: `/~client=default` or `/~client=somevalue`. 

### Location
This file should be placed in `api` directory.  
params-schema.json is version independant, so it can be placed outside of `version` subdirectories.
> /api/params-schema.json

### Accessing support from Request
A parsed support object can be accessed directly with `request.getSupportParams()`
> /v1/User/handlers.js
```js 
exports.login = async (request) => {
    const support = request.getSupportParams();
    console.log(support);
}
```
> Output
```js
{ 
    userId: [ 'abc123' ],
    client: [ 'web' ]
}
```
<br></br>
## Paths 
---
`paths.json` defines all the routes that are available for a specific category. They determine the required request structure for a client request to be processed. They can be used as a metadata for dictating a request structure for specific request.
Each category must have its own paths.json file.  

Category Specific and RequestName specific middlewares can also be specified in `paths.json` which will be auto-imported and executed.  
### Example
> /v1/User/paths.json
```json
{
    "categorySpecificMiddlewares": ["./common.js->verifyClient", "./common.js->checkHeaders"],
    "login": {
        "methods": ["GET", "POST"],
        "description": "login route",
        "parameters": {
            "support": [],
            "query": [],
            "headers": ["Content-Type", "Accept"]
        },
        "handlers": {
            "GET": "./User/handlers.js->getLoginForm",
            "POST": "./User/handlers.js->login"
        },
        "middlewares": {
            "GET": ["./auth.js->authenticate", "./auth.js->validateOTP"],
            "POST": ["./auth.js->sendOTP"]
        }
    }
}
```
This example determines:
* A request can be made for `/v1/User/login`. Since this file is present in `User` directory/category and it has a key of `login`.
* The allowed http methods for this endpoint are **GET**, **POST**.
* The parameters that it requires are:
  * `support` not required
  * `query` not required
  * `headers` should have 'Content-Type' and 'Accept' headers.
* The handlers (functions that will be executed when this request is received) are:
  * For **GET** http request method, `getLoginForm` function will be executed, which is defined in `./User/handlers.js`.
  * For **POST** http method, `login` function will be executed, which is defined in `./User/handlers.js`.
  * For **\<YOUR HTTP METHOD\>**, the function at `path/to->yourFunction` will be executed.
  * handler string has 2 portions **file/location** and **functionName**. This portions are separated by `->` (minus, right arrow).
* `categorySpecificMiddlewares` will be executed for all requests related to `user` category.
* `[login][middlewares]` defines middlewares that are related to login route.
    * `GET` section determines middlewares that will be run for **GET** requests to `login` requestName in `user` category.
    * `POST` section determines middlewares that will be run for **POST** requests to `login` requestName in `user` category.
* Middlewares will always run in the sequence they are declared in the corresponding arrays.
* The sequence of pathSpecific and categorySpecific middlewares can be dynamically altered in `Middleware` class.
* If required, middlewares can be added dynamically  at runtime.
<!--* Middleware function paths should always be relative to Middleware.js file. -->
* All middlewares must be defined in `middlewares` directory under appropriate file.

### Location
Paths files are category dependant, so they should be placed in respective category directories.
> /api/\<versionName>/\<categoryName>/paths.json  
> /api/v1/User/paths.json  

<br></br>
## Config
---
`config.json` defines all the configurables that are set for entire api.

UPDATE: `config.json` is now `config.js`, though the file still exposes a JS object with same structure, the values of the object can be made dynamic based on the development environment. This allows greater flexibility.

### Example
```json
{
    "response": {
        "requiredKeys": ["status", "message"]
    }
    "middlewares": {
        "allRequests": [
        "./common.js->alwaysOne",
        "./common.js->b",
        "./common.js->alwaysTwo"
        ]
    }
}
```

### Config[`"response"`]
used for determining **response** specific configurables

### Config[`"response"`][`"requiredKeys"`]
`requiredKeys` is a list of keys used for asserting the presense of said keys in an ideal API response object. If keys defined in `requiredKeys` are not present in API response object, appropriate errors will be thrown informing of the specific key that is missing.

To avoid this validation:  
1. Either `requiredKeys` could be made empty. OR
2. `skipBasicResponseSchemaValidation` can be passed as support with the api call. This support can be valueless.
    eg path: `/v1/user/details/~skipBasicResponseSchemaValidation`

### Config["middlewares"]
used for determining **middlewares** specific configurables.
### Config["middlewares"]["allRequests"]
`allRequests` middlewares are middlewares which are common to all api requests. These middlewares run regardless of api request *path* and *http method*.



### Location
config file is version independant. It can be placed at same level as app.js  .
> ./config.json

<br></br>
## Response Schema
---
Used for defining views for responses. Each response schema defines a mapping of the client expected key in API Response Object, with actual API response object's key.

### Syntax
```json
{
    "schemaName": {
        "clientExpectedKey": "actualResponseKey"
    }
}
```
With response schema, client can dictate schema they want the API response object to follow. With this mapping of `clientExpectedKey` & `actualResponseKey` the *Response* class can forge new response from the original api response. With this schema definition, one can: 
 * filter the api response object.
 * rename the keys of api response object, without changing the underlying handler function.
 * get different views based on client requirement, without changing the underlying api.  

### Example
```json
{
    "addressless-details": {
        "fullName": "name",
        "mobileNumber": "phone",
        "id": "aadharNumber",
        "message": "message",
        "clientType": "clientType"
    }
}
```
`addressless-details` schema can be applied over api by just passing it as support value to api path. eg:
    `/v1/user/details/~responseSchema=addressless-details`

### API response example
#### Without specifying any response schema
> **GET** /v1/user/details
```json
{
    "message": "some message",
    "name": "abc def",
    "address": "xyz street, bombay, 123456",
    "phone": "123454321",
    "currentLocation": "here",
    "aadharNumber": "123456789012",
    "status": 230
}
```

 #### With `addressless-details` response schema
> **GET** /v1/user/details/*~responseSchema=addressless-details*
```json
{
    "status": 230,
    "message": "some message",
    "fullName": "abc def",
    "mobileNumber": "123454321",
    "id": "123456789012",
    "clientType": null
}
```
**Notice** that `status` is added to api response, even though it was not requested by `addressless-details`. This is a normal behaviour implemented to avoid `requiredKeys` validation failure. Hence all keys from `config.json['response']['requiredKeys']` are always added to new response.

**Notice** that `clientType` is received as `null`. This is because there was no key `clientType` in original api response. Passing nulls in such scenarios can be helpful, as it acknowledges that `someKey` was requested, but not found.


### Location
response-schema.json is version dependant. Hence it is place directly inside \<version> directory.
> /v1/response-schema.json