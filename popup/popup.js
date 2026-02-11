const toggleBtn = document.getElementById('toggleButton');
const speedSlider = document.getElementById('speedSlider');
const instantToggle = document.getElementById('instantToggle');

// 1. Load initial states on popup open
chrome.storage.local.get(['isActive', 'typingSpeed', 'isInstant'], (result) => {
    updateButtonUI(result.isActive || false);
    
    if (result.typingSpeed !== undefined) {
        speedSlider.value = result.typingSpeed;
    }
    
    instantToggle.checked = result.isInstant || false;
});

// 2. Toggle button logic
toggleBtn.addEventListener('click', () => {
    chrome.storage.local.get(['isActive'], (result) => {
        const newState = !result.isActive;
        chrome.storage.local.set({ isActive: newState }, () => {
            updateButtonUI(newState);
        });
    });
});

// 3. Slider logic
speedSlider.addEventListener('input', () => {
    chrome.storage.local.set({ typingSpeed: parseInt(speedSlider.value) });
});

// 4. Instant Mode logic (Now outside of the UI function)
instantToggle.addEventListener('change', () => {
    chrome.storage.local.set({ isInstant: instantToggle.checked });
});

function updateButtonUI(isActive) {
    if (isActive) {
        toggleBtn.innerText = "Paste-Type is ON";
        toggleBtn.style.backgroundColor = "#4CAF50";
        toggleBtn.style.color = "white";
    } else {
        toggleBtn.innerText = "Paste-Type is OFF";
        toggleBtn.style.backgroundColor = "#f44336";
        toggleBtn.style.color = "white";
    }
}