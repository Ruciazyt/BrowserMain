// BrowserMain - Background Service Worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('[BrowserMain] Extension installed');
});

// Toolbar button clicked → open extension page in a new tab
chrome.action.onClicked.addListener(async (tab) => {
  const extensionPageUrl = chrome.runtime.getURL('index.html');

  // Always get the CURRENT active tab info directly — don't rely on previousTab*
  let webpageUrl = '';
  let webpageTitle = '';
  let webpageFavicon = '';

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url && activeTab.url.startsWith('http')) {
      webpageUrl = activeTab.url || '';
      webpageTitle = activeTab.title || '';
      webpageFavicon = activeTab.favIconUrl || '';
    }
  } catch (err) {
    console.error('[BrowserMain] Tab query error:', err);
  }

  // Build the target URL with shortcut data as query params
  const url = new URL(extensionPageUrl);
  if (webpageUrl && webpageUrl.startsWith('http')) {
    url.searchParams.set('add_url', webpageUrl);
    url.searchParams.set('add_title', webpageTitle);
    url.searchParams.set('add_favicon', webpageFavicon);
  }

  try {
    await chrome.tabs.create({ url: url.toString() });
  } catch (err) {
    console.error('[BrowserMain] Tab create error:', err);
  }
});
