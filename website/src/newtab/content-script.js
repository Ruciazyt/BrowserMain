// Content script injected into chrome://newtab/ pages
// Sets up message listener for background script communication
(function() {
  window.__browserMainReady = true;
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'OPEN_ADD_DIALOG') {
      window.dispatchEvent(new CustomEvent('browsermain:open-add-dialog', {
        detail: {
          url: message.url,
          title: message.title,
          favicon: message.favicon,
        }
      }));
    }
    return false;
  });
})();
