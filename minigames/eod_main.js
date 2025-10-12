// --- GAME STATE & CORE LOGIC ---
// This file contains the main game engine and depends on the data
// defined in eod_data.js, which must be loaded first.
let game = {};

function initializeSetup() {
    // --- PERSISTENT LOCKOUT CHECK ---
    const perm_lock_time = localStorage.getItem('socom_eod_perm_lock');
    if (perm_lock_time) {
        const time_diff = Date.now() - parseInt(perm_lock_time, 10);
        if (time_diff < 300000) { // 5 minutes in ms
            forceShowDetonatedState(true); // true for permanent lock
            return;
        } else {
            localStorage.removeItem('socom_eod_perm_lock');
            localStorage.setItem('socom_eod_attempts', '0');
        }
    }

    const lockout = localStorage.getItem('socom_eod_lockout');
    if (lockout) {
        forceShowDetonatedState(false);
        return;
    }

    // --- STANDARD INITIALIZATION ---
    const grid = document.getElementById('series-selection-grid');
    grid.innerHTML = '';
    for (const key in BOMB_SERIES_DEFINITIONS) {
        const series = BOMB_SERIES_DEFINITIONS[key];
        const btn = document.createElement('button');
        btn.className = `series-btn ${series.color}`;
        btn.innerHTML = `${series.name}<br><small>(${series.difficulty})</small>`;
        btn.onclick = () => startGame(series);
        grid.appendChild(btn);
    }
}

