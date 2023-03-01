/* eslint-disable no-unused-vars*/
// only used for docstrings
const CustomError = require("./CustomError");
const Request = require("./v1/Request");
const Response = require("./v1/Response");
const { readdirSync } = require("fs");
const path = require("path");
const e = require("express");
/* eslint-enable no-unused-vars*/

class VersionModule {
  defaultVersion = "v1";
  availableVersions = ["v1"]; // add or deprecate versions here
  /**
   * @param {String} requestVersion
   */
  constructor(requestVersion) {
    this.version = requestVersion;
    if (
      !requestVersion ||
      !this.availableVersions.includes(requestVersion) ||
      requestVersion.toLowerCase() === "default"
    ) {
      console.warn(
        `API Version '${requestVersion}' is unsupported, using default version: '${this.defaultVersion}'`
      );
      this.version = this.defaultVersion;
    }
    if (process.platform !== "win32")
      this.getAllVersionDirs = this.#getAllVersionDirsClosure();
  }
  /**
   * call function returned by getIndex() function when request needs to be routed to its required version endpoint.
   * @returns {Function} version specific index function, this index function is similar to a controller but version bounded.
   */
  getIndex() {
    try {
      const { index } = require(`./${this.#versionDirBasePath}/index.js`);
      return index;
    } catch (error) {
      console.error(error);
      throw new CustomError("something went wrong", 404);
    }
  }

  /**
   * @function getRequestResponse
   * @namespace getRequestResponse
   * @param {import("express").Request} expressRequest
   * @param {import("express").Response} expressResponse
   * @throws Error for either factory not found OR request-response init
   * @returns {[Request, Response]}
   */
  getRequestResponse(expressRequest, expressResponse) {
    const { RequestResponseFactory } = require(`./${
      this.#versionDirBasePath
    }/index.js`);
    if (!RequestResponseFactory) {
      console.error(
        `please define and export function RequestResponseFactory() in './${this.version}/index.js' @ version.getRequestResponse()`
      );
      throw new CustomError();
    }
    /** @type {import("./v1/Request")} */
    let request;
    /** @type {import("./v1/Response")} */
    let response;
    [request, response] = RequestResponseFactory(
      expressRequest,
      expressResponse
    );
    return [request, response];
  }

  get #versionDirBasePath() {
    if (process.platform === "win32") {
      return `./${this.version}`;
    } else {
      return `./${this.getAllVersionDirs()[this.version]}`;
    }
  }

  // ============= closure for getting version directories =============

  #getAllVersionDirsClosure() {
    // filter and keep only those directories which have "paths.json" file.
    const dirs = readdirSync(__dirname, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())
      .filter((dir) => {
        return (
          readdirSync(path.join(__dirname, dir.name)).find(
            (item) => item === "index.js"
          ) !== undefined
        );
      })
      .map((dir) => dir.name);
    const dirLCMap = {};

    dirs.forEach((dir) => {
      if (dirLCMap[dir.toLowerCase()]) {
        console.warn(
          `duplicate directory names found for ${dir}. Only ${
            dirLCMap[dir.toLowerCase()]
          } will be considered.`
        );
        return;
      }
      dirLCMap[dir.toLowerCase()] = dir;
    });
    /**
     * @returns {{}}
     */
    return function getDirMap() {
      return dirLCMap;
    };
  }
}

module.exports = VersionModule;
