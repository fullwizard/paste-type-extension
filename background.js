let isTyping = false;
let currentTabId = null;

// Handle manual "Cancel" from the browser debug bar
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === currentTabId) {
    isTyping = false;
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  // Emergency Stop (from Escape key in content.js)
  if (message.action === "stop_typing") {
    isTyping = false;
    if (currentTabId) {
      chrome.debugger.detach({ tabId: currentTabId }, () => {
        if (chrome.runtime.lastError) { /* ignore already detached */ }
      });
    }
    return;
  }

  if (message.action === "start_typing_flow") {
    if (isTyping) return; // Prevent multiple loops if triggered twice

    const tabId = sender.tab.id;
    const frameId = sender.frameId;

    // Fetch user preferences
    chrome.storage.local.get(['typingSpeed', 'isInstant'], (settings) => {
      const isInstant = settings.isInstant || false;
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
            // If already attached, detach and cycle the connection
            chrome.debugger.detach({ tabId: tabId }, () => {
              chrome.debugger.attach({ tabId: tabId }, "1.2", () => {
                isTyping = true;
                currentTabId = tabId;
                startTyping(tabId, text, baseDelay, isInstant);
              });
            });
          } else {
            isTyping = true;
            currentTabId = tabId;
            await startTyping(tabId, text, baseDelay, isInstant);
            
            // Clean up when finished
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

async function startTyping(tabId, text, baseDelay, isInstant) {
  for (const char of text) {
    if (!isTyping) break;

    try {
      await simulateHardwareKey(tabId, char);
      
      // THE CONDITIONAL:
      if (!isInstant) {
        // Human Mode: Use the slider delay + variance
        const variance = baseDelay * 0.2;
        const finalDelay = baseDelay + (Math.random() * variance - (variance / 2));
        await new Promise(r => setTimeout(r, finalDelay));
      } else {
        // Instant Mode: No calculated wait. 
        // We use 0ms just to keep the browser from freezing up.
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (e) {
      isTyping = false;
      break;
    }
  }
}

async function simulateHardwareKey(tabId, char) {
  return new Promise((resolve, reject) => {
    // Send keyDown ONLY (includes character data). Sending "char" causes double letters in Docs.
    chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
      type: "keyDown",
      text: char,
      unmodifiedText: char,
      key: char,
      windowsVirtualKeyCode: char.toUpperCase().charCodeAt(0)
    }, () => {
      if (chrome.runtime.lastError) return reject();
      
      // Send keyUp to finish the stroke
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