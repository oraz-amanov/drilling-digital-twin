// ============================================
// INTERACTION.JS - Mouse Interactions and Hover Effects
// Handles mouse movement, clicks, hover detection, and info box display
// Only active in Drill Rig module
// ============================================

import * as THREE from 'three';

// Module-level variables to track state
let currentHovered = null;
let cameraFocusTarget = null;
let isFocusing = false;
let camera, scene, interactiveObjects;

// Mouse position for raycasting
let mouse = new THREE.Vector2();

// Initialize interaction system
// Parameters: cam (camera), scn (scene), intObjs (interactive objects array)
export function initInteraction(cam, scn, intObjs) {
    camera = cam;
    scene = scn;
    interactiveObjects = intObjs;

    const raycaster = new THREE.Raycaster();

    // Track mouse movement to update raycaster
    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Handle mouse click for selection
    window.addEventListener("click", (event) => {
        const clickMouse = new THREE.Vector2();
        clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(clickMouse, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (intersects.length > 0) {
            // Find the parent object with userData
            let obj = intersects[0].object;
            while (obj.parent && !obj.userData.name) {
                obj = obj.parent;
            }

            // If in testing mode, call testClickHandler
            if (window.isTestingMode && window.testClickHandler) {
                window.testClickHandler(obj.userData.name);
                return;
            }

            // If in learning mode (not testing), handle normal hover/click behavior
            if (window.currentModule === "Drill Rig" && !window.isTestingMode) {
                // If clicking on Drill String, show action box and focus camera
                if (obj.userData.name === "Drill String") {
                    const actionBox = document.getElementById("actionBox");
                    if (actionBox) {
                        actionBox.style.display = "block";
                        updateActionBoxPosition(obj);
                    }
                    cameraFocusTarget = obj;
                    isFocusing = true;
                } else {
                    const actionBox = document.getElementById("actionBox");
                    if (actionBox) actionBox.style.display = "none";
                    isFocusing = false;
                    cameraFocusTarget = null;
                }
            }
        } else {
            // No object clicked
            if (window.currentModule === "Drill Rig" && !window.isTestingMode) {
                const actionBox = document.getElementById("actionBox");
                if (actionBox) actionBox.style.display = "none";
            }
            isFocusing = false;
            cameraFocusTarget = null;
        }
    });
}

// Get currently hovered object using raycaster
// This also handles the glow effect for ALL interactive objects including cloned ones
export function getHoveredObject() {
    if (!camera) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
        const obj = intersects[0].object;

        if (obj.userData && obj.userData.name) {
            return obj;
        }
    }
    return null;
}

// Update info box position to follow 3D object on screen
export function updateInfoBoxPosition(object) {
    const infoBox = document.getElementById("infoBox");
    if (!infoBox) return;
    
    const vector = new THREE.Vector3();
    object.getWorldPosition(vector);
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    infoBox.style.left = `${x + 15}px`;
    infoBox.style.top = `${y + 60}px`;
}

// Update action box position
function updateActionBoxPosition(object) {
    const actionBox = document.getElementById("actionBox");
    if (!actionBox) return;
    
    const vector = new THREE.Vector3();
    object.getWorldPosition(vector);
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    actionBox.style.left = `${x + 20}px`;
    actionBox.style.top = `${y + 80}px`;
}

// Clear hover state and hide info box
export function clearHover() {
    const infoBox = document.getElementById("infoBox");
    if (infoBox) infoBox.style.display = "none";
    if (currentHovered) {
        const target = currentHovered.userData.target || currentHovered;
        resetGlow(target);
    }
    currentHovered = null;
    
    // Hide action box
    const actionBox = document.getElementById("actionBox");
    if (actionBox) actionBox.style.display = "none";
}

// Apply glow effect to object (highlight on hover)
export function glowObject(object) {
    object.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.emissive = new THREE.Color(0x333300);
            child.material.emissiveIntensity = 0.8;
        }
    });
}

// Reset glow effect (remove highlight)
export function resetGlow(object) {
    object.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.emissive?.set(0x000000);
            child.material.emissiveIntensity = 0;
        }
    });
}

// Update hover info display - only active in Drill Rig module (not in testing mode)
export function updateHoverInfo() {
    // Skip all hover handling in testing mode or non-Drill Rig modules
    if (window.isTestingMode || window.currentModule !== "Drill Rig") return;
    
    const obj = getHoveredObject();
    const infoBox = document.getElementById("infoBox");
    const infoTitle = document.getElementById("infoTitle");
    const infoText = document.getElementById("infoText");
    
    if (obj) {
        // Apply glow effect
        if (currentHovered !== obj) {
            // Reset previous glow
            if (currentHovered) {
                const target = currentHovered.userData.target || currentHovered;
                resetGlow(target);
            }
            
            currentHovered = obj;
            
            // Apply new glow
            const target = obj.userData.target || obj;
            glowObject(target);
            
            // Show info box
            infoTitle.textContent = obj.userData.name;
            infoText.textContent = typeof obj.userData.info === "function" ? obj.userData.info() : obj.userData.info;
            infoBox.style.display = "block";
        }
        
        // Update position
        updateInfoBoxPosition(obj);
    } else {
        clearHover();
    }
}

// Reset interaction state (call when switching from testing to learning mode)
export function resetInteractionState() {
    // Clear any hover states
    if (currentHovered) {
        const target = currentHovered.userData.target || currentHovered;
        resetGlow(target);
    }
    currentHovered = null;
    
    // Hide info box
    const infoBox = document.getElementById("infoBox");
    if (infoBox) infoBox.style.display = "none";
    
    // Hide action box
    const actionBox = document.getElementById("actionBox");
    if (actionBox) actionBox.style.display = "none";
    
    // Reset focusing
    isFocusing = false;
    cameraFocusTarget = null;
}

// Set camera focus target
export function setCameraFocus(target) {
    cameraFocusTarget = target;
}

// Set focusing state
export function setIsFocusing(value) {
    isFocusing = value;
}

// Get focusing state
export function getIsFocusing() {
    return isFocusing;
}

// Get camera focus target
export function getCameraFocusTarget() {
    return cameraFocusTarget;
}