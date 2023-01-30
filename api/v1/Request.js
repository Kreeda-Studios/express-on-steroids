/* eslint-disable no-unused-vars*/
// used in docstring, to provide helpful code suggestion.
const express = require("express");
/*eslint-enable no-unused-vars*/

const CustomError = require("./CustomError");

/**
 *  #### Acts as a wrapper for *expressRequest*, providing additional functionalities.
 * 1. Provides validation and handlerFunctions for request as per `paths.json`.
 * 2. Allows controlled access to common expressRequest properties via getters.
 * 3. parses request path and parameters as per `path-schema.json` and `params-schema.json`.
 * Version 1
 *
 * >#### Regarding function paths
 * >a handler function path has following syntax ->  `./path/to/handlersFile->handlerFunctionName`,
 * > where `->` is a separator which determines what handler function to load from which file.
 * > The function path should be relative to Request.js
 */
class Request {
  #request;
  #mwData;
  /**@type {{String: String}} */
  #pathVariables;
  /** @type {{String: Array<String>}} */
  #support;
  /**
   * @param {express.Request} expressRequest express request object received from client
   * **Constructor Sideeffects**: validates request and parses request path variables, which may throw Error.
   */
  constructor(expressRequest) {
    if (!expressRequest)
      throw new Error(
        "express request object not accessible, initializing Request fails."
      );
    this.#request = expressRequest;
    this.#mwData = expressRequest.mwData || {};
    this.#pathVariables = {};
    this.#support = null; // {<key> : [<value1>, <value2>, ...]}
    this.#parsePathVariables();
    this.#validateRequest();
  }

