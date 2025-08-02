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
function getCompleteFormData() { const data = { id: document.getElementById('character-id').value || `sheet_${Date.now()}` }; data.branchRankLocked = document.getElementById('lock-branch-rank-checkbox').checked; document.querySelectorAll('#sheet-form [id]').forEach(el => { if (el.id) data[el.id] = el.type === 'checkbox' ? el.checked : el.value; }); data.crafts = Array.from(document.querySelectorAll('#craft-skills-container .sub-skill-item')).map(item => ({checked: item.querySelector('input[type=checkbox]').checked, type: item.querySelector('select').value, score: item.querySelector('input[type=number]').value})); data.languages = Array.from(document.querySelectorAll('#language-skills-container .sub-skill-item')).map(item => ({checked: item.querySelector('input[type=checkbox]').checked, lang: item.querySelector('input[type=text]').value, score: item.querySelector('input[type=number]').value})); data.weapons = Array.from(document.querySelectorAll('#weapons-body tr')).map(row => { const i = row.querySelectorAll('input'); return { name: i[0].value, skill: i[1].value, range: i[2].value, dmg: i[3].value, ap: i[4].value, lethality: i[5].value, ammoC: i[6].value, ammoM: i[7].value }; }); data.bonds = Array.from(document.querySelectorAll('.bond-item')).map(item => ({ checked: item.querySelector('input[type="checkbox"]').checked, name: item.querySelector('input[type="text"]').value, score: item.querySelector('select').value })); data.isArmorActive = isArmorActive; data.currentArmorPoints = currentArmorPoints; return data; }
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
