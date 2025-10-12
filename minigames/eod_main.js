// --- GAME STATE & CORE LOGIC ---
// This file contains the main game engine and depends on the data
// defined in eod_data.js, which must be loaded first.
let game = {};

// --- INITIALIZATION & LOCK STATE MANAGEMENT ---

window.onload = function() {
    // Check for a hard lock first. This state occurs after 2 failed code attempts.
    const hardLockTime = localStorage.getItem('eod_hard_lock_timestamp');
    if (hardLockTime && Date.now() - parseInt(hardLockTime) < 300000) { // 300000 ms = 5 minutes
        document.body.innerHTML = `
            <div class="container" style="text-align: center; padding: 50px;">
                <h1 style="color: var(--danger-color);">SIMULATOR TERMINAL LOCKED</h1>
                <p>Maximum restart attempts failed following a critical detonation.</p>
                <p>The system is locked for 5 minutes as per safety protocols.</p>
            </div>`;
        document.body.style.backgroundColor = '#4d0000'; // Keep the detonated feel
        return; // Halt all further game initialization
    } else if (hardLockTime) {
        // If the 5 minutes have passed, clear the lock so the user can try again.
        localStorage.removeItem('eod_hard_lock_timestamp');
        localStorage.removeItem('eod_lock_tries');
        // We'll treat this as a standard detonated state now, requiring a code.
        localStorage.setItem('eod_detonated_timestamp', Date.now());
    }

    // Check for a soft lock. This state occurs immediately after any detonation.
    // This ensures that if the user reloads or navigates away, the detonated state persists.
    const detonatedTimestamp = localStorage.getItem('eod_detonated_timestamp');
    if (detonatedTimestamp) {
        // Don't show the setup screen. Instead, reconstruct a view of the detonated bomb.
        document.getElementById('setup-view').classList.add('hidden');
        document.getElementById('game-view').classList.remove('hidden');
        document.getElementById('reset-btn').classList.remove('hidden');

        // Display a static "detonated" state since the game object is gone.
        document.getElementById('modules-container').innerHTML = '<p style="text-align:center; color: var(--danger-color);">[CRITICAL FAILURE - COMPONENTS UNRESPONSIVE]</p>';
        document.getElementById('manual-panel').innerHTML = '';
        document.getElementById('timer').textContent = '00:00';
        document.getElementById('strikes').textContent = 'STRIKES: -/-';
        document.getElementById('serial-number').textContent = 'S/N: OFFLINE';
        document.getElementById('status').textContent = 'STATUS: DETONATED';
        document.getElementById('status').style.color = 'var(--danger-color)';
        document.body.style.backgroundColor = '#4d0000'; // Use the new aesthetic color
    } else {
        // If there's no lock, initialize the setup screen as normal.
        initializeSetup();
    }
};


function initializeSetup() {
    const grid = document.getElementById('series-selection-grid');
    grid.innerHTML = '';
    for(const key in BOMB_SERIESS_DEFINITIONS) {
        const series = BOMB_SERIES_DEFINITIONS[key];
        const btn = document.createElement('button');
        btn.className = `series-btn ${series.color}`;
        btn.innerHTML = `${series.name}<br><small>(${series.difficulty})</small>`;
        btn.onclick = () => startGame(series);
        grid.appendChild(btn);
    }
}

// --- CORE GAME FLOW ---

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
    document.body.style.backgroundColor = '#4d0000'; // More aesthetic dark red
    // Set the persistent lock state
    localStorage.setItem('eod_detonated_timestamp', Date.now());
}

function disarm() {
    game.isActive = false;
    clearInterval(game.timerInterval);
    document.getElementById('status').textContent = 'STATUS: DISARMED';
    document.getElementById('status').style.color = 'var(--success-color)';
    document.getElementById('timer').style.color = 'var(--success-color)'; // Make timer green on success
}

function performActualReset() {
    clearInterval(game.timerInterval);
    game = {};
    document.getElementById('game-view').classList.add('hidden');
    document.getElementById('reset-btn').classList.add('hidden');
    document.getElementById('setup-view').classList.remove('hidden');

    // Explicitly reset any styles that might have been changed
    document.body.style.backgroundColor = 'var(--bg-color)';
    document.getElementById('timer').style.color = 'var(--danger-color)';
    document.getElementById('status').style.color = 'var(--text-color)';

    initializeSetup(); // Re-populate the bomb series buttons
}

function resetGame() {
    // This function is now the gatekeeper for resetting the simulation.
    const isDetonated = localStorage.getItem('eod_detonated_timestamp');

    if (!isDetonated) {
        // If we are not in a persistent detonated state, reset normally.
        performActualReset();
        return;
    }

    // If a detonation has been logged, a code is required.
    let tries = parseInt(localStorage.getItem('eod_lock_tries') || '2');
    const code = prompt(`[RESTRICTED ACTION]\n\nAn override code is required to reset the simulation after a critical failure.\n\nAttempts remaining: ${tries}\nEnter 4-digit code:`);

    if (code === null) {
        // User pressed cancel, do nothing.
        return;
    }

    if (code === '1711') {
        alert('ACCESS GRANTED. Resetting simulation protocols.');
        // Clear all persistence keys on success
        localStorage.removeItem('eod_detonated_timestamp');
        localStorage.removeItem('eod_lock_tries');
        localStorage.removeItem('eod_hard_lock_timestamp');
        performActualReset();
    } else {
        tries--;
        localStorage.setItem('eod_lock_tries', tries);

        if (tries > 0) {
            alert(`ACCESS DENIED. Incorrect code. You have ${tries} attempt(s) remaining.`);
        } else {
            alert('ACCESS DENIED. Maximum attempts exceeded. Terminal will be locked for 5 minutes for security review.');
            // Move from a soft lock to a hard lock.
            localStorage.setItem('eod_hard_lock_timestamp', Date.now());
            localStorage.removeItem('eod_detonated_timestamp');
            // Reload the page to engage the hard lock screen.
            window.location.reload();
        }
    }
}


// --- MODULE RENDERING & INTERACTION ---

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