  /**
   * @private
   * 1. validates allowed http method
   * 2. validates handler presence in `paths.json`
   * 3. validates http headers as per requirement defined in `paths.json`
   */
  #validateRequest() {
    const metadata = this.getRouteMetadata(); // also validates category
    if (!metadata)
      throw new Error("no metadata found, request validation cannot start.");
    this.#validateAllowedMethods(metadata, this.getHttpMethod());
    this.#validateHandlerPresence(metadata, this.getHttpMethod());
    this.#validateRequestHeaders(metadata, this.getHttpHeaders());
    // this.#validateSupportParameters(metadata, this.getSupportParams());
    // this.#validateRequestQuery(metadata, this.getQuery());
  }

  /**
   * @private
   * iterates over `path-schema.json` and stores the parsed data internally in *this.#pathVariables*.
   * Stores *default* values if received string is **default**
   */
  #parsePathVariables() {
    const PATH_SCHEMA = require("../path-schema.json"); //{}
    const splitPath = this.getSplitPath(); // []
    Object.keys(PATH_SCHEMA).forEach((key) => {
      const keySchema = PATH_SCHEMA[key]; // {}
      if (keySchema.required) {
        if (splitPath.length <= keySchema.sequence) {
          throw new Error(
            `${key} is required in request path at sequence ${keySchema.sequence}, parsing path variables fails.`
          );
        }
        let value = splitPath[keySchema.sequence] || undefined;
        if (value === "default") value = keySchema.default;
        this.#pathVariables[key] = value;
      } else {
        let value =
          (splitPath.length > keySchema.sequence &&
            splitPath[keySchema.sequence]) ||
          undefined;
        if (value === "default") value = keySchema.default;
        this.#pathVariables[key] = value;
      }
    });
    if (!this.#pathVariables["httpMethod"]) {
      this.#pathVariables["httpMethod"] = this.getHttpMethod();
    }
  }

  /**
   * splits *request path* on `/` and returns the resulting array.
   * * the resulting array is already filtered for empty strings.
   * @returns {Array<String>} array containing strings from *req.path*
   */
  getSplitPath() {
    const pathSplits =
      this.#request.path.split("/").filter((item) => item !== "") || [];
    return pathSplits;
  }

  /**
   *
   * @returns {{}} Object containing all the metadata for current path, as per the definitions in `paths.json`
   */
  getRouteMetadata() {
    if (this.pathMetadata) return JSON.parse(JSON.stringify(this.pathMetadata));
    this.pathMetadata = this.#getPathMetadataByRequestName(
      this.getCategory(),
      this.getRequestName()
    );
    return JSON.parse(JSON.stringify(this.pathMetadata));
  }

  // ===================================
  // Getters for core request variables
  // **version, requestName, category and support
  // ===================================

  /**
   * Request class is version bound
   * @returns {String} 'v1'
   */
  getVersion() {
    return "v1";
  }
  /**
   * parses support params and constructs a Object.
   * @returns {{String: Array<String>}} Object containing all the parsed support params
   */
  getSupportParams() {
    if (this.#support) return JSON.parse(JSON.stringify(this.#support));
    const supportString = this.#pathVariables["support"];
    // if (!supportString) {
    //   console.warn(
    //     "no 'support' field in pathVariables. Warning at getSupportParams() in Request.js."
    //   );
    // }
    this.#support = this.#parseSupportParams(supportString);
    return JSON.parse(JSON.stringify(this.#support));
  }
  /**
   * parses the handler function location defined in `paths.json`, finds the function and returns it.
   * @returns {function} handler function to execute the actual business logic. `handlerFunction(req)`
   */
  getHandler() {
    const pathsData = this.getRouteMetadata();
    const handlers = pathsData.handlers;
    if (!handlers) return;
    const funcLocation = handlers[this.getHttpMethod()];
    const [file, func] = funcLocation.split("->").filter((item) => item !== "");
    if (!file || !func)
      throw new Error(
        `parsing handler string fails for handlerString: ${funcLocation}`
      );
    return this.#importHandler(file, func);
  }
  /**
   * category name can be used to determine the folder where the handlers and paths.json are present.
   * @returns {String} category name
   */
  getCategory() {
    if (!this.getPathVariables()["category"])
      throw new CustomError(
        "no 'request' field in pathVariables, make sure 'request' related metadata is defined in 'path-schema.json'. Error at getRequestName() in Request.js.",
        400
      );
    return this.getPathVariables()["category"];
  }

  /**
   * request name determines the actual business logic flow that will be executed on the given category.
   * * If category is *User*, requestName could be *login*
   * @returns {String} request name
   */
  getRequestName() {
    if (!this.getPathVariables()["request"]) {
      throw new CustomError(
        "no 'request' field in pathVariables, make sure 'request' related metadata is defined in 'path-schema.json'. Error at getRequestName() in Request.js.",
        400
      );
    }
    return this.getPathVariables()["request"];
  }

  /**
   * parses the components of *request path* based on the path schema definition from `path-schema.json`.
   * @returns {{String: String}}
   */
  getPathVariables() {
    return JSON.parse(JSON.stringify(this.#pathVariables));
  }

  // ====================================
  // Middleware Data getters and setters
  // ====================================
  /**
   * returns value for a specific key stored by middleware.
   * @param {String} key
   * @returns {any}
   */
  getMiddlewareData(key) {
    if (key && this.#mwData) return this.#mwData[key];
    return null;
  }
  /**
   * returns a `object` containing all the data added by middlewares.
   * @returns {{}}
   */
  getAllMiddlewareData() {
    if (!this.#mwData) {
      this.#mwData = {};
    }
    return JSON.parse(JSON.stringify(this.#mwData));
  }
  /**
   * allows middleware to store some data in request.
   * @param {String} key
   * @param {any} value
   * @returns {null}
   */
  setMiddlewareData(key, value) {
    if (typeof key === "string") {
      this.#mwData[key] = value;
      return true;
    }
    return;
  }

  // =======================================
  // getters for express request properties
  // =======================================
  /**
   * please use getSplitPath() if you want to split the path on '/'
   * @returns {String} unaltered request's path
   */
  getPath() {
    return this.#request.path;
  }
  /**
   *
   * @returns {{}} unaltered request body
   */
  getBody() {
    return this.#request.body;
  }
  /**
   *
   * @returns {{}} unaltered request query
   */
  getQuery() {
    return this.#request.query;
  }
  /**
   *
   * @returns {{}} unaltered request params
   */
  getParams() {
    return this.#request.params;
  }
  /**
   *
   * @returns {String} http method of request
   */
  getHttpMethod() {
    return this.#request.method;
  }
  /**
   * ** cookie parser not implemented yet**
   * @returns {{}} ~request cookies~
   */
  getCookie() {
    return this.#request.cookies;
  }

  /**
   *
   * @returns {{}} unaltered request http headers
   */
  getHttpHeaders() {
    return this.#request.headers;
  }

  // =============================
  // Utility functions
  // =============================

  /**
   * used by Request.getSupportParams()
   * parses support string and construct js Object. Also autofills REQUIRED support params from `params-schema.js`, if not already present, with default values
   * @param {String} supportString `\~firstKey=value1,value2\~secondKey=value89`
   * @returns `{
   *  firstKey: [value1, value2],
   *  secondKey=[value89]
   * }`
   */
  #parseSupportParams = (supportString) => {
    let SUPPORT_SCHEMA;
    try {
      const PARAMS_METADATA = require("./../params-schema.json");
      if (!PARAMS_METADATA.support) throw new Error();
      SUPPORT_SCHEMA = PARAMS_METADATA.support;
    } catch (error) {
      console.warn(
        `cannot find definition for 'support' schema in params-schema.json, continuing execution.`
      );
    }
    let support = {};
    if (supportString) {
      let supportParams =
        supportString.split("~").filter((item) => item !== "") || [];
      // map and store key-value pairs
      supportParams.forEach((supportParam) => {
        let [key, value] = supportParam.split("=");
        support[key] = (value && value.split(",")) || [];
      });
    }

    // add default values for keys that are required
    if (SUPPORT_SCHEMA)
      Object.keys(SUPPORT_SCHEMA).forEach((key) => {
        if (
          (!Object.keys(support).includes(key) &&
            SUPPORT_SCHEMA[key].required) ||
          support[key] === "default"
        ) {
          support[key] = [SUPPORT_SCHEMA[key].default];
        }
      });
    return support;
  };

  /**
   * return JSON object relating to request name from paths.json file
   * @param {String} category category name
   * @param {String} requestName request name
   * @returns {{}} JSON object from /`category`/paths.json for given requestName
   */
  #getPathMetadataByRequestName = (category, requestName) => {
    const pathsJson = require(`./${category}/paths.json`);
    if (!pathsJson)
      throw new Error(
        "category mismatch, cannot find paths.json for " + category
      );
    if (typeof pathsJson[requestName] !== "object") {
      throw new Error(
        `'/${requestName}' is not a valid requestName for given category ${category}`
      );
    }
    if (pathsJson[requestName] && !Array.isArray(pathsJson[requestName])) {
      const data = pathsJson[requestName];
      let requiredProperties = ["methods", "description", "handlers"];
      for (let requiredProperty of requiredProperties) {
        if (!data[requiredProperty]) {
          throw new Error(
            `request schema for request '${requestName}' does not have required property '${requiredProperty}', parsing path metadata fails.`
          );
        }
      }
      data["categorySpecificMiddlewares"] =
        pathsJson["categorySpecificMiddlewares"] || [];
      return data;
    }
    throw new Error(
      `'/${requestName}' is not a valid requestName for given category ${category}`
    );
  };

  /**
   * used by Request.validateRequest()
   * verifies whether the route allows the requested http method.
   *
   * @param {{}} metadata route specific metadata JSON from `paths.json`.
   * @param {String} reqMethod request http method. like "GET"
   * @returns
   */
  #validateAllowedMethods = (metadata, reqMethod) => {
    if (!metadata)
      throw new Error(
        "no metadata provided for validating allowed methods, request validation fails."
      );
    if (!metadata.methods)
      throw new Error(
        "no methods field in metadata, request validation fails."
      );
    if (!metadata.methods.includes(reqMethod))
      throw new Error(
        `${reqMethod} is not allowed for current endpoint, request validation fails.`
      );
    return true; // validation succeeds
  };

  /**
   * used by Request.validateRequest()
   * validates whether a handler function location is present in `paths.json` for requested http method.
   * @param {{}} metadata route specific metadata JSON from `paths.json`.
   * @param {String} reqMethod request http method.
   * @returns
   */
  #validateHandlerPresence = (metadata, reqMethod) => {
    if (!metadata)
      throw new Error(
        "no metadata provided for validating allowed methods, request validation fails."
      );
    if (!metadata.handlers)
      throw new Error(
        "no handlers for given endpoint, request validation fails."
      );
    if (!Object.keys(metadata.handlers).includes(reqMethod))
      throw new Error(
        `no handler defined for ${reqMethod} for current endpoint, request validation fails.`
      );
    return true; // validation succeeds
  };

  /**
   * NOT IN USE
   * ~used by Request.validateRequest()~
   * checks if any support parameters are required for current route. If any, then validates for their presence in support object.
   * @param {{}} metadata route specific metadata JSON from `paths.json`.
   * @param {{}} support parsed support object
   */
  #validateSupportParameters = (metadata, support) => {
    const requiredKeys =
      metadata && metadata.parameters && metadata.parameters.support;
    if (!requiredKeys || requiredKeys.length === 0) return true;
    // if required support parameters are defined proceed with validation
    if (requiredKeys && !support)
      throw new Error("support is required, validation fails");
    requiredKeys.forEach((key) => {
      if (!Object.keys(support).includes(key))
        throw new Error(
          `required keys for support are [${requiredKeys}]. cannot find ${key} in provided support. request validation fails.`
        );
    });

    return true;
  };
  /**
   * NOT IN USE
   * ~used by Request.validateRequest()~
   * checks if any query parameters are required for current route. If any, then validates for their presence in req.query object.
   *
   * @param {{}} metadata route specific metadata JSON from `paths.json`.
   * @param {{}} query request query
   * @returns
   */
  #validateRequestQuery = (metadata, query) => {
    const requiredKeys =
      metadata && metadata.parameters && metadata.parameters.query;
    if (!requiredKeys || requiredKeys.length === 0) return true;
    if (requiredKeys && !query)
      throw new Error("query is required, request validation fails.");
    requiredKeys.forEach((key) => {
      if (!Object.keys(query).includes(key))
        throw new Error(
          `required keys for query are [${requiredKeys}]. cannot find ${key} in provided query, request validation fails.`
        );
    });
    return true;
  };
  /**
   * used by Request.validateRequest()
   * checks if any headers are required for current route. If any, then validates for their presence in req.headers object.
   *
   * @param {{}} metadata route specific metadata JSON from `paths.json`.
   * @param {{}} headers request headers
   * @returns
   */
  #validateRequestHeaders = (metadata, headers) => {
    const requiredKeys =
      metadata && metadata.parameters && metadata.parameters.headers;
    if (!requiredKeys || requiredKeys.length === 0) return true;
    if (requiredKeys && !headers)
      throw new Error("headers is required, validation fails");
    requiredKeys.forEach((key) => {
      if (!Object.keys(headers).includes(key.toLowerCase()))
        throw new Error(
          `required keys for headers are [${requiredKeys}]. cannot find ${key} in provided headers. request validation fails.`
        );
    });
    return true;
  };

  /**
   * imports and returns handlerFunction `functionName` from file `fileName`. If either is not found errors are thrown.
   * @param {String} fileName
   * @param {String} functionName
   * @returns function (req, res)
   * @throws CustomError
   */
  #importHandler = (fileName, functionName) => {
    let allHandlers;
    try {
      allHandlers = require(fileName);
    } catch (error) {
      throw new CustomError(error.message + ", importing handler fails", 400);
    }
    if (!allHandlers)
      throw new CustomError(
        `no handler file with name "${fileName}" found, importing handlers fails`,
        400
      );
    if (!Object.keys(allHandlers).includes(functionName)) {
      throw new CustomError(
        `no handler with name ${functionName} found, importing handler fails.`,
        400
      );
    }
    if (!allHandlers[functionName]) {
      throw new CustomError(
        `function body not defined for function "${functionName}", importing handler fails.`
      );
    }
    return allHandlers[functionName];
  };
}
module.exports = Request;
