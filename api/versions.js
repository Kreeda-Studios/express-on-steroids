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
  }
  /**
   * call function returned by getIndex() function when request needs to be routed to its required version endpoint.
   * @returns {Function} version specific index function, this index function is similar to a controller but version bounded.
   */
  getIndex() {
    try {
      const { index } = require(path.join(
        this.#versionDirBasePath,
        "index.js"
      ));
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
    const { RequestResponseFactory } = require(path.join(
      this.#versionDirBasePath,
      "index.js"
    ));
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
    // version needs to be exact match with, `availableVersions`[] in versions.js
    // if (process.platform === "win32") {
    return path.join(__dirname, this.version);
    // }
    // return this.#findVersionDir(__dirname, this.version);
  }
  #findVersionDir(baseDir, versionName) {
    let version = versionName;
    try {
      if (require(path.join(baseDir, version, "index.js"))) {
        return path.join(baseDir, version);
      }
    } catch (error) {}
    version = versionName.toLowerCase();
    try {
      if (require(path.join(baseDir, version, "index.js"))) {
        return path.join(baseDir, version);
      }
    } catch (error) {}
    version = versionName.charAt(0).toUpperCase() + versionName.substring(1);
    try {
      if (require(path.join(baseDir, version, "index.js"))) {
        return path.join(baseDir, version);
      }
    } catch (error) {}
    version =
      versionName.charAt(0).toUpperCase() +
      versionName.substring(1).toLowerCase();
    try {
      if (require(path.join(baseDir, version, "index.js"))) {
        return path.join(baseDir, version);
      }
    } catch (error) {}
    throw new Error(
      `version '${versionName}' is invalid, its directory cannot be found.`
    );
  }
}

module.exports = VersionModule;
