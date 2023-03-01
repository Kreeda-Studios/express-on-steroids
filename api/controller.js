/* eslint-disable no-unused-vars*/
const express = require("express");
const CustomError = require("./CustomError");
/* eslint-enable no-unused-vars*/

const VersionModule = require("./versions");
/**
 * @function handleRequest
 * @description This function is the entry point for all the requests.
 * @param {express.Request} expressRequest - The request object
 * @param {express.Response} expressResponse - The response object
 * @property {Request} request
 * @property {Response} response
 * @returns {null} - Returns null
 * @throws {CustomError} - Throws an error if the version is not found
 **/
exports.handleRequest = (expressRequest, expressResponse) => {
  try {
    const versionName = parseVersionName(expressRequest);
    const version = new VersionModule(versionName);
    const index = version.getIndex();
    const [request, response] = version.getRequestResponse(
      expressRequest,
      expressResponse
    );

    // ===============================
    // middleware related
    // ===============================
    {
      const Middleware = require("../middlewares/Middleware");
      const middleware = new Middleware(request)
        .parseFromConfigJson()
        .parseFromRequestMetadata(true);
      // sequentially execute all middlewares
      middleware.executeAll(request, response);
    }
    //================================

    // this is the last step, and will start executing version specific logic.
    return index(request, response);
  } catch (error) {
    if (error && !expressResponse.headersSent) {
      return expressResponse.status(error.statusCode || 500).json({
        message:
          error.message ||
          "something went wrong @ handleRequest() in controller.js",
        status: error.statusCode || 500,
      });
    }
  }
};

/**
 * parse version name from the request path based on version metadata defined in `path-schema.json`
 * @param {express.Request} expressRequest
 * @returns
 */
const parseVersionName = (expressRequest) => {
  let VERSION_METADATA;
  try {
    const PATH_SCHEMA = require("./path-schema.json");
    if (!PATH_SCHEMA || !PATH_SCHEMA.version) throw new CustomError();
    VERSION_METADATA = PATH_SCHEMA.version;
  } catch (error) {
    console.error(error);
    throw new CustomError();
  }
  const pathSplits =
    (expressRequest.path &&
      expressRequest.path
        .toLowerCase()
        .split("/")
        .filter((str) => str !== "")) ||
    [];
  const versionName =
    (pathSplits.length > VERSION_METADATA.sequence &&
      pathSplits[VERSION_METADATA.sequence]) ||
    VERSION_METADATA.default;
  return versionName.toLowerCase();
};
