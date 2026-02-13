let isTyping = false;
let currentTabId = null;

chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === currentTabId) isTyping = false;
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "stop_typing") {
    isTyping = false;
    if (currentTabId) chrome.debugger.detach({ tabId: currentTabId }, () => {});
    return;
  }

  if (message.action === "start_typing_flow") {
    if (isTyping) return;
    const tabId = sender.tab.id;
    const frameId = sender.frameId;

    chrome.storage.local.get(['typingSpeed', 'isInstant'], (settings) => {
      const isInstant = settings.isInstant || false;
      const userSpeed = settings.typingSpeed || 50;
      const baseDelay = Math.max(10, 500 - (userSpeed * 4.9));

      chrome.scripting.executeScript({
        target: { tabId: tabId, frameIds: [frameId] },
        func: () => navigator.clipboard.readText().catch(() => null)
      }).then(async (results) => {
        let text = results[0]?.result;
        if (!text) return;

        // --- THE "PURIFY" STEP ---
        // 1. Convert to a standard string to drop object metadata
        // 2. Strip non-ASCII/Hidden control characters that cause jumping
        // 3. Normalize all whitespace/newlines
        text = text.toString()
                   .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove hidden zero-width chars
                   .replace(/\u00A0/g, ' ')               // Non-breaking space to Space
                   .replace(/\r\n/g, '\n')                // Normalize newlines
                   .replace(/\r/g, '\n');

        chrome.debugger.attach({ tabId: tabId }, "1.2", async () => {
          if (chrome.runtime.lastError) {
            chrome.debugger.detach({ tabId: tabId }, () => {
              chrome.debugger.attach({ tabId: tabId }, "1.2", () => runTypingSequence(tabId, text, baseDelay, isInstant));
            });
          } else {
            await runTypingSequence(tabId, text, baseDelay, isInstant);
          }
        });
      });
    });
  }
});

async function runTypingSequence(tabId, text, baseDelay, isInstant) {
  isTyping = true;
  currentTabId = tabId;

  for (const char of text) {
    if (!isTyping) break;
    
    await simulateHardwareKey(tabId, char);
    
    // BACK TO TRUE SPEED: No more chunking pauses
    const delay = isInstant ? 0 : (baseDelay + (Math.random() * (baseDelay * 0.1)));
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
  }

  if (isTyping) {
    chrome.debugger.detach({ tabId: tabId });
    isTyping = false;
  }
}

async function simulateHardwareKey(tabId, char) {
  const specialKeys = {
    '(': { code: 57, shift: true }, ')': { code: 48, shift: true },
    '%': { code: 53, shift: true }, ';': { code: 186, shift: false },
    ':': { code: 186, shift: true }, '.': { code: 190, shift: false },
    ',': { code: 188, shift: false }, '-': { code: 189, shift: false },
    '!': { code: 49, shift: true }, '?': { code: 191, shift: true },
    ' ': { code: 32, shift: false }, '\n': { code: 13, shift: false },
    '&': { code: 55, shift: true }, '"': { code: 222, shift: true },
    "'": { code: 222, shift: false }
  };

  const isUpper = /[A-Z]/.test(char);
  const spec = specialKeys[char];
  const keyCode = spec ? spec.code : char.toUpperCase().charCodeAt(0);
  const needsShift = spec ? spec.shift : isUpper;
  const modifiers = needsShift ? 8 : 0;

  // KeyDown and KeyUp in immediate succession
  await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
    type: "keyDown", text: char, unmodifiedText: char, key: char,
    modifiers: modifiers, windowsVirtualKeyCode: keyCode
  });

  await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
    type: "keyUp", key: char, modifiers: modifiers, windowsVirtualKeyCode: keyCode
  });
}