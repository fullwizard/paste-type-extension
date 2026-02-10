chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "start_typing_flow") {
    const tabId = sender.tab.id;
    const frameId = sender.frameId;

    // 1. Pull clipboard text from the frame context
    chrome.scripting.executeScript({
      target: { tabId: tabId, frameIds: [frameId] },
      func: () => {
        return navigator.clipboard.readText().catch(() => null);
      }
    }).then(async (results) => {
      const text = results[0]?.result;
      if (!text) return;

      // 2. Attach debugger to emulate hardware input
      chrome.debugger.attach({ tabId: tabId }, "1.2", async () => {
        if (chrome.runtime.lastError) {
          // If already attached, detach and re-attach
          chrome.debugger.detach({ tabId: tabId }, () => {
            chrome.debugger.attach({ tabId: tabId }, "1.2", () => startTyping(tabId, text));
          });
        } else {
          await startTyping(tabId, text);
        }
      });
    }).catch((err) => {
      // Scripting error handler
    });
  }
});

/**
 * Iterates through text and triggers the simulation
 */
async function startTyping(tabId, text) {
  for (const char of text) {
    await simulateHardwareKey(tabId, char);
    // Mimic human speed: 20ms to 60ms delay
    await new Promise(r => setTimeout(r, Math.random() * 40 + 20));
  }
  chrome.debugger.detach({ tabId: tabId });
}

/**
 * Sends ONLY keyDown and keyUp to prevent double-typing in Google Docs
 */
async function simulateHardwareKey(tabId, char) {
  return new Promise((resolve) => {
    chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
      type: "keyDown",
      text: char,
      unmodifiedText: char,
      key: char,
      windowsVirtualKeyCode: char.toUpperCase().charCodeAt(0)
    }, () => {
      chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
        type: "keyUp",
        key: char
      }, resolve);
    });
  });
}