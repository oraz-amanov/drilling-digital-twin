// Test Mode system for the drill operations module

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let dataLoaded = false;
let dataLoadPromise = null;
let activeTimerInterval = null;
let activeTimeout = null;

function initTestMode() {
  questions = [];
  currentQuestionIndex = 0;
  score = 0;
}

function getSegmentAverages(segment) {
  if (!window.dataset) return { wob: 0, rpm: 0, spp: 0 };

  let wob = 0;
  let rpm = 0;
  let spp = 0;
  let count = 0;

  for (let i = segment.startIndex; i <= segment.endIndex; i++) {
    const row = window.dataset[i];
    if (!row) continue;

    wob += row.WOBA || 0;
    rpm += row.RPMA || 0;
    spp += row.SPPA || 0;
    count++;
  }

  if (count === 0) return { wob: 0, rpm: 0, spp: 0 };

  return {
    wob: wob / count,
    rpm: rpm / count,
    spp: spp / count
  };
}

function ensureDataLoaded() {
  if (dataLoadPromise) {
    return dataLoadPromise;
  }
  // Always load fresh data for test mode
  if (dataLoaded) {
    return Promise.resolve();
  }
  if (typeof Papa === 'undefined') {
    console.error("PapaParse not available");
    return Promise.reject(new Error("PapaParse not available"));
  }
  console.log("Loading drilling data CSV...");
  dataLoadPromise = new Promise((resolve, reject) => {
    Papa.parse("./src/data/final_drilling_data.csv", {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function(results) {
        const dataset = results.data;
        const segments = createSegments(dataset);
        window.segmentsData = segments;
        window.dataset = dataset;
        questions = [];
        window.getSegmentAverages = getSegmentAverages;
        dataLoaded = true;
        console.log("Data loaded:", dataset.length, "rows,", segments.length, "segments");
        resolve();
      },
      error: function(error) {
        console.error("Failed to load CSV:", error);
        reject(error);
      }
    });
  });
  return dataLoadPromise;
}

function createSegments(data) {
  const segs = [];
  if (!data || data.length === 0) return segs;
  let currentOp = data[0]["Rig Status Unified"];
  let startIndex = 0;
  for (let i = 1; i < data.length; i++) {
    const op = data[i]["Rig Status Unified"];
    if (op !== currentOp) {
      segs.push({ operation: currentOp, startIndex, endIndex: i - 1 });
      currentOp = op;
      startIndex = i;
    }
  }
  segs.push({ operation: currentOp, startIndex, endIndex: data.length - 1 });
  return segs;
}

function startTestMode() {
  console.log("? startTestMode triggered");
  window.isTestMode = true;
  console.log("Test Mode Started");
  currentTarget = 150;

  ensureDataLoaded().then(() => {
    if (!window.segmentsData || !window.segmentsData.length) {
      alert("Failed to load drilling data");
      return;
    }
    const glassyPanel = document.getElementById("glassyPanelFrame");
    if (glassyPanel) glassyPanel.style.display = "none";
    const backBtn = document.getElementById("backBtn");
    if (backBtn) backBtn.style.display = "none";
    groupSegmentsByOperation();
    generateQuestions();
    currentQuestionIndex = 0;
    const chartsPanel = document.getElementById("chartsPanel");
    if (chartsPanel) chartsPanel.style.display = "none";
    const controlPanel = document.getElementById("controlPanel");
    if (!controlPanel) {
      const mainPanel = document.getElementById("mainPanel") || document.getElementById("drillControlPanel") || document.getElementById("drillingPanel");
      if (mainPanel) mainPanel.style.display = "none";
    } else {
      controlPanel.style.display = "none";
    }
    const testModePanel = document.getElementById("testModePanel");
    if (testModePanel) {
      testModePanel.style.display = "block";
    } else {
      createTestModePanel().style.display = "block";
    }
    try {
      loadQuestion(0);
    } catch (e) {
      console.error("loadQuestion crashed:", e);
    }
  }).catch(err => {
    alert("Could not load drilling data");
  });
}

