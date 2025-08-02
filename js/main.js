// --- GLOBAL DATA & CONFIG ---
let isAdmin = false;
let statsUnlocked = false;
let isArmorActive = false;
let currentArmorPoints = 0;

// Data will be loaded from JSON files
let skillDescriptions = {};
let weaponPresets = {};
let armorPresets = [];

const ADMIN_PASSWORD_HASH = 'dmFsa3lyaWU=';
const MAX_STAT_POINTS = 25, MIN_STAT_VALUE = 8, MAX_STAT_VALUE = 18;
const branches = { "NSA": "intelligence", "CIA": "intelligence", "Army": "army", "Navy": "navy", "Marines": "marines", "Air Force": "airforce" };
const ranks = { intelligence: [ {name: "Case Officer", grade: "GS-11"}, {name: "Supervisory CO", grade: "GS-14", adminOnly: true}, {name: "Chief of Station", grade: "SIS-2", adminOnly: true} ], army: [ {name: "Sergeant", grade: "E-5"}, {name: "Staff Sergeant", grade: "E-6"}, {name: "Sergeant First Class", grade: "E-7"}, {name: "Master Sergeant", grade: "E-8", adminOnly: true}, {name: "Second Lieutenant", grade: "O-1", adminOnly: true}, {name: "First Lieutenant", grade: "O-2", adminOnly: true}, {name: "Captain", grade: "O-3", adminOnly: true} ], marines: [ {name: "Sergeant", grade: "E-5"}, {name: "Staff Sergeant", grade: "E-6"}, {name: "Gunnery Sergeant", grade: "E-7"}, {name: "Master Sergeant", grade: "E-8", adminOnly: true}, {name: "Second Lieutenant", grade: "O-1", adminOnly: true}, {name: "First Lieutenant", grade: "O-2", adminOnly: true}, {name: "Captain", grade: "O-3", adminOnly: true} ], navy: [ {name: "Petty Officer 2nd Class", grade: "E-5"}, {name: "Petty Officer 1st Class", grade: "E-6"}, {name: "Chief Petty Officer", grade: "E-7"}, {name: "Senior Chief Petty Officer", grade: "E-8", adminOnly: true}, {name: "Ensign", grade: "O-1", adminOnly: true}, {name: "Lieutenant (JG)", grade: "O-2", adminOnly: true}, {name: "Lieutenant", grade: "O-3", adminOnly: true} ], airforce: [ {name: "Staff Sergeant", grade: "E-5"}, {name: "Technical Sergeant", grade: "E-6"}, {name: "Master Sergeant", grade: "E-7"}, {name: "Senior Master Sergeant", grade: "E-8", adminOnly: true}, {name: "Second Lieutenant", grade: "O-1", adminOnly: true}, {name: "First Lieutenant", grade: "O-2", adminOnly: true}, {name: "Captain", grade: "O-3", adminOnly: true} ] };
const stats = ["STR", "DEX", "CON", "INT", "POW", "CHA"];
const simpleSkills = [ "Accounting", "Alertness", "Artillery", "Athletics", "Criminology", "Disguise", "Dodge", "Drive", "Firearms", "First Aid", "Forensics", "Heavy Machinery", "Heavy Weapons", "Human Studies", "HUMINT", "Leadership", "Medicine", "Melee Weapons", "Navigate", "Paranormal", "Persuade", "Pharmacy", "Psychotherapy", "Ride", "Search", "SIGINT", "Stealth", "Support Int.", "Surgery", "Survival", "Swim", "Tech Procedures", "Unarmed Combat" ].sort();
const baseSkillValues = { 'Accounting': 10, 'Alertness': 20, 'Athletics': 30, 'Disguise': 10, 'Dodge': 30, 'Drive': 20, 'Firearms': 20, 'First Aid': 10, 'Heavy Machinery': 10, 'Heavy Weapons': 10, 'Human Studies': 10, 'Melee Weapons': 30, 'Navigate': 10, 'Paranormal': 10, 'Persuade': 20, 'Psychotherapy': 10, 'Ride': 10, 'Search': 20, 'Stealth': 20, 'Survival': 10, 'Swim': 20, 'Tech Procedures': 20, 'Unarmed Combat': 40 };
const statDescriptions = { STR: { 3: "Frail", 6: "Below Average", 9: "Average", 12: "Strong", 15: "Powerful", 18: "Peak Human" }, DEX: { 3: "Clumsy", 6: "Slow", 9: "Average", 12: "Agile", 15: "Nimble", 18: "Lightning Reflexes" }, CON: { 3: "Sickly", 6: "Frail", 9: "Average", 12: "Hardy", 15: "Tough", 18: "Superhuman Endurance" }, INT: { 3: "Dim", 6: "Slow Learner", 9: "Average", 12: "Sharp", 15: "Brilliant", 18: "Genius" }, POW: { 3: "Weak-willed", 6: "Hesitant", 9: "Average", 12: "Determined", 15: "Indomitable", 18: "Unyielding Will" }, CHA: { 3: "Unlikable", 6: "Awkward", 9: "Average", 12: "Likable", 15: "Charismatic", 18: "Compelling Presence" } };


// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeApplication);

async function initializeApplication() {
    try {
        // 1. Inject HTML from templates before doing anything else
        injectHtmlFromTemplates();

        // 2. Fetch all necessary data in parallel
        const [skillDescData, weaponPresetData, armorPresetData, historyData] = await Promise.all([
            fetch('data/skill_descriptions.json').then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); }),
            fetch('data/weapon_presets.json').then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); }),
            fetch('data/armor_presets.json').then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); }),
            fetch('history.json').then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); })
        ]);

        // 3. Assign fetched data to global variables
        skillDescriptions = skillDescData;
        weaponPresets = weaponPresetData;
        armorPresets = armorPresetData;

        // 4. Run the rest of the setup functions
        loadDailyHistory(historyData);
        populateBranches();
        populateStats();
        populateSkills();
        loadSavedSheets();
        applySavedTheme();
        setupTooltips();
        populateWeaponCategories();

        // 5. Add event listeners that were previously in window.onload or inline
        window.add('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
        document.getElementById('settings-btn').addEventListener('click', () => { document.getElementById('settings-menu').style.display = document.getElementById('settings-menu').style.display === 'block' ? 'none' : 'block'; });
        document.getElementById('lock-branch-rank-checkbox').addEventListener('change', updateBranchRankLockState);
        document.getElementById('skills-container').addEventListener('input', updateLinkedWeaponStats);
        document.getElementById('skills-container').addEventListener('change', (event) => { if (event.target.type === 'checkbox') { updateRollSkillsButtonVisibility(); } });
         document.body.addEventListener('click', handleTutorialAction, true); // Use capture phase

    } catch (error) {
        console.error("Failed to initialize the application:", error);
        document.body.innerHTML = `<h1>FATAL ERROR</h1><p>Could not load application data. Please ensure all data files (e.g., skill_descriptions.json, weapon_presets.json) are present in their respective folders and correctly formatted. Check the console (F12) for more details.</p>`;
    }
}

