const Gpio = require("pigpio").Gpio;

const IN1 = new Gpio(17, { mode: Gpio.OUTPUT });
const IN2 = new Gpio(18, { mode: Gpio.OUTPUT });
const IN3 = new Gpio(22, { mode: Gpio.OUTPUT });
const IN4 = new Gpio(23, { mode: Gpio.OUTPUT });

function forward() {
  IN1.digitalWrite(1); IN2.digitalWrite(0);
  IN3.digitalWrite(1); IN4.digitalWrite(0);
}

function backward() {
  IN1.digitalWrite(0); IN2.digitalWrite(1);
  IN3.digitalWrite(0); IN4.digitalWrite(1);
}

function left() {
  IN1.digitalWrite(0); IN2.digitalWrite(1);
  IN3.digitalWrite(1); IN4.digitalWrite(0);
}

function right() {
  IN1.digitalWrite(1); IN2.digitalWrite(0);
  IN3.digitalWrite(0); IN4.digitalWrite(1);
}

function stop() {
  IN1.digitalWrite(0); IN2.digitalWrite(0);
  IN3.digitalWrite(0); IN4.digitalWrite(0);
}

module.exports = { forward, backward, left, right, stop };