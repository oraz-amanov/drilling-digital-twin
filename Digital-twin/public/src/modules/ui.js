// ============================================
// UI.JS - User Interface and Testing Mode
// Handles testing mode quiz
// Testing mode only available in learning module
// ============================================

import { currentModule } from './moduleManager.js';

// Global reference to reset function - will be set from index.js
let resetToLearningModeUI = null;

// Export function to set the reset callback
export function setResetCallback(callback) {
    resetToLearningModeUI = callback;
}

// Initialize testing mode state
window.isTestingMode = false;

// Panel visibility state - always visible now
let panelVisible = true;

// Initialize UI functionality
export function initUI(drillString) {
    // No trip buttons or control panel - testing mode toggle handled separately
}

// Show testing mode UI
export function showTestingMode() {
    // Hide back button during testing (so it doesn't obstruct view)
    const backBtn = document.getElementById("backBtn");
    if (backBtn) backBtn.style.display = "none";
    
    // Hide mode toggle button during testing
    const modeBtn = document.getElementById("modeToggleBtn");
    if (modeBtn) modeBtn.style.display = "none";
    
    // Get or create exit button for testing mode
    let exitTestBtn = document.getElementById('exitTestBtn');
    if (!exitTestBtn) {
        exitTestBtn = document.createElement('button');
        exitTestBtn.id = 'exitTestBtn';
        exitTestBtn.textContent = '← Exit Test';
        exitTestBtn.style.cssText = `
            position: absolute;
            top: 15px;
            left: 15px;
            z-index: 200;
            background: rgba(233, 69, 96, 0.8);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;
        document.body.appendChild(exitTestBtn);
        
        exitTestBtn.addEventListener('click', () => {
            // Manual exit to learning mode
            window.isTestingMode = false;
            
            // Stop any running test
            if (questionTimer) {
                clearInterval(questionTimer);
                questionTimer = null;
            }
            questionAnswered = true;
            
            // Hide testing UI
            hideTestingMode();
            
            const testQuestion = document.getElementById('testQuestion');
            if (testQuestion) testQuestion.style.display = 'none';
            const testResult = document.getElementById('testResult');
            if (testResult) testResult.style.display = 'none';
            const testingContainer = document.getElementById('testingContainer');
            if (testingContainer) testingContainer.style.display = 'none';
            
            // Show/reset learning mode elements
            const backBtn = document.getElementById("backBtn");
            if (backBtn) backBtn.style.display = 'block';
            const modeToggleBtn = document.getElementById("modeToggleBtn");
            if (modeToggleBtn) {
                modeToggleBtn.style.display = 'block';
                modeToggleBtn.textContent = 'Switch to Testing Mode';
                modeToggleBtn.style.background = 'rgba(0, 100,200,0.8)';
            }
            
            // Reset score
            score = 0;
            questionCount = 0;
            
            // Reset interaction state
            if (resetToLearningModeUI) {
                resetToLearningModeUI();
            }
            
            // Show learning mode info box
            document.getElementById('infoBox').style.display = 'block';
            
            // Hide exit button
            const btn = document.getElementById('exitTestBtn');
            if (btn) btn.style.display = 'none';
        });
    }
    if (exitTestBtn) exitTestBtn.style.display = 'block';
    
    // Create testing mode container if it doesn't exist
    let testingContainer = document.getElementById('testingContainer');
    if (!testingContainer) {
        testingContainer = document.createElement('div');
        testingContainer.id = 'testingContainer';
        testingContainer.style.cssText = `
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            padding: 20px 30px;
            border-radius: 15px;
            text-align: center;
            color: white;
            z-index: 100;
            min-width: 300px;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(testingContainer);
    }
    
    testingContainer.innerHTML = `
        <h2 style="margin: 0 0 15px 0; color: #e94560;">Testing Mode</h2>
        <p style="margin: 0 0 15px 0;">Click the correct component when prompted!</p>
        <button id="startTestBtn" style="
            padding: 12px 24px;
            font-size: 16px;
            background: #e94560;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
        ">Start Testing</button>
    `;
    
    testingContainer.style.display = 'block';
    
    // Show exit test button
    const btn1 = document.getElementById('exitTestBtn');
    if (btn1) btn1.style.display = 'block';
    
    // Add event listener for start button
    document.getElementById('startTestBtn').addEventListener('click', () => {
        startTest();
    });
}

