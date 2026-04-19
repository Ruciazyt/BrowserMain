// BrowserMain - Background Service Worker (MV3)
// Self-contained classic script — no ES module imports/exports allowed in MV3 service workers.

const SHORTCUTS_KEY = 'browsermain_shortcuts';
const SETTINGS_KEY = 'browsermain_settings';

// ---------------------------------------------------------------------------
// Storage helpers (inlined from ../newtab/utils/storage.ts)
// ---------------------------------------------------------------------------

function getFaviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return 'https://' + hostname + '/favicon.ico';
  } catch {
    return '';
  }
}

function getSmartFaviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    const domain = encodeURIComponent(hostname);
    return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64';
  } catch {
    return '';
  }
}

function getShortcuts() {
  return new Promise((resolve) => {
    chrome.storage.local.get(SHORTCUTS_KEY, (result) => {
      resolve(result[SHORTCUTS_KEY] || []);
    });
  });
}

function saveShortcuts(shortcuts) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SHORTCUTS_KEY]: shortcuts }, resolve);
  });
}

// ---------------------------------------------------------------------------
// Chrome Favicons API helpers
// ---------------------------------------------------------------------------

/**
 * Get favicon URL for the active tab using Chrome's native favicons API.
 * Falls back to the tab's built-in favIconUrl if available.
 * Returns '' if no tab is available or the API fails.
 */
async function getActiveTabFavicon() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) return '';
    // chrome.favicons.getFaviconUrl returns the resolved favicon URL for the tab
    const faviconUrl = await chrome.favicons.getFaviconUrl(activeTab.id);
    return faviconUrl || activeTab.favIconUrl || '';
  } catch (err) {
    // Fall back to the tab's built-in favIconUrl on any error
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return activeTab?.favIconUrl || '';
    } catch {
      return '';
    }
  }
}

/**
 * Get favicon URL for a given URL by finding a matching tab and using Chrome's favicons API.
 * Returns '' if no tab is found for the URL or the API fails.
 */
async function getFaviconForUrl(url) {
  if (!url || !url.startsWith('http')) return '';
  try {
    // Find a tab that has loaded this URL
    const tabs = await chrome.tabs.query({ url: url });
    if (tabs && tabs.length > 0 && tabs[0].id) {
      const faviconUrl = await chrome.favicons.getFaviconUrl(tabs[0].id);
      return faviconUrl || tabs[0].favIconUrl || '';
    }
    return '';
  } catch (err) {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Extension URL builder
// ---------------------------------------------------------------------------

async function buildExtensionUrl(addData, targetPage) {
  const page = targetPage === 'popup' ? 'quickadd.html' : 'index.html';
  const extensionPageUrl = chrome.runtime.getURL(page);

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
        // Use Chrome's native favicons API first, fall back to tab's built-in favIconUrl
        const chromeFavicon = await getActiveTabFavicon();
        webpageFavicon = chromeFavicon || activeTab.favIconUrl || '';
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

// ---------------------------------------------------------------------------
// Chrome event listeners
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  console.log('[BrowserMain] Extension installed');
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const targetUrl = await buildExtensionUrl(null, 'popup');
    await chrome.tabs.create({ url: targetUrl });
  } catch (err) {
    console.error('[BrowserMain] Tab create error:', err);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'add-shortcut') return;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.url || !activeTab.url.startsWith('http')) return;
    // Use Chrome's native favicons API for best quality favicon
    const chromeFavicon = await getActiveTabFavicon();
    const targetUrl = await buildExtensionUrl({
      url: activeTab.url,
      title: activeTab.title || '',
      favicon: chromeFavicon || activeTab.favIconUrl || '',
    }, 'popup');
    await chrome.tabs.create({ url: targetUrl });
  } catch (err) {
    console.error('[BrowserMain] commands.onCommand error:', err);
  }
});

// ── Quick-add popup message handler ───────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ADD_SHORTCUT') {
    const { url, title, favicon, group } = msg;

    getShortcuts().then((shortcuts) => {
      // Duplicate check (case-insensitive)
      if (shortcuts.some((s) => s.url.toLowerCase() === url.toLowerCase())) {
        sendResponse({ success: false, duplicate: true });
        return;
      }

      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        url: url || '',
        title: title || '',
        favicon: favicon || '',
        group: group || undefined,
        order: shortcuts.length,
      };

      shortcuts.unshift(entry);
      saveShortcuts(shortcuts).then(() => {
        console.log('[BrowserMain] Shortcut added:', entry.title);
        sendResponse({ success: true });
      });
    });

    return true; // async response
  }

  // GET_FAVICON: resolve favicon for a given URL using Chrome's native favicons API
  if (msg.type === 'GET_FAVICON') {
    const { url } = msg;
    if (!url) {
      sendResponse({ favicon: '' });
      return;
    }

    getFaviconForUrl(url)
      .then((favicon) => {
        // If Chrome API returned nothing, fall back to Google S2
        const fallback = favicon || getSmartFaviconUrl(url);
        sendResponse({ favicon: fallback });
      })
      .catch(() => {
        sendResponse({ favicon: getSmartFaviconUrl(url) });
      });

    return true; // async response
  }
});
