require("dotenv").config();

const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

app.use(express.static("public"));

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