function injectHtmlFromTemplates() {
    const mainContainerContent = document.getElementById('template-main-container').content.cloneNode(true);
    document.querySelector('.container').appendChild(mainContainerContent);

    const sheetFormContent = document.getElementById('template-sheet-form').content.cloneNode(true);
    document.getElementById('sheet-form').appendChild(sheetFormContent);
}

// --- NEW CODE: Tutorial System Globals ---
let tutorialState = {
    isActive: false,
    currentStep: 0,
};

const tutorialSteps = [
    {
        title: "SYSTEM TUTORIAL INITIATED",
        text: "This protocol will guide you through the agent creation and file management process. All other system functions will be locked until the tutorial is complete or cancelled. Press BEGIN to proceed.",
        isIntro: true // Special flag for the very first screen
    },
    {
        title: "CONFIRMATION",
        text: "You are about to access the agent creation module. This is where all new operative files are generated. Do you wish to continue?",
        isConfirmation: true, // Special flag for the confirmation step
        nextStepAction: () => {
            resetForm(); // Ensure a clean slate
            showView('main'); // Go to the main menu
        }
    },
    {
        targetElement: '#main-view .main-menu button:nth-of-type(1)',
        actionTarget: '#main-view .main-menu button:nth-of-type(1)', // The element to click
        waitForAction: true, // This step requires a click to advance
        title: "STEP 1: CREATE AGENT FILE",
        text: "Your first task is to access the file creation interface. Select the highlighted option to proceed.",
        nextStepAction: () => showView('character-sheet') // Action to take after the click
    },
    {
        targetElement: '#character-sheet-view .form-section:first-of-type .grid-container > div:first-of-type',
        title: "STEP 2: IDENTIFICATION",
        text: "Enter your agent's full name. The system requires a minimum of 5 characters for a valid file.",
        validation: {
            inputElement: '#full-name',
            minLength: 5
        }
    }
];

// --- DAILY HISTORY FEED ---
function loadDailyHistory(historyData) {
    const contentEl = document.getElementById('history-content');
    const titleEl = document.getElementById('history-title');
    const imageEl = document.getElementById('history-image');

    const today = new Date();
    const month = today.getMonth() + 1; // JS months are 0-11
    const day = today.getDate();
    const dateString = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${today.getFullYear()}`;
    titleEl.textContent = `THIS DAY IN HISTORY // ${dateString}`;

    try {
        const todayEvent = historyData.find(item => item.month === month && item.day === day);
        if (todayEvent) {
            contentEl.textContent = todayEvent.event;
            if (todayEvent.image_url) {
                imageEl.src = todayEvent.image_url;
                imageEl.alt = todayEvent.image_alt || "Historical event";
                imageEl.style.display = 'block';
            } else { imageEl.style.display = 'none'; }
        } else { contentEl.textContent = 'No significant military events recorded for this date.'; imageEl.style.display = 'none'; }
    } catch (error) {
        console.error('Error processing historical data:', error);
        contentEl.textContent = 'Failed to load historical data. Ensure history.json is valid.';
        imageEl.style.display = 'none';
    }
}

// --- FORM & UI INITIALIZATION ---
function resetForm() {
    document.getElementById('sheet-form').reset();
    document.getElementById('bonds-container').innerHTML = '';
    document.getElementById('weapons-body').innerHTML = '';
    deactivateArmor();
    populateSkills(); populateStats(); addBond(); addBond(); addBond(); addDefaultUnarmed(); updateAllCalculations(); checkAdaptedStatus(); setupTooltips();
    document.getElementById('lock-branch-rank-checkbox').checked = false;
    updateBranchRankLockState();
    updateRollSkillsButtonVisibility();
}

