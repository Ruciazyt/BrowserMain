// BrowserMain - Background Service Worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('[BrowserMain] Extension installed');
});

// Helper: build extension page URL with optional "add shortcut" query params
async function buildExtensionUrl(addData) {
  const extensionPageUrl = chrome.runtime.getURL('index.html');

  let webpageUrl = '';
  let webpageTitle = '';
  let webpageFavicon = '';

  if (addData) {
    webpageUrl = addData.url || '';
    webpageTitle = addData.title || '';
    webpageFavicon = addData.favicon || '';
  } else {
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
  }

  const url = new URL(extensionPageUrl);
  if (webpageUrl && webpageUrl.startsWith('http')) {
    url.searchParams.set('add_url', webpageUrl);
    url.searchParams.set('add_title', webpageTitle);
    url.searchParams.set('add_favicon', webpageFavicon);
  }

  return url.toString();
}

// Toolbar button clicked → open extension page in a new tab
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const targetUrl = await buildExtensionUrl(null);
    await chrome.tabs.create({ url: targetUrl });
  } catch (err) {
    console.error('[BrowserMain] Tab create error:', err);
  }
});

// Keyboard shortcut Ctrl+Shift+U / Command+Shift+U → open new tab with "add shortcut" intent
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'add-shortcut') return;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.url || !activeTab.url.startsWith('http')) return;
    const targetUrl = await buildExtensionUrl({
      url: activeTab.url,
      title: activeTab.title || '',
      favicon: activeTab.favIconUrl || '',
    });
    await chrome.tabs.create({ url: targetUrl });
  } catch (err) {
    console.error('[BrowserMain] commands.onCommand error:', err);
  }
});
