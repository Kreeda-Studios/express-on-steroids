# Custom Middlewares
This document serves to discuss the common interaction with custom middlewares, how to change their execution flow, how to add middlewares that run during specific points in the request lifecycle etc.

## Adding a middleware for all and every request
1. Add a new javascript file, or use existing, to middlewares directory. say `auth.js`. 
2. Define a middleware function `login` in your newly created file `auth.js` and export it.
```js
/**
 * @param {Request} req
 * @param {Response} res
 */
exports.login = (req, res) => {
  if (req.getHttpHeaders().authorization) {
    console.log("authorization header found");
    req.setMiddlewareData("isLoggedIn", true);
    req.setMiddlewareData("login", "OK");
    req.setMiddlewareData("user", {id: "idkfa"})
  }
};
```
3. Specify the middleware as a requirement in an *array* at `config.js['middleware']['allRequests']`.
> config.js
```js
module.exports = config = {
  ...
  middlewares: {
    allRequests: [
      ...
      "./auth.js->login"
    ],
  },
  ...
};
```

4. Done.


## Adding a middleware for all and every request to a specific category of requests.
1. Add a new javascript file, or use existing, to middlewares directory. say `auth.js`. 
2. Define a middleware function `login` in your newly created file `auth.js` and export it.
```js
/**
 * @param {Request} req
 * @param {Response} res
 */
exports.login = (req, res) => {
  if (req.getHttpHeaders().authorization) {
    console.log("authorization header found");
    req.setMiddlewareData("isLoggedIn", true);
    req.setMiddlewareData("login", "OK");
    req.setMiddlewareData("user", {id: "idkfa"})
  }
};
```
3. Specify the middleware as a requirement in an *array* at `api/<versionName>/<categoryName>/paths.json[categorySpecificMiddlewares]`.
> api/\<versionName\>/\<categoryName\>/paths.json
```json
{
  "categorySpecificMiddlewares": [
    ...
    "./auth.js->login"
  ],
  ...
}
```
4. Done.


## Adding a middleware for a specific request
1. Add a new javascript file, or use existing, to middlewares directory. say `auth.js`. 
2. Define a middleware function `login` in your newly created file `auth.js` and export it.
```js
/**
 * @param {Request} req
 * @param {Response} res
 */
exports.login = (req, res) => {
  if (req.getHttpHeaders().authorization) {
    console.log("authorization header found");
    req.setMiddlewareData("isLoggedIn", true);
    req.setMiddlewareData("login", "OK");
    req.setMiddlewareData("user", {id: "idkfa"})
  }
};
```
3. Specify the middleware as a requirement in a *object* at `api/<versionName>/User/paths.json['profile']['GET']` , if this middleware should run only for `GET` request to `/<versionName>/user/profile`.
> api/\<versionName\>/\<categoryName\>/paths.json

```json
"profile": {
    "methods": ["GET", "POST"],
    "auth": {
        "type": "none",
        "userGroups": []
    },
    "description": "profile route",
    "parameters": {
        "support": [],
        "query": [],
        "headers": []
    },
    "handlers": {
        "GET": "./handlers.js->getProfile",
        "POST": "./handlers.js->createProfile"
    },
    "middlewares": {
        "GET": ["./auth.js->login"],
        "POST": []
    }
}
```
  * In the given example, `login` middleware would run for `GET` request to `/v1/User/profile`. And no middleware would run for `POST` request.

4. Done.

## Things to notice.

* The sequence of middleware function paths in array determines the sequence the middlewares will be executed in.
* middleware function path is specified in 2 segments separated with `->`. The first segment is location of middleware file. <!--This location is relative to `Middleware.js` file in your codebase-->. The second segment is the name of middleware function.  

* Your middleware function will have access to object of `Request` and `Response` class which bring along helpful methods such as `setMiddlewareData(key, value)`. With this method the middleware can put some data on the `Request` object which will be retained through out the api request lifecycle. This data will be accessible to next middlewares and also the request handler functions.



## configuring Middleware
```js
const Middleware = require("../middlewares/Middleware");
const middleware = new Middleware(request)
    .parseFromConfigJson()
    .parseFromRequestMetadata(categorySpecificFirst=true);
middleware.add((req, res) => {
  console.log(req.getAllMiddlewareData());
})
// sequentially execute all middlewares
middleware.executeAll(request, response);
```
from the above code, the following conclusions could be made:
  * middlewares from `config.json` will be parsed first by `parseFromConfigJson()`, and hence they will be executed first.
  * middlewares from paths.json will be parsed by `parseFromRequestMetadata()` , with `categorySpecificFirst=true`, meaning *category specific middlewares* will be executed before *path specific middlewares*.
  * The sequence of `parseFromConfigJson()` and `parseFromRequestMetadata()` can be interchanged.
  * To avoid executing `config.json` middlewares dont execute `parseFromConfigJson()`. Same is true for `parseFromRequestMetadata()`.
  * the last middleware that will be executed is 
  a function that prints all accumulated middleware data available to `req`.
  * `executeAll()` sequentially executes all middlewares after the parsing is finished.