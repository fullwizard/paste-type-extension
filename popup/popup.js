const btn = document.getElementById('toggleButton');

// 1. Get the saved state when the popup opens
// We provide a default value { isActive: false } in case it's the first time
chrome.storage.local.get(['isActive'], (result) => {
    updateButtonUI(result.isActive || false);
});
const speedSlider = document.getElementById('speedSlider');

// Load saved speed
chrome.storage.local.get(['typingSpeed'], (result) => {
  if (result.typingSpeed) {
    speedSlider.value = result.typingSpeed;
  }
});

// Save speed on change
speedSlider.addEventListener('input', () => {
  chrome.storage.local.set({ typingSpeed: parseInt(speedSlider.value) });
});

// 2. Handle the click
btn.addEventListener('click', () => {
    // Get current state from storage first
    chrome.storage.local.get(['isActive'], (result) => {
        const newState = !result.isActive;

        // Save the new state
        chrome.storage.local.set({ isActive: newState }, () => {
            updateButtonUI(newState);
            console.log("State saved:", newState);
        });
    });
});

// 3. Helper function to keep things clean
function updateButtonUI(isActive) {
    if (isActive) {
        btn.innerText = "Status: ON";
        btn.style.backgroundColor = "#4CAF50"; // Nice green
    } else {
        btn.innerText = "Status: OFF";
        btn.style.backgroundColor = "#f44336"; // Nice red
    }
}
