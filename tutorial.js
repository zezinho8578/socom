// --- SOCOM TUTORIAL SYSTEM (REWRITE) ---

let currentTutorialStep = 0;
let tutorialActive = false;
let originalTargetOnClick = null; // To store original onclick events

// --- Core Tutorial Steps Definition ---
const tutorialSteps = [
    {
        title: "TUTORIAL",
        text: "This tutorial will guide you through creating a new agent file. Would you like to begin?",
        setup: () => {
            showView('main');
            getEl('tutorial-box').innerHTML = `
                <h4>TUTORIAL</h4>
                <p>This tutorial will guide you through creating a new agent file. Would you like to begin?</p>
                <div class="tutorial-controls">
                    <button onclick="advanceTutorial()">BEGIN</button>
                    <button onclick="endTutorial()">CANCEL</button>
                </div>`;
        }
    },
    {
        title: "STEP 1: CREATE FILE",
        text: "Welcome, Recruit. Your first task is to open a new file. Click the highlighted 'CREATE NEW AGENT FILE' button to proceed.",
        targetSelector: 'button[onclick*="character-sheet"]',
        padding: 10
    },
    {
        title: "STEP 2: BRANCH & RANK",
        text: "Every operative has a background. Select a Branch from the dropdown menu. For now, you will be assigned the lowest available rank. Promotion is earned through successful operations.",
        targetSelector: '#branch',
        padding: 20,
        groupSelectors: ['#rank'],
        eventType: 'change'
    },
    {
        title: "STEP 3: CORE ATTRIBUTES",
        text: "These are your innate strengths and weaknesses. Distribute all 25 points. A balanced operative is a versatile operative. You must use all points to continue.",
        targetSelector: '#stats-container',
        padding: 20,
        validation: () => getEl('stat-points-remaining').textContent === '0'
    },
    {
        title: "STEP 4: SKILLS",
        text: `You have <strong>300</strong> points to distribute among your skills. These represent your training. For this simulation, no single skill can exceed 80. Spend all points to proceed. <br><br>Points Remaining: <span id="tutorial-skill-points-counter">300</span>`,
        targetSelector: '#skills-container',
        padding: 40,
        validation: () => {
            let totalSpent = 0;
            const skillInputs = document.querySelectorAll('#skills-container input[type="number"]');
            const baseValues = {};
             simpleSkills.forEach(skill => baseValues[`skill-${skill.replace(/\s+/g, '-')}`] = baseSkillValues[skill] || 0);
            ['skill-milsci-land', 'skill-milsci-sea', 'skill-milsci-air', 'skill-pilot-airplane', 'skill-pilot-helicopter', 'skill-pilot-boat', 'skill-pilot-rc', 'skill-science-biology', 'skill-science-chemistry', 'skill-science-mathematics', 'skill-science-physics'].forEach(id => baseValues[id] = 0);
            document.querySelectorAll('#craft-skills-container input[type="number"], #language-skills-container input[type="number"]').forEach(input => baseValues[input.id] = 0);
            
            skillInputs.forEach(input => {
                let baseValue = baseValues[input.id] || 0;
                let currentValue = parseInt(input.value, 10) || 0;
                if (currentValue > 80) { input.value = 80; currentValue = 80; }
                totalSpent += (currentValue - baseValue);
            });
            
            const pointsLeft = 300 - totalSpent;
            getEl('tutorial-skill-points-counter').textContent = pointsLeft;
            return pointsLeft <= 0;
        }
    },
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "In the field, you learn under pressure. Check the box next to 'ALERTNESS' to mark it for improvement.",
        targetSelector: '#check-skill-Alertness',
        padding: 10,
        groupSelectors: ['label[for="skill-Alertness"]'],
        eventType: 'change'
    },
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "Good. Now, initiate the improvement roll by clicking the 'ROLL 1D4S' button that has appeared.",
        targetSelector: '#roll-skills-btn',
        padding: 10
    },
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "Confirm the action. This is final.",
        targetSelector: '#skill-roll-prompt button[onclick*="executeSkillRolls"]',
        padding: 15
    },
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "The roll is complete and your skill has increased. Close the report.",
        targetSelector: '#skill-roll-conclusion button',
        padding: 15
    },
    {
        title: "STEP 6: LOADOUT",
        text: "An operative is only as good as their tools. Access the weapons locker by clicking '+ ADD WEAPON'.",
        targetSelector: 'button[onclick*="openWeaponModal"]',
        padding: 30
    },
    {
        title: "STEP 6: LOADOUT",
        text: "For this simulation, select a standard sidearm. Find the 'Medium Pistol' in the list and click 'SELECT'.",
        // This step is special, it has a setup function to find the target
        setup: () => {
            getEl('weapon-category-select').value = "Firearms";
            populateWeaponPresets();
            const weaponButtons = document.querySelectorAll('#weapon-preset-list button');
            weaponButtons.forEach(button => {
                if (button.getAttribute('onclick').includes('Medium Pistol')) {
                    // Temporarily hijack this button to advance the tutorial
                    button.onclick = () => {
                        addWeapon(JSON.parse(button.getAttribute('onclick').match(/addWeapon\((.*?),/)[1]), true);
                        advanceTutorial();
                    };
                }
            });
        }
    },
    {
        title: "TUTORIAL COMPLETE",
        text: "You have successfully created an agent file. You are ready for your first assignment. Do not disappoint us. Welcome to SOCOM.",
        setup: () => {
            getEl('tutorial-box').innerHTML = `
                <h4>TUTORIAL COMPLETE</h4>
                <p>You have successfully created an agent file. You are ready for your first assignment. Do not disappoint us. Welcome to SOCOM.</p>
                <div class="tutorial-controls">
                    <button onclick="endTutorial()">FINISH</button>
                </div>`;
            getEl('tutorial-spotlight').style.display = 'none';
        }
    }
];

