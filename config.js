// production environment configuration
const config = {
  response: {
    requiredKeys: [], // add keys here, which should always be present in response
  },
  middlewares: {
    allRequests: [
      // "./path/to->middlewareFunctionOne",
      // "./path/to->middlewareFunctionTwo",
      // "./path/to->middlewareFunctionThree",
    ],
  },
};
module.exports = config;
