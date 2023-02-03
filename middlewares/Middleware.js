const CustomError = require("../api/CustomError");
const path = require("path");
/**
 * @class Middleware
 * ### maintains a list of middlewares that should be executed before the request handling.
 * Depends on Request.getRouteMetadata() for: Category Specific and Path Specific Middleware function paths;
 * Depends on config.json for providing function paths of middlewares which are always run.
 *
 * Benefits:
 *  * Conditionally loads only required middlewares, hence providing performance benefits.
 *  * New middlewares can also be dynamically added in the chain of middlewares with `add()`.
 *
 * >#### Regarding function paths
 * >a middleware function path has following syntax ->  `./path/to/middlewaresFile->middlewareFunctionName`,
 * > where `->` is a separator which determines what middleware function to load from which file.
 * > The function path should be relative to Middleware.js
 */
class Middleware {
  /**
   * @type {Array<Function>}
   * chain of middleware functions
   */
  #middlewares; // will stay empty unless add() or parseAndImportAll() is called
  #requestPathVariables;
  #middlewareFunctionPaths; // functionPaths are kept here. this is utilised by parseAndImportAll().
  /** @type {{middlewares: Array<String>, categorySpecificMiddlewares: Array<String>}} */
  #requestMetadata;

  /**
   * @constructor
   * @param {import("../api/v1/Request.js")} request
   * @throws {CustomError}
   */
  constructor(request) {
    if (!request) {
      console.error(
        "missing parameter 'request', initializing class Middleware fails."
      );
      throw new CustomError();
    }
    this.#middlewares = [];
    this.#middlewareFunctionPaths = [];
    this.#requestPathVariables = request.getPathVariables();
    this.#requestMetadata = request.getRouteMetadata();
  }

  // ===========================
  // Exposed methods
  // ===========================

  // ===========================
  // Function path parsers.
  // ===========================

  /**
   * Finds middleware function paths in request metadata, and adds them to this.#middlewareFunctionPaths.
   * @param {Boolean} categorySpecificFirst if true category specific middlewares will be executed before path specific middlewares
   * @returns {this}
   */
  parseFromRequestMetadata(categorySpecificFirst) {
    if (
      this.#requestMetadata &&
      this.#requestMetadata["middlewares"] &&
      this.#requestMetadata["middlewares"][
        this.#requestPathVariables.httpMethod
      ]
    ) {
      let pathSpecificFuncPaths =
        this.#requestMetadata["middlewares"][
          this.#requestPathVariables.httpMethod
        ] || [];
      let categorySpecificFuncPaths =
        this.#requestMetadata["categorySpecificMiddlewares"] || [];

