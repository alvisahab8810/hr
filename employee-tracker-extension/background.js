let currentTab = null;
let activityStartTime = Date.now();

// Change this to the logged-in employee's actual email
const employeeEmail = localStorage.getItem("employeeEmail") || "employee@example.com";

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url.startsWith('chrome://')) {
    logActivity(tab);
    currentTab = tab;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && !tab.url.startsWith('chrome://')) {
    logActivity(tab);
    currentTab = tab;
  }
});

function logActivity(tab) {
  const timeSpent = Date.now() - activityStartTime;
  activityStartTime = Date.now();

  fetch('http://localhost:3000/api/track-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeEmail,
      url: tab.url,
      title: tab.title,
      timeSpent,
      timestamp: new Date().toISOString(),
    }),
  }).catch((err) => console.error("Error sending activity:", err));
}
