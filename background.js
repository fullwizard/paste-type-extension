let isTyping = false;
let currentTabId = null;

// Stop loop if user clicks "Cancel" on the browser debug bar
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === currentTabId) isTyping = false;
});

chrome.runtime.onMessage.addListener((message, sender) => {
  // Emergency Stop from Escape key
  if (message.action === "stop_typing") {
    isTyping = false;
    if (currentTabId) chrome.debugger.detach({ tabId: currentTabId }, () => {
        if (chrome.runtime.lastError) { /* already detached */ }
    });
    return;
  }

  if (message.action === "start_typing_flow") {
    if (isTyping) return; // Prevent multiple loops

    const tabId = sender.tab.id;
    const frameId = sender.frameId;

    // Get text and speed settings
    chrome.storage.local.get(['typingSpeed'], (settings) => {
      const userSpeed = settings.typingSpeed || 50;
      // Map 1-100 scale to delay: 100 is fast (~10ms), 1 is slow (~500ms)
      const baseDelay = Math.max(10, 500 - (userSpeed * 4.9));

      chrome.scripting.executeScript({
        target: { tabId: tabId, frameIds: [frameId] },
        func: () => navigator.clipboard.readText().catch(() => null)
      }).then(async (results) => {
        const text = results[0]?.result;
        if (!text) return;

        chrome.debugger.attach({ tabId: tabId }, "1.2", async () => {
          if (chrome.runtime.lastError) {
             // Handle "already attached" by cycling the connection
             chrome.debugger.detach({ tabId: tabId }, () => {
               chrome.debugger.attach({ tabId: tabId }, "1.2", () => startTyping(tabId, text, baseDelay));
             });
          } else {
            isTyping = true;
            currentTabId = tabId;
            await startTyping(tabId, text, baseDelay);
            if (isTyping) {
              chrome.debugger.detach({ tabId: tabId });
              isTyping = false;
            }
          }
        });
      });
    });
  }
});

async function startTyping(tabId, text, baseDelay) {
  for (const char of text) {
    if (!isTyping) break; // Exit loop if Cancel or Escape hit

    try {
      await simulateHardwareKey(tabId, char);
      // Small random variance to keep it looking "human"
      const variance = baseDelay * 0.2;
      const finalDelay = baseDelay + (Math.random() * variance - (variance / 2));
      await new Promise(r => setTimeout(r, finalDelay));
    } catch (e) {
      isTyping = false;
      break;
    }
  }
}

async function simulateHardwareKey(tabId, char) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
      type: "keyDown",
      text: char,
      unmodifiedText: char,
      key: char,
      windowsVirtualKeyCode: char.toUpperCase().charCodeAt(0)
    }, () => {
      if (chrome.runtime.lastError) return reject();
      chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
        type: "keyUp",
        key: char
      }, () => {
        if (chrome.runtime.lastError) return reject();
        resolve();
      });
    });
  });
}