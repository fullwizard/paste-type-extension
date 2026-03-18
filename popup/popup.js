const toggleBtn = document.getElementById('toggleButton');
const speedSlider = document.getElementById('speedSlider');
const randomSlider = document.getElementById('randomSlider');
const typoSlider = document.getElementById('typoSlider');
const instantToggle = document.getElementById('instantToggle');
const noCorrectToggle = document.getElementById('noCorrectToggle');

// 1. Load initial states from storage
chrome.storage.local.get(['isActive', 'typingSpeed', 'isInstant', 'randomness', 'typoFreq', 'noCorrect'], (result) => {
    updateButtonUI(result.isActive || false);
    if (result.typingSpeed !== undefined) speedSlider.value = result.typingSpeed;
    if (result.randomness !== undefined) randomSlider.value = result.randomness;
    if (result.typoFreq !== undefined) typoSlider.value = result.typoFreq;
    instantToggle.checked = result.isInstant || false;
    noCorrectToggle.checked = result.noCorrect || false;
});

// 2. Event Listeners for UI interaction
toggleBtn.addEventListener('click', () => {
    chrome.storage.local.get(['isActive'], (result) => {
        const newState = !result.isActive;
        chrome.storage.local.set({ isActive: newState }, () => updateButtonUI(newState));
    });
});

speedSlider.addEventListener('input', () => {
    chrome.storage.local.set({ typingSpeed: parseInt(speedSlider.value) });
});

randomSlider.addEventListener('input', () => {
    chrome.storage.local.set({ randomness: parseInt(randomSlider.value) });
});

typoSlider.addEventListener('input', () => {
    chrome.storage.local.set({ typoFreq: parseInt(typoSlider.value) });
});

instantToggle.addEventListener('change', () => {
    chrome.storage.local.set({ isInstant: instantToggle.checked });
});

noCorrectToggle.addEventListener('change', () => {
    chrome.storage.local.set({ noCorrect: noCorrectToggle.checked });
});

// UI Helper to change button appearance
function updateButtonUI(isActive) {
    toggleBtn.innerText = isActive ? "Paste-Type is ON" : "Paste-Type is OFF";
    toggleBtn.style.backgroundColor = isActive ? "#4CAF50" : "#f44336";
    toggleBtn.style.color = "white";
}