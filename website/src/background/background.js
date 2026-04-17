// BrowserMain - Background Service Worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('BrowserMain extension installed');
});

// Track the previous active HTTP(S) tab whenever it becomes active
let previousTabUrl = '';
let previousTabTitle = '';
let previousTabFavicon = '';

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.id && tab.url && tab.url.startsWith('http')) {
      previousTabUrl = tab.url;
      previousTabTitle = tab.title || '';
      previousTabFavicon = tab.favIconUrl || '';

      await chrome.storage.session.set({
        previousTabUrl: previousTabUrl,
        previousTabTitle: previousTabTitle,
        previousTabFavicon: previousTabFavicon,
      });
    }
  } catch {
    // Ignore errors
  }
});

// Also capture the active tab when a new tab is about to be created
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.active) return; // skip — toolbar button creates an active tab
  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab?.id && currentTab.url && currentTab.url.startsWith('http')) {
      previousTabUrl = currentTab.url;
      previousTabTitle = currentTab.title || '';
      previousTabFavicon = currentTab.favIconUrl || '';
      await chrome.storage.session.set({
        previousTabUrl: previousTabUrl,
        previousTabTitle: previousTabTitle,
        previousTabFavicon: previousTabFavicon,
      });
    }
  } catch {
    // Ignore
  }
});

// Toolbar button clicked → open a new tab pointing to the extension's own page
// This avoids chrome://newtab/ override ambiguity and is fully reliable
chrome.action.onClicked.addListener(async (tab) => {
  // Open the bundled new tab page explicitly instead of the extension root.
  const extensionPageUrl = chrome.runtime.getURL('index.html');

  let webpageUrl = previousTabUrl;
  let webpageTitle = previousTabTitle;
  let webpageFavicon = previousTabFavicon;

  try {
    const stored = await chrome.storage.session.get(['previousTabUrl', 'previousTabTitle', 'previousTabFavicon']);
    if (stored.previousTabUrl) {
      webpageUrl = stored.previousTabUrl || '';
      webpageTitle = stored.previousTabTitle || '';
      webpageFavicon = stored.previousTabFavicon || '';
    }
  } catch {
    // ignore
  }

  // Build the target URL with shortcut data as query params
  const url = new URL(extensionPageUrl);
  if (webpageUrl && webpageUrl.startsWith('http')) {
    url.searchParams.set('add_url', webpageUrl);
    url.searchParams.set('add_title', webpageTitle);
    url.searchParams.set('add_favicon', webpageFavicon);
  }

  // Create new tab pointing to our extension page
  chrome.tabs.create({ url: url.toString() });
});
