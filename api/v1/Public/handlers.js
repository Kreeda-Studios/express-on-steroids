/* eslint-disable no-unused-vars */
const Request = require("../Request.js");
/* eslint-enable no-unused-vars */

// when adding functions here make sure to refer to them from paths.json file in same directory.
/**
 *
 * @param {Request} req
 * @returns
 */
exports.default = async (req) => {
  console.log(req.getSupportParams());
  return { message: "default", status: 200 };
};
