// BrowserMain - Background Service Worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('BrowserMain extension installed');
});

// Toolbar button clicked → send current tab info to the new tab page
// to trigger the AddShortcutDialog overlay
chrome.action.onClicked.addListener(async (tab) => {
  // tab here is the new tab — we need the webpage the user was on BEFORE clicking
  // Use lastFocusedWindow + active to get the currently focused webpage tab
  const [webpageTab] = await chrome.tabs.query({ lastFocusedWindow: true, active: true });

  if (!webpageTab?.id) return;

  const url = webpageTab.url || '';
  // Skip chrome://, about:, etc.
  if (!url.startsWith('http')) return;

  // Now find the new tab to send the message to
  const newTabs = await chrome.tabs.query({ url: 'chrome://newtab/*' });
  const newTab = newTabs.find(t => t.windowId === tab.windowId) || tab;

  if (!newTab.id) return;

  chrome.tabs.sendMessage(newTab.id, {
    action: 'OPEN_ADD_DIALOG',
    url: webpageTab.url,
    title: webpageTab.title || '',
    favicon: webpageTab.favIconUrl || '',
  }).catch(() => {
    // New tab page may not be ready yet
  });
});
