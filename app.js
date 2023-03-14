const express = require("express");
const bodyParser = require("body-parser");

//Import API Controller
const handleRequest = require("./api/controller").handleRequest;

// declare a new express app
const app = express();

// ===============================
// Third Party Middlewares
// ===============================
app.use(bodyParser.json());
// Enable CORS for all methods
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});
// ===============================

//Handle all Http methods on any path
app.all("*", handleRequest);

// const PORT = 3000;
// app.listen(PORT, function () {
//   console.log(`your awesome api running at http://127.0.0.1:${PORT}`);
// });

// Expose inactive (non-listening) app
module.exports = app;