function exitTestMode() {
  // 🔥 stop timers
  if (activeTimerInterval) {
    clearInterval(activeTimerInterval);
    activeTimerInterval = null;
  }

  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }
  
  window.isTestMode = false;
  const testModePanel = document.getElementById("testModePanel");
  if (testModePanel) testModePanel.style.display = "none";
  score = 0;
  questions = [];
  currentQuestionIndex = 0;
  const glassyPanel = document.getElementById("glassyPanelFrame");
  if (glassyPanel) glassyPanel.style.display = "block";
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.style.display = "block";
  const chartsPanel = document.getElementById("chartsPanel");
  if (chartsPanel && window.chartsVisible) chartsPanel.style.display = "block";
  console.log("Exited Test Mode");
  if (window.parent && window !== window.parent) {
    window.parent.postMessage("testModeExited", "*");
  }

  window.parent.postMessage({
    type: "STOP_TEST_MODE"
  }, "*");
  window.parent.postMessage({
    type: "updateRigState",
    targetState: {
      rotationSpeed: 0,
      drillPosition: 150,   // neutral position
      pumpPressure: 0,
      pumpActive: false,
      operation: "static"
    }
  }, "*");
}

function groupSegmentsByOperation() {
  const data = window.segmentsData;
  if (!data || !Array.isArray(data)) return {};
  const grouped = { "rotary drilling": [], "circulating": [], "tripping in": [], "tripping out": [], "connection": [], "static": [] };
  for (let i = 0; i < data.length; i++) {
    const segment = data[i];
    const op = String(segment.operation || "").toLowerCase().trim();
    if (grouped.hasOwnProperty(op)) grouped[op].push(segment);
  }
  return grouped;
}

function generateQuestions() {
  const grouped = groupSegmentsByOperation();
  const operationKeys = Object.keys(grouped);
  const questionsPerOp = {};
  operationKeys.forEach(op => { questionsPerOp[op] = 0; });
  for (let i = 0; i < operationKeys.length; i++) {
    const op = operationKeys[i];
    const segments = grouped[op];
    if (segments && segments.length > 0) {
      const randomSegment = segments[Math.floor(Math.random() * segments.length)];
      questions.push(randomSegment);
      questionsPerOp[op]++;
    }
  }
  const remainingSlots = 12 - questions.length;
  if (remainingSlots > 0) {
    const availableOps = operationKeys.filter(op => {
      const segs = grouped[op];
      return segs && segs.length > 0 && questionsPerOp[op] < 2;
    });
    for (let i = 0; i < remainingSlots; i++) {
      if (availableOps.length === 0) break;
      const op = availableOps[Math.floor(Math.random() * availableOps.length)];
      const segs = grouped[op];
      const randomSegment = segs[Math.floor(Math.random() * segs.length)];
      questions.push(randomSegment);
      questionsPerOp[op]++;
      if (questionsPerOp[op] >= 2) {
        const idx = availableOps.indexOf(op);
        if (idx > -1) availableOps.splice(idx, 1);
      }
    }
  }
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = questions[i];
    questions[i] = questions[j];
    questions[j] = temp;
  }
  console.log("Generated questions:", questions);
  const distribution = {};
  for (let i = 0; i < questions.length; i++) {
    const op = String(questions[i].operation || "").toLowerCase().trim();
    distribution[op] = (distribution[op] || 0) + 1;
  }
  console.log("operations distribution:", distribution);
}

let currentTarget = 150; // starting depth (safe middle)

function getTargetPosition(operation) {
  const op = String(operation).toLowerCase();

  const BASE = 150;

  if (op.includes("tripping in")) return BASE - 100;   // down
  if (op.includes("tripping out")) return BASE + 100;  // up
  if (op.includes("rotary drilling")) return BASE - 40;
  if (op.includes("connection")) return BASE + 20;
  if (op.includes("static")) return BASE;

  return BASE;
}