function populateBranches() { document.getElementById('branch').innerHTML = Object.keys(branches).map(b => `<option value="${b}">${b.toUpperCase()}</option>`).join(''); }
function populateStats() { document.getElementById('stats-container').innerHTML = stats.map(stat => `<div class="stat-item"><div class="stat-header"><label>${stat}</label><button type="button" onclick="changeStat('${stat}', -1)">-</button><input type="number" id="${stat}" value="${MIN_STAT_VALUE}" readonly oninput="updateAllCalculations()"><button type="button" onclick="changeStat('${stat}', 1)">+</button><span id="${stat}x5">x5: 0</span></div><div id="${stat}-desc" class="stat-desc"></div></div>`).join(''); }
function populateSkills() { const container = document.getElementById('skills-container'); let html = '<div class="grid-container" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); grid-auto-rows: min-content; align-items: start;">'; html += simpleSkills.map(skill => { const baseValue = baseSkillValues[skill] || 0; const skillId = `skill-${skill.replace(/\s+/g, '-')}`; return `<div class="skill-item-simple"><label class="styled-checkbox"><input type="checkbox" id="check-${skillId}"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label for="${skillId}" data-skill="${skill}">${skill.toUpperCase()}</label><input type="number" id="${skillId}" min="0" max="100" value="${baseValue}"></div></div>`; }).join(''); html += '</div>'; html += '<div class="grid-container" style="grid-template-columns: 1fr 1fr; align-items: stretch; margin-top: 10px;">'; html += `<div><div class="sub-skill-group"> <h3 class="sub-skill-header" data-skill="Military Science">Military Science</h3> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-milsci-land"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Military Science">Land</label><input type="number" id="skill-milsci-land" value="0" min="0" max="100"></div></div> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-milsci-sea"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Military Science">Sea</label><input type="number" id="skill-milsci-sea" value="0" min="0" max="100"></div></div> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-milsci-air"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Military Science">Air</label><input type="number" id="skill-milsci-air" value="0" min="0" max="100"></div></div> </div><div class="sub-skill-group" style="margin-top: 10px;"> <h3 class="sub-skill-header" data-skill="Pilot">Pilot</h3> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-pilot-airplane"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Pilot">Airplane</label><input type="number" id="skill-pilot-airplane" value="0" min="0" max="100"></div></div> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-pilot-helicopter"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Pilot">Helicopter</label><input type="number" id="skill-pilot-helicopter" value="0" min="0" max="100"></div></div> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-pilot-boat"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Pilot">Boat</label><input type="number" id="skill-pilot-boat" value="0" min="0" max="100"></div></div> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-pilot-rc"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Pilot">RC/Drone</label><input type="number" id="skill-pilot-rc" value="0" min="0" max="100"></div></div> </div></div>`; html += `<div class="sub-skill-group"> <h3 class="sub-skill-header" data-skill="Science">Science</h3> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-science-biology"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Science">Biology</label><input type="number" id="skill-science-biology" value="0" min="0" max="100"></div></div> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-science-chemistry"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Science">Chemistry</label><input type="number" id="skill-science-chemistry" value="0" min="0" max="100"></div></div> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-science-mathematics"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Science">Mathematics</label><input type="number" id="skill-science-mathematics" value="0" min="0" max="100"></div></div> <div class="sub-skill-item"><label class="styled-checkbox"><input type="checkbox" id="check-skill-science-physics"><span class="checkbox-visual"></span></label><div class="skill-label-input"><label data-skill="Science">Physics</label><input type="number" id="skill-science-physics" value="0" min="0" max="100"></div></div> </div>`; html += '</div>'; html += '<div class="grid-container" style="grid-template-columns: 1fr 1fr; margin-top: 10px;">'; html += `<div class="sub-skill-group"> <div class="sub-skill-header-flex"><h3 class="sub-skill-header" data-skill="Craft">Craft</h3><button type="button" onclick="addCraftSkill()">+ ADD</button></div> <div id="craft-skills-container"></div> </div>`; html += `<div class="sub-skill-group"> <div class="sub-skill-header-flex"><h3 class="sub-skill-header">Foreign Language</h3><button type="button" onclick="addLanguageSkill()">+ ADD</button></div> <div id="language-skills-container"></div> </div>`; html += '</div>'; container.innerHTML = html; }

// --- TOOLTIP MANAGEMENT ---
function setupTooltips() {
    const tooltip = document.getElementById('skill-tooltip');
    const skillLabels = document.querySelectorAll('[data-skill]');

    skillLabels.forEach(label => {
        label.addEventListener('mouseover', (e) => { const skillName = e.target.dataset.skill; const description = skillDescriptions[skillName]; if (description) { tooltip.innerHTML = description; tooltip.classList.remove('hidden'); } });
        label.addEventListener('mousemove', (e) => { tooltip.style.left = `${e.pageX + 15}px`; tooltip.style.top = `${e.pageY + 15}px`; });
        label.addEventListener('mouseout', () => { tooltip.classList.add('hidden'); });
    });
}

// --- THEME MANAGEMENT ---
function changeTheme(theme) { localStorage.setItem('socom_theme', theme); applyCurrentTheme(theme); }
function applyCurrentTheme(theme) { document.body.className = ''; if (isAdmin) document.body.classList.add('admin-mode'); if (theme !== 'default') document.body.classList.add(theme + '-theme'); }
function applySavedTheme() { const savedTheme = localStorage.getItem('socom_theme'); if (savedTheme) applyCurrentTheme(savedTheme); else applyAutoTheme(); }
function applyAutoTheme() {
    const savedTheme = localStorage.getItem('socom_theme');
    if (savedTheme && savedTheme !== 'default' && savedTheme !== 'army') { applyCurrentTheme(savedTheme); return; } 
    document.body.className = ''; if (isAdmin) document.body.classList.add('admin-mode');
    const rankSelect = document.getElementById('rank');
    const grade = rankSelect.options[rankSelect.selectedIndex]?.dataset.grade;
    const officerGrades = ['O-1','O-2','O-3','GS-14','SIS-2'];
    if (grade && officerGrades.includes(grade)) { document.body.classList.add('officer-theme'); return; }
    const branchType = branches[document.getElementById('branch').value];
    if (branchType && branchType !== 'army') { document.body.classList.add(branchType + '-theme'); }
}

