// --- DATA LIBRARIES ---
// This file contains all the definitions for bomb series and modules.
// The main game logic in eod_main.js will use these variables.

const BOMB_SERIES_DEFINITIONS = {
    'M1-T': { name: "M1-T 'Tutor'", difficulty: 'Training', color: 'green', baseTime: 300, baseStrikes: 3, modulePool: ['wires'], moduleCount: 1 },
    'M4-S': { name: "M4-S 'Scorpion'", difficulty: 'Standard', color: 'blue', baseTime: 240, baseStrikes: 2, modulePool: ['wires', 'keypad'], moduleCount: 2 },
    'M7-B': { name: "M7-B 'Spectre'", difficulty: 'Hard', color: 'red', baseTime: 180, baseStrikes: 2, modulePool: ['wires', 'keypad', 'button'], moduleCount: 2 }
};

const MODULE_GENERATORS = {
    wires: {
        name: "WIRES",
        generate(game) {
            const numWires = 4 + Math.floor(Math.random() * 3);
            const colors = ['red', 'blue', 'yellow', 'white', 'black'];
            const currentWires = Array.from({ length: numWires }, () => colors[Math.floor(Math.random() * colors.length)]);
            
            const rulePool = [
                { text: "IF there are no red wires, <strong>CUT</strong> the second wire.", test: (wires) => wires.filter(c => c === 'red').length === 0, action: () => 1 },
                { text: "IF there is exactly one blue wire, <strong>CUT</strong> the last white wire.", test: (wires) => wires.filter(c => c === 'blue').length === 1, action: (wires) => wires.lastIndexOf('white') },
                { text: "IF there are more yellow than white wires, <strong>CUT</strong> the first yellow wire.", test: (wires) => wires.filter(c=>c==='yellow').length > wires.filter(c=>c==='white').length, action: (wires) => wires.indexOf('yellow') },
                { text: "IF the last wire is black, <strong>CUT</strong> the fourth wire.", test: (wires) => wires[wires.length - 1] === 'black' && wires.length >= 4, action: () => 3 },
                { text: "OTHERWISE, <strong>CUT</strong> the last red wire.", test: () => true, action: (wires) => wires.lastIndexOf('red') },
                { text: "OTHERWISE, <strong>CUT</strong> the first wire.", test: () => true, action: () => 0 }
            ];
            
            const shuffledRules = rulePool.filter(r => !r.text.startsWith("OTHERWISE")).sort(() => 0.5 - Math.random());
            const chosenRules = shuffledRules.slice(0, 3);
            chosenRules.push(Math.random() > 0.5 ? rulePool[4] : rulePool[5]);

            return {
                data: { currentWires, solved: false, steps: 1, completedSteps: 0, cutIndexes: [] },
                manualHTML: `<h3>WIRES</h3><ul>${chosenRules.map(r => `<li>${r.text}</li>`).join('')}</ul>`,
                logic: {
                    getCorrectWire: () => {
                        const activeWires = game.modules.wires.data.currentWires.map((color, index) => ({ color, index })).filter(w => !game.modules.wires.data.cutIndexes.includes(w.index));
                        for (const rule of chosenRules) {
                            if (rule.test(activeWires.map(w => w.color))) {
                                const targetIndexInActive = rule.action(activeWires.map(w => w.color));
                                return targetIndexInActive !== -1 && targetIndexInActive < activeWires.length ? activeWires[targetIndexInActive].index : -1;
                            }
                        }
                        return -1;
                    }
                }
            };
        }
    },
    keypad: {
        name: "KEYPAD",
        generate(game) {
            const rulePools = {
                first: [
                    { text: "The first digit is the number of starting strikes.", depends: null, getValue: () => game.maxStrikes },
                    { text: "The first digit is the total number of modules on the device.", depends: null, getValue: () => Object.keys(game.modules).length },
                    { text: "The first digit is the number of <strong>BLACK</strong> wires.", depends: 'wires', getValue: () => game.modules.wires.data.currentWires.filter(c=>c==='black').length },
                ],
                second: [
                    { text: "The second digit is the first number in the serial number.", depends: null, getValue: () => { const d = game.serial.match(/\d/); return d ? d[0] : 0; } },
                    { text: "The second digit is one more than the number of <strong>BLUE</strong> wires.", depends: 'wires', getValue: () => game.modules.wires.data.currentWires.filter(c=>c==='blue').length + 1 },
                ],
                third: [
                    { text: "The third digit is the number of <strong>WHITE</strong> wires.", depends: 'wires', getValue: () => game.modules.wires.data.currentWires.filter(c=>c==='white').length },
                    { text: "The third digit is the last number in the serial number.", depends: null, getValue: () => { const d = game.serial.match(/\d/g); return d ? d[d.length - 1] : 0; } },
                ],
                last: [
                    { text: "The last digit is the number of vowels in the serial number.", depends: null, getValue: () => (game.serial.match(/[AEIOU]/gi) || []).length },
                    { text: "The last digit is the total number of wires on the device.", depends: 'wires', getValue: () => game.modules.wires.data.currentWires.length },
                ]
            };

            const chosenRules = [];
            let correctCode = "";
            for (const position in rulePools) {
                const validRules = rulePools[position].filter(r => r.depends === null || !!game.modules[r.depends]);
                const chosenRule = validRules[Math.floor(Math.random() * validRules.length)];
                chosenRules.push(chosenRule);
                correctCode += chosenRule.getValue().toString().slice(-1);
            }

            return {
                data: { display: "", correctCode, solved: false },
                manualHTML: `<h3>KEYPAD (4 DIGITS)</h3><ul>${chosenRules.map(r => `<li>${r.text}</li>`).join('')}</ul>`,
            };
        }
    },
    button: {
        name: "BUTTON",
        generate(game) {
            const colors = ['red', 'blue', 'white', 'yellow'];
            const labels = ['DETONATE', 'ABORT', 'HOLD', 'PRESS'];
            const data = { currentColor: colors[Math.floor(Math.random() * colors.length)], currentLabel: labels[Math.floor(Math.random() * labels.length)], solved: false, isHeld: false };
            
            const rulePool = [
                { text: "<strong>IF</strong> the button is BLUE and says 'ABORT', <strong>PRESS AND HOLD</strong>.", test: () => data.currentColor === 'blue' && data.currentLabel === 'ABORT', action: 'hold' },
                { text: "<strong>IF</strong> the serial number contains a vowel, <strong>PRESS AND RELEASE</strong>.", test: () => /[AEIOU]/i.test(game.serial), action: 'release' },
                { text: "<strong>IF</strong> there are more than 2 <strong>RED</strong> wires, <strong>PRESS AND RELEASE</strong>.", depends: 'wires', test: () => game.modules.wires.data.currentWires.filter(c=>c==='red').length > 2, action: 'release' },
                { text: "<strong>OTHERWISE</strong>, <strong>PRESS AND HOLD</strong>.", test: () => true, action: 'hold' }
            ];
            
            const validRules = rulePool.filter(r => !r.depends || !!game.modules[r.depends]);
            const holdRuleDigit = Math.floor(Math.random() * 6) + 1;

            return {
                data,
                manualHTML: `<h3>BUTTON</h3><ul>${validRules.map(r => `<li>${r.text}</li>`).join('')}</ul><p><strong>IF HOLDING:</strong> Release when the timer has a '<strong>${holdRuleDigit}</strong>' in any position.</p>`,
                logic: {
                    getCorrectAction: () => { for (const rule of validRules) { if (rule.test()) return rule.action; } },
                    getCorrectReleaseDigit: () => holdRuleDigit.toString()
                }
            };
        }
    }
};
