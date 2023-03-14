const app = require("./app");

const PORT = 3000;

// Use express for creating listening server
app.listen(PORT, function () {
  console.log(`your awesome api running at http://127.0.0.1:${PORT}`);
});