// --- VIEW MANAGEMENT & UI/CALCS ---
function showView(viewId) { document.querySelectorAll('main').forEach(el => el.classList.add('hidden')); const viewEl = document.getElementById(`${viewId}-view`); if(viewEl){ viewEl.classList.remove('hidden'); if(viewId === 'loader') loadSavedSheets();} }
function updateRanks() { const rankType = branches[document.getElementById('branch').value] || 'intelligence'; const rankOptions = ranks[rankType].map(r => { const isDisabled = r.adminOnly && !isAdmin; const label = `${r.name} (${r.grade})${r.adminOnly ? ' 🔒' : ''}`; return `<option value="${r.name}" data-grade="${r.grade}" ${isDisabled ? 'disabled' : ''}>${label}</option>`; }).join(''); document.getElementById('rank').innerHTML = rankOptions; applyAutoTheme(); }
function changeStat(stat, delta) { if (statsUnlocked) return; const input = document.getElementById(stat); let pointsSpent = stats.reduce((acc, s) => acc + (parseInt(document.getElementById(s).value) - MIN_STAT_VALUE), 0); let currentValue = parseInt(input.value); if (delta > 0 && pointsSpent < MAX_STAT_POINTS && currentValue < MAX_STAT_VALUE) { input.value = currentValue + 1; } else if (delta < 0 && currentValue > MIN_STAT_VALUE) { input.value = currentValue - 1; } updateAllCalculations(); }
function updateAllCalculations() { let pointsSpent = 0; stats.forEach(stat => { const value = parseInt(document.getElementById(stat).value); pointsSpent += (value - MIN_STAT_VALUE); document.getElementById(`${stat}x5`).textContent = `x5: ${value * 5}`; document.getElementById(`${stat}-desc`).textContent = getStatDescription(stat, value); }); document.getElementById('stat-points-remaining').textContent = MAX_STAT_POINTS - pointsSpent; updateDerivedAttributes(); updateBondScores(); updateLinkedWeaponStats(); }
function updateDerivedAttributes() {
    const str = parseInt(document.getElementById('STR').value), con = parseInt(document.getElementById('CON').value), pow = parseInt(document.getElementById('POW').value);
    const hpMaxInput = document.getElementById('hp-max'), wpMaxInput = document.getElementById('wp-max'), sanMaxInput = document.getElementById('san-max'), bpInput = document.getElementById('bp');
    if (!isAdmin) { hpMaxInput.value = Math.ceil((str + con) / 2); wpMaxInput.value = pow; sanMaxInput.value = pow * 5; bpInput.value = Math.max(0, parseInt(sanMaxInput.value) - pow); }
    const hpCurrent = document.getElementById('hp-current'); hpCurrent.max = parseInt(hpMaxInput.value); if(!hpCurrent.value || parseInt(hpCurrent.value) > hpCurrent.max) hpCurrent.value = hpCurrent.max;
    const wpCurrent = document.getElementById('wp-current'); wpCurrent.max = parseInt(wpMaxInput.value); if(!wpCurrent.value || parseInt(wpCurrent.value) > wpCurrent.max) wpCurrent.value = wpCurrent.max;
    const sanCurrent = document.getElementById('san-current'); sanCurrent.max = parseInt(sanMaxInput.value); if(!sanCurrent.value || parseInt(sanCurrent.value) > sanCurrent.max) sanCurrent.value = sanCurrent.max;
    checkBreakingPoint();
}
function checkBreakingPoint() { const sanCurrent = parseInt(document.getElementById('san-current').value), bp = parseInt(document.getElementById('bp').value); document.getElementById('bp-warning').classList.toggle('hidden', sanCurrent > bp); }
function acknowledgeBreakingPoint() { document.getElementById('bp').value = Math.max(0, parseInt(document.getElementById('san-current').value) - parseInt(document.getElementById('POW').value)); document.getElementById('bp-warning').classList.add('hidden'); }
function getStatDescription(stat, val) { const tiers = statDescriptions[stat]; let desc = tiers[val] || ''; for (const key in tiers) { if (val >= key) desc = tiers[key]; } return `// ${desc}`; }

// --- SKILL IMPROVEMENT ---
function updateRollSkillsButtonVisibility() {
    const checkedSkills = document.querySelectorAll('#skills-container input[type="checkbox"]:checked');
    document.getElementById('roll-skills-btn').classList.toggle('hidden', checkedSkills.length === 0);
}

function startSkillImprovement() {
    document.getElementById('skill-roll-modal').classList.remove('hidden');
    document.getElementById('skill-roll-prompt').classList.remove('hidden');
    document.getElementById('skill-roll-process').classList.add('hidden');
    document.getElementById('skill-roll-conclusion').classList.add('hidden');
}

function closeSkillRollModal() {
    document.getElementById('skill-roll-modal').classList.add('hidden');
}

async function executeSkillRolls() {
    const checkedBoxes = Array.from(document.querySelectorAll('#skills-container input[type="checkbox"]:checked'));
    const skillsToRoll = [];

    for (const box of checkedBoxes) {
        const skillItem = box.closest('.skill-item-simple, .sub-skill-item');
        if (!skillItem) continue;

        const scoreInput = skillItem.querySelector('input[type="number"]');
        let skillName = "Unknown Skill";

        // Determine the skill's name for display
        if (skillItem.classList.contains('skill-item-simple')) {
            skillName = skillItem.querySelector('.skill-label-input label').textContent.trim();
        } else {
            const craftSelect = skillItem.querySelector('select[data-skill="Craft"]');
            const langInput = skillItem.querySelector('input[placeholder="Language"]');
            if (craftSelect) {
                skillName = `Craft: ${craftSelect.value}`;
            } else if (langInput) {
                skillName = `Language: ${langInput.value || '(Unnamed)'}`;
            } else {
                const group = skillItem.closest('.sub-skill-group');
                const header = group.querySelector('.sub-skill-header');
                const subTypeName = skillItem.querySelector('.skill-label-input label').textContent.trim();
                const headerName = header.textContent.trim();
                skillName = `${headerName}: ${subTypeName}`;
            }
        }
        
        const currentScore = parseInt(scoreInput.value, 10);
        if (currentScore >= 99) {
            alert(`ERROR: Skill "${skillName}" is already at its maximum value (99). Cannot improve further.`);
            closeSkillRollModal();
            return;
        }
        
        skillsToRoll.push({ name: skillName, checkbox: box, input: scoreInput, currentScore: currentScore });
    }

    if (skillsToRoll.length === 0) {
        closeSkillRollModal();
        return;
    }
    
    document.getElementById('skill-roll-prompt').classList.add('hidden');
    document.getElementById('skill-roll-process').classList.remove('hidden');

    const skillNameEl = document.getElementById('rolling-skill-name');
    const diceEl = document.getElementById('dice-animation');
    const resultEl = document.getElementById('roll-result-text');

    for (const skill of skillsToRoll) {
        skillNameEl.textContent = `ROLLING: ${skill.name.toUpperCase()}`;
        resultEl.textContent = '';
        
        const animationInterval = setInterval(() => { diceEl.textContent = Math.floor(Math.random() * 4) + 1; }, 100);
        await new Promise(resolve => setTimeout(resolve, 4000));
        clearInterval(animationInterval);

        const roll = Math.floor(Math.random() * 4) + 1;
        diceEl.textContent = roll;
        
        const newScore = Math.min(99, skill.currentScore + roll);
        skill.input.value = newScore;
        
        resultEl.textContent = `Result: +${roll}. New Score: ${newScore}.`;
        skill.checkbox.checked = false;
        await new Promise(resolve => setTimeout(resolve, 2500));
    }

    document.getElementById('skill-roll-process').classList.add('hidden');
    document.getElementById('skill-roll-conclusion').classList.remove('hidden');
    updateRollSkillsButtonVisibility();
}

