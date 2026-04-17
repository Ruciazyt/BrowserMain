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
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.id && tab.url && tab.url.startsWith('http')) {
      previousTabId = activeInfo.tabId;
      previousTabUrl = tab.url || '';
      previousTabTitle = tab.title || '';
      previousTabFavicon = tab.favIconUrl || '';

      await chrome.storage.session.set({
        previousTabId: activeInfo.tabId,
        previousTabUrl: tab.url || '',
        previousTabTitle: tab.title || '',
        previousTabFavicon: tab.favIconUrl || '',
      });
    }
  } catch {
    // Ignore errors
  }
});

// Also handle chrome.tabs.onCreated to capture the tab that was active before the new tab appeared
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.active) return;

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

// Toolbar button clicked → open newtab with shortcut data in URL fragment
chrome.action.onClicked.addListener(async (tab) => {
  // Restore previous tab from session storage (survives service worker restarts)
  let webpageUrl = previousTabUrl;
  let webpageTitle = previousTabTitle;
  let webpageFavicon = previousTabFavicon;

  try {
    const stored = await chrome.storage.session.get(['previousTabId', 'previousTabUrl', 'previousTabTitle', 'previousTabFavicon']);
    if (stored.previousTabId) {
      webpageUrl = stored.previousTabUrl || '';
      webpageTitle = stored.previousTabTitle || '';
      webpageFavicon = stored.previousTabFavicon || '';
    }
  } catch {
    // ignore
  }

  if (!webpageUrl || !webpageUrl.startsWith('http')) {
    // No valid previous tab — open plain newtab
    chrome.tabs.create({ url: 'chrome://newtab/' });
    return;
  }

  // Pass shortcut data via URL fragment (never sent to server, no storage latency issues)
  const params = new URLSearchParams({
    add_url: webpageUrl || '',
    add_title: webpageTitle || '',
    add_favicon: webpageFavicon || '',
  });

  chrome.tabs.create({ url: `chrome://newtab/#${params.toString()}` });
});
