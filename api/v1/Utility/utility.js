const path = require("path");
exports.resolvePath = function (pathToJSON, relativePathFromJSON) {
  const importedFilePath = relativePathFromJSON
    .split("->")
    .filter((item) => item !== "")[0];
  return path.join(pathToJSON, importedFilePath);
};