// --- INTERACTIVE SECTIONS ---
function checkAdaptedStatus() { const violenceCount = document.querySelectorAll('#violence1:checked, #violence2:checked, #violence3:checked').length; document.getElementById('violence-adapted').classList.toggle('hidden', violenceCount < 3); const helplessnessCount = document.querySelectorAll('#helplessness1:checked, #helplessness2:checked, #helplessness3:checked').length; document.getElementById('helplessness-adapted').classList.toggle('hidden', helplessnessCount < 3); }
function addCraftSkill(data = {}){ const container = document.getElementById('craft-skills-container'); const item = document.createElement('div'); item.className = 'sub-skill-item'; const craftTypes = ['Gunsmith', 'Locksmith', 'Mechanic', 'Microelectronics', 'Explosives']; let options = craftTypes.map(c => `<option value="${c}" ${c === data.type ? 'selected' : ''}>${c}</option>`).join(''); item.innerHTML = `<label class="styled-checkbox"><input type="checkbox" ${data.checked ? 'checked' : ''}><span class="checkbox-visual"></span></label><div class="skill-label-input"><select data-skill="Craft">${options}</select><input type="number" min="0" max="100" value="${data.score || 0}"></div><button class="remove-btn" onclick="this.parentElement.remove()">X</button>`; container.appendChild(item); setupTooltips(); }
function addLanguageSkill(data = {}){ const container = document.getElementById('language-skills-container'); const item = document.createElement('div'); item.className = 'sub-skill-item'; item.innerHTML = `<label class="styled-checkbox"><input type="checkbox" ${data.checked ? 'checked' : ''}><span class="checkbox-visual"></span></label><div class="skill-label-input"><input type="text" placeholder="Language" value="${data.lang || ''}"><input type="number" min="0" max="100" value="${data.score || 0}"></div><button class="remove-btn" onclick="this.parentElement.remove()">X</button>`; container.appendChild(item); }
function addBond(data = {}) { const container = document.getElementById('bonds-container'); const item = document.createElement('div'); item.className = 'bond-item'; item.innerHTML = `<label class="styled-checkbox"><input type="checkbox" ${data.checked ? 'checked' : ''}><span class="checkbox-visual"></span></label><input type="text" placeholder="Bond Name" value="${data.name || ''}"><select class="bond-score"></select><button class="remove-btn" onclick="this.parentElement.remove()">X</button>`; container.appendChild(item); updateBondScores(); if(data.score) item.querySelector('.bond-score').value = data.score; }
function updateBondScores() { const cha = parseInt(document.getElementById('CHA').value) || 0; document.getElementById('bond-cha-note').textContent = `MAX SCORE: ${cha}`; document.querySelectorAll('.bond-score').forEach(select => { const currentScore = select.value; let options = ''; for (let i = 0; i <= cha; i++) { options += `<option value="${i}">${i}</option>`; } select.innerHTML = options; select.value = Math.min(currentScore, cha); }); }

// --- WEAPON MANAGEMENT ---
function addDefaultUnarmed() { const unarmedPreset = weaponPresets["Melee Weapons"][0]; addWeapon(unarmedPreset); }
function getCalculatedSkill(skillIdentifier) {
    if (!skillIdentifier) return 20;
    const get = (id, fallback) => parseInt(document.getElementById(id)?.value) || fallback;
    
    switch(skillIdentifier) {
        case 'Unarmed Combat': return get('skill-Unarmed-Combat', 40);
        case 'Melee Weapons': return get('skill-Melee-Weapons', 30);
        case 'DEX*5': return (get('DEX', 10) * 5);
        case 'Firearms': return get('skill-Firearms', 20);
        case 'Athletics': return get('skill-Athletics', 30);
        case 'Athletics+20': return Math.min(99, get('skill-Athletics', 30) + 20);
        case 'Heavy Weapons': return get('skill-Heavy-Weapons', 10);
        case 'Science':
            const scienceSkills = ['skill-science-biology', 'skill-science-chemistry', 'skill-science-mathematics', 'skill-science-physics'];
            return Math.max(...scienceSkills.map(id => get(id, 0)), 10); // Use 10 as a base for science
        default: return parseInt(skillIdentifier) || 20;
    }
}

function updateLinkedWeaponStats() {
    const weaponRows = document.querySelectorAll('#weapons-body tr');
    weaponRows.forEach(row => {
        const skillIdentifier = row.dataset.skillIdentifier;
        if (!skillIdentifier) return; // Skip if this weapon isn't linked to a skill

        // --- Part 1: Update the Skill Value ---
        const newSkillValue = getCalculatedSkill(skillIdentifier);
        const skillInput = row.cells[1].querySelector('input');
        if (skillInput) {
            skillInput.value = newSkillValue;
        }

        // --- Part 2: Update the Damage Value based on Skill ---
        const baseDamage = row.dataset.baseDamage;
        const damageInput = row.cells[3].querySelector('input');

        // Only apply bonus to Unarmed and Melee weapons that have a base damage value
        if ((skillIdentifier === 'Unarmed Combat' || skillIdentifier === 'Melee Weapons') && baseDamage && damageInput) {
            let bonus = 0;
            if (newSkillValue > 90) bonus = 3;
            else if (newSkillValue > 75) bonus = 2;
            else if (newSkillValue > 50) bonus = 1;

            if (bonus > 0) {
                const dicePart = baseDamage.split(/[-+]/)[0].trim();
                damageInput.value = `${dicePart}+${bonus}`;
            } else {
                damageInput.value = baseDamage;
            }
        }
    });
}

function addWeapon(preset, closeModal = false) {
    const newRow = document.getElementById('weapons-body').insertRow();
    const defaultData = { name: '', skill: '', range: '', dmg: '', ap: '', lethality: '', ammoC: '', ammoM: '' };
    const effectivePreset = preset || {};

    let finalData;
    if (effectivePreset.skillIdentifier) {
        const calculatedSkill = getCalculatedSkill(effectivePreset.skillIdentifier);
        finalData = { ...defaultData, ...effectivePreset, skill: calculatedSkill };
    } else {
        finalData = { ...defaultData, ...effectivePreset };
    }

    newRow.dataset.skillIdentifier = finalData.skillIdentifier || '';
    newRow.dataset.baseDamage = finalData.dmg || '';
    newRow.innerHTML = `<td><input type="text" value="${finalData.name}"></td><td><input type="number" min="0" max="99" value="${finalData.skill}"></td><td><div class="input-group"><input type="number" min="0" value="${finalData.range}"><span class="input-group-addon">m</span></div></td><td><input type="text" value="${finalData.dmg}"></td><td><input type="text" value="${finalData.ap}"></td><td><div class="input-group"><input type="number" min="0" max="100" value="${finalData.lethality}"><span class="input-group-addon">%</span></div></td><td><div class="derived-attr-input"><input type="number" min="0" value="${finalData.ammoC}"> / <input type="number" min="0" value="${finalData.ammoM}"></div></td><td><button type="button" class="remove-btn" onclick="this.closest('tr').remove()">X</button></td>`;
    if (closeModal) { closeWeaponModal(); }
    updateLinkedWeaponStats(); // Immediately apply damage bonus if applicable
}