// Hide testing mode UI
export function hideTestingMode() {
    const testingContainer = document.getElementById('testingContainer');
    if (testingContainer) {
        testingContainer.style.display = 'none';
    }
    
    // Also hide testing UI elements
    const testQuestion = document.getElementById('testQuestion');
    if (testQuestion) testQuestion.style.display = 'none';
    const testResult = document.getElementById('testResult');
    if (testResult) testResult.style.display = 'none';
    
    // Hide exit test button
    const btn2 = document.getElementById('exitTestBtn');
    if (btn2) btn2.style.display = 'none';
    
    // Reset question timer
    if (questionTimer) {
        clearInterval(questionTimer);
        questionTimer = null;
    }
    
    // Restore back button and mode toggle in Drill Rig mode
    const backBtn = document.getElementById("backBtn");
    const modeToggleBtn = document.getElementById("modeToggleBtn");
    if (currentModule === 'Drill Rig') {
        if (backBtn) backBtn.style.display = 'block';
        if (modeToggleBtn) modeToggleBtn.style.display = 'block';
    }
}

// Initialize testing mode functionality
// Parameters: interactiveObjects (array of clickable 3D objects), moduleCallback (function to get current module)
export function initTestingMode(interactiveObjects, moduleCallback) {
    // Make interactiveObjects available globally for testing
    window.testingInteractiveObjects = interactiveObjects;
    
    // Store module callback for checking current module
    window.getModuleCallback = moduleCallback;
    
    // Create mode toggle button in the UI (only in Drill Rig module)
    createModeToggleButton();
}