function loadQuestion(index) {
  if (!window.isTestMode) return;
  const segment = questions[index];
  if (!segment) return;
  const avg = window.getSegmentAverages(segment);
  console.log("operation:", segment.operation, "avg wob:", avg.wob, "avg rpm:", avg.rpm, "avg spp:", avg.spp);

  
  const wobEl = document.getElementById("testModeWob");
  const rpmEl = document.getElementById("testModeRpm");
  const sppEl = document.getElementById("testModeSpp");
  const questionTextEl = document.getElementById("testModeQuestionText");
  if (wobEl) wobEl.textContent = avg.wob.toFixed(2);
  if (rpmEl) rpmEl.textContent = avg.rpm.toFixed(0);
  if (sppEl) sppEl.textContent = avg.spp.toFixed(2);
  if (questionTextEl) questionTextEl.textContent = "Question " + (index + 1) + ": " + segment.operation;
  const correctOp = String(segment.operation || "").toLowerCase().trim();
  let timerEl = document.getElementById("testModeTimerText");
  if (!timerEl) {
    const panel = document.getElementById("testModePanel");
    if (panel) {
      timerEl = document.createElement("div");
      timerEl.id = "testModeTimerText";
      timerEl.style.marginBottom = "4px";
      const resultEl = document.getElementById("testModeResultText");
      if (resultEl) panel.insertBefore(timerEl, resultEl);
      else panel.appendChild(timerEl);
    }
  }
  let scoreEl = document.getElementById("testModeScoreText");
  if (!scoreEl) {
    const panel = document.getElementById("testModePanel");
    if (panel && timerEl) {
      scoreEl = document.createElement("div");
      scoreEl.id = "testModeScoreText";
      scoreEl.style.marginBottom = "4px";
      panel.insertBefore(scoreEl, timerEl);
    }
  }
  if (scoreEl) scoreEl.textContent = "Score: " + score;
  let exitBtn = document.getElementById("testModeExitBtn");
  if (!exitBtn) {
    const panel = document.getElementById("testModePanel");
    if (panel) {
      exitBtn = document.createElement("button");
      exitBtn.id = "testModeExitBtn";
      exitBtn.textContent = "Exit Test Mode";
      exitBtn.style.cssText = "position: absolute; top: 10px; right: 10px; padding: 6px 14px; background: rgba(200,50,50,0.8); color: #fff; border: 1px solid rgba(255,100,100,0.5); border-radius: 6px; cursor: pointer; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;";
      exitBtn.onclick = exitTestMode;
      panel.appendChild(exitBtn);
    }
  }
  const TIME_LIMIT = 10;
  let timeLeft = TIME_LIMIT;
  const handleAnswer = (selected, auto) => {
    if (activeTimerInterval) {
      clearInterval(activeTimerInterval);
      activeTimerInterval = null;
    }
    const panel = document.getElementById("testModePanel");
    const buttons = panel ? panel.querySelectorAll("#testModeOpsWrap button") : [];
    buttons.forEach(b => b.disabled = true);
    const resultEl = document.getElementById("testModeResultText");
    const isCorrect = selected === correctOp;
    if (isCorrect) {
      score++;
      if (resultEl) resultEl.textContent = "Correct";
      console.log("Correct");
    } else {
      if (resultEl) resultEl.textContent = "Wrong (correct: " + correctOp + ")";
      if (auto) console.log("Time up � correct: " + correctOp);
      else console.log("Wrong (correct: " + correctOp + ")");
    }
    if (scoreEl) scoreEl.textContent = "Score: " + score;
    if (timerEl) timerEl.textContent = "Timer: --";
    const isLast = currentQuestionIndex === questions.length - 1;
    activeTimeout = setTimeout(() => {
      if (isLast) {
        if (resultEl) resultEl.textContent = "Final Score: " + score + " / 12";
        const allBtns = panel ? panel.querySelectorAll("#testModeOpsWrap button") : [];
        allBtns.forEach(b => b.disabled = true);
        return;
      }
      currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
      loadQuestion(currentQuestionIndex);
    }, 2000);
  };
  const attachHandlers = () => {
    const panel = document.getElementById("testModePanel");
    if (!panel) return;

    const buttons = panel.querySelectorAll("#testModeOpsWrap button");

    buttons.forEach(btn => {
      const opValue = String(btn.getAttribute("data-op") || "").toLowerCase().trim();

      btn.onclick = null; // 🔥 reset old handler

      btn.onclick = () => {
        handleAnswer(opValue, false);
      };

      btn.disabled = false;
    });
  };
  const startTimer = () => {
    // kill old timer (important)
    if (activeTimerInterval) {
      clearInterval(activeTimerInterval);
      activeTimerInterval = null;
    }

    timeLeft = TIME_LIMIT;

    if (timerEl) timerEl.textContent = "Timer: " + timeLeft + "s";

    activeTimerInterval = setInterval(() => {
      timeLeft--;
      if (timerEl) timerEl.textContent = "Timer: " + timeLeft + "s";

      if (timeLeft <= 0) handleAnswer("", true);
    }, 1000);
  };
  const opsWrap = document.getElementById("testModeOpsWrap");
  if (!opsWrap) {
    createTestModePanel();
    setTimeout(() => { attachHandlers(); startTimer(); }, 0);
  } else {
    attachHandlers();
    startTimer();
  }
  const op = String(segment.operation).toLowerCase();

  let rotationSpeed = avg.rpm / 200;
  let pumpActive = avg.spp > 1;

  // 👇 overrides
  if (op.includes("connection") || op.includes("static")) {
    rotationSpeed = 0;
    pumpActive = false;
  }

  window.parent.postMessage({
    type: "updateRigState",
    targetState: {
      rotationSpeed,
      drillPosition: getTargetPosition(segment.operation),
      pumpPressure: avg.spp,
      pumpActive,
      operation: segment.operation
    }
  }, "*");
}