// --- WEAPON MODAL ---
function openWeaponModal() { document.getElementById('weapon-preset-modal').classList.remove('hidden'); populateWeaponPresets(); }
function closeWeaponModal() { document.getElementById('weapon-preset-modal').classList.add('hidden'); }
function populateWeaponCategories() { const select = document.getElementById('weapon-category-select'); select.innerHTML = Object.keys(weaponPresets).map(cat => `<option value="${cat}">${cat.toUpperCase()}</option>`).join(''); }
function populateWeaponPresets() {
    const category = document.getElementById('weapon-category-select').value;
    const list = document.getElementById('weapon-preset-list');
    if (!weaponPresets[category]) { list.innerHTML = ''; return; }

    list.innerHTML = weaponPresets[category].map(preset => `
        <li class="preset-item">
            <div class="preset-info">
                <h4>${preset.name} <span class="expense-tag">(${preset.expense})</span></h4>
                ${preset.desc ? `<p>${preset.desc}</p>` : ''}
                ${preset.examples ? `<small>${preset.examples}</small>` : ''}
            </div>
            <button onclick='addWeapon(${JSON.stringify(preset)}, true)'>SELECT</button>
        </li>
    `).join('');
}

// --- ARMOR MANAGEMENT ---
function toggleArmor() { if (isArmorActive) deactivateArmor(); else openArmorModal(); }
function openArmorModal() { populateArmorPresets(); document.getElementById('armor-modal').classList.remove('hidden'); }
function closeArmorModal() { document.getElementById('armor-modal').classList.add('hidden'); }
function populateArmorPresets() {
    const list = document.getElementById('armor-preset-list');
    const helmetCheckbox = document.getElementById('helmet-checkbox');
    list.innerHTML = armorPresets.map(preset => `
        <li class="preset-item" data-is-bomb-suit="${preset.isBombSuit}">
            <div class="preset-info">
                <h4>${preset.name} <span class="expense-tag">(AP: ${preset.ap})</span></h4>
                <p>${preset.desc}</p>
            </div>
            <button onclick='selectArmor(${preset.ap}, ${preset.isBombSuit})'>SELECT</button>
        </li>
    `).join('');
    document.querySelectorAll('#armor-preset-list .preset-item').forEach(item => {
        item.addEventListener('mouseover', () => {
            const isBombSuit = item.getAttribute('data-is-bomb-suit') === 'true';
            helmetCheckbox.disabled = isBombSuit;
            if (isBombSuit) helmetCheckbox.checked = false;
        });
    });
}
function selectArmor(baseAP, isBombSuit) {
    const helmetCheckbox = document.getElementById('helmet-checkbox');
    let totalAP = baseAP + (helmetCheckbox.checked && !isBombSuit ? 1 : 0);
    isArmorActive = true; currentArmorPoints = totalAP;
    const apInput = document.getElementById('armor-points'); const armorBtn = document.getElementById('armor-btn');
    apInput.value = totalAP; apInput.classList.remove('hidden'); apInput.classList.add('armor-active'); armorBtn.classList.add('armor-active');
    closeArmorModal();
}
function deactivateArmor() {
    isArmorActive = false; currentArmorPoints = 0;
    const apInput = document.getElementById('armor-points'); const armorBtn = document.getElementById('armor-btn'); const helmetCheckbox = document.getElementById('helmet-checkbox');
    apInput.value = 0; apInput.classList.add('hidden'); apInput.classList.remove('armor-active'); armorBtn.classList.remove('armor-active');
    helmetCheckbox.checked = false; helmetCheckbox.disabled = false;
}
function validateArmorPoints(event) {
    const input = event.target;
    let value = parseInt(input.value, 10);
    if (isNaN(value)) value = currentArmorPoints;
    if (value > currentArmorPoints) input.value = currentArmorPoints;
    else currentArmorPoints = value;
    if (currentArmorPoints <= 0) deactivateArmor();
}

// --- ADMIN & LOCKING FUNCTIONS ---
function toggleAdminMode() {
    const rankSelect = document.getElementById('rank'); const currentRankValue = rankSelect.value;
    const derivedInputs = ['bp', 'hp-max', 'wp-max', 'san-max'];
    if (isAdmin) {
        isAdmin = false; if (statsUnlocked) toggleStatsLock();
        document.body.classList.remove('admin-mode');
        document.getElementById('admin-login-btn').textContent = 'Admin Login';
        document.getElementById('toggle-stats-lock-btn').classList.add('hidden');
        document.getElementById('lock-branch-rank-container').classList.add('hidden');
        derivedInputs.forEach(id => document.getElementById(id).readOnly = true);
        updateAllCalculations(); alert('Admin mode deactivated.');
    } else {
        const pass = prompt('Enter NEMESIS clearance code:');
        if (btoa(pass) === ADMIN_PASSWORD_HASH) {
            isAdmin = true;
            document.body.classList.add('admin-mode');
            document.getElementById('admin-login-btn').textContent = 'Admin Logout';
            document.getElementById('toggle-stats-lock-btn').classList.remove('hidden');
            document.getElementById('lock-branch-rank-container').classList.remove('hidden');
            derivedInputs.forEach(id => document.getElementById(id).readOnly = false);
            alert('Admin mode activated. Privileges granted.');
        } else if (pass) { alert('Access Denied.'); }
    }
    updateRanks(); rankSelect.value = currentRankValue; updateBranchRankLockState();
}
function toggleStatsLock() { statsUnlocked = !statsUnlocked; const btn = document.getElementById('toggle-stats-lock-btn'); const pointsCounter = document.getElementById('stat-points-remaining').parentElement.parentElement; stats.forEach(stat => { const input = document.getElementById(stat); input.readOnly = !statsUnlocked; input.previousElementSibling.disabled = statsUnlocked; input.nextElementSibling.disabled = statsUnlocked; }); if (statsUnlocked) { btn.textContent = 'LOCK STATS'; pointsCounter.classList.add('hidden'); } else { btn.textContent = 'FORCE STATS'; pointsCounter.classList.remove('hidden'); updateAllCalculations(); } }
function updateBranchRankLockState() { const isLocked = document.getElementById('lock-branch-rank-checkbox').checked; document.getElementById('branch').disabled = isLocked && !isAdmin; document.getElementById('rank').disabled = isLocked && !isAdmin; }

