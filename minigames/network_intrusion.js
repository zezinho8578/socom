// --- GAME STATE & CORE LOGIC ---
let game = {};

function startIntrusion() {
    // --- 1. GATHER SETUP DATA ---
    const difficulty = document.getElementById('difficulty').value;
    const skill = parseInt(document.getElementById('hacking-skill').value);
    const roll = parseInt(document.getElementById('d100-roll').value);
    if (isNaN(skill) || isNaN(roll)) {
        alert('Please fill in your Hacking skill and d100 roll.');
        return;
    }

    // --- 2. CONFIGURE GAME BASED ON DIFFICULTY ---
    let gridSize, baseTraceSpeed, firewallRatio;
    switch(difficulty) {
        case 'easy': gridSize = 5; baseTraceSpeed = 0.2; firewallRatio = 0.10; break;
        case 'hard': gridSize = 12; baseTraceSpeed = 0.4; firewallRatio = 0.25; break;
        default: gridSize = 8; baseTraceSpeed = 0.3; firewallRatio = 0.20; break;
    }

    // --- 3. PERFORM SKILL CHECK ---
    game = {
        gridSize,
        grid: [],
        path: [],
        traceProgress: 0,
        traceSpeed: baseTraceSpeed,
        iceActive: false,
        isActive: true,
    };
    
    const resultEl = document.getElementById('roll-result');
    let resultText = '';
    if (roll >= 96) {
        resultText = `FUMBLE (${roll}) - Counter-hack detected! Active ICE countermeasures and accelerated trace.`;
        resultEl.style.borderColor = 'var(--danger-color)';
        game.traceSpeed *= 1.5;
        game.iceActive = true;
    } else if (roll > skill) {
        resultText = `FAILURE (${roll}) - Unfamiliar network architecture. System trace is faster than anticipated.`;
        resultEl.style.borderColor = 'var(--danger-color)';
        game.traceSpeed *= 1.25;
    } else if (roll <= 5) {
        resultText = `CRITICAL (${roll}) - Found a backdoor exploit. The system trace is significantly slowed.`;
        resultEl.style.borderColor = 'var(--success-color)';
        game.traceSpeed *= 0.5;
    } else { // Success
        resultText = `SUCCESS (${roll}) - Standard intrusion. Operating within expected parameters.`;
        resultEl.style.borderColor = 'var(--accent-color)';
    }
    resultEl.textContent = resultText;

    // --- 4. INITIALIZE UI & GENERATE GRID ---
    document.getElementById('setup-view').classList.add('hidden');
    document.getElementById('game-view').classList.remove('hidden');
    document.getElementById('reset-btn').classList.remove('hidden');
    document.getElementById('status-display').textContent = "STATUS: IN PROGRESS";

    generateGrid(firewallRatio);
    renderGrid();

    // --- 5. START TRACE TIMER ---
    game.timerInterval = setInterval(updateTrace, 100);
}

function generateGrid(firewallRatio) {
    // Create a 2D array of node objects
    for (let y = 0; y < game.gridSize; y++) {
        const row = [];
        for (let x = 0; x < game.gridSize; x++) {
            row.push({ x, y, type: 'normal', captured: false });
        }
        game.grid.push(row);
    }

    // Set start and end nodes
    const startNode = game.grid[0][0];
    startNode.type = 'start';
    startNode.captured = true;
    game.path.push(startNode);

    const endNode = game.grid[game.gridSize - 1][game.gridSize - 1];
    endNode.type = 'end';
    
    // Place firewalls randomly
    const totalNodes = game.gridSize * game.gridSize;
    const firewallCount = Math.floor(totalNodes * firewallRatio);
    for (let i = 0; i < firewallCount; i++) {
        let randX, randY;
        do {
            randX = Math.floor(Math.random() * game.gridSize);
            randY = Math.floor(Math.random() * game.gridSize);
        } while (game.grid[randY][randX].type !== 'normal'); // Ensure we don't overwrite start/end
        game.grid[randY][randX].type = 'firewall';
    }
}

function renderGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${game.gridSize}, 1fr)`;

    for (let y = 0; y < game.gridSize; y++) {
        for (let x = 0; x < game.gridSize; x++) {
            const node = game.grid[y][x];
            const el = document.createElement('div');
            el.className = 'node';
            el.classList.add(node.type);
            if (node.captured) el.classList.add('captured');
            el.dataset.x = x;
            el.dataset.y = y;
            el.onclick = () => handleNodeClick(x, y);
            container.appendChild(el);
        }
    }
}

function handleNodeClick(x, y) {
    if (!game.isActive) return;

    const node = game.grid[y][x];
    if (node.captured) return;

    // Check if the clicked node is adjacent to any captured node
    const isAdjacent = game.path.some(p => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1 && !(Math.abs(p.x-x) === 1 && Math.abs(p.y-y) ===1));
    if (!isAdjacent) return;

    // Handle firewall penalty
    if (node.type === 'firewall') {
        game.traceProgress = Math.min(100, game.traceProgress + 5); // Add 5% to trace
    }

    node.captured = true;
    game.path.push(node);
    
    // Update visuals
    const el = document.querySelector(`.node[data-x='${x}'][data-y='${y}']`);
    el.classList.add('captured');

    // Check for win condition
    if (node.type === 'end') {
        winGame();
    }
}

function updateTrace() {
    if (!game.isActive) return;

    game.traceProgress += game.traceSpeed;
    document.getElementById('trace-bar-inner').style.width = `${game.traceProgress}%`;

    // Handle Fumble ICE effect
    if (game.iceActive && Math.random() < 0.05) { // 5% chance per tick
        triggerICE();
    }

    if (game.traceProgress >= 100) {
        loseGame();
    }
}

function triggerICE() {
    if (game.path.length <= 1) return; // Don't reset the start node

    // Select a random node from the path to "un-capture"
    const nodeToReset = game.path[Math.floor(Math.random() * (game.path.length - 1)) + 1];
    
    // Find its index in the path
    const resetIndex = game.path.findIndex(p => p.x === nodeToReset.x && p.y === nodeToReset.y);

    // All nodes from this point forward are no longer part of the valid path
    const nodesToSever = game.path.slice(resetIndex);
    game.path = game.path.slice(0, resetIndex);

    nodesToSever.forEach(node => {
        node.captured = false;
        const el = document.querySelector(`.node[data-x='${node.x}'][data-y='${node.y}']`);
        if (el) {
            el.classList.remove('captured');
            el.classList.add('ice-flash');
            setTimeout(() => el.classList.remove('ice-flash'), 500);
        }
    });
}


function winGame() {
    clearInterval(game.timerInterval);
    game.isActive = false;
    document.getElementById('status-display').textContent = "STATUS: SUCCESS";
    document.getElementById('status
