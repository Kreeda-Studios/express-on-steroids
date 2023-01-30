/* eslint-disable no-unused-vars*/
// only used for docstrings
const Request = require("./v1/Request");
const Response = require("./v1/Response");
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
      const { index } = require(`./${this.version}/index.js`);
      return index;
    } catch (error) {
      throw Error(
        `cannot find file ./${this.version}/index.js, importing version ${this.version} fails.`
      );
    }
  }

  /**
   * @function getRequestResponse
   * @namespace getRequestResponse
   * @param {express.Request} expressRequest
   * @param {express.Response} expressResponse
   * @property {Request} request
   * @property {Response} response
   * @throws Error for either factory not found OR request-response init
   * @returns {[Request, Response]}
   */
  getRequestResponse(expressRequest, expressResponse) {
    const { RequestResponseFactory } = require(`./${this.version}/index.js`);
    if (!RequestResponseFactory) {
      console.warn(
        `please define and export function RequestResponseFactory() in './${this.version}/index.js' @ version.getRequestResponse()`
      );
      throw new Error(
        "request response factory not found, creating version specific Request and Response fails."
      );
    }
    /** @type {Request} */
    let request;
    /** @type {Response} */
    let response;
    [request, response] = RequestResponseFactory(
      expressRequest,
      expressResponse
    );
    return [request, response];
  }
}

module.exports = VersionModule;
