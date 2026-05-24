// ============================================
// ANIMATION.JS - CLEAN FINAL (NO CONFLICTS)
// Animation follows data ONLY (no overrides)
// ============================================

import * as THREE from 'three';

export function startAnimationLoop(
    camera, scene, renderer, controls,
    rigGroup, rigROP,
    getHoveredObject, updateHoverInfo, clearHover,
    getIsFocusing, getCameraFocusTarget, setIsFocusing,
    targetState,
    drillString, topDriveGroup, mudPump1, mudPump2,
    updateHose,
    extra = {}
) {

    const clock = new THREE.Clock();
    const basePositions = new Map();

    function storeBase(obj) {
        if (obj && !basePositions.has(obj)) {
            basePositions.set(obj, obj.position.clone());
        }
    }

    [
        mudPump1, mudPump2,
        extra.shaleShaker,
        extra.flowline,
        extra.standpipe,
        extra.gooseneck,
        extra.kellyHose
    ].forEach(storeBase);

    function applyGlow(object, intensity = 0) {
        if (!object) return;

        object.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setRGB(intensity, intensity * 0.6, 0);
                child.material.emissiveIntensity = intensity;
            }
        });
    }


    function animate() {
        requestAnimationFrame(animate);

        const isTestMode = window.isTestMode === true;
        if (!isTestMode) {
            targetState.rotationSpeed = 0;
            targetState.pumpActive = false;
        }
        const lerpSpeed = isTestMode ? 0.01 : 0.05;

        const time = clock.getElapsedTime();
        controls.update();

        // =========================
        // 🔁 TOP DRIVE ROTATION
        // =========================
        const op = (targetState.operation || "").toLowerCase();

        const isRotary = op === "rotary drilling";
        const isCirculating = op === "circulating";
        const isTripIn = op === "tripping in";
        const isTripOut = op === "tripping out";
        const isConnection = op === "connection";
        const isStatic = op === "static";

        // CONNECTION behavior (subtle activity)
        if (isConnection && drillString) {
            drillString.position.y += Math.sin(time * 2) * 0.3; // slight bounce
        }

        // STATIC behavior (completely dead)
        if (isStatic) {
            // no movement at all (do nothing)
        }

        const rotationAllowed = op.includes("rotary drilling");

        if (topDriveGroup) {
            if (rotationAllowed) {
                topDriveGroup.rotation.y += targetState.rotationSpeed * 0.2;
            }
        }
        const MIN_Y = -150;  // deepest allowed (adjust to your rig)
        const MAX_Y = 170;   // top position (surface)

        // Clamp target
        targetState.drillPosition = Math.max(
            MIN_Y,
            Math.min(MAX_Y, targetState.drillPosition)
        );

        // =========================
        // ⬇️ DRILL STRING (PURE LERP)
        // =========================
        if (drillString) {
            drillString.position.y += (targetState.drillPosition - drillString.position.y) * lerpSpeed;
        }

        // =========================
        // 🔥 FLOW / PUMP STATE
        // =========================
        const pumpActive = targetState.pumpActive;

        // =========================
        // 🔥 MUD PUMPS
        // =========================
        [mudPump1, mudPump2].forEach(pump => {
            if (!pump) return;

            storeBase(pump);
            const base = basePositions.get(pump);

            if (pumpActive) {
                const vibration = Math.sin(time * 6) * 0.3;
                pump.position.y = base.y + vibration;
                applyGlow(pump, 0.3);
            } else {
                pump.position.y += (base.y - pump.position.y) * 0.1;
                applyGlow(pump, 0);
            }
        });

        // =========================
        // 🌊 SHALE SHAKER (REALISTIC)
        // =========================
        if (extra.shaleShaker) {
            const shaker = extra.shaleShaker;

            storeBase(shaker);
            const base = basePositions.get(shaker);

            if (pumpActive) {
                // FIXED: small + fast vibration (no crazy jumps)
                const vibX = Math.sin(time * 20) * 0.02;
                const vibY = Math.sin(time * 20) * 0.01;

                shaker.position.x = base.x + vibX;
                shaker.position.y = base.y + vibY;

                applyGlow(shaker, 0.7);
            } else {
                shaker.position.lerp(base, 0.1);
                applyGlow(shaker, 0);
            }
        }

        // =========================
        // 🔄 FLOW PATH VISUALIZATION
        // =========================
        const flowObjects = [
            extra.flowline,
            extra.standpipe,
            extra.gooseneck,
            extra.kellyHose
        ];

        flowObjects.forEach(obj => {
            applyGlow(obj, pumpActive ? 0.6 : 0);
        });

        // =========================
        // 🧠 OPERATION VISUAL BOOST
        // =========================
        if (op.includes("rotary")) {
            applyGlow(topDriveGroup, 0.6); // toned down
        } else {
            applyGlow(topDriveGroup, 0);
        }

        // =========================
        // 🧠 HOVER SYSTEM
        // =========================
        if (getHoveredObject && updateHoverInfo && clearHover) {
            const obj = getHoveredObject();
            if (obj) updateHoverInfo();
            else clearHover();
        }

        // =========================
        // 🔧 HOSE UPDATE
        // =========================
        if (updateHose) updateHose();

        renderer.render(scene, camera);
    }

    animate();
}