      // make middleware function paths relative to middleware.js
      pathSpecificFuncPaths = this.#normalisePaths(
        pathSpecificFuncPaths,
        this.#pathToPathsJson
      );
      // make middleware function paths relative to middleware.js
      categorySpecificFuncPaths = this.#normalisePaths(
        categorySpecificFuncPaths,
        this.#pathToPathsJson
      );

      if (categorySpecificFirst === true) {
        this.#middlewareFunctionPaths = this.#middlewareFunctionPaths.concat(
          categorySpecificFuncPaths,
          pathSpecificFuncPaths
        );
      } else {
        this.#middlewareFunctionPaths = this.#middlewareFunctionPaths.concat(
          pathSpecificFuncPaths,
          categorySpecificFuncPaths
        );
      }
    }
    return this;
  }

  /**
   * parse and store functionPaths for middlewares which should run for all requests.
   * depends on config.json['middlewares']['allRequests']
   * @returns {this}
   */
  parseFromConfigJson() {
    const ALWAYS_RUN_SECTION = "allRequests";
    let alwaysFuncPaths = [];
    try {
      alwaysFuncPaths =
        require("../config.js")["middlewares"][ALWAYS_RUN_SECTION] || [];
    } catch (error) {
      console.warn(error);
    }
    alwaysFuncPaths = this.#normalisePaths(
      alwaysFuncPaths,
      this.#pathToConfigFile
    );
    this.#middlewareFunctionPaths =
      this.#middlewareFunctionPaths.concat(alwaysFuncPaths);
    return this;
  }

  // ==========================
  // Misc Exposed methods.
  // ===========================

  /**
   * Executes ALL middlewares in a sequential manner.
   * @param {import("../api/v1/Request.js")} request will be provided to middleware
   * @param {import("../api/v1/Response.js")} response will be provided to middleware
   * @throws {CustomError} avoids catching middleware errors.
   * @todo avoid multiple calls to executeAll()
   */
  executeAll(request, response) {
    this.#finishParsingAndImport();
    if (!request || !response) {
      console.warn(
        "Middleware.executeAll() doesn't have access to request and response object, skipping middleware execution."
      );
      return this;
    }
    for (let middlewareFunction of this.#middlewares) {
      middlewareFunction(request, response);
    }
    return this;
  }

  /**
   * returns an array containing paths to all the middlewares.
   * @returns {Array<String>} List of paths of middleware functions, which will be imported.
   */
  getMiddlewareFunctionPaths() {
    return JSON.parse(JSON.stringify(this.#middlewareFunctionPaths));
  }

  /**
   * adds `function` at the end of chain of middlewares.
   * @param {function} f
   * @returns {this}
   */
  add(f) {
    if (typeof f === "function") {
      this.#middlewares.push(f);
      return this;
    }
    return this;
  }

  /**
   * adds `function` at the front of chain of middlewares.
   * @param {function} f
   * @returns {this}
   */
  addToFront(f) {
    if (typeof f === "function") {
      this.#middlewares.unshift(f);
      return this;
    }
    return this;
  }

  // =============================
  // Private helpers.
  // =============================

  /**
   * NECESSARY.
   * parses all the requested middleware function location strings and stores them sequentially.
   * @returns {this}
   * @sideeffect discards all duplicate entries from this.#middlewareFunctionPaths
   * @sideeffect discards all duplicate functions from this.#middlewares
   * @todo no check implemented for abusive importing (finishParsingAndImport() called multiple times)
   */
  #finishParsingAndImport() {
    this.#middlewareFunctionPaths = this.#removeDuplicates(
      this.#middlewareFunctionPaths
    );
    this.#importAndAddAll(this.#middlewareFunctionPaths);
    this.#middlewares = this.#removeDuplicates(this.#middlewares);
    return this;
  }

  /**
   * Discards duplicate middleware functions.
   * Sequence will be maintained. Duplicate middlewares will be removed from end.
   * ['a','b','c','a','a','c','f','g','a'] => ['a', 'b', 'c', 'f', 'g']
   */
  #removeDuplicates(someArray) {
    return [...new Set(someArray)];
  }

  /**
   * accepts array of functionPath strings (`some/File/Name.js->someFunctionName`), imports all functions from their functionPath, and calls `this.add()` with each function.
   * @param {Array<String>} functionPaths
   * @sideeffect discards non importable functionPath from functionPaths
   */
  #importAndAddAll(functionPaths) {
    if (!functionPaths || !functionPaths.length) return;
    let i = functionPaths.length - 1;
    while (i >= 0) {
      try {
        let funcPath = functionPaths[i];
        const [fileName, funcName] = funcPath
          .split("->")
          .filter((item) => item !== "");
        const f = this.#importMiddleware(fileName, funcName);
        this.addToFront(f);
        i--;
      } catch (error) {
        // remove non importable function paths from functionPaths
        functionPaths.splice(i, 1);
        i--;
        console.warn(error.message);
        // console.warn(
        //   `fail import middleware for string: ${funcPath}, skipping.`
        // );
      }
    }
  }

  /**
   * import middleware function and returns it
   * @param {String} fileName path to js file which exports middleware function
   * @param {String} functionName exported middleware function name
   * @returns {Function}
   * @throws {CustomError}
   */
  #importMiddleware = (fileName, functionName) => {
    let allFunctions;
    try {
      allFunctions = require(fileName);
    } catch (error) {
      console.log(`cannot import middleware in ${fileName}->${functionName}`);
      console.error(error);
      throw new CustomError();
    }
    if (!allFunctions) {
      console.error(
        `no middleware file with name "${fileName}" found, importing middleware fails.`,
        400
      );
      throw new CustomError();
    }
    if (!Object.keys(allFunctions).includes(functionName)) {
      console.error(
        `no middleware with name ${functionName} found, importing middleware fails.`
      );
      throw new CustomError();
    }
    if (!allFunctions[functionName]) {
      console.error(
        `function body not defined for function "${functionName}", importing middleware fails.`
      );
      throw new CustomError();
    }
    return allFunctions[functionName];
  };
  #resolvePath = function (pathToJSON, pathInJSON) {
    // const path = require("path");
    const importedFilePath =
      pathInJSON.split("->").filter((item) => item !== "")[0] || pathInJSON;
    return path.join(pathToJSON, importedFilePath);
  };

  /**
   * reconstructs the paths, and makes them relative to middleware.js
   * @param {Array<String>} functionPaths
   * @param {import("fs").PathLike} sourceFilePath
   * @sideeffect none
   */
  #normalisePaths(functionPaths, sourceFilePath) {
    let arr = [];
    for (let functionPath of functionPaths) {
      if (!functionPath) continue;
      let [file, func] = functionPath.split("->").filter((item) => item !== "");
      file = this.#resolvePath(sourceFilePath, file);
      arr.push(file + "->" + func);
    }
    return arr;
  }
  /**
   * this acts as a single point of modification in case paths.json's path relative to Middleware.js changes.
   * @returns {import("fs").PathLike} relative path to paths.json file
   */
  get #pathToPathsJson() {
    return path.join(
      __dirname,
      "..",
      "api",
      this.#requestPathVariables.version,
      this.#requestPathVariables.category
    );
  }
  /**
   * this acts as a single point of modification in case config.js's path relative to Middleware.js changes.
   * @returns {import("fs").PathLike} relative path to paths.json file
   */
  get #pathToConfigFile() {
    return path.join(__dirname, "..");
  }
}

module.exports = Middleware;
