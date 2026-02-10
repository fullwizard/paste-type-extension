chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "type_debug") {
        const tabId = sender.tab.id;
        const text = message.text;

        // Attach debugger to the current tab
        chrome.debugger.attach({ tabId: tabId }, "1.2", async () => {
            for (let char of text) {
                // Send KeyDown and KeyUp for every character
                await sendKey(tabId, char);
                // Human-like delay
                await new Promise(r => setTimeout(r, Math.random() * 40 + 20));
            }
            // Detach when finished to hide the gray bar
            chrome.debugger.detach({ tabId: tabId });
        });
    }
});

async function sendKey(tabId, char) {
    return new Promise((resolve) => {
        chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
            type: "keyDown",
            text: char,
            unmodifiedText: char,
            key: char
        }, () => {
            chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
                type: "keyUp",
                key: char
            }, resolve);
        });
    });
}