const { spawn } = require("child_process");

let stream = null;

function startStream() {
  stream = spawn("libcamera-vid", [
    "-t", "0",
    "--width", "640",
    "--height", "480",
    "--codec", "mjpeg",
    "-o", "-"
  ]);

  return stream.stdout;
}

module.exports = { startStream };