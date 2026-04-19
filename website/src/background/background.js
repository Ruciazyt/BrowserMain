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
// Extension URL builder
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Chrome event listeners
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  console.log('[BrowserMain] Extension installed');
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const targetUrl = await buildExtensionUrl(null);
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

// ── Quick-add popup message handler ───────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ADD_SHORTCUT') {
    const { url, title, favicon } = msg;

    getShortcuts().then((shortcuts) => {
      // Duplicate check
      if (shortcuts.some((s) => s.url === url)) {
        sendResponse({ success: false, duplicate: true });
        return;
      }

      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        url: url || '',
        title: title || '',
        favicon: favicon || '',
        createdAt: Date.now(),
      };

      shortcuts.unshift(entry);
      saveShortcuts(shortcuts).then(() => {
        console.log('[BrowserMain] Shortcut added:', entry.title);
        sendResponse({ success: true });
      });
    });

    return true; // async response
  }
});
