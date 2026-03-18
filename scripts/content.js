window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'm') {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: "start_typing_flow" });
  }
  if (e.key === 'Escape') {
    chrome.runtime.sendMessage({ action: "stop_typing" });
  }
}, true);