window.addEventListener("focus", () => {
  chrome.runtime.sendMessage({ type: "focus", url: window.location.href });
});

window.addEventListener("blur", () => {
  chrome.runtime.sendMessage({ type: "blur", url: window.location.href });
});
