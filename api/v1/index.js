/* eslint-disable no-unused-vars*/
const Request = require("./Request");
const Response = require("./Response");
const express = require("express");
/*eslint-enable no-unused-vars*/

/**
 * @function index
 * @description This function is the entry point for all v1 requests.
 * @param {Request} request - The request object
 * @param {Response} response - The response object
 * @returns {null} - Returns null
 * @throws {Error} - Throws an error if the version is not found
 **/
exports.index = async (request, response) => {
  try {
    const handlerFunction = request.getHandler();
    let responseData;
    if (handlerFunction) {
      responseData = await handlerFunction(request, response);
    }
    return response.handling(responseData).send();
  } catch (error) {
    console.trace(error);
    if (error && !response.isSent()) {
      return response
        .handling({
          message: error.message || "something went wrong at index.js",
          status: error.statusCode || 500,
        })
        .send();
    }
  }
};

/**
 * @function RequestResponseFactory
 *
 * Constructs `Request` and `Response` objects following the configuration that is neccessary, while hiding the initialisation flow from user. And return [RequestObject, ResponseObject]
 * @param {express.Request} expressRequest
 * @param {express.Response} expressResponse
 * @return {[Request, Response]}
 */
exports.RequestResponseFactory = (expressRequest, expressResponse) => {
  const Request = require("./Request");
  const Response = require("./Response");
  const request = new Request(expressRequest);
  const response = new Response(expressResponse, request.getSupportParams());
  return [request, response];
};
