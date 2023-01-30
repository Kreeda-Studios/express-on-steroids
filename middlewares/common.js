/* eslint-disable no-unused-vars */
const Request = require("../api/v1/Request");
const Response = require("../api/v1/Response");
/* eslint-enable no-unused-vars */

// custom middleware should not send response
// custom middleware should throw CustomError whenever and wherever necessary
// if interacting with or modifying request, use req.setMiddlewareData(key, value).

/**
 * @param {Request} req
 * @param {Response} res
 */
exports.someMiddleware = (req, res) => {
  req.setMiddlewareData("someKey", "someValue");
  console.log(res.getStatus());
};
