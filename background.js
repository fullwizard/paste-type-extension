let isTyping = false;
let currentTabId = null;

chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === currentTabId) isTyping = false;
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "stop_typing") { isTyping = false; return; }

  if (message.action === "start_typing_flow") {
    if (isTyping) return;
    const tabId = sender.tab.id;

    chrome.storage.local.get(['typingSpeed', 'isInstant', 'randomness', 'typoFreq', 'isActive', 'noCorrect'], (settings) => {
      if (!settings.isActive) return;

      const isInstant = settings.isInstant || false;
      const baseDelay = Math.max(5, 500 - (settings.typingSpeed * 4.9));
      const randomness = (settings.randomness || 0) / 100;
      const typoFreq = (settings.typoFreq || 0) / 100;
      const noCorrect = settings.noCorrect || false;

      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => navigator.clipboard.readText().catch(() => null)
      }).then(async (results) => {
        let rawText = results[0]?.result;
        if (!rawText) return;

        // --- PRE-PROCESS: Fix Quotes & Newlines ---
        let processedText = rawText.toString()
          .replace(/[\u2018\u2019]/g, "'") // Fix curly single quotes
          .replace(/[\u201C\u201D]/g, '"') // Fix curly double quotes
          .replace(/\r\n/g, "\n")          
          .replace(/\r/g, "\n");           

        const cleanText = Array.from(processedText)
          .map(char => {
            const code = char.charCodeAt(0);
            if ((code >= 32 && code <= 126) || code === 10 || code === 9) return char;
            if (code === 160) return " "; 
            return ""; 
          }).join("");

        // Clipboard Flush to kill Bold Metadata
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (t) => {
                const blob = new Blob([t], { type: "text/plain" });
                const data = [new ClipboardItem({ "text/plain": blob })];
                navigator.clipboard.write(data).catch(() => {});
            },
            args: [cleanText]
        });

        chrome.debugger.attach({ tabId: tabId }, "1.2", async () => {
          if (chrome.runtime.lastError) {
             chrome.debugger.detach({ tabId: tabId }, () => {
               chrome.debugger.attach({ tabId: tabId }, "1.2", () => startSequence(tabId, cleanText, baseDelay, isInstant, randomness, typoFreq, noCorrect));
             });
          } else {
             await new Promise(r => setTimeout(r, 150)); 
             await startSequence(tabId, cleanText, baseDelay, isInstant, randomness, typoFreq, noCorrect);
          }
        });
      });
    });
  }
});

async function startSequence(tabId, text, baseDelay, isInstant, randomness, typoFreq, noCorrect) {
  isTyping = true;
  currentTabId = tabId;

  for (const char of text) {
    if (!isTyping) break;

    if (!isInstant && typoFreq > 0 && Math.random() < typoFreq && !/[\s\n]/.test(char)) {
      const keys = "asdfghjklqwertyuiop";
      const wrongChar = keys[Math.floor(Math.random() * keys.length)];
      await simulateKey(tabId, wrongChar);
      if (!noCorrect) {
        await new Promise(r => setTimeout(r, baseDelay * 1.5)); 
        await simulateKey(tabId, 'Backspace');
        await new Promise(r => setTimeout(r, baseDelay * 0.8)); 
      }
    }

    await simulateKey(tabId, char);

    if (!isInstant) {
      const varAmount = baseDelay * randomness;
      const finalDelay = baseDelay + (Math.random() * varAmount * 2 - varAmount);
      await new Promise(r => setTimeout(r, Math.max(2, finalDelay)));
    } else {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  if (isTyping) chrome.debugger.detach({ tabId: tabId });
  isTyping = false;
}

async function simulateKey(tabId, char) {
  const special = {
    '(': { code: 57, s: true }, ')': { code: 48, s: true },
    '.': { code: 190, s: false }, ',': { code: 188, s: false },
    ' ': { code: 32, s: false }, '\n': { code: 13, s: false },
    '\t': { code: 9, s: false }, 'Backspace': { code: 8, s: false }, 
    '-': { code: 189, s: false }, '!': { code: 49, s: true }, 
    '?': { code: 191, s: true }, '"': { code: 222, s: true }, 
    "'": { code: 222, s: false }, ';': { code: 186, s: false }, 
    ':': { code: 186, s: true }, '/': { code: 191, s: false }, 
    '\\': { code: 220, s: false }, '&': { code: 55, s: true }
  };

  const spec = special[char];
  const keyCode = spec ? spec.code : char.toUpperCase().charCodeAt(0);
  const mods = (spec?.s || /[A-Z]/.test(char)) ? 8 : 0;
  const isEnter = char === '\n';
  
  const params = {
    windowsVirtualKeyCode: keyCode,
    modifiers: mods,
    key: isEnter ? "Enter" : char,
    text: (char === 'Backspace' || isEnter) ? "" : char,
    unmodifiedText: (char === 'Backspace' || isEnter) ? "" : char
  };

  await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", { 
    type: isEnter ? "rawKeyDown" : "keyDown", 
    ...params 
  });
  
  await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", { 
    type: "keyUp", 
    ...params 
  });
}