// Create the Learning/Testing mode toggle button
export function createModeToggleButton() {
    // Check if button already exists
    if (document.getElementById('modeToggleBtn')) return;

    // Only create button in Drill Rig module
    if (currentModule !== "Drill Rig") return;

    // Create toggle button - positioned to the left of screen
    const modeBtn = document.createElement('button');
    modeBtn.id = 'modeToggleBtn';
    modeBtn.textContent = 'Switch to Testing Mode';
    modeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        left: 120px;
        z-index: 20;
        background: rgba(0, 100, 200, 0.8);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
    `;
    
    document.body.appendChild(modeBtn);
    
    // Handle button click
    modeBtn.addEventListener('click', () => {
        window.isTestingMode = !window.isTestingMode;

        if (window.isTestingMode) {
            // Switch to Testing Mode
            modeBtn.textContent = 'Switch to Learning Mode';
            modeBtn.style.background = 'rgba(233, 69, 96, 0.8)';
            showTestingMode();

            // Hide learning mode info box
            const infoBox = document.getElementById('infoBox');
            if (infoBox) infoBox.style.display = 'none';

            // Clear any hover/glow state
            if (resetToLearningModeUI) {
                resetToLearningModeUI();
            }
        } else {
            // Switch to Learning Mode - FULL RESET

            // Stop any running test
            if (questionTimer) {
                clearInterval(questionTimer);
                questionTimer = null;
            }
            questionAnswered = true;

            // Hide testing UI
            hideTestingMode();

            // Clear test question UI
            const testQuestion = document.getElementById('testQuestion');
            if (testQuestion) testQuestion.style.display = 'none';
            const testResult = document.getElementById('testResult');
            if (testResult) testResult.style.display = 'none';

            // Reset button appearance only in Drill Rig module
            if (window.currentModule === 'Drill Rig') {
                modeBtn.textContent = 'Switch to Testing Mode';
                modeBtn.style.background = 'rgba(0, 100, 200, 0.8)';
            }

            // Reset score for next time
            score = 0;
            questionCount = 0;

            // Reset interaction state to clear any glow and states
            if (resetToLearningModeUI) {
                resetToLearningModeUI();
            }

            // Show learning mode info box
            document.getElementById('infoBox').style.display = 'block';

            // Hide button if not in Drill Rig module
            if (window.currentModule !== 'Drill Rig') {
                modeBtn.style.display = 'none';
            }
        }
    });
}

// Testing state variables
let currentQuestion = null;
let questionTimer = null;
let score = 0;
let questionCount = 0;
const totalQuestions = 10;
const questionTimeLimit = 10000; // 10 seconds

// Component name mapping for testing (groups similar components)
const componentGroups = {
    'BOP': ['BOP', 'Blowout Preventer'],
    'Drill String': ['Drill String'],
    'Mud Pump': ['Mud Pump 1', 'Mud Pump 2'],
    'Shale Shaker': ['Shale Shaker'],
    'Mud Tank': ['Mud Tank'],
    'Top Drive': ['Top Drive'],
    'Standpipe': ['Standpipe'],
    'Traveling Block': ['Traveling Block'],
    'Drawworks': ['Drawworks']
};

// Available questions (will be shuffled)
const availableComponents = Object.keys(componentGroups);

// Start the test
function startTest() {
    score = 0;
    questionCount = 0;
    
    // Shuffle available components
    shuffleArray(availableComponents);
    
    // Hide the center start screen (testingContainer)
    const testingContainer = document.getElementById('testingContainer');
    if (testingContainer) testingContainer.style.display = 'none';
    
    // Show exit test button
    const exitBtn3 = document.getElementById('exitTestBtn');
    if (exitBtn3) exitBtn3.style.display = 'block';
    
    // Show test question UI
    showTestQuestion();
}

// Show current question to user
function showTestQuestion() {
    if (questionCount >= totalQuestions) {
        // Test complete - show final score
        showFinalScore();
        return;
    }
    
    // Get next component to test
    currentQuestion = availableComponents[questionCount % availableComponents.length];
    questionCount++;
    
    // Create question UI - positioned at RIGHT side of screen
    let questionUI = document.getElementById('testQuestion');
    if (!questionUI) {
        questionUI = document.createElement('div');
        questionUI.id = 'testQuestion';
        questionUI.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 260px;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            padding: 80px 15px 20px 15px;
            text-align: center;
            color: white;
            z-index: 200;
            font-family: Arial, sans-serif;
            box-shadow: -5px 0 20px rgba(0,0,0,0.5);
            border-left: 3px solid #e94560;
        `;
        document.body.appendChild(questionUI);
    }
    
    // Add close button functionality
    let timeLeft = questionTimeLimit / 1000;
    
    questionUI.innerHTML = `
        <h3 style="color: #e94560; margin: 0 0 10px 0; font-size: 18px;">TESTING MODE</h3>
        <div style="background: #222; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
            <span style="color: #ffaa00; font-weight: bold;">${questionCount}/${totalQuestions}</span>
        </div>
        <p style="font-size: 16px; margin: 10px 0;">Find and click:</p>
        <p style="font-size: 22px; margin: 10px 0; font-weight: bold; color: #e94560;">${currentQuestion}</p>
        <div style="margin-top: 20px; padding: 10px; background: #333; border-radius: 8px;">
            <span style="color: #aaa; font-size: 14px;">Time: </span>
            <span id="timeLeft" style="color: #e94560; font-size: 24px; font-weight: bold;">${timeLeft}</span>
            <span style="color: #aaa; font-size: 14px;">s</span>
        </div>
        <div id="testFeedback" style="margin-top: 20px; padding: 15px; border-radius: 8px; display: none; font-weight: bold; font-size: 16px;"></div>
        <div style="margin-top: auto; padding: 10px; background: #222; border-radius: 8px;">
            <span style="color: #aaa; font-size: 14px;">Score: </span>
            <span style="color: #00ff00; font-size: 20px; font-weight: bold;">${score}</span>
        </div>
    `;
    
    // Clear any existing timer first
    if (questionTimer) {
        clearInterval(questionTimer);
        questionTimer = null;
    }
    
    questionUI.style.display = 'block';
    
    // Start countdown timer
    let remaining = questionTimeLimit;
    questionTimer = setInterval(() => {
        remaining -= 1000;
        const seconds = remaining / 1000;
        const timeSpan = document.getElementById('timeLeft');
        if (timeSpan) timeSpan.textContent = seconds;
        
        if (remaining <= 0) {
            // Time's up - move to next question
            clearInterval(questionTimer);
            nextQuestion(false); // false = no correct click
        }
    }, 1000);
    
    // Set up click handler for this question
    setupQuestionClickHandler();
}