// --- Helper & Utility Functions ---
const getEl = (id) => document.getElementById(id);
const queryEl = (selector) => document.querySelector(selector);

// --- Core Tutorial Functions ---
function startTutorial() {
    tutorialActive = true;
    currentTutorialStep = 0;
    resetForm();
    getEl('tutorial-overlay').classList.remove('hidden');
    getEl('tutorial-box').classList.remove('hidden');
    updateTutorialStep();
}

function endTutorial() {
    tutorialActive = false;
    getEl('tutorial-overlay').classList.add('hidden');
    getEl('tutorial-box').classList.add('hidden');
    resetForm();
    showView('main');
}

function advanceTutorial() {
    if (!tutorialActive) return;
    currentTutorialStep++;
    if (currentTutorialStep >= tutorialSteps.length) {
        endTutorial();
    } else {
        // Use a small delay to ensure the DOM is ready for the next step
        setTimeout(updateTutorialStep, 100);
    }
}

let validationInterval;
function updateTutorialStep() {
    clearInterval(validationInterval); // Stop any previous validation checks
    const step = tutorialSteps[currentTutorialStep];

    // Update the tutorial box content
    if (step.title && step.text) {
        getEl('tutorial-box').innerHTML = `
            <h4>${step.title}</h4>
            <p>${step.text}</p>
            <div class="tutorial-controls">
                <button onclick="endTutorial()">CANCEL TUTORIAL</button>
            </div>`;
    }

    // Run a custom setup function if it exists
    if (step.setup) {
        step.setup();
    }

    const target = step.targetSelector ? queryEl(step.targetSelector) : null;
    updateSpotlight(target, step.padding, step.groupSelectors);

    if (step.validation) {
        validationInterval = setInterval(() => {
            if (step.validation()) {
                clearInterval(validationInterval);
                advanceTutorial();
            }
        }, 250);
    } else if (target) {
        const eventType = step.eventType || 'click';
        // Hijack the element's default action to advance the tutorial
        originalTargetOnClick = target.onclick;
        target.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (originalTargetOnClick) originalTargetOnClick();
            target.onclick = originalTargetOnClick; // Restore original behavior
            advanceTutorial();
        };
        // For non-click events like 'change'
        if (eventType !== 'click') {
             target.addEventListener(eventType, advanceTutorial, { once: true });
             target.onclick = null; // clear the click hijack for change events
        }
    }
}

function updateSpotlight(target, padding = 0, groupSelectors = []) {
    const spotlight = getEl('tutorial-spotlight');
    if (!target) {
        spotlight.style.display = 'none';
        return;
    }
    spotlight.style.display = 'block';

    const rect = target.getBoundingClientRect();
    spotlight.style.left = `${rect.left - padding}px`;
    spotlight.style.top = `${rect.top - padding}px`;
    spotlight.style.width = `${rect.width + (padding * 2)}px`;
    spotlight.style.height = `${rect.height + (padding * 2)}px`;
}


// --- Draggability ---
function initializeTutorial() {
    const box = getEl('tutorial-box');
    let isDragging = false;
    let offsetX, offsetY;

    const onMouseDown = (e) => {
        if (e.target.nodeName === 'BUTTON') return;
        isDragging = true;
        offsetX = e.clientX - box.offsetLeft;
        offsetY = e.clientY - box.offsetTop;
        box.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    };
    const onMouseUp = () => {
        isDragging = false;
        box.style.cursor = 'grab';
        document.body.style.userSelect = '';
    };
    const onMouseMove = (e) => {
        if (!isDragging) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        box.style.left = `${x}px`;
        box.style.top = `${y}px`;
    };

    box.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
}
