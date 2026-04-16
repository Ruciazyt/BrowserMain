// BrowserMain - Background Service Worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('BrowserMain extension installed');
});

// Track the previous active HTTP(S) tab using chrome.storage.session
// This is more reliable than querying lastFocusedWindow when the toolbar button is clicked
let previousTabId = null;
let previousTabUrl = '';
let previousTabTitle = '';
let previousTabFavicon = '';

// On tab activation, store the tab info (but skip chrome://, about:, etc.)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Store the previous tab info before switching
  if (previousTabId !== null) {
    // The newly activated tab just became active, so the stored one is still valid
    // We update storage only when we have a valid previous tab
  }

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.id && tab.url && tab.url.startsWith('http')) {
      // Shift: current becomes previous
      previousTabId = activeInfo.tabId;
      previousTabUrl = tab.url || '';
      previousTabTitle = tab.title || '';
      previousTabFavicon = tab.favIconUrl || '';

      // Store in session storage for persistence across service worker restarts
      await chrome.storage.session.set({
        previousTabId: activeInfo.tabId,
        previousTabUrl: tab.url || '',
        previousTabTitle: tab.title || '',
        previousTabFavicon: tab.favIconUrl || '',
      });
    }
  } catch {
    // Ignore errors (e.g., tab may have been closed)
  }
});

// Also handle chrome.tabs.onCreated to capture the tab that was active before the new tab appeared
// When a new tab is created, the previously active tab's onActivated fires AFTER the new tab is created
// So we store the previous tab info when a new tab is created and we're about to lose track of it
chrome.tabs.onCreated.addListener(async (tab) => {
  // When a new tab is created, capture the current active tab as "previous"
  // This handles the case where the user clicks the toolbar button right as the new tab appears
  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab?.id && currentTab.url && currentTab.url.startsWith('http') && currentTab.id !== tab.id) {
      previousTabId = currentTab.id;
      previousTabUrl = currentTab.url || '';
      previousTabTitle = currentTab.title || '';
      previousTabFavicon = currentTab.favIconUrl || '';

      await chrome.storage.session.set({
        previousTabId: currentTab.id,
        previousTabUrl: currentTab.url || '',
        previousTabTitle: currentTab.title || '',
        previousTabFavicon: currentTab.favIconUrl || '',
      });
    }
  } catch {
    // Ignore
  }
});

// Toolbar button clicked → send stored previous tab info to the new tab page
// to trigger the AddShortcutDialog overlay
chrome.action.onClicked.addListener(async (tab) => {
  // Restore previous tab from session storage (survives service worker restarts)
  let webpageTabId = previousTabId;
  let webpageUrl = previousTabUrl;
  let webpageTitle = previousTabTitle;
  let webpageFavicon = previousTabFavicon;

  try {
    const stored = await chrome.storage.session.get(['previousTabId', 'previousTabUrl', 'previousTabTitle', 'previousTabFavicon']);
    if (stored.previousTabId) {
      webpageTabId = stored.previousTabId;
      webpageUrl = stored.previousTabUrl || '';
      webpageTitle = stored.previousTabTitle || '';
      webpageFavicon = stored.previousTabFavicon || '';
    }
  } catch {
    // storage.session not available, fall through to in-memory values
  }

  if (!webpageTabId || !webpageUrl || !webpageUrl.startsWith('http')) return;

  // Now find the new tab to send the message to
  const newTabs = await chrome.tabs.query({ url: 'chrome://newtab/*' });
  const newTab = newTabs.find(t => t.windowId === tab.windowId) || tab;

  if (!newTab.id) return;

  chrome.tabs.sendMessage(newTab.id, {
    action: 'OPEN_ADD_DIALOG',
    url: webpageUrl,
    title: webpageTitle,
    favicon: webpageFavicon,
  }).catch(() => {
    // New tab page may not be ready yet
  });
});