function createTestModePanel() {
  const existing = document.getElementById("testModePanel");
  if (existing) return existing;
  const panel = document.createElement("div");
  panel.id = "testModePanel";
  panel.style.display = "none";
  panel.style.position = "absolute";
  panel.style.top = "10px";
  panel.style.right = "10px";
  panel.style.width = "360px";
  panel.style.backgroundColor = "#f5f5f5";
  panel.style.border = "1px solid #ccc";
  panel.style.padding = "10px";
  panel.style.fontFamily = "sans-serif";
  panel.style.zIndex = "10000";
  const questionText = document.createElement("div");
  questionText.id = "testModeQuestionText";
  questionText.textContent = "Question will appear here";
  questionText.style.fontWeight = "bold";
  questionText.style.marginBottom = "8px";
  panel.appendChild(questionText);
  const params = document.createElement("div");
  params.id = "testModeParams";
  params.style.marginBottom = "8px";
  params.innerHTML = '<div>WOB: <span id="testModeWob">-</span></div><div>RPM: <span id="testModeRpm">-</span></div><div>SPP: <span id="testModeSpp">-</span></div>';
  panel.appendChild(params);
  // MAIN QUESTION PANEL (RIGHT SIDE)
  panel.style.right = "10px";
  panel.style.width = "320px";
  panel.style.height = "auto";
  panel.style.zIndex = "10000";
  panel.style.position = "absolute";



  // ADD BOTH TO BODY
  document.body.appendChild(panel);
  const opsWrap = document.createElement("div");
  opsWrap.id = "testModeOpsWrap";
  opsWrap.style.marginBottom = "8px";
  const operations = ["rotary drilling", "circulating", "tripping in", "tripping out", "connection", "static"];
  operations.forEach(op => {
    const btn = document.createElement("button");
    btn.textContent = op;
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.marginBottom = "4px";
    btn.style.padding = "4px 6px";
    btn.style.fontSize = "12px";
    btn.setAttribute("data-op", op);
    opsWrap.appendChild(btn);
  });
  panel.appendChild(opsWrap);
  const timerText = document.createElement("div");
  timerText.id = "testModeTimerText";
  timerText.textContent = "Timer: --";
  timerText.style.marginBottom = "4px";
  panel.appendChild(timerText);
  const resultText = document.createElement("div");
  resultText.id = "testModeResultText";
  resultText.textContent = "Result: --";
  resultText.style.marginBottom = "4px";
  panel.appendChild(resultText);
  document.body.appendChild(panel);
  return panel;
}

export { startTestMode, exitTestMode };
window.startTestMode = startTestMode;
window.exitTestMode = exitTestMode;