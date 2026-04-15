const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const motor = require("./motor");
const camera = require("./camera");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on("connection", (socket) => {

  socket.on("command", (cmd) => {
    if (cmd === "forward") motor.forward();
    if (cmd === "backward") motor.backward();
    if (cmd === "left") motor.left();
    if (cmd === "right") motor.right();
    if (cmd === "stop") motor.stop();
  });

});

server.listen(5000, () => {
  console.log("Robot server running");
});