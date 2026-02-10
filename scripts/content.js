let isActive = false;

chrome.storage.local.get(['isActive'], (result) => { 
    isActive = result.isActive || false; 
});

chrome.storage.onChanged.addListener((changes) => { 
    if (changes.isActive) isActive = changes.isActive.newValue; 
});

document.addEventListener('keydown', (event) => {
    if (isActive && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        event.stopImmediatePropagation();
        
        try {
            chrome.runtime.sendMessage({ action: "start_typing_flow" });
        } catch (e) {
            // This catches the error if the extension was updated but page wasn't refreshed
            console.warn("Extension reloaded. Please refresh the page.");
        }
    }
}, true);