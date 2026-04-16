// BrowserMain - Background Service Worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('BrowserMain extension installed');
});

// Toolbar button clicked → send current tab info to the new tab page
// to trigger the AddShortcutDialog overlay
chrome.action.onClicked.addListener(async (tab) => {
  // Only handle http(s) pages — skip chrome:// URLs etc.
  if (!tab.id || !tab.url || !tab.url.startsWith('http')) return;

  // Query the active tab in the current window (the new tab page)
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab.id) return;

  chrome.tabs.sendMessage(activeTab.id, {
    action: 'OPEN_ADD_DIALOG',
    url: tab.url,
    title: tab.title || '',
    favicon: tab.favIconUrl || '',
  }).catch(() => {
    // New tab page may not be ready yet — silently ignore
  });
});
