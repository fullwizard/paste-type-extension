let isActive = false;

chrome.storage.local.get(['isActive'], (result) => { isActive = result.isActive || false; });
chrome.storage.onChanged.addListener((changes) => { if (changes.isActive) isActive = changes.isActive.newValue; });

document.addEventListener('keydown', async (event) => {
    if (isActive && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        event.stopImmediatePropagation();

        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                // Send the text to the background script to be "debug typed"
                chrome.runtime.sendMessage({ action: "type_debug", text: text });
            }
        } catch (err) {
            console.error('Clipboard error:', err);
        }
    }
}, true);