// ============================================
// DRILLING DATA PLAYER - FINAL CLEAN VERSION
// Fully synchronized with animation.js
// ============================================

// Dataset storage
let dataset = [];
let segments = [];
let currentSegmentIndex = 0;
let playbackInterval = null;
let isPlaying = false;

let wobChart, rpmChart;
let chartsVisible = false;

// SINGLE SOURCE OF TRUTH (sent to animation.js)
let targetState = {
    rotationSpeed: 0,
    drillPosition: 165, // surface reference
    pumpPressure: 0,
    pumpActive: false,
    operation: ''
};

// DOM Elements
let wobValue, rpmValue, sppValue, hklaValue, bposValue, operationValue;
let playPauseBtn, resetBtn, rowCounter, totalRows, toggleChartsBtn, closeChartsBtn;

// =========================
// INIT
// =========================
function initElements() {
    wobValue = document.getElementById('wobValue');
    rpmValue = document.getElementById('rpmValue');
    sppValue = document.getElementById('sppValue');
    hklaValue = document.getElementById('hklaValue');
    bposValue = document.getElementById('bposValue');
    operationValue = document.getElementById('operationValue');

    playPauseBtn = document.getElementById('playPauseBtn');
    resetBtn = document.getElementById('resetBtn');
    rowCounter = document.getElementById('rowCounter');
    totalRows = document.getElementById('totalRows');

    toggleChartsBtn = document.getElementById('toggleChartsBtn');
    closeChartsBtn = document.getElementById('closeChartsBtn');
}

// =========================
// CHARTS
// =========================
function initCharts() {
    const wobCtx = document.getElementById('wobChart').getContext('2d');
    const rpmCtx = document.getElementById('rpmChart').getContext('2d');

    const options = { animation: false, responsive: true };

    wobChart = new Chart(wobCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'WOB', data: [], borderWidth: 2, tension: 0.3 }] },
        options
    });

    rpmChart = new Chart(rpmCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'RPM', data: [], borderWidth: 2, tension: 0.3 }] },
        options
    });
}

function updateCharts(segment) {
    const avg = getSegmentAverages(segment);

    wobChart.data.labels.push(currentSegmentIndex);
    wobChart.data.datasets[0].data.push(avg.wob);

    rpmChart.data.labels.push(currentSegmentIndex);
    rpmChart.data.datasets[0].data.push(avg.rpm);

    wobChart.update();
    rpmChart.update();
}

function resetCharts() {
    [wobChart, rpmChart].forEach(chart => {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
    });
}

function toggleChartsVisibility() {
    chartsVisible = !chartsVisible;
    document.getElementById('chartsPanel').style.display = chartsVisible ? 'block' : 'none';
    toggleChartsBtn.textContent = chartsVisible ? 'Hide Charts' : 'Show Charts';
}

function hideCharts() {
    chartsVisible = false;
    document.getElementById('chartsPanel').style.display = 'none';
    toggleChartsBtn.textContent = 'Show Charts';
}

// =========================
// OPERATION LOGIC (FIXED)
// =========================
const operationBehaviors = {

    "rotary drilling": (data, segIdx, totalSegs) => {
        targetState.rotationSpeed = data.rpm / 200; // normalized
        targetState.drillPosition = 165 - (segIdx / totalSegs) * 300;
        targetState.pumpPressure = data.spp;
        targetState.pumpActive = true;
    },

    "connection": () => {
        targetState.rotationSpeed = 0;
        targetState.pumpPressure = 0;
        targetState.pumpActive = false;
        // slight lift
        targetState.drillPosition = Math.min(targetState.drillPosition + 5, 165);
    },

    "circulating": (data) => {
        targetState.rotationSpeed = 0;
        targetState.pumpPressure = data.spp;
        targetState.pumpActive = true;
        // position unchanged
    },

    "tripping in": (data, segIdx, totalSegs) => {
        targetState.rotationSpeed = data.rpm / 200;;
        targetState.drillPosition -= 100;
        targetState.pumpPressure = 0;
        targetState.pumpActive = false;
    },

    "tripping out": (data, segIdx, totalSegs) => {
        targetState.rotationSpeed = data.rpm / 200;
        targetState.drillPosition += 100;
        targetState.pumpPressure = 0;
        targetState.pumpActive = false;
    },

    "static": () => {
        targetState.rotationSpeed = 0;
        targetState.pumpPressure = 0;
        targetState.pumpActive = false;
    }
};

// =========================
// UPDATE RIG STATE
// =========================
function updateRigBehavior(segment) {
    const avg = getSegmentAverages(segment);
    const op = segment.operation.toLowerCase().trim();

    targetState.operation = op;

    if (operationBehaviors[op]) {
        operationBehaviors[op](avg, currentSegmentIndex, segments.length);
    }

    // send to Three.js
    if (window.parent) {
        window.parent.postMessage({
            type: 'updateRigState',
            targetState: { ...targetState }
        }, '*');
    }
}

// =========================
// DATA LOADING
// =========================
function loadDataset() {
    Papa.parse('./src/data/final_drilling_data.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            dataset = results.data;
            totalRows.textContent = dataset.length;

            segments = createSegments(dataset);

            // Expose data globally for Test Mode and external use
            window.segmentsData = segments;
            window.dataset = dataset;
            window.getSegmentAverages = getSegmentAverages;

            if (segments.length > 0) {
                displaySegment(segments[0]);
            }
        }
    });
}

function createSegments(data) {
    const segs = [];
    let currentOp = data[0]['Rig Status Unified'];
    let startIndex = 0;

    for (let i = 1; i < data.length; i++) {
        const op = data[i]['Rig Status Unified'];

        if (op !== currentOp) {
            segs.push({ operation: currentOp, startIndex, endIndex: i - 1 });
            currentOp = op;
            startIndex = i;
        }
    }

    segs.push({ operation: currentOp, startIndex, endIndex: data.length - 1 });
    return segs;
}

// =========================
// DATA PROCESSING
// =========================
function getSegmentAverages(segment) {
    let wob = 0, rpm = 0, spp = 0, hkla = 0, bpos = 0;
    let n = segment.endIndex - segment.startIndex + 1;

    for (let i = segment.startIndex; i <= segment.endIndex; i++) {
        const r = dataset[i];
        wob += r.WOBA || 0;
        rpm += r.RPMA || 0;
        spp += r.SPPA || 0;
        hkla += r.HKLA || 0;
        bpos += r.BPOS || 0;
    }

    return {
        wob: wob / n,
        rpm: rpm / n,
        spp: spp / n,
        hkla: hkla / n,
        bpos: bpos / n
    };
}

// =========================
// UI UPDATE
// =========================
function displaySegment(segment) {
    const avg = getSegmentAverages(segment);

    operationValue.textContent = segment.operation;
    wobValue.textContent = avg.wob.toFixed(2);
    rpmValue.textContent = avg.rpm.toFixed(0);
    sppValue.textContent = avg.spp.toFixed(2);
    hklaValue.textContent = avg.hkla.toFixed(2);
    bposValue.textContent = avg.bpos.toFixed(2);

    rowCounter.textContent = `${segment.startIndex + 1} - ${segment.endIndex + 1}`;
}

// =========================
// PLAYBACK
// =========================
function nextSegment() {
    currentSegmentIndex = (currentSegmentIndex + 1) % segments.length;

    const segment = segments[currentSegmentIndex];

    displaySegment(segment);
    updateCharts(segment);
    updateRigBehavior(segment);
}

function startPlayback() {
    if (isPlaying) return;
    isPlaying = true;
    playPauseBtn.textContent = 'Pause';

    playbackInterval = setInterval(nextSegment, 4000);
}

function pausePlayback() {
    isPlaying = false;
    playPauseBtn.textContent = 'Play';
    clearInterval(playbackInterval);
}

function togglePlayPause() {
    isPlaying ? pausePlayback() : startPlayback();
}

function resetPlayback() {
    pausePlayback();

    currentSegmentIndex = 0;
    resetCharts();

    targetState = {
        rotationSpeed: 0,
        drillPosition: 165,
        pumpPressure: 0,
        pumpActive: false,
        operation: ''
    };

    if (segments.length > 0) displaySegment(segments[0]);

    if (window.parent) {
        window.parent.postMessage({
            type: 'updateRigState',
            targetState: { ...targetState }
        }, '*');
    }
}

// =========================
// EVENTS
// =========================
function attachEventListeners() {
    playPauseBtn.addEventListener('click', togglePlayPause);
    resetBtn.addEventListener('click', resetPlayback);
    toggleChartsBtn.addEventListener('click', toggleChartsVisibility);
    closeChartsBtn.addEventListener('click', hideCharts);
}

// =========================
// INIT
// =========================
function initDrillingDataPlayer() {
    initElements();
    initCharts();
    attachEventListeners();
    loadDataset();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDrillingDataPlayer);
} else {
    initDrillingDataPlayer();
}
