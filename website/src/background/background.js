// BrowserMain - Background Service Worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('BrowserMain extension installed');
});

chrome.action.onClicked.addListener(async (tab) => {
  // Quick add shortcut from current tab
  if (tab.id && tab.url) {
    const url = tab.url;
    const title = tab.title || 'New Shortcut';
    chrome.storage.local.get('browsermain_shortcuts', (result) => {
      const shortcuts = result.browsermain_shortcuts || [];
      shortcuts.push({
        id: Date.now().toString(),
        title,
        url,
        favicon: tab.favIconUrl,
        order: shortcuts.length,
      });
      chrome.storage.local.set({ browsermain_shortcuts: shortcuts });
    });
  }
});