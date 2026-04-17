// BrowserMain - Background Service Worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('[BrowserMain] Extension installed');
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
      console.log('[BrowserMain] Stored previous tab:', previousTabUrl);
    }
  } catch (err) {
    console.error('[BrowserMain] onActivated error:', err);
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
      console.log('[BrowserMain] onCreated stored previous tab:', previousTabUrl);
    }
  } catch (err) {
    console.error('[BrowserMain] onCreated error:', err);
  }
});

// Toolbar button clicked → open extension page in a new tab
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[BrowserMain] Toolbar button clicked, tab:', tab?.id);

  // Get the extension's base URL
  const extensionBase = chrome.runtime.getURL('');
  console.log('[BrowserMain] Extension base URL:', extensionBase);

  // Restore previous tab from session storage
  let webpageUrl = previousTabUrl;
  let webpageTitle = previousTabTitle;
  let webpageFavicon = previousTabFavicon;

  try {
    const stored = await chrome.storage.session.get(['previousTabUrl', 'previousTabTitle', 'previousTabFavicon']);
    console.log('[BrowserMain] Storage result:', stored);
    if (stored.previousTabUrl) {
      webpageUrl = stored.previousTabUrl || '';
      webpageTitle = stored.previousTabTitle || '';
      webpageFavicon = stored.previousTabFavicon || '';
    }
  } catch (err) {
    console.error('[BrowserMain] Storage read error:', err);
  }

  console.log('[BrowserMain] Will open tab with URL:', webpageUrl);

  // Build target URL — use extension base with optional add params
  const url = new URL(extensionBase);
  if (webpageUrl && webpageUrl.startsWith('http')) {
    url.searchParams.set('add_url', webpageUrl);
    url.searchParams.set('add_title', webpageTitle);
    url.searchParams.set('add_favicon', webpageFavicon);
  }

  const finalUrl = url.toString();
  console.log('[BrowserMain] Final tab URL:', finalUrl);

  try {
    await chrome.tabs.create({ url: finalUrl });
    console.log('[BrowserMain] Tab created successfully');
  } catch (err) {
    console.error('[BrowserMain] Tab create error:', err);
  }
});
