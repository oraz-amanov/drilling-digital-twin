import { createModeToggleButton } from './ui.js';
export let currentModule = "Drill Rig";

export function setModule(moduleName) {
    currentModule = moduleName;
    window.currentModule = moduleName;
    // FORCE disable testing outside drill module
    if (moduleName !== 'Drill Rig') {
        window.isTestingMode = false;

        const testUI = document.getElementById('testQuestion');
        if (testUI) testUI.style.display = 'none';

        const resultUI = document.getElementById('testResult');
        if (resultUI) resultUI.style.display = 'none';

        const exitBtn = document.getElementById('exitTestBtn');
        if (exitBtn) exitBtn.style.display = 'none';
    }
    
    if (window.resetInteractionState) {
        window.resetInteractionState();
    }

    const infoBox = document.getElementById("infoBox");
    if (infoBox) infoBox.style.display = "none";
    
    // Clean up test question UI when leaving testing mode
    const testQuestion = document.getElementById('testQuestion');
    if (testQuestion) testQuestion.style.display = 'none';
    const testResult = document.getElementById('testResult');
    if (testResult) testResult.style.display = 'none';
    const testingContainer = document.getElementById('testingContainer');
    if (testingContainer) testingContainer.style.display = 'none';
    
    // Stop test timer
    if (window.questionTimer) {
        clearInterval(window.questionTimer);
        window.questionTimer = null;
    }
    
    // Hide testing UI when switching modules
    let modeBtn = document.getElementById('modeToggleBtn');

    if (moduleName === 'Drill Rig') {
    // ✅ Create button if it doesn't exist
        if (!modeBtn) {
            createModeToggleButton();
            modeBtn = document.getElementById('modeToggleBtn');
        }

        // ✅ Show it
        if (modeBtn) modeBtn.style.display = 'block';

    } else {
        // ❌ Hide it in other modules
        if (modeBtn) modeBtn.style.display = 'none';

        // ❌ Force exit testing mode
        window.isTestingMode = false;
    }
    
    // Always show back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.style.display = 'block';
    }
    

    // For operations module, ensure glassy panel is activated
    if (moduleName === 'operations') {
        const glassyPanelFrame = document.getElementById('glassyPanelFrame');
        if (glassyPanelFrame) {
            glassyPanelFrame.classList.add('active');
        }
        document.getElementById('operationsTestBtn').style.display = 'block';
    } else {
        // For Drill Rig module, hide glassy panel
        const glassyPanelFrame = document.getElementById('glassyPanelFrame');
        if (glassyPanelFrame) {
            glassyPanelFrame.classList.remove('active');
        }
        document.getElementById('operationsTestBtn').style.display = 'none';
    }

    
}