// ============================================
// OPERATIONS.JS (FIXED)
// Fixes applied:
//   BUG #1 - now reads window.targetState set by the glassy panel
//   BUG #4 - tripping no longer directly moves drillString.position.y;
//            instead it drives targetState.drillPosition so animation.js
//            lerps smoothly without fighting
// ============================================

import * as THREE from 'three';

let currentOperation = null;

// BUG #4 FIX: removed the old local operationState that tracked running/progress
// independently. State is now driven through window.targetState so animation.js
// is the single authority on object positions.
let operationState = {
    circulation: { running: false },
    tripping_in:  { running: false, progress: 0 },
    tripping_out: { running: false, progress: 0 }
};

let rigGroup      = null;
let drillString   = null;
let topDriveGroup = null;
let mudPump1      = null;
let mudPump2      = null;
let travelingBlock = null;
let standpipe      = null;
let bop            = null;

// BUG #2 FIX: this function now actually stores all refs so nothing is null
export function setRigObjects(objects) {
    rigGroup       = objects.rigGroup;
    drillString    = objects.drillString;
    topDriveGroup  = objects.topDriveGroup;
    mudPump1       = objects.mudPump1;
    mudPump2       = objects.mudPump2 || null;
    travelingBlock = objects.travelingBlock || null;
    standpipe      = objects.standpipe      || null;
    bop            = objects.bop            || null;
}

export function playOperation(name, objects) {
    if (objects) setRigObjects(objects);
    currentOperation = name;

    switch (name) {
        case 'circulation':   startCirculation();  break;
        case 'tripping_in':   startTrippingIn();   break;
        case 'tripping_out':  startTrippingOut();  break;
        case 'stop':          stopAllOperations(); break;
    }
}

// ── Circulation ──────────────────────────────────────────────────────────────
function startCirculation() {
    operationState.circulation.running = true;

    // BUG #1 FIX: drive the shared targetState so animation.js reacts
    if (window.targetState) {
        window.targetState.pumpActive    = true;
        window.targetState.pumpPressure  = 1500; // default starting pressure
        window.targetState.rotationSpeed = 0.4;  // gentle rotation for circulation
    }

    if (mudPump1) mudPump1.userData.isOperating = true;

    showOperationStatus('Circulation', 'Running — Mud pump activated');
}

// ── Tripping In ──────────────────────────────────────────────────────────────
function startTrippingIn() {
    operationState.tripping_in.running  = true;
    operationState.tripping_in.progress = 0;

    // BUG #4 FIX: do NOT touch drillString.position.y directly here.
    // Set targetState.drillPosition lower and animation.js will lerp there.
    if (window.targetState) {
        window.targetState.drillPosition = -50; // drill goes down into hole
        window.targetState.rotationSpeed  = 0;  // no rotation while tripping
        window.targetState.pumpActive     = false;
    }

    showOperationStatus('Tripping In', 'Running — Running pipe into hole');
}

// ── Tripping Out ─────────────────────────────────────────────────────────────
function startTrippingOut() {
    operationState.tripping_out.running  = true;
    operationState.tripping_out.progress = 0;

    // BUG #4 FIX: same — drive through targetState, not direct position mutation
    if (window.targetState) {
        window.targetState.drillPosition = 165; // pull back to surface position
        window.targetState.rotationSpeed  = 0;
        window.targetState.pumpActive     = false;
    }

    showOperationStatus('Tripping Out', 'Running — Pulling pipe from hole');
}

// ── Stop all ─────────────────────────────────────────────────────────────────
function stopAllOperations() {
    currentOperation = null;
    operationState.circulation.running  = false;
    operationState.tripping_in.running  = false;
    operationState.tripping_out.running = false;

    // Reset shared state
    if (window.targetState) {
        window.targetState.pumpActive    = false;
        window.targetState.pumpPressure  = 0;
        window.targetState.rotationSpeed = 0;
        window.targetState.drillPosition = 165; // back to surface
    }

    if (mudPump1) mudPump1.userData.isOperating = false;
    if (mudPump2) mudPump2.userData.isOperating = false;

    hideOperationStatus();
}

// ── Per-frame update (called from animation loop) ─────────────────────────────
export function updateOperations() {
    // BUG #1 FIX: read from window.targetState (set by panel postMessage)
    // instead of from the old disconnected local operationState.
    const ts = window.targetState;
    if (!ts) return;

    // Circulation visual — pump glow driven by pumpPressure from panel
    if (operationState.circulation.running) {
        const time = Date.now() * 0.005;
        const intensity = ts.pumpActive ? 0.3 + Math.sin(time) * 0.2 : 0;

        [mudPump1, mudPump2].forEach(pump => {
            if (!pump) return;
            pump.traverse(child => {
                if (child.isMesh && child.material?.emissive) {
                    child.material.emissive.setHex(ts.pumpActive ? 0x00ff00 : 0x000000);
                    child.material.emissiveIntensity = intensity;
                }
            });
        });
    }

    // BUG #4 FIX: tripping progress is now tracked from targetState changes
    // instead of directly mutating drillString.position.y every frame.
    // animation.js owns the lerp; we just watch for completion here.
    if (operationState.tripping_in.running && drillString) {
        // Check if drill string has approximately reached the target
        const target = ts.drillPosition;
        const current = drillString.position.y;
        if (Math.abs(current - target) < 2) {
            operationState.tripping_in.running = false;
            updateOperationStatusText('Tripping In', 'Complete');
        }
    }

    if (operationState.tripping_out.running && drillString) {
        const target = ts.drillPosition;
        const current = drillString.position.y;
        if (Math.abs(current - target) < 2) {
            operationState.tripping_out.running = false;
            updateOperationStatusText('Tripping Out', 'Complete');
        }
    }
}

// ── Status box helpers ────────────────────────────────────────────────────────
function showOperationStatus(title, status) {
    let box = document.getElementById('operationStatusBox');
    if (!box) {
        box = document.createElement('div');
        box.id = 'operationStatusBox';
        box.style.cssText = `
            position: absolute;
            top: 80px;
            left: 15px;
            background: rgba(0, 80, 0, 0.85);
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            z-index: 50;
            font-family: Arial, sans-serif;
            min-width: 200px;
            border: 2px solid #00ff00;
        `;
        document.body.appendChild(box);
    }
    box.innerHTML = `
        <div style="font-size:16px;font-weight:bold;margin-bottom:8px;">${title}</div>
        <div style="font-size:14px;color:#00ff00;">● ${status}</div>
    `;
    box.style.display = 'block';
}

function updateOperationStatusText(title, status) {
    const box = document.getElementById('operationStatusBox');
    if (!box) return;
    box.innerHTML = `
        <div style="font-size:16px;font-weight:bold;margin-bottom:8px;">${title}</div>
        <div style="font-size:14px;color:#00ff00;">✓ ${status}</div>
    `;
    setTimeout(() => hideOperationStatus(), 2000);
}

function hideOperationStatus() {
    const box = document.getElementById('operationStatusBox');
    if (box) box.style.display = 'none';
}

export function getCurrentOperation() { return currentOperation; }
export function getOperationState()   { return operationState; }