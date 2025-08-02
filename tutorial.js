// --- TUTORIAL SYSTEM ---

let isTutorialActive = false;
let currentTutorialStep = 0;
let tutorialSkillPoints = 300;

// Draggable prompt box logic
let isDragging = false;
let offsetX, offsetY;

const tutorialSteps = [
    // Step 0: Initial Prompt
    {
        title: "TUTORIAL",
        text: "This tutorial will guide you through creating a new agent file. Would you like to begin?",
        targetElement: null, // No spotlight for the initial prompt
        setup: () => {
            showView('main');
            document.getElementById('tutorial-box').innerHTML = `
                <h4>TUTORIAL</h4>
                <p>This tutorial will guide you through creating a new agent file. Would you like to begin?</p>
                <div class="tutorial-controls">
                    <button onclick="advanceTutorial()">BEGIN</button>
                    <button onclick="endTutorial()">CANCEL</button>
                </div>`;
        }
    },
    // Step 1: Create New Agent
    {
        title: "STEP 1: CREATE FILE",
        text: "Welcome, Recruit. Your first task is to open a new file. Click the highlighted 'CREATE NEW AGENT FILE' button to proceed.",
        targetElement: 'button[onclick*="character-sheet"]',
        spotlightPadding: 10,
        eventListener: (el) => el.click() // The button click itself advances the tutorial
    },
    // Step 2: Choose Branch
    {
        title: "STEP 2: BRANCH & RANK",
        text: "Every operative has a background. Select a Branch from the dropdown menu. For now, you will be assigned the lowest available rank. Promotion is earned through successful operations.",
        targetElement: '#branch',
        spotlightPadding: 20,
        spotlightGroup: ['#rank'], // Also highlight the rank dropdown
        eventListener: (el) => {
            el.addEventListener('change', advanceTutorial, { once: true });
        }
    },
    // Step 3: Core Attributes
    {
        title: "STEP 3: CORE ATTRIBUTES",
        text: "These are your innate strengths and weaknesses. Distribute all 25 points. A balanced operative is a versatile operative. You must use all points to continue.",
        targetElement: '#stats-container',
        spotlightPadding: 20,
        validation: () => {
            const pointsRemaining = parseInt(document.getElementById('stat-points-remaining').textContent, 10);
            return pointsRemaining === 0;
        }
    },
    // Step 4: Skills
    {
        title: "STEP 4: SKILLS",
        text: `You have <strong>300</strong> points to distribute among your skills. These represent your training. For this simulation, no single skill can exceed 80. Spend all points to proceed. <br><br>Points Remaining: <span id="tutorial-skill-points-counter">${tutorialSkillPoints}</span>`,
        targetElement: '#skills-container',
        spotlightPadding: 40,
        validation: () => {
            let totalSpent = 0;
            const skillInputs = document.querySelectorAll('#skills-container input[type="number"]');
            const baseValues = {};
            simpleSkills.forEach(skill => baseValues[`skill-${skill.replace(/\s+/g, '-')}`] = baseSkillValues[skill] || 0);

            skillInputs.forEach(input => {
                const baseValue = baseValues[input.id] || 0;
                let currentValue = parseInt(input.value, 10);

                if (currentValue > 80) {
                    input.value = 80; // Enforce max value
                    currentValue = 80;
                }
                
                totalSpent += (currentValue - baseValue);
            });
            
            tutorialSkillPoints = 300 - totalSpent;
            document.getElementById('tutorial-skill-points-counter').textContent = tutorialSkillPoints;

            return tutorialSkillPoints <= 0;
        }
    },
    // Step 5: Skill Improvement Roll
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "In the field, you learn under pressure. Check the box next to 'ALERTNESS' to mark it for improvement.",
        targetElement: '#check-skill-Alertness',
        spotlightPadding: 10,
        eventListener: (el) => {
             el.addEventListener('change', advanceTutorial, { once: true });
        }
    },
    // Step 5a: Click Roll Button
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "Good. Now, initiate the improvement roll by clicking the 'ROLL 1D4S' button that has appeared.",
        targetElement: '#roll-skills-btn',
        spotlightPadding: 10,
        eventListener: (el) => el.click(), // Clicking this will open the modal and advance
        setup: () => {
            // The modal opening is handled by the original button's onclick
            // We just need to listen for the modal to appear to move to the next step
            const observer = new MutationObserver((mutations) => {
                const modal = document.getElementById('skill-roll-modal');
                if (!modal.classList.contains('hidden')) {
                    observer.disconnect();
                    advanceTutorial();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    },
    // Step 5b: Confirm Roll
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "Confirm the action. This is final.",
        targetElement: '#skill-roll-prompt button[onclick*="executeSkillRolls"]',
        spotlightPadding: 15,
        spotlightNoRadius: true,
        eventListener: (el) => el.click(),
        setup: () => {
             const observer = new MutationObserver(() => {
                const conclusion = document.getElementById('skill-roll-conclusion');
                if (!conclusion.classList.contains('hidden')) {
                    observer.disconnect();
                    advanceTutorial();
                }
            });
            observer.observe(document.getElementById('skill-roll-modal'), { subtree: true, attributes: true });
        }
    },
    // Step 5c: Close Modal
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "The roll is complete and your skill has increased. Close the report.",
        targetElement: '#skill-roll-conclusion button',
        spotlightPadding: 15,
        spotlightNoRadius: true,
        eventListener: (el) => el.click(),
         setup: () => {
            const observer = new MutationObserver(() => {
                const modal = document.getElementById('skill-roll-modal');
                if (modal.classList.contains('hidden')) {
                    observer.disconnect();
                    advanceTutorial();
                }
            });
            observer.observe(document.getElementById('skill-roll-modal'), { attributes: true });
        }
    },
    // Step 6: Add Weapon
    {
        title: "STEP 6: LOADOUT",
        text: "An operative is only as good as their tools. Access the weapons locker by clicking '+ ADD WEAPON'.",
        targetElement: 'button[onclick*="openWeaponModal"]',
        spotlightPadding: 30,
        eventListener: (el) => el.click(),
        setup: () => {
            const observer = new MutationObserver(() => {
                const modal = document.getElementById('weapon-preset-modal');
                if (!modal.classList.contains('hidden')) {
                    observer.disconnect();
                    advanceTutorial();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    },
    // Step 6a: Choose Weapon
    {
        title: "STEP 6: LOADOUT",
        text: "For this simulation, select a standard sidearm. Find the 'Medium Pistol' in the list and click 'SELECT'.",
        targetElement: null, // No spotlight inside the modal
        setup: () => {
            // Find the correct button and add a listener to it
            const weaponButtons = document.querySelectorAll('#weapon-preset-list button');
            weaponButtons.forEach(button => {
                const preset = JSON.parse(button.getAttribute('onclick').match(/addWeapon\((.*?),/)[1]);
                if (preset.name === 'Medium Pistol') {
                    button.addEventListener('click', advanceTutorial, { once: true });
                }
            });
        }
    },
    // Step 7: Conclusion
    {
        title: "TUTORIAL COMPLETE",
        text: "You have successfully created an agent file. You are ready for your first assignment. Do not disappoint us. Welcome to SOCOM.",
        targetElement: null,
        setup: () => {
            document.getElementById('tutorial-box').innerHTML = `
                <h4>TUTORIAL COMPLETE</h4>
                <p>You have successfully created an agent file. You are ready for your first assignment. Do not disappoint us. Welcome to SOCOM.</p>
                <div class="tutorial-controls">
                    <button onclick="endTutorial()">FINISH</button>
                </div>`;
        }
    }
];

function startTutorial() {
    isTutorialActive = true;
    currentTutorialStep = 0;
    document.getElementById('tutorial-overlay').classList.remove('hidden');
    document.getElementById('tutorial-box').classList.remove('hidden');
    updateTutorialUI();
}

function endTutorial() {
    isTutorialActive = false;
    document.getElementById('tutorial-overlay').classList.add('hidden');
    document.getElementById('tutorial-box').classList.add('hidden');
    document.getElementById('tutorial-overlay').style.clipPath = ''; // Reset spotlight
    resetForm(); // Reset character sheet to clean state
    showView('main');
}

function advanceTutorial() {
    if (!isTutorialActive) return;
    currentTutorialStep++;
    if (currentTutorialStep >= tutorialSteps.length) {
        endTutorial();
    } else {
        updateTutorialUI();
    }
}

function updateTutorialUI() {
    const step = tutorialSteps[currentTutorialStep];
    const box = document.getElementById('tutorial-box');
    const overlay = document.getElementById('tutorial-overlay');

    // Run setup function if it exists
    if (step.setup) {
        step.setup();
    } else {
        // Default box content
         box.innerHTML = `
            <h4>${step.title}</h4>
            <p>${step.text}</p>
            <div class="tutorial-controls">
                ${!step.validation && !step.eventListener ? '<button onclick="advanceTutorial()">NEXT</button>' : ''}
                <button onclick="endTutorial()">CANCEL TUTORIAL</button>
            </div>`;
    }

    // Handle spotlight effect
    if (step.targetElement) {
        const target = document.querySelector(step.targetElement);
        if (target) {
            highlightElement(target, step.spotlightPadding, step.spotlightGroup, step.spotlightNoRadius);
        }
    } else {
        overlay.style.clipPath = ''; // No target, no spotlight
    }

    // Handle progression logic
    if (step.eventListener) {
        const target = document.querySelector(step.targetElement);
        if (target) {
            step.eventListener(target);
        }
    } else if (step.validation) {
        // Poll for validation
        const interval = setInterval(() => {
            if (!isTutorialActive || currentTutorialStep !== tutorialSteps.indexOf(step)) {
                clearInterval(interval);
                return;
            }
            if (step.validation()) {
                clearInterval(interval);
                advanceTutorial();
            }
        }, 250); // Check every 250ms
    }
}


function highlightElement(element, padding = 10, groupSelectors = [], noRadius = false) {
    const overlay = document.getElementById('tutorial-overlay');
    const rects = [element.getBoundingClientRect()];

    // Add grouped elements to the list of rectangles
    groupSelectors.forEach(selector => {
        const groupEl = document.querySelector(selector);
        if (groupEl) rects.push(groupEl.getBoundingClientRect());
    });

    // Combine all rectangles into one bounding box
    const combinedRect = rects.reduce((acc, rect) => {
        const left = Math.min(acc.left, rect.left);
        const top = Math.min(acc.top, rect.top);
        const right = Math.max(acc.right, rect.right);
        const bottom = Math.max(acc.bottom, rect.bottom);
        return { left, top, right, bottom, width: right - left, height: bottom - top };
    }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });

    const top = combinedRect.top - padding;
    const left = combinedRect.left - padding;
    const width = combinedRect.width + (padding * 2);
    const height = combinedRect.height + (padding * 2);
    const radius = noRadius ? '0' : '10px';

    overlay.style.clipPath = `polygon(
        0 0, 0 100%, 100% 100%, 100% 0, 0 0,
        ${left}px ${top}px,
        ${left}px ${top + height}px,
        ${left + width}px ${top + height}px,
        ${left + width}px ${top}px,
        ${left}px ${top}px
    )`;
}


// --- Draggability Setup ---
function makeDraggable() {
    const box = document.getElementById('tutorial-box');

    const onMouseDown = (e) => {
        isDragging = true;
        offsetX = e.clientX - box.offsetLeft;
        offsetY = e.clientY - box.offsetTop;
        box.style.cursor = 'grabbing';
    };

    const onMouseUp = () => {
        isDragging = false;
        box.style.cursor = 'grab';
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        box.style.left = `${e.clientX - offsetX}px`;
        box.style.top = `${e.clientY - offsetY}px`;
    };
    
    box.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
}
