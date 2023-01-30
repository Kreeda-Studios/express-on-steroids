## Adding new middleware
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
3. Specify the middleware as a requirement at one of the following place:
  * in `config.json['middleware']['allRequests']` , if this middleware should run for any and all requests.
  * in `./User/paths.json[categorySpecificMiddlewares]` , if this middleware should run for any and all request to category `User`.
  * in `./User/paths.json['profile']['GET']` , if this middleware should run only for `GET` request to `/<versionIdentifier>/user/profile`.

Example:
>v1/User/paths.json
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
        "GET": "./User/handlers.js->getProfile",
        "POST": "./User/handlers.js->createProfile"
    },
    "middlewares": {
        "GET": ["./auth.js->login"],
        "POST": []
    }
}
```
* In the given example, `login` middleware would run for `GET` request to `/v1/User/profile`. And no middleware would run for `POST` request.

4. Finished adding middleware. If Middleware class is configured correctly, the login middleware should execute.

## Things to notice.

* The sequence of middleware function paths in array determines the sequence the middlewares will be executed in.
* middleware function path is specified in 2 segments separated with `->`. The first segment is location of middleware file. This location is relative to `Middleware.js` file in your codebase. The second segment is the name of middleware function.  

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