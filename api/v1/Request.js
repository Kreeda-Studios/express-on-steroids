/* eslint-disable no-unused-vars*/
// used in docstring, to provide helpful code suggestion.
const express = require("express");
/*eslint-enable no-unused-vars*/

const CustomError = require("../CustomError");
const UTILITY = require("./Utility/utility.js");
const path = require("path");

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
  /** @type {{String: Array<String>}} */
  /**
   * @param {express.Request} expressRequest express request object received from client
   * **Constructor Sideeffects**: validates request and parses request path variables, which may throw Error.
   */
  constructor(expressRequest) {
    if (!expressRequest) {
      console.error(
        "express request object not accessible, initializing Request fails."
      );
      throw new CustomError();
    }
    this.#request = expressRequest;
    this.#mwData = expressRequest.mwData || {};

    this.getPathVariables = this.#pathVariablesClosure(
      this.getPath(),
      this.getHttpMethod()
    );
    this.getSupportParams = this.#supportParamsClosure(
      this.getPathVariables().support
    );

    this.#validateRequest();
  }

  /**
   * A facade that takes care of everything request validation.
   * @private
   * 1. validates allowed http method
   * 2. validates handler presence in `paths.json`
   * 3. validates http headers as per requirement defined in `paths.json`
   */
  #validateRequest() {
    const metadata = this.getRouteMetadata(); // also validates category
    if (!metadata) {
      console.error("no metadata found, request validation cannot start.");
      throw new CustomError();
    }
    this.#validateAllowedMethods(metadata, this.getHttpMethod());
    this.#validateHandlerPresence(metadata, this.getHttpMethod());
    this.#validateRequestHeaders(metadata, this.getHttpHeaders());
    // this.#validateSupportParameters(metadata, this.getSupportParams());
    // this.#validateRequestQuery(metadata, this.getQuery());
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
   * parses the handler function location defined in `paths.json`, finds the function and returns it.
   * @returns {function} handler function to execute the actual business logic. `handlerFunction(req)`
   */
  getHandler() {
    const pathsData = this.getRouteMetadata();
    const handlers = pathsData.handlers;
    if (!handlers) return;
    const funcLocation = handlers[this.getHttpMethod()];
    let [file, func] = funcLocation.split("->").filter((item) => item !== "");
    if (!file || !func) {
      console.error(
        `parsing handler string fails for handlerString: ${funcLocation}`
      );
      throw new CustomError();
    }
    // make file path relative to Request.js
    file = UTILITY.resolvePath(this.#pathToPathsJson, file);
    return this.#importHandler(file, func);
  }
  /**
   * category name can be used to determine the folder where the handlers and paths.json are present.
   * @returns {String} category name
   */
  getCategory() {
    if (!this.getPathVariables()["category"]) {
      console.error(
        "no 'request' field in pathVariables, make sure 'request' related metadata is defined in 'path-schema.json'. Error at getRequestName() in Request.js."
      );
      throw new CustomError();
    }
    return this.getPathVariables()["category"];
  }

  /**
   * request name determines the actual business logic flow that will be executed on the given category.
   * * If category is *User*, requestName could be *login*
   * @returns {String} request name
   */
  getRequestName() {
    if (!this.getPathVariables()["request"]) {
      console.error(
        "no 'request' field in pathVariables, make sure 'request' related metadata is defined in 'path-schema.json'. Error at getRequestName() in Request.js."
      );
      throw new CustomError();
    }
    return this.getPathVariables()["request"];
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
   * return JSON object relating to request name from paths.json file
   * @param {String} category category name
   * @param {String} requestName request name
   * @returns {{}} JSON object from /`category`/paths.json for given requestName
   */
  #getPathMetadataByRequestName = (category, requestName) => {
    let pathsJson;
    try {
      pathsJson = require(this.#pathToPathsJson + "/paths.json");
    } catch (error) {
      // `cannot find category '${category}, importing path metdata fails.`
      console.error(error);
      throw new CustomError();
    }
    if (!pathsJson) {
      console.error(
        "category mismatch, cannot find paths.json for " + category
      );
    }
    if (
      pathsJson[requestName] &&
      typeof pathsJson[requestName] === "object" &&
      !Array.isArray(pathsJson[requestName])
    ) {
      // array.isarray check ensures that "categorySpecificMiddleware" is not used as source of request metadata
      const data = pathsJson[requestName];
      let requiredProperties = ["methods", "description", "handlers"];
      for (let requiredProperty of requiredProperties) {
        if (!data[requiredProperty]) {
          console.error(
            `request schema for request '${requestName}' does not have required property '${requiredProperty}', parsing path metadata fails.`
          );
          throw new CustomError();
        }
      }
      data["categorySpecificMiddlewares"] =
        pathsJson["categorySpecificMiddlewares"] || [];
      return data;
    }
    throw new CustomError(
      `'/${requestName}' is not a valid requestName for given category ${category}`,
      400
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
    if (!metadata) {
      console.error(
        "no metadata provided for validating allowed methods, request validation fails."
      );
      throw new CustomError();
    }
    if (!metadata.methods) {
      console.error("no methods field in metadata, request validation fails.");
      throw new CustomError();
    }
    if (!metadata.methods.includes(reqMethod)) {
      console.error(
        `${reqMethod} is not allowed for current endpoint, request validation fails.`
      );
      throw new CustomError(
        `${reqMethod} is not allowed for current endpoint.`
      );
    }
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
    if (!metadata) {
      console.error(
        "no metadata provided for validating allowed methods, request validation fails."
      );
      throw new CustomError();
    }
    if (!metadata.handlers) {
      console.error(
        "no handlers for given endpoint, request validation fails."
      );
      throw new CustomError();
    }
    if (!Object.keys(metadata.handlers).includes(reqMethod)) {
      console.error(
        `no handler defined for ${reqMethod} for current endpoint, request validation fails.`
      );
      throw new CustomError();
    }
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
    if (requiredKeys && !headers) {
      console.error(
        "validateRequestHeaders didn't receive required parameter 'headers'."
      );
      throw new CustomError();
    }
    requiredKeys.forEach((key) => {
      if (!Object.keys(headers).includes(key.toLowerCase()))
        throw new CustomError(
          `required keys for headers are [${requiredKeys}]. cannot find ${key} in provided headers. request validation fails.`,
          400
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
      console.error(error);
      throw new CustomError();
    }
    if (!allHandlers) {
      console.error(
        `no handler file with name "${fileName}" found, importing handlers fails`
      );
      throw new CustomError();
    }
    if (!Object.keys(allHandlers).includes(functionName)) {
      console.error(
        `no handler with name ${functionName} found, importing handler fails.`
      );
      throw new CustomError();
    }
    if (!allHandlers[functionName]) {
      console.error(
        `function body not defined for function "${functionName}", importing handler fails.`
      );
      throw new CustomError();
    }
    return allHandlers[functionName];
  };
  /** returns relative path to paths.json file */
  get #pathToPathsJson() {
    return path.join(__dirname, this.getCategory());
  }

  // =========================================
  // Closures for Core Components of Request
  // =========================================

  // ============ support closure ============
  /**
   * parses support params, stores it as an object and returns a getter function for accessing it.
   * @returns {Function}
   */
  #supportParamsClosure(supportString) {
    /**
     * @type {{String: Array<String>}}
     */
    const support = {};
    parseSupportParams(supportString);
    addDefaultSupport();
    /**
     * used by Request.getSupportParams()
     * parses support string and construct js Object. Also autofills REQUIRED support params from `params-schema.js`, if not already present, with default values
     * @param {String} supportString `\~firstKey=value1,value2\~secondKey=value89`
     * @throws {CustomError}
     * @returns `{
     *  firstKey: [value1, value2],
     *  secondKey=[value89]
     * }`
     */
    function parseSupportParams(supportString) {
      // let support = {};
      if (supportString) {
        let supportSplit =
          supportString.split("~").filter((item) => item !== "") || [];
        // map and store key-value pairs
        supportSplit.forEach((supportParam) => {
          let [key, value] = supportParam.split("=");
          support[key] = (value && value.split(",")) || [];
        });
      }
    }
    /**
     * adds absent required support keys from params-schema.json
     */
    function addDefaultSupport() {
      // add default values for keys that are required
      const SUPPORT_SCHEMA = getSupportSchema();
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
    }

    function getSupportSchema() {
      let SUPPORT_SCHEMA;
      try {
        const PARAMS_METADATA = require("./../params-schema.json");
        if (!PARAMS_METADATA.support) throw new CustomError();
        SUPPORT_SCHEMA = PARAMS_METADATA.support;
      } catch (error) {
        // `cannot find definition for 'support' schema in params-schema.json, continuing execution.`
        console.error(error);
      }
      return SUPPORT_SCHEMA || {};
    }
    function getter() {
      return support;
    }
    return getter;
  }

  // ============= Path Variables Closure ==================
  /**
   * parses path variables, stores it as an object and returns a getter function for accessing it.
   * @param {String} requestPath
   * @param {String} httpMethod
   * @returns {Function}
   */
  #pathVariablesClosure(requestPath, httpMethod) {
    /**
     * @type {{String: String}}
     */
    let pathVariables = {};
    parsePathVariables();

    function parsePathVariables() {
      const PATH_SCHEMA = getPathSchema();
      const splitPath =
        requestPath.split("/").filter((item) => item !== "") || [];

      Object.keys(PATH_SCHEMA).forEach((key) => {
        const keySchema = PATH_SCHEMA[key]; // {}
        let value;
        if (keySchema.required) {
          if (splitPath.length <= keySchema.sequence) {
            throw new CustomError(
              `${key} is required in request path at sequence ${keySchema.sequence}, parsing path variables fails.`,
              400
            );
          }
          value = splitPath[keySchema.sequence] || undefined;
        } else {
          value =
            (splitPath.length > keySchema.sequence &&
              splitPath[keySchema.sequence]) ||
            undefined;
        }
        if (value === "default") value = keySchema.default;
        pathVariables[key] = value;
      });
      if (!pathVariables["httpMethod"]) {
        pathVariables["httpMethod"] = httpMethod;
      }
    }
    function getPathSchema() {
      let PATH_SCHEMA = {};
      try {
        PATH_SCHEMA = require("../path-schema.json"); //{}
      } catch (error) {
        // "cannot find path-schema.json, parsing path variables fails."
        console.error(error);
        throw new CustomError();
      }
      return PATH_SCHEMA;
    }
    /**
     * @returns {{String: String}} object containing parsed path variables
     */
    function getter() {
      // if dont want to allow modifications to pathVariables use `return JSON.parse(JSON.stringify(pathVariables))`
      // modifications to pathVariables can be made by using getter().someKey = someValue
      return pathVariables;
    }
    return getter;
  }
}
module.exports = Request;