// Handle user clicking on objects during test
let questionAnswered = false;

function setupQuestionClickHandler() {
    questionAnswered = false;
    
    // Store original click handler
    const originalClickHandler = window.onClickHandler;
    
    // Create a temporary click handler that checks answers
    window.testClickHandler = (clickedObjName) => {
        if (questionAnswered) return;
        
        // Check if clicked object matches current question
        const validNames = componentGroups[currentQuestion];
        if (validNames && validNames.includes(clickedObjName)) {
            // Correct answer!
            questionAnswered = true;
            clearInterval(questionTimer);
            nextQuestion(true);
        }
    };
}

// Move to next question
function nextQuestion(correct) {
    // Clear any existing timer first
    if (questionTimer) {
        clearInterval(questionTimer);
        questionTimer = null;
    }
    
    if (correct) {
        score++;
        showTestFeedback(true);
    } else {
        showTestFeedback(false);
    }
    
    // Update the score display in the question UI
    const questionUI = document.getElementById('testQuestion');
    if (questionUI) {
        const scoreSpan = questionUI.querySelector('span[style*="color: #00ff00"]');
        if (scoreSpan) {
            scoreSpan.textContent = score;
        }
    }
    
    // Brief delay before next question
    setTimeout(() => {
        showTestQuestion();
    }, 1200);
}

// Show feedback for correct/wrong answer
function showTestFeedback(correct) {
    const feedback = document.getElementById('testFeedback');
    if (feedback) {
        feedback.style.display = 'block';
        if (correct) {
            feedback.style.background = 'rgba(0, 200, 0, 0.3)';
            feedback.style.color = '#00ff00';
            feedback.textContent = '✓ Correct!';
        } else {
            feedback.style.background = 'rgba(200, 0, 0, 0.3)';
            feedback.style.color = '#ff6666';
            feedback.textContent = '✗ Wrong! Try again...';
        }
        
        // Hide feedback after 800ms
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 800);
    }
}

// Show final score when test is complete
function showFinalScore() {
    let resultUI = document.getElementById('testResult');
    if (!resultUI) {
        resultUI = document.createElement('div');
        resultUI.id = 'testResult';
        resultUI.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            padding: 40px 60px;
            border-radius: 20px;
            text-align: center;
            color: white;
            z-index: 300;
            min-width: 400px;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(resultUI);
    }
    
    const percentage = Math.round((score / totalQuestions) * 100);
    let message = '';
    let color = '';
    
    if (percentage >= 80) {
        message = 'Excellent! You know your rig components well!';
        color = '#00ff00';
    } else if (percentage >= 60) {
        message = 'Good job! Keep practicing to improve!';
        color = '#ffaa00';
    } else {
        message = 'Keep learning! Try again to improve your score.';
        color = '#ff6666';
    }
    
    resultUI.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #e94560; font-size: 28px;">Test Complete!</h2>
        <p style="font-size: 48px; margin: 0 0 10px 0; color: ${color};">${score}/${totalQuestions}</p>
        <p style="font-size: 20px; margin: 0 0 20px 0;">${percentage}%</p>
        <p style="font-size: 16px; margin: 0 0 30px 0; color: #aaa;">${message}</p>
        <button id="restartTestBtn" style="
            padding: 12px 30px;
            font-size: 16px;
            background: #e94560;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
        ">Take Test Again</button>
    `;
    
    resultUI.style.display = 'block';
    
    // Show exit test button
    const exitBtn4 = document.getElementById('exitTestBtn');
    if (exitBtn4) exitBtn4.style.display = 'block';
    
    // Restart button handler
    document.getElementById('restartTestBtn').addEventListener('click', () => {
        resultUI.style.display = 'none';
        startTest();
    });
}

// Utility function to shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}