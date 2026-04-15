// motor.js (SAFE FOR WINDOWS + RENDER TESTING)

function initMotor() {
  console.log("Motor module running (simulation mode)");
}

function move(action, speed) {
  console.log("Motor:", action, speed);
}

function stop() {
  console.log("Motor stopped");
}

module.exports = {
  initMotor,
  move,
  stop
};
