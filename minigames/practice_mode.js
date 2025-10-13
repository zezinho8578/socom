// practice_mode.js

window.addEventListener('DOMContentLoaded', () => {
    // Only run this script if practice mode is active
    if (localStorage.getItem('socom_practice_mode') !== 'true') {
        return;
    }

    // --- 1. Create the visual overlay ---
    const overlay = document.createElement('div');
    overlay.textContent = 'PRACTICE';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-15deg)',
        fontSize: '10vw',
        fontWeight: 'bold',
        color: 'rgba(255, 65, 65, 0.10)',
        zIndex: '9999',
        pointerEvents: 'none', // Allows clicking through the overlay
        textShadow: '0 0 10px rgba(0,0,0,0.5)'
    });
    document.body.appendChild(overlay);

    // --- 2. Neutralize all lockout mechanisms ---
    // This script runs on page load, so it can clear any lockout keys
    // before the game's own initialization script has a chance to check them.
    const lockoutKeys = [
        'socom_eod_lockout', 'socom_eod_perm_lock', 'socom_eod_attempts',
        'socom_net_lockout', 'socom_net_perm_lock', 'socom_net_attempts',
        'socom_safe_lockout', 'socom_safe_perm_lock', 'socom_safe_attempts'
    ];
    lockoutKeys.forEach(key => localStorage.removeItem(key));

    // --- 3. Override the reset functions to remove the password prompt ---
    // This technique is called "monkey patching". We replace the game's original
    // reset function with our own simplified version.

    // For EOD Simulation (eod.html)
    if (typeof window.resetGame === 'function') {
        window.resetGame = function() {
            // Our new function simply reloads the page, bypassing the prompt.
            window.location.reload();
        };
    }

    // For Network Intrusion and Safe Cracking (which both use 'resetSim')
    if (typeof window.resetSim === 'function') {
        window.resetSim = function() {
            // Our new function simply reloads the page, bypassing the prompt.
            window.location.reload();
        };
    }
});