// --- DATA MANAGEMENT ---
function getCompleteFormData() { const data = { id: document.getElementById('character-id').value || `sheet_${Date.now()}` }; data.branchRankLocked = document.getElementById('lock-branch-rank-checkbox').checked; document.querySelectorAll('#sheet-form [id]').forEach(el => { if (el.id) data[el.id] = el.type === 'checkbox' ? el.checked : el.value; }); data.crafts = Array.from(document.querySelectorAll('#craft-skills-container .sub-skill-item')).map(item => ({checked: item.querySelector('input[type=checkbox]').checked, type: item.querySelector('select').value, score: item.querySelector('input[type=number]').value})); data.languages = Array.from(document.querySelectorAll('#language-skills-container .sub-skill-item')).map(item => ({checked: item.querySelector('input[type=checkbox]').checked, lang: item.querySelector('input[type=text]').value, score: item.querySelector('input[type=number]').value})); data.weapons = Array.from(document.querySelectorAll('#weapons-body tr')).map(row => { const i = row.querySelectorAll('input'); return { name: i[0].value, skill: i[1].value, range: i[2].value, dmg: i[3].value, ap: i[4].value, lethality: i[5].value, ammoC: i[6].value, ammoM: i[7].value, skillIdentifier: row.dataset.skillIdentifier || '', baseDamage: row.dataset.baseDamage || '' }; }); data.bonds = Array.from(document.querySelectorAll('.bond-item')).map(item => ({ checked: item.querySelector('input[type="checkbox"]').checked, name: item.querySelector('input[type="text"]').value, score: item.querySelector('select').value })); data.isArmorActive = isArmorActive; data.currentArmorPoints = currentArmorPoints; return data; }
function populateCompleteForm(data) {
    resetForm(); 
    document.getElementById('weapons-body').innerHTML = ''; // Clear default unarmed before loading
    Object.keys(data).forEach(key => { if (!['weapons', 'bonds', 'crafts', 'languages', 'branchRankLocked', 'isArmorActive', 'currentArmorPoints'].includes(key)) { const el = document.getElementById(key); if (el) { el[el.type === 'checkbox' ? 'checked' : 'value'] = data[key]; } } });
    document.getElementById('bonds-container').innerHTML = ''; 
    if (data.crafts) data.crafts.forEach(c => addCraftSkill(c)); if (data.languages) data.languages.forEach(l => addLanguageSkill(l));
    if (data.weapons && data.weapons.length > 0) { data.weapons.forEach(w => addWeapon(w)); } else { addDefaultUnarmed(); }
    if (data.bonds && data.bonds.length > 0) { data.bonds.forEach(b => addBond(b)); } else { addBond(); addBond(); addBond(); }
    
    document.getElementById('lock-branch-rank-checkbox').checked = data.branchRankLocked || false;
    updateRanks(); 
    if (data.rank) document.getElementById('rank').value = data.rank; 
    updateAllCalculations(); checkAdaptedStatus(); applyAutoTheme(); updateBranchRankLockState();
    if (data.isArmorActive) {
        isArmorActive = true; currentArmorPoints = data.currentArmorPoints || 0;
        const apInput = document.getElementById('armor-points'); const armorBtn = document.getElementById('armor-btn');
        if (currentArmorPoints > 0) { apInput.value = currentArmorPoints; apInput.classList.remove('hidden'); apInput.classList.add('armor-active'); armorBtn.classList.add('armor-active'); } else { deactivateArmor(); }
    } else { deactivateArmor(); }
    updateRollSkillsButtonVisibility();
}
function saveCharacter() { const data = getCompleteFormData(); const name = data['full-name'] || 'UNNAMED_AGENT'; const sheetName = prompt("Save file as:", name); if (sheetName) { localStorage.setItem(data.id, JSON.stringify({ name: sheetName, ...data })); alert(`Agent file '${sheetName}' saved locally.`); loadSavedSheets(); } }
function loadSavedSheets() { const list = document.getElementById('saved-sheets-list'); list.innerHTML = ''; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key.startsWith('sheet_')) { const data = JSON.parse(localStorage.getItem(key)); const li = document.createElement('li'); li.innerHTML = `<span>${data.name}</span><div><button onclick="renameSheet('${key}')">RENAME</button><button onclick="loadSheet('${key}')">LOAD</button><button class="remove-btn" onclick="deleteSheet('${key}')">DELETE</button></div>`; list.appendChild(li); } } }
function loadSheet(key) { populateCompleteForm(JSON.parse(localStorage.getItem(key))); showView('character-sheet'); }
function deleteSheet(key) { if(confirm("DELETE FILE?")){ localStorage.removeItem(key); loadSavedSheets(); }}
function renameSheet(key) { const data = JSON.parse(localStorage.getItem(key)); const newName = prompt("New filename:", data.name); if (newName) { data.name = newName; localStorage.setItem(key, JSON.stringify(data)); loadSavedSheets(); } }
function loadCharacterFromFile(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = e => { populateCompleteForm(JSON.parse(e.target.result)); showView('character-sheet'); }; reader.readAsText(file); }
function exportToJson(){ const data = getCompleteFormData(); const jsonString = JSON.stringify(data, null, 2); const blob = new Blob([jsonString], {type: "application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${(data['full-name'] || 'agent').replace(/\s+/g, '_')}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }

function screenshotPage(event) {
    const btn = event.currentTarget; const originalText = btn.textContent;
    btn.textContent = '...CAPTURING...'; btn.disabled = true;
    html2canvas(document.querySelector('.container'), { useCORS: true, allowTaint: true, scrollX: 0, scrollY: -window.scrollY })
        .then(canvas => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png', 1.0);
            const agentName = document.getElementById('full-name').value || 'UNNAMED_AGENT';
            a.download = `${agentName.replace(/\s+/g, '_')}_Sheet.png`;
            a.click(); a.remove();
        }).catch(err => { console.error('Screenshot failed:', err); alert('Could not capture screenshot. See console for details.');
        }).finally(() => { btn.textContent = originalText; btn.disabled = false; });
}

// --- NEW CODE: TUTORIAL SYSTEM ---

function startTutorial() {
    tutorialState.isActive = true;
    tutorialState.currentStep = 0;
    document.getElementById('tutorial-overlay').classList.remove('hidden');
    showTutorialStep(0);
}

function cancelTutorial() {
    tutorialState.isActive = false;
    document.getElementById('tutorial-overlay').classList.add('hidden');
    // Ensure spotlight is cleared
    const spotlight = document.getElementById('tutorial-spotlight');
    spotlight.style.width = '0px';
    spotlight.style.height = '0px';
    spotlight.style.opacity = '0';
}

function advanceTutorial() {
    const currentStepData = tutorialSteps[tutorialState.currentStep];
    if (currentStepData.nextStepAction) {
        currentStepData.nextStepAction();
    }

    if (tutorialState.currentStep < tutorialSteps.length - 1) {
        tutorialState.currentStep++;
        showTutorialStep(tutorialState.currentStep);
    } else {
        alert("Tutorial Concluded. You are now free to proceed.");
        cancelTutorial();
    }
}

function regressTutorial() {
    if (tutorialState.currentStep > 0) {
        // If we go back from step 2, we need to show the confirmation screen again
        // This kind of specific logic will be built out as we add more steps
        const comingFromStepData = tutorialSteps[tutorialState.currentStep];
        if (comingFromStepData.targetElement && comingFromStepData.targetElement.includes('CREATE NEW AGENT')) {
             // Do nothing special for now, just go back.
        }

        tutorialState.currentStep--;
        showTutorialStep(tutorialState.currentStep);
    }
}


function showTutorialStep(stepIndex) {
    const step = tutorialSteps[stepIndex];
    if (!step) {
        console.error("NEMESIS: Invalid tutorial step index.", stepIndex);
        cancelTutorial();
        return;
    }

    const overlay = document.getElementById('tutorial-overlay');
    const prompt = document.getElementById('tutorial-prompt');
    const spotlight = document.getElementById('tutorial-spotlight');
    const titleEl = document.getElementById('tutorial-title');
    const textEl = document.getElementById('tutorial-text');
    const initialNav = document.getElementById('tutorial-nav-initial');
    const stepsNav = document.getElementById('tutorial-nav-steps');

    // Reset prompt position for calculation
    prompt.style.top = '';
    prompt.style.bottom = '';
    prompt.style.left = '50%';
    prompt.style.transform = 'translateX(-50%)';

    titleEl.innerText = step.title;
    textEl.innerText = step.text;

    if (step.isIntro || step.isConfirmation) {
        // Handle introductory/confirmation screens with no spotlight
        spotlight.style.opacity = '0';
        spotlight.style.width = '0';
        prompt.style.top = '50%';
        prompt.style.transform = 'translate(-50%, -50%)';
        
        // Show the correct buttons
        initialNav.classList.toggle('hidden', !step.isIntro);
        stepsNav.classList.toggle('hidden', step.isIntro);
        if (step.isConfirmation) {
            stepsNav.querySelector('button:nth-of-type(1)').classList.add('hidden'); // Hide "BACK" button
            stepsNav.querySelector('button:nth-of-type(2)').innerText = 'CONTINUE';
        }

} else {
    // Handle a standard step with a spotlight
    initialNav.classList.add('hidden');
    stepsNav.classList.remove('hidden');
    
    const nextBtn = stepsNav.querySelector('button:nth-of-type(2)');
    nextBtn.innerText = 'NEXT';

    // Lock NEXT button if action is required
    if (step.waitForAction || step.validation) {
        nextBtn.disabled = true;
    } else {
        nextBtn.disabled = false;
    }

    // Add validation listener if required
    if (step.validation) {
        const input = document.querySelector(step.validation.inputElement);
        if (input) {
            input.oninput = () => {
                if (input.value.length >= step.validation.minLength) {
                    nextBtn.disabled = false;
                } else {
                    nextBtn.disabled = true;
                }
            };
        }
    } else {
        // Clean up previous listeners
        const anyInput = document.querySelector('#full-name');
        if(anyInput) anyInput.oninput = null;
    }


        const target = document.querySelector(step.targetElement);
        if (!target) {
            console.error("NEMESIS: Tutorial target not found:", step.targetElement);
            cancelTutorial();
            return;
        }

        const rect = target.getBoundingClientRect();
        const padding = 5; // As requested

        spotlight.style.opacity = '1';
        spotlight.style.left = `${rect.left - padding}px`;
        spotlight.style.top = `${rect.top - padding}px`;
        spotlight.style.width = `${rect.width + (padding * 2)}px`;
        spotlight.style.height = `${rect.height + (padding * 2)}px`;

        // Position the prompt box
        const promptHeight = prompt.offsetHeight;
        if (rect.top > (window.innerHeight / 2)) {
            // Target is in the bottom half, place prompt above
            prompt.style.top = `${rect.top - padding - promptHeight - 20}px`;
        } else {
            // Target is in the top half, place prompt below
            prompt.style.top = `${rect.bottom + padding + 20}px`;
        }
    }
    
    // Logic for hiding/showing Back button
    const backBtn = stepsNav.querySelector('button:nth-of-type(1)');
    // We hide back button on the first *real* step (index 2)
    if(stepIndex <= 1 || step.isConfirmation) {
         backBtn.classList.add('hidden');
    } else {
         backBtn.classList.remove('hidden');
    }
}

// --- NEW CODE: Tutorial Action Handler ---

function handleTutorialAction(event) {
    if (!tutorialState.isActive) return;

    const step = tutorialSteps[tutorialState.currentStep];
    if (!step || !step.waitForAction) return;

    // Check if the clicked element matches the expected action target
    if (event.target.matches(step.actionTarget)) {
        event.preventDefault(); // Prevent default link behavior if any
        event.stopPropagation(); // Stop the event from bubbling further
        
        // Execute the action associated with this step (e.g., changing view)
        if (step.nextStepAction) {
            step.nextStepAction();
        }

        // Advance to the next tutorial step automatically
        advanceTutorial();
    }
}
