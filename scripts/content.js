let isActive = false;

chrome.storage.local.get(['isActive'], (result) => { 
    isActive = result.isActive || false; 
});

chrome.storage.onChanged.addListener((changes) => { 
    if (changes.isActive) isActive = changes.isActive.newValue; 
});

document.addEventListener('keydown', (event) => {
    // 1. Start Typing (Ctrl+M)
    if (isActive && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
            chrome.runtime.sendMessage({ action: "start_typing_flow" });
        } catch (e) {
            console.warn("Extension context invalidated. Please refresh.");
        }
    }

    // 2. Emergency Stop (Escape)
    if (event.key === "Escape") {
        chrome.runtime.sendMessage({ action: "stop_typing" });
    }
}, true);