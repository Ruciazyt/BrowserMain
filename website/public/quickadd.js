// quickadd.js — BrowserMain quick-add popup logic

(function () {
  'use strict';

  const urlInput = document.getElementById('url-input');
  const titleInput = document.getElementById('title-input');
  const faviconPreview = document.getElementById('favicon-preview');
  const faviconDomain = document.getElementById('favicon-domain');
  const msgBar = document.getElementById('msg-bar');
  const form = document.getElementById('form');
  const btnCancel = document.getElementById('btn-cancel');

  // ── URL param helpers ────────────────────────────────────────────────────

  function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }

  function getSmartFavicon(url) {
    try {
      const { hostname } = new URL(url);
      return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(hostname) + '&sz=64';
    } catch {
      return '';
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  const initUrl = decodeURIComponent(getUrlParam('url'));
  const initTitle = decodeURIComponent(getUrlParam('title'));
  let initFavicon = decodeURIComponent(getUrlParam('favicon'));

  urlInput.value = initUrl;
  titleInput.value = initTitle;

  if (initFavicon) {
    faviconPreview.src = initFavicon;
  } else if (initUrl) {
    faviconPreview.src = getSmartFavicon(initUrl);
  }

  if (initUrl) {
    try {
      faviconDomain.textContent = new URL(initUrl).hostname;
    } catch {
      faviconDomain.textContent = initUrl;
    }
  }

  // ── Dynamic favicon on URL change ───────────────────────────────────────

  urlInput.addEventListener('input', function () {
    const val = urlInput.value.trim();
    if (val) {
      try {
        const { hostname } = new URL(val);
        faviconDomain.textContent = hostname;
        faviconPreview.src = getSmartFavicon(val);
      } catch {
        faviconDomain.textContent = val;
        faviconPreview.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    } else {
      faviconDomain.textContent = '—';
      faviconPreview.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showError(msg) {
    msgBar.className = 'msg-bar error';
    msgBar.textContent = msg;
  }

  function showWarning(msg) {
    msgBar.className = 'msg-bar warning';
    msgBar.textContent = msg;
  }

  function clearMsg() {
    msgBar.className = 'msg-bar';
    msgBar.textContent = '';
  }

  function validateUrl(val) {
    try {
      const u = new URL(val);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();

    const url = urlInput.value.trim();
    const title = titleInput.value.trim();

    if (!url) {
      urlInput.classList.add('error');
      showError('URL is required');
      urlInput.focus();
      return;
    }

    if (!validateUrl(url)) {
      urlInput.classList.add('error');
      showError('Enter a valid http/https URL');
      urlInput.focus();
      return;
    }

    // Build favicon from current URL if not set
    const favicon = faviconPreview.src && !faviconPreview.src.startsWith('data:')
      ? faviconPreview.src
      : getSmartFavicon(url);

    chrome.runtime.sendMessage(
      { type: 'ADD_SHORTCUT', url, title, favicon },
      (response) => {
        if (chrome.runtime.lastError) {
          showError('Extension error: ' + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          chrome.runtime.sendMessage({ type: 'SHORTCUT_ADDED' });
          setTimeout(() => window.close(), 50);
        } else if (response && response.duplicate) {
          showWarning('Already in your shortcuts');
        } else {
          showError('Could not save. Try again.');
        }
      }
    );
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  btnCancel.addEventListener('click', function () {
    window.close();
  });

  // ── Escape closes popup ───────────────────────────────────────────────────

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.close();
  });

  // ── Clear error state on input ───────────────────────────────────────────

  urlInput.addEventListener('input', function () {
    urlInput.classList.remove('error');
    clearMsg();
  });

})();
