(function() {
  'use strict';

  /* ── State ── */
  let socket = null;
  let currentSpeed = 80;
  let autoMode = false;
  let isRecording = false;
  let sequenceRunning = false;
  let sequence = [];
  let joystickActive = false;
  let currentServoAngle = 90;
  let targetServoAngle = 90;
  let servoMoving = false;

  /* ── DOM refs ── */
  const $ = id => document.getElementById(id);
  const overlay = $('connectOverlay');
  const inputIp = $('inputIp');
  const inputPort = $('inputPort');
  const btnConnect = $('btnConnect');
  const connectError = $('connectError');
  const statusDot = $('statusDot');
  const statusText = $('statusText');
  const voltageBadge = $('voltageBadge');
  const videoFeed = $('videoFeed');
  const videoPlaceholder = $('videoPlaceholder');
  const badgeLive = $('badgeLive');
  const badgeRec = $('badgeRec');
  const speedSlider = $('speedSlider');
  const speedValue = $('speedValue');
  const distNum = $('distNum');
  const distBar = $('distBar');
  const motorDir = $('motorDir');
  const motorLeft = $('motorLeft');
  const motorRight = $('motorRight');
  const motorLeftBar = $('motorLeftBar');
  const motorRightBar = $('motorRightBar');
  const statusLog = $('statusLog');
  const seqList = $('seqList');
  const servoAngleNum = $('servoAngleNum');
  const servoStatusAngle = $('servoStatusAngle');
  const servoAngleBar = $('servoAngleBar');
  const servoAngleMarker = $('servoAngleMarker');
  const servoStateEl = $('servoState');
  

  /* ── Connection ── */
  function connect() {
    const ip = inputIp.value.trim();
    const port = inputPort.value.trim() || '5000';
    if (!ip) { connectError.textContent = 'Please enter an IP address'; return; }
    connectError.textContent = '';
    btnConnect.textContent = 'Connecting...';
    btnConnect.disabled = true;

    

  function connectToRobot() {
    socket = io("https://render-lboq.onrender.com", {
      transports: ["websocket", "polling"],
      timeout: 8000
  });

  socket.on("connect", () => {
    console.log("Connected to Render server");
    handleConnectionSuccess();
  });

  socket.on("connect_error", (err) => {
    console.log("Connection error:", err);
    connectError.textContent = "Cannot connect to server";
    resetConnectBtn();
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
    setConnected(false);
    addLog("Disconnected", "error");
  });

  socket.on("command", (data) => {
    console.log("Command received:", data);
  });

  socket.on("distance_update", (data) => updateDistance(data.value));
  socket.on("motor_update", (data) => updateMotors(data));
  socket.on("voltage_update", (data) => updateVoltage(data.value));
  socket.on("status_update", (data) => addLog(data.message, data.type));

  socket.on("camera_response", (data) => {
    addLog(
      data.message,
      data.type === "ok" ? "success" : "error"
    );
  });

  socket.on("auto_mode_update", (data) => {
    autoMode = data.enabled;
    document.getElementById("toggleAuto").classList.toggle("active", autoMode);
  });

  socket.on("servo_update", (data) => {
    const angle = parseInt(data.angle);
    if (!isNaN(angle)) {
      currentServoAngle = angle;
      servoMoving = false;
      updateServoUI(angle, false);
      addLog(`Servo positioned at ${angle}°`, "info");
    }
  });

  socket.on("servo_moving", () => {
    servoMoving = true;
    updateServoState("Moving", true);
  });
}

    
  }

  function handleConnectionSuccess(ip, port) {
      overlay.classList.add('hidden');
      setConnected(true);
      videoFeed.src = `http://10.127.21.206:5000/video_feed`;
      videoFeed.style.display = 'block';
      videoPlaceholder.style.display = 'none';
      badgeLive.classList.add('live');
      addLog('Connected to robot', 'success');
  }

  function resetConnectBtn() {
    btnConnect.innerHTML = '<i class="fas fa-plug"></i>&nbsp; CONNECT';
    btnConnect.disabled = false;
  }

  function disconnect() {
    if (socket) socket.disconnect();
    socket = null;
    overlay.classList.remove('hidden');
    setConnected(false);
    videoFeed.style.display = 'none';
    videoPlaceholder.style.display = 'flex';
    badgeLive.classList.remove('live');
    badgeRec.classList.remove('rec');
    resetConnectBtn();
  }

  function setConnected(c) {
    statusDot.classList.toggle('connected', c);
    statusText.textContent = c ? 'Connected' : 'Disconnected';
  }

  btnConnect.addEventListener('click', connect);
  $('btnDisconnect').addEventListener('click', disconnect);
  inputIp.addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });

  /* ── Joystick ── */
  const jCanvas = $('joystickCanvas');
  const jCtx = jCanvas.getContext('2d');
  const jCx = 110, jCy = 110, jMaxR = 70, jKnobR = 24;
  let jKnobX = jCx, jKnobY = jCy;
  let jDragging = false;

  function drawJoystick() {
    jCtx.clearRect(0, 0, 220, 220);
    jCtx.beginPath();
    jCtx.arc(jCx, jCy, jMaxR + 8, 0, Math.PI * 2);
    jCtx.strokeStyle = 'rgba(0,229,160,0.12)';
    jCtx.lineWidth = 2;
    jCtx.stroke();

    jCtx.save();
    jCtx.translate(jCx, jCy);
    const arrows = [
      [0, -1, '\u2191'], [0, 1, '\u2193'], [-1, 0, '\u2190'], [1, 0, '\u2192']
    ];
    arrows.forEach(([dx, dy, sym]) => {
      jCtx.fillStyle = 'rgba(106,123,150,0.3)';
      jCtx.font = '16px sans-serif';
      jCtx.textAlign = 'center';
      jCtx.textBaseline = 'middle';
      jCtx.fillText(sym, dx * (jMaxR + 2), dy * (jMaxR + 2));
    });
    jCtx.restore();

    jCtx.strokeStyle = 'rgba(0,229,160,0.06)';
    jCtx.lineWidth = 1;
    jCtx.beginPath(); jCtx.moveTo(jCx, jCy - jMaxR); jCtx.lineTo(jCx, jCy + jMaxR); jCtx.stroke();
    jCtx.beginPath(); jCtx.moveTo(jCx - jMaxR, jCy); jCtx.lineTo(jCx + jMaxR, jCy); jCtx.stroke();

    jCtx.beginPath();
    jCtx.arc(jCx, jCy, jMaxR, 0, Math.PI * 2);
    jCtx.strokeStyle = 'rgba(0,229,160,0.15)';
    jCtx.lineWidth = 1.5;
    jCtx.stroke();

    jCtx.beginPath();
    jCtx.moveTo(jCx, jCy);
    jCtx.lineTo(jKnobX, jKnobY);
    jCtx.strokeStyle = 'rgba(0,229,160,0.2)';
    jCtx.lineWidth = 2;
    jCtx.stroke();

    const grad = jCtx.createRadialGradient(jKnobX, jKnobY, 0, jKnobX, jKnobY, jKnobR + 10);
    grad.addColorStop(0, 'rgba(0,229,160,0.25)');
    grad.addColorStop(1, 'rgba(0,229,160,0)');
    jCtx.fillStyle = grad;
    jCtx.beginPath();
    jCtx.arc(jKnobX, jKnobY, jKnobR + 10, 0, Math.PI * 2);
    jCtx.fill();

    jCtx.beginPath();
    jCtx.arc(jKnobX, jKnobY, jKnobR, 0, Math.PI * 2);
    const kGrad = jCtx.createRadialGradient(jKnobX - 4, jKnobY - 4, 0, jKnobX, jKnobY, jKnobR);
    kGrad.addColorStop(0, '#1a3a40');
    kGrad.addColorStop(1, '#0d1f25');
    jCtx.fillStyle = kGrad;
    jCtx.fill();
    jCtx.strokeStyle = jDragging ? 'rgba(0,229,160,0.8)' : 'rgba(0,229,160,0.3)';
    jCtx.lineWidth = 2;
    jCtx.stroke();

    jCtx.beginPath();
    jCtx.arc(jKnobX, jKnobY, 4, 0, Math.PI * 2);
    jCtx.fillStyle = jDragging ? '#00e5a0' : 'rgba(0,229,160,0.4)';
    jCtx.fill();
  }

  function getJoystickPos(e) {
    const rect = jCanvas.getBoundingClientRect();
    const scaleX = 220 / rect.width;
    const scaleY = 220 / rect.height;
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function clampKnob(x, y) {
    const dx = x - jCx, dy = y - jCy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > jMaxR) {
      const scale = jMaxR / dist;
      return { x: jCx + dx * scale, y: jCy + dy * scale };
    }
    return { x, y };
  }

  function sendJoystick() {
    if (!socket || !socket.connected) return;
    const nx = (jKnobX - jCx) / jMaxR;
    const ny = (jKnobY - jCy) / jMaxR;
    if (Math.abs(nx) < 0.08 && Math.abs(ny) < 0.08) {
      socket.emit('stop_motors');
      return;
    }
    socket.emit('joystick_control', { x: Math.round(nx * 100) / 100, y: Math.round(ny * 100) / 100 });
  }

  function springBack() {
    const animate = () => {
      const dx = jCx - jKnobX, dy = jCy - jKnobY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) {
        jKnobX = jCx; jKnobY = jCy;
        drawJoystick();
        if (socket && socket.connected) socket.emit('stop_motors');
        joystickActive = false;
        return;
      }
      jKnobX += dx * 0.25;
      jKnobY += dy * 0.25;
      drawJoystick();
      requestAnimationFrame(animate);
    };
    animate();
  }

  jCanvas.addEventListener('mousedown', e => {
    jDragging = true; joystickActive = true;
    const p = clampKnob(...Object.values(getJoystickPos(e)));
    jKnobX = p.x; jKnobY = p.y;
    drawJoystick(); sendJoystick();
  });
  document.addEventListener('mousemove', e => {
    if (!jDragging) return;
    const p = clampKnob(...Object.values(getJoystickPos(e)));
    jKnobX = p.x; jKnobY = p.y;
    drawJoystick(); sendJoystick();
  });
  document.addEventListener('mouseup', () => {
    if (jDragging) { jDragging = false; springBack(); }
  });
  jCanvas.addEventListener('touchstart', e => {
    e.preventDefault(); jDragging = true; joystickActive = true;
    const p = clampKnob(...Object.values(getJoystickPos(e)));
    jKnobX = p.x; jKnobY = p.y;
    drawJoystick(); sendJoystick();
  }, { passive: false });
  document.addEventListener('touchmove', e => {
    if (!jDragging) return;
    e.preventDefault();
    const p = clampKnob(...Object.values(getJoystickPos(e)));
    jKnobX = p.x; jKnobY = p.y;
    drawJoystick(); sendJoystick();
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (jDragging) { jDragging = false; springBack(); }
  });

  drawJoystick();

  /* ── D-Pad ── */
  document.querySelectorAll('.btn-dpad').forEach(btn => {
    const dir = btn.dataset.dir;

    function startDir() {
      if (!socket || !socket.connected) return;
      btn.classList.add('pressed');
      socket.emit('motor_control', { action: dir, speed: currentSpeed });
    }
    function stopDir() {
      btn.classList.remove('pressed');
      if (!joystickActive && socket && socket.connected) {
        socket.emit('stop_motors');
      }
    }

    btn.addEventListener('mousedown', e => { e.preventDefault(); startDir(); });
    btn.addEventListener('mouseup', stopDir);
    btn.addEventListener('mouseleave', stopDir);
    btn.addEventListener('touchstart', e => { e.preventDefault(); startDir(); }, { passive: false });
    btn.addEventListener('touchend', e => { e.preventDefault(); stopDir(); }, { passive: false });
    btn.addEventListener('touchcancel', stopDir);
  });

  /* ── Speed Slider ── */
  speedSlider.addEventListener('input', () => {
    currentSpeed = parseInt(speedSlider.value);
    speedValue.innerHTML = `${currentSpeed}<span>%</span>`;
  });

  /* ── Auto Mode ── */
  $('toggleAuto').addEventListener('click', function() {
    if (!socket || !socket.connected) return;
    autoMode = !autoMode;
    this.classList.toggle('active', autoMode);
    socket.emit('auto_mode', { enabled: autoMode });
  });

  /* ── Camera Buttons ── */
  $('btnPhoto').addEventListener('click', () => {
    if (socket && socket.connected) socket.emit('camera_action', { action: 'photo' });
  });
  $('btnRecord').addEventListener('click', function() {
    if (!socket || !socket.connected) return;
    isRecording = !isRecording;
    this.classList.toggle('active', isRecording);
    this.innerHTML = isRecording
      ? '<i class="fas fa-square"></i> Stop Recording'
      : '<i class="fas fa-circle"></i> Record';
    badgeRec.classList.toggle('rec', isRecording);
    socket.emit('camera_action', { action: isRecording ? 'record_start' : 'record_stop' });
  });

  /* ── Servo Control ── */
  const servoBtns = document.querySelectorAll('.btn-servo');

  servoBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      if (!socket || !socket.connected) return;
      const angle = parseInt(this.dataset.angle);

      if (angle === currentServoAngle && !servoMoving) return;

      targetServoAngle = angle;
      servoMoving = true;

      servoBtns.forEach(b => {
        b.classList.remove('active', 'moving');
      });
      this.classList.add('moving');

      servoAngleNum.textContent = angle;
      updateServoState('Moving', true);
      updateServoBars(angle);

      socket.emit('servo_control', { angle: angle });

      addLog(`Servo moving to ${angle}\u00B0`, 'info');
    });
  });

  function updateServoUI(angle, moving) {
    servoAngleNum.textContent = angle;
    servoStatusAngle.textContent = angle + '\u00B0';
    updateServoBars(angle);

    servoBtns.forEach(b => {
      b.classList.remove('active', 'moving');
      if (parseInt(b.dataset.angle) === angle) {
        b.classList.add(moving ? 'moving' : 'active');
      }
    });

    if (!moving) {
      updateServoState('Idle', false);
    }
  }

  function updateServoBars(angle) {
    const pct = (angle / 180) * 100;
    servoAngleBar.style.width = pct + '%';
    servoAngleMarker.style.left = pct + '%';
  }

  function updateServoState(text, moving) {
    servoStateEl.textContent = text;
    servoStateEl.classList.toggle('moving', moving);
    servoStateEl.classList.toggle('idle', !moving);
  }

  /* ── Servo Visual Canvas ── */
  const sCanvas = $('servoCanvas');
  const sCtx = sCanvas.getContext('2d');
  let displayServoAngle = 90;

  function drawServoVisual() {
    const w = 260, h = 100;
    const cx = 130, cy = 85;

    sCtx.clearRect(0, 0, w, h);

    const diff = targetServoAngle - displayServoAngle;
    if (Math.abs(diff) > 0.5) {
      displayServoAngle += diff * 0.12;
    } else {
      displayServoAngle = targetServoAngle;
    }

    const arcR = 65;
    const startA = Math.PI;
    const endA = 0;

    sCtx.beginPath();
    sCtx.arc(cx, cy, arcR, startA, endA);
    sCtx.strokeStyle = 'rgba(28,42,69,0.6)';
    sCtx.lineWidth = 6;
    sCtx.lineCap = 'round';
    sCtx.stroke();

    const currentRad = Math.PI - (displayServoAngle / 180) * Math.PI;
    sCtx.beginPath();
    sCtx.arc(cx, cy, arcR, startA, currentRad);
    const arcGrad = sCtx.createLinearGradient(cx - arcR, cy, cx + arcR, cy);
    arcGrad.addColorStop(0, '#00b4d8');
    arcGrad.addColorStop(0.5, '#00e5a0');
    arcGrad.addColorStop(1, '#e07cff');
    sCtx.strokeStyle = arcGrad;
    sCtx.lineWidth = 6;
    sCtx.lineCap = 'round';
    sCtx.stroke();

    [0, 90, 180].forEach(deg => {
      const rad = Math.PI - (deg / 180) * Math.PI;
      const inner = arcR - 10;
      const outer = arcR + 10;
      sCtx.beginPath();
      sCtx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
      sCtx.lineTo(cx + Math.cos(rad) * outer, cy + Math.sin(rad) * outer);
      sCtx.strokeStyle = 'rgba(106,123,150,0.4)';
      sCtx.lineWidth = 1.5;
      sCtx.stroke();

      const labelR = arcR + 20;
      sCtx.fillStyle = 'rgba(106,123,150,0.5)';
      sCtx.font = '9px JetBrains Mono';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(deg + '\u00B0', cx + Math.cos(rad) * labelR, cy + Math.sin(rad) * labelR);
    });

    const needleLen = arcR - 4;
    const needleRad = Math.PI - (displayServoAngle / 180) * Math.PI;
    const nx = cx + Math.cos(needleRad) * needleLen;
    const ny = cy + Math.sin(needleRad) * needleLen;

    sCtx.shadowColor = servoMoving ? '#ff8c42' : '#00e5a0';
    sCtx.shadowBlur = 12;
    sCtx.beginPath();
    sCtx.moveTo(cx, cy);
    sCtx.lineTo(nx, ny);
    sCtx.strokeStyle = servoMoving ? '#ff8c42' : '#00e5a0';
    sCtx.lineWidth = 2.5;
    sCtx.lineCap = 'round';
    sCtx.stroke();
    sCtx.shadowBlur = 0;

    sCtx.beginPath();
    sCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    const pivGrad = sCtx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, 6);
    pivGrad.addColorStop(0, '#1e3040');
    pivGrad.addColorStop(1, '#0d1a25');
    sCtx.fillStyle = pivGrad;
    sCtx.fill();
    sCtx.strokeStyle = servoMoving ? 'rgba(255,140,66,0.6)' : 'rgba(0,229,160,0.5)';
    sCtx.lineWidth = 1.5;
    sCtx.stroke();

    sCtx.beginPath();
    sCtx.arc(nx, ny, 4, 0, Math.PI * 2);
    sCtx.fillStyle = servoMoving ? '#ff8c42' : '#00e5a0';
    sCtx.fill();

    requestAnimationFrame(drawServoVisual);
  }
  drawServoVisual();

  /* ── Sequence Builder ── */
  $('seqAddBtn').addEventListener('click', () => {
    const action = $('seqAction').value;
    const dur = parseFloat($('seqDuration').value) || 1;
    sequence.push({ action, duration: dur, speed: currentSpeed });
    renderSequence();
  });

  function renderSequence() {
    seqList.innerHTML = sequence.map((s, i) => `
      <div class="seq-item">
        <span>${i + 1}. ${s.action} \u2014 ${s.duration}s @ ${s.speed}%</span>
        <button class="seq-remove" data-idx="${i}"><i class="fas fa-times"></i></button>
      </div>
    `).join('');
    seqList.querySelectorAll('.seq-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        sequence.splice(parseInt(btn.dataset.idx), 1);
        renderSequence();
      });
    });
  }

  $('seqRunBtn').addEventListener('click', () => {
    if (!socket || !socket.connected || sequence.length === 0) return;
    socket.emit('run_sequence', { steps: sequence });
    sequenceRunning = true;
    $('seqRunBtn').style.display = 'none';
    $('seqStopBtn').style.display = 'inline-flex';
  });
  $('seqStopBtn').addEventListener('click', () => {
    if (socket && socket.connected) socket.emit('stop_sequence');
    sequenceRunning = false;
    $('seqRunBtn').style.display = 'inline-flex';
    $('seqStopBtn').style.display = 'none';
  });
  $('seqClearBtn').addEventListener('click', () => {
    sequence = [];
    renderSequence();
  });

  /* ── UI Update Functions ── */
  function updateDistance(val) {
    const v = typeof val === 'number' ? val : parseFloat(val);
    distNum.textContent = isNaN(v) ? '--' : v.toFixed(1);
    const pct = Math.min(100, Math.max(0, (v / 200) * 100));
    distBar.style.width = pct + '%';
    if (v < 15) {
      distBar.style.background = '#ff3355';
      distNum.style.color = '#ff3355';
    } else if (v < 30) {
      distBar.style.background = '#ff8c42';
      distNum.style.color = '#ff8c42';
    } else {
      distBar.style.background = '#00e5a0';
      distNum.style.color = '#00e5a0';
    }
    drawGauge(v);
  }

  function updateMotors(data) {
    const labels = { forward: 'Forward', backward: 'Backward', left: 'Left', right: 'Right', stop: 'Stopped' };
    motorDir.textContent = labels[data.action] || data.action;
    const l = Math.abs(data.left || 0);
    const r = Math.abs(data.right || 0);
    motorLeft.textContent = l + '%';
    motorRight.textContent = r + '%';
    motorLeftBar.style.width = l + '%';
    motorRightBar.style.width = r + '%';
  }

  function updateVoltage(val) {
    voltageBadge.innerHTML = `<i class="fas fa-bolt"></i> ${val}V`;
  }

  function addLog(msg, type) {
    const now = new Date();
    const ts = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const el = document.createElement('div');
    el.className = `log-entry ${type || 'info'}`;
    el.innerHTML = `<span class="log-time">${ts}</span><span class="log-msg">${msg}</span>`;
    statusLog.prepend(el);
    while (statusLog.children.length > 50) statusLog.lastChild.remove();
  }

  /* ── Distance Gauge Canvas ── */
  const gCanvas = $('gaugeCanvas');
  const gCtx = gCanvas.getContext('2d');

  function drawGauge(dist) {
    const w = 320, h = 320, cx = 160, cy = 160, r = 130;
    gCtx.clearRect(0, 0, w, h);

    gCtx.beginPath();
    gCtx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
    gCtx.strokeStyle = 'rgba(28,42,69,0.6)';
    gCtx.lineWidth = 10;
    gCtx.lineCap = 'round';
    gCtx.stroke();

    const pct = Math.min(1, Math.max(0, dist / 200));
    const endAngle = 0.75 * Math.PI + pct * 1.5 * Math.PI;
    let color = '#00e5a0';
    if (dist < 15) color = '#ff3355';
    else if (dist < 30) color = '#ff8c42';

    gCtx.beginPath();
    gCtx.arc(cx, cy, r, 0.75 * Math.PI, endAngle);
    gCtx.strokeStyle = color;
    gCtx.lineWidth = 10;
    gCtx.lineCap = 'round';
    gCtx.stroke();

    gCtx.shadowColor = color;
    gCtx.shadowBlur = 15;
    gCtx.beginPath();
    gCtx.arc(cx, cy, r, endAngle - 0.1, endAngle);
    gCtx.strokeStyle = color;
    gCtx.lineWidth = 10;
    gCtx.lineCap = 'round';
    gCtx.stroke();
    gCtx.shadowBlur = 0;

    for (let i = 0; i <= 10; i++) {
      const angle = 0.75 * Math.PI + (i / 10) * 1.5 * Math.PI;
      const innerR = r - 18;
      const outerR = r - 12;
      gCtx.beginPath();
      gCtx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      gCtx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      gCtx.strokeStyle = 'rgba(106,123,150,0.3)';
      gCtx.lineWidth = i % 5 === 0 ? 2 : 1;
      gCtx.stroke();
    }

    gCtx.fillStyle = 'rgba(106,123,150,0.5)';
    gCtx.font = '10px JetBrains Mono';
    gCtx.textAlign = 'center';
    const labelAngles = [0.75, 1.5, 2.25];
    const labelVals = ['0', '100', '200'];
    labelAngles.forEach((a, i) => {
      const lr = r - 28;
      gCtx.fillText(labelVals[i], cx + Math.cos(a * Math.PI) * lr, cy + Math.sin(a * Math.PI) * lr + 3);
    });
  }
  drawGauge(0);

  /* ── Keyboard Control ── */
  const keyMap = { ArrowUp: 'forward', ArrowDown: 'backward', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'stop' };
  const pressedKeys = new Set();

  document.addEventListener('keydown', e => {
    if (e.repeat || !socket || !socket.connected) return;
    const dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      pressedKeys.add(e.key);
      socket.emit('motor_control', { action: dir, speed: currentSpeed });
      const btn = document.querySelector(`.btn-dpad[data-dir="${dir}"]`);
      if (btn) btn.classList.add('pressed');
    }
  });

  document.addEventListener('keyup', e => {
    const dir = keyMap[e.key];
    if (dir) {
      pressedKeys.delete(e.key);
      const btn = document.querySelector(`.btn-dpad[data-dir="${dir}"]`);
      if (btn) btn.classList.remove('pressed');
      if (pressedKeys.size === 0 && !joystickActive && socket && socket.connected) {
        socket.emit('stop_motors');
      }
    }
  });

})();
