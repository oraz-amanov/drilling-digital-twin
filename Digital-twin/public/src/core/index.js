// ============================================
// INDEX.JS - FINAL STABLE VERSION
// Key fixes:
// 1. Proper operation sync (LOWERCASE + TRIM)
// 2. Safe targetState merging
// 3. Guaranteed extraComponents wiring
// 4. Clean animation pipeline
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initScene, loadModels } from './scene.js';
import {
    initInteraction,
    updateHoverInfo,
    clearHover,
    getHoveredObject,
    setIsFocusing,
    getIsFocusing,
    getCameraFocusTarget,
    resetInteractionState
} from '../modules/interaction.js';
import { initUI, initTestingMode, setResetCallback } from '../modules/ui.js';
import { startAnimationLoop } from './animation.js';
import { setModule } from '../modules/moduleManager.js';
import { playOperation, updateOperations, setRigObjects } from '../modules/operations.js';
import { startTestMode } from '../modules/oper_testMode.js';

// ================= GLOBAL EXPOSURE =================
window.setModule = setModule;
window.resetInteractionState = resetInteractionState;
window.playOperation = playOperation;
window.startTestMode = startTestMode;

// ================= GLOBAL STATE =================
window.targetState = {
    operation: '',
    rotationSpeed: 0,
    drillPosition: 170,
    pumpPressure: 0,
    pumpActive: false,
    wob: 0,
    rpm: 0,
    spp: 0,
    hkla: 0,
    bpos: 0
};

const targetState = window.targetState;

// ================= SCENE VARS =================
let scene, camera, renderer, controls, rigGroup, interactiveObjects;
let drillString, mudPump1, mudPump2, topDriveGroup, hose;

// ================= INIT =================
window.initThreeJS = function () {

    if (window.threeJSInitialized) {
        document.getElementById('rigContainer').style.display = 'block';
        window.setModule(window.currentModule || 'Drill Rig');
        return;
    }

    window.threeJSInitialized = true;

    // ================= SCENE =================
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(200, 250, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    document.getElementById('rigContainer').appendChild(renderer.domElement);

    rigGroup = new THREE.Group();
    scene.add(rigGroup);

    interactiveObjects = [];

    // ================= CONTROLS =================
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 100, 0);

    // ================= RESIZE =================
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ================= SCENE INIT =================
    const result = initScene(scene, rigGroup, interactiveObjects, camera, renderer);
    drillString = result.drillString;
    window.drillString = drillString;

    initInteraction(camera, scene, interactiveObjects);

    // ================= HELPER =================
    function findByName(name) {
        let found = null;
        rigGroup.traverse(obj => {
            if (!found && obj.userData?.name === name) {
                found = obj;
            }
        });
        return found;
    }

    // static components
    const standpipe = findByName('Standpipe');
    const dischargeLine = findByName('Discharge Line');
    const gooseneck = findByName('Gooseneck');

    // dynamic components
    let shaleShaker = null;
    let flowline = null;
    let kellyHose = null;
    let bop = null;

    // ================= LOAD MODELS =================
    loadModels(
        rigGroup,
        interactiveObjects,
        result.metalMaterial,

        // onPartial
        (mudPump, topDrive) => {
            if (mudPump) mudPump1 = mudPump;
            if (topDrive) topDriveGroup = topDrive;
        },

        // onComplete
        () => {

            // clone second pump
            if (mudPump1) {
                mudPump2 = mudPump1.clone(true);
                mudPump2.position.set(-150, 0, 0);
                rigGroup.add(mudPump2);
            }

            // collect components
            shaleShaker = findByName('Shale Shaker');
            flowline = findByName('Flowline');
            kellyHose = findByName('Kelly Hose');
            bop = findByName('BOP');

            // pass to operations system
            setRigObjects({ rigGroup, drillString, topDriveGroup, mudPump1, mudPump2 });

            // bundle
            const extraComponents = {
                standpipe,
                dischargeLine,
                gooseneck,
                kellyHose,
                shaleShaker,
                flowline,
                bop
            };

            // ================= START ANIMATION =================
            startAnimationLoop(
                camera,
                scene,
                renderer,
                controls,
                rigGroup,
                0,
                getHoveredObject,
                updateHoverInfo,
                clearHover,
                getIsFocusing,
                getCameraFocusTarget,
                setIsFocusing,
                targetState,
                drillString,
                topDriveGroup,
                mudPump1,
                mudPump2,

                // hose update
                () => {
                    if (!mudPump1 || !topDriveGroup) return;

                    const start = new THREE.Vector3();
                    const end = new THREE.Vector3();

                    mudPump1.getWorldPosition(start);
                    topDriveGroup.getWorldPosition(end);

                    const curve = new THREE.CatmullRomCurve3([
                        start,
                        start.clone().add(new THREE.Vector3(20, 60, 0)),
                        end.clone().add(new THREE.Vector3(-10, 20, 0)),
                        end
                    ]);

                    if (!hose) {
                        hose = new THREE.Mesh(
                            new THREE.TubeGeometry(curve, 80, 1.5, 20, false),
                            new THREE.MeshStandardMaterial({ color: 0x111111 })
                        );
                        rigGroup.add(hose);
                    } else {
                        hose.geometry.dispose();
                        hose.geometry = new THREE.TubeGeometry(curve, 80, 1.5, 20, false);
                    }
                },

                extraComponents
            );

          
        }
    );
    window.topDriveGroup = topDriveGroup;
    window.mudPump1 = mudPump1;
    window.mudPump2 = mudPump2;

    // ================= LISTEN FOR TEST MODE EXIT =================
    window.addEventListener('message', event => {
        // Also handle rig state updates (original functionality)
        if (event.data.type === 'updateRigState') {
            const incoming = event.data.targetState || {};
            Object.assign(targetState, incoming);
            if (event.data.operation) {
                targetState.operation = event.data.operation.toLowerCase().trim();
            }
            console.log('UPDATED STATE:', targetState);
        }
    });
    


    window.addEventListener("message", (event) => {
      const data = event.data;

      if (data.type === "STOP_TEST_MODE") {
        console.log("Stopping test mode control");

        // STOP EVERYTHING
        window.currentRigState = null;
        window.isTestMode = false;

        // Reset values (IMPORTANT)
        if (window.setRigState) {
          window.setRigState({
            rotationSpeed: 0,
            pumpPressure: 0,
            pumpActive: false
          });
        }

        return;
      }

      if (data.type === "updateRigState") {
         if (!window.isTestMode) return; // 🔥 BLOCK updates after exit

        window.currentRigState = data.targetState;
      }
    });

    
};










