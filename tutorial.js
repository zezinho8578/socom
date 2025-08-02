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
    // Step 1: Create New Agent (CORRECTED)
    {
        title: "STEP 1: CREATE FILE",
        text: "Welcome, Recruit. Your first task is to open a new file. Click the highlighted 'CREATE NEW AGENT FILE' button to proceed.",
        targetElement: 'button[onclick*="character-sheet"]',
        spotlightPadding: 10,
        eventListener: (el) => {
            // This is the correct way to handle it. The original button's onclick
            // already takes the user to the right view. We just need to advance
            // the tutorial when that happens.
            el.addEventListener('click', advanceTutorial, { once: true });
        }
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
            simpleSkills.forEach(skill => {
                const skillId = `skill-${skill.replace(/\s+/g, '-')}`;
                baseValues[skillId] = baseSkillValues[skill] || 0;
            });
            
             // Account for complex skills with base 0
            ['skill-milsci-land', 'skill-milsci-sea', 'skill-milsci-air', 'skill-pilot-airplane', 'skill-pilot-helicopter', 'skill-pilot-boat', 'skill-pilot-rc', 'skill-science-biology', 'skill-science-chemistry', 'skill-science-mathematics', 'skill-science-physics'].forEach(id => baseValues[id] = 0);


            skillInputs.forEach(input => {
                let baseValue = 0;
                // find base value for simple skills, craft, and languages
                if(baseValues[input.id] !== undefined) {
                    baseValue = baseValues[input.id];
                }

                let currentValue = parseInt(input.value, 10);
                if (isNaN(currentValue)) currentValue = 0;

                if (currentValue > 80) {
                    input.value = 80; // Enforce max value
                    currentValue = 80;
                }
                
                totalSpent += (currentValue - baseValue);
            });
            
            tutorialSkillPoints = 300 - totalSpent;
            const counter = document.getElementById('tutorial-skill-points-counter');
            if(counter) counter.textContent = tutorialSkillPoints;


            return tutorialSkillPoints <= 0;
        }
    },
    // Step 5: Skill Improvement Roll
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "In the field, you learn under pressure. Check the box next to 'ALERTNESS' to mark it for improvement.",
        targetElement: '#check-skill-Alertness',
        spotlightPadding: 10,
        spotlightGroup: ['label[for="skill-Alertness"]'],
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
        },
        eventListener: (el) => {
             el.addEventListener('click', () => { /* The observer handles advancement */ }, { once: true });
        }
    },
    // Step 5b: Confirm Roll
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "Confirm the action. This is final.",
        targetElement: '#skill-roll-prompt button[onclick*="executeSkillRolls"]',
        spotlightPadding: 15,
        spotlightNoRadius: true,
        setup: () => {
             const observer = new MutationObserver(() => {
                const conclusion = document.getElementById('skill-roll-conclusion');
                if (!conclusion.classList.contains('hidden')) {
                    observer.disconnect();
                    advanceTutorial();
                }
            });
            observer.observe(document.getElementById('skill-roll-modal'), { subtree: true, attributes: true, childList: true });
        },
        eventListener: (el) => {
            el.addEventListener('click', () => { /* The observer handles advancement */ }, { once: true });
        }
    },
    // Step 5c: Close Modal
    {
        title: "STEP 5: FIELD IMPROVEMENT",
        text: "The roll is complete and your skill has increased. Close the report.",
        targetElement: '#skill-roll-conclusion button',
        spotlightPadding: 15,
        spotlightNoRadius: true,
         setup: () => {
            const observer = new MutationObserver(() => {
                const modal = document.getElementById('skill-roll-modal');
                if (modal.classList.contains('hidden')) {
                    observer.disconnect();
                    advanceTutorial();
                }
            });
            observer.observe(document.getElementById('skill-roll-modal'), { attributes: true });
        },
        eventListener: (el) => {
             el.addEventListener('click', () => { /* The observer handles advancement */ }, { once: true });
        }
    },
    // Step 6: Add Weapon
    {
        title: "STEP 6: LOADOUT",
        text: "An operative is only as good as their tools. Access the weapons locker by clicking '+ ADD WEAPON'.",
        targetElement: 'button[onclick*="openWeaponModal"]',
        spotlightPadding: 30,
        setup: () => {
            const observer = new MutationObserver(() => {
                const modal = document.getElementById('weapon-preset-modal');
                if (!modal.classList.contains('hidden')) {
                    observer.disconnect();
                    advanceTutorial();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        },
        eventListener: (el) => {
             el.addEventListener('click', () => { /* The observer handles advancement */ }, { once: true });
        }
    },
    // Step 6a: Choose Weapon
    {
        title: "STEP 6: LOADOUT",
        text: "For this simulation, select a standard sidearm. Find the 'Medium Pistol' in the list and click 'SELECT'.",
        targetElement: null, // No spotlight inside the modal
        setup: () => {
            document.getElementById('weapon-category-select').value = "Firearms";
            populateWeaponPresets();
            // Find the correct button and add a listener to it
            const weaponButtons = document.querySelectorAll('#weapon-preset-list button');
            weaponButtons.forEach(button => {
                const presetText = button.getAttribute('onclick');
                if (presetText && presetText.includes('Medium Pistol')) {
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
    resetForm(); // Start with a fresh sheet
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
        // Use a tiny timeout to allow the DOM to update before we try to find the next element
        setTimeout(updateTutorialUI, 50);
    }
}

function updateTutorialUI() {
    const step = tutorialSteps[currentTutorialStep];
    const box = document.getElementById('tutorial-box');
    const overlay = document.getElementById('tutorial-overlay');

    // Default box content unless setup overrides it
     box.innerHTML = `
        <h4>${step.title}</h4>
        <p>${step.text}</p>
        <div class="tutorial-controls">
            ${!step.validation && !step.eventListener ? '<button onclick="advanceTutorial()">NEXT</button>' : ''}
            <button onclick="endTutorial()">CANCEL TUTORIAL</button>
        </div>`;

    // Run setup function if it exists
    if (step.setup) {
        step.setup();
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
    if(!element) {
        overlay.style.clipPath = '';
        return;
    };
    
    const rects = [element.getBoundingClientRect()];

    // Add grouped elements to the list of rectangles
    if(groupSelectors) {
        groupSelectors.forEach(selector => {
            const groupEl = document.querySelector(selector);
            if (groupEl) rects.push(groupEl.getBoundingClientRect());
        });
    }

    // Combine all rectangles into one bounding box
    const combinedRect = rects.reduce((acc, rect) => {
        if (!rect.width && !rect.height) return acc; // Skip empty rects
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
    const radius = noRadius ? '0' : '10px'; // This value is not used in clip-path, but good to have

    // A small value to prevent rendering issues on some browsers with perfect rectangles
    const Epsilon = 0.01;

    overlay.style.clipPath = `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${left + Epsilon}px ${top + Epsilon}px,
        ${left + Epsilon}px ${top + height - Epsilon}px,
        ${left + width - Epsilon}px ${top + height - Epsilon}px,
        ${left + width - Epsilon}px ${top + Epsilon}px,
        ${left + Epsilon}px ${top + Epsilon}px
    )`;
}


// --- Draggability Setup ---
function makeDraggable() {
    const box = document.getElementById('tutorial-box');
    const header = document.querySelector('#tutorial-box h4');

    const onMouseDown = (e) => {
        // only start dragging if the mousedown is on the box itself or its h4, not a button
        if(e.target.nodeName === 'BUTTON') return;
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
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        
        // Constrain to viewport
        const boxRect = box.getBoundingClientRect();
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + boxRect.width > window.innerWidth) newLeft = window.innerWidth - boxRect.width;
        if (newTop + boxRect.height > window.innerHeight) newTop = window.innerHeight - boxRect.height;
        
        box.style.left = `${newLeft}px`;
        box.style.top = `${newTop}px`;
    };
    
    box.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
}