function startGame(series) {
    const skill = parseInt(document.getElementById('demo-skill').value);
    const roll = parseInt(document.getElementById('d100-roll').value);
    if (isNaN(skill) || isNaN(roll)) { alert('Please fill in your Demolitions skill and d100 roll.'); return; }

    game = { series, timeLeft: series.baseTime, maxStrikes: series.baseStrikes, strikes: 0, isActive: true, modules: {} };

    let statusText = ''; let statusClass = '';
    if (roll >= 96) { statusText = `FUMBLE (${roll}) - Panic sets in! Less time, one mistake is fatal.`; statusClass='fail'; game.timeLeft = Math.floor(series.baseTime * 0.7); game.maxStrikes = 0; }
    else if (roll > skill) { statusText = `FAILURE (${roll}) - Unfamiliar configuration. Time pressure is on.`; statusClass='fail'; game.timeLeft = Math.floor(series.baseTime * 0.85); game.maxStrikes = Math.max(0, series.baseStrikes - 1); }
    else if (roll <= 5) { statusText = `CRITICAL (${roll}) - You've seen this before. Extra time and margin for error.`; statusClass='crit'; game.timeLeft = Math.floor(series.baseTime * 1.5); game.maxStrikes = series.baseStrikes + 1; }
    else { statusText = `SUCCESS (${roll}) - Standard procedure. Operating within parameters.`; statusClass='success'; }
    
    game.serial = Array.from({length: 6}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
    
    const availableModules = [...series.modulePool].sort(() => 0.5 - Math.random());
    const chosenModuleKeys = availableModules.slice(0, series.moduleCount);
    
    chosenModuleKeys.forEach(key => game.modules[key] = {}); 
    
    let manualHTML = '';
    for(const key of chosenModuleKeys) {
         const generatedModule = MODULE_GENERATORS[key].generate(game);
         game.modules[key] = generatedModule;
         manualHTML += generatedModule.manualHTML;
    }
    
    document.getElementById('setup-view').classList.add('hidden');
    document.getElementById('game-view').classList.remove('hidden');
    document.getElementById('reset-btn').classList.remove('hidden');
    
    const manualPanel = document.getElementById('manual-panel');
    manualPanel.innerHTML = manualHTML + `<div id="roll-result-display" class="${statusClass}">${statusText}</div>`;
    document.getElementById('status').textContent = 'STATUS: ARMED';

    renderModules();
    updateDisplays();
    game.timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() { if (!game.isActive) return; game.timeLeft--; if (game.timeLeft <= 0) { game.timeLeft = 0; detonate(); } updateDisplays(); }
function updateDisplays() {
    const minutes = String(Math.floor(game.timeLeft / 60)).padStart(2, '0');
    const seconds = String(game.timeLeft % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    document.getElementById('strikes').textContent = `STRIKES: ${game.strikes}/${game.maxStrikes}`;
    document.getElementById('serial-number').textContent = `S/N: ${game.serial}`;
}
function handleStrike() { if (!game.isActive) return; game.strikes++; updateDisplays(); document.body.classList.add('flash'); setTimeout(() => document.body.classList.remove('flash'), 300); if (game.strikes > game.maxStrikes) { detonate(); } }
function checkWinCondition() { if (Object.values(game.modules).every(m => m.data.solved)) { disarm(); } }

function detonate() {
    game.isActive = false;
    clearInterval(game.timerInterval);
    document.getElementById('status').textContent = 'STATUS: DETONATED';
    document.getElementById('status').style.color = 'var(--danger-color)';
    document.body.style.backgroundColor = 'var(--danger-bg)';
    localStorage.setItem('socom_eod_lockout', Date.now());
    localStorage.setItem('socom_eod_attempts', '0');
}

function disarm() {
    game.isActive = false;
    clearInterval(game.timerInterval);
    document.getElementById('status').textContent = 'STATUS: DISARMED';
    document.getElementById('status').style.color = 'var(--success-color)';
    document.getElementById('timer').style.color = 'var(--success-color)';
}

function resetGame() {
    const code = prompt("ADMINISTRATIVE OVERRIDE REQUIRED.\nEnter 4-digit reset code:");

    if (code === null) { return; } // User pressed cancel.

    if (code === "1711") {
        localStorage.removeItem('socom_eod_lockout');
        localStorage.removeItem('socom_eod_attempts');
        localStorage.removeItem('socom_eod_perm_lock');
        window.location.reload();
    } else {
        let attempts = parseInt(localStorage.getItem('socom_eod_attempts') || '0', 10);
        attempts++;
        localStorage.setItem('socom_eod_attempts', attempts);

        alert('ERROR: Invalid override code.');

        if (attempts >= 2) {
            localStorage.setItem('socom_eod_perm_lock', Date.now());
            forceShowDetonatedState(true);
        }
    }
}

function forceShowDetonatedState(isPermanent) {
    document.getElementById('setup-view').classList.add('hidden');
    document.getElementById('game-view').classList.remove('hidden');
    document.getElementById('reset-btn').classList.remove('hidden');

    document.body.style.backgroundColor = 'var(--danger-bg)';
    document.getElementById('modules-container').innerHTML = '';
    document.getElementById('manual-panel').innerHTML = '<h3>SIGNAL LOST</h3><p>Device data purged. Terminal requires administrative override to reset simulation access.</p>';
    document.getElementById('timer').textContent = "00:00";
    document.getElementById('strikes').textContent = "STRIKES: -/-";
    document.getElementById('serial-number').textContent = "S/N: CORRUPT";

    if (isPermanent) {
        document.getElementById('status').textContent = 'STATUS: TERMINAL LOCKED';
        document.getElementById('status').style.color = 'var(--danger-color)';
        document.getElementById('reset-btn').disabled = true;
    } else {
        document.getElementById('status').textContent = 'STATUS: DETONATED';
        document.getElementById('status').style.color = 'var(--danger-color)';
    }
}

// --- MODULE RENDERING ---
function renderModules() {
    const container = document.getElementById('modules-container');
    container.innerHTML = '';
    for (const key in game.modules) {
        const module = game.modules[key];
        const moduleWrapper = document.createElement('div');
        moduleWrapper.className = 'module';
        moduleWrapper.id = `module-${key}`;
        let contentHTML = '';
        switch(key) {
            case 'wires': contentHTML = `<div class="wires-container">${module.data.currentWires.map((color, i) => `<div class="wire" style="background-color:${color}" onclick="cutWire(${i})"></div>`).join('')}</div>`; break;
            case 'keypad': contentHTML = `<div class="keypad-display" id="keypad-display"></div><div class="keypad-grid">${[1,2,3,4,5,6,7,8,9,'C','0','S'].map(k => `<button onclick="pressKeypad('${k}')">${k}</button>`).join('')}</div>`; break;
            case 'button': contentHTML = `<button id="big-button" class="big-button" onmousedown="pressBigButton()" onmouseup="releaseBigButton()" style="background-color:${module.data.currentColor}; color: #000;">${module.data.currentLabel}</button>`; break;
        }
        moduleWrapper.innerHTML = `<div class="module-header">${MODULE_GENERATORS[key].name}</div><div class="module-solved-light"></div><div class="module-content">${contentHTML}</div>`;
        container.appendChild(moduleWrapper);
    }
}

// --- MODULE INTERACTION HANDLERS ---
function cutWire(index) {
    const module = game.modules.wires;
    if (!game.isActive || module.data.solved) return;
    const wireEl = document.querySelector(`#module-wires .wire:nth-child(${index + 1})`);
    if (wireEl.classList.contains('cut')) return;

    if (index === module.logic.getCorrectWire()) {
        wireEl.classList.add('cut');
        module.data.cutIndexes.push(index);
        module.data.solved = true;
        document.querySelector('#module-wires .module-solved-light').classList.add('solved');
        checkWinCondition();
    } else { handleStrike(); }
}

function pressKeypad(key) {
    const module = game.modules.keypad;
    if (!game.isActive || module.data.solved) return;
    const display = document.getElementById('keypad-display');
    if (key === 'C') { module.data.display = ""; }
    else if (key === 'S') {
        if(module.data.display === module.data.correctCode) {
            module.data.solved = true;
            document.querySelector('#module-keypad .module-solved-light').classList.add('solved');
            checkWinCondition();
        } else { handleStrike(); }
    }
    else if(module.data.display.length < module.data.correctCode.length) { module.data.display += key; }
    display.textContent = module.data.display;
}

function pressBigButton() {
    const module = game.modules.button;
    if (!game.isActive || module.data.solved) return;
    module.data.isHeld = true;
}

function releaseBigButton() {
    const module = game.modules.button;
    if (!game.isActive || !module.data.isHeld) return;
    module.data.isHeld = false;

    const correctAction = module.logic.getCorrectAction();
    const timerStr = document.getElementById('timer').textContent;

    let success = false;
    if (correctAction === 'hold' && timerStr.includes(module.logic.getCorrectReleaseDigit())) {
        success = true;
    } else if (correctAction === 'release') {
        success = true;
    }
    
    if(success) {
        module.data.solved = true;
        document.querySelector('#module-button .module-solved-light').classList.add('solved');
        checkWinCondition();
    } else { handleStrike(); }
}

// --- INITIALIZE ---
window.onload = initializeSetup;
