// quickadd.js — BrowserMain quick-add popup logic

(function () {
  'use strict';

  const urlInput = document.getElementById('url-input');
  const titleInput = document.getElementById('title-input');
  const groupInput = document.getElementById('group-input');
  const faviconPreview = document.getElementById('favicon-preview');
  const faviconDomain = document.getElementById('favicon-domain');
  const faviconRow = document.getElementById('favicon-row');
  const msgBar = document.getElementById('msg-bar');
  const form = document.getElementById('form');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');
  const btnClose = document.getElementById('btn-close');
  const statusDot = document.getElementById('status-dot');
  const successFlash = document.getElementById('success-flash');
  const groupDatalist = document.getElementById('group-suggestions');
  const groupHint = document.getElementById('group-hint');

  // ── URL param helpers ────────────────────────────────────────────────────

  function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }

  function getDraftParam(primaryName, legacyName) {
    return decodeURIComponent(getUrlParam(primaryName) || getUrlParam(legacyName) || '');
  }

  function getSmartFavicon(url) {
    try {
      const { hostname } = new URL(url);
      return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(hostname) + '&sz=64';
    } catch {
      return '';
    }
  }

  function isUrl(val) {
    try {
      const u = new URL(val);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  const initUrl = getDraftParam('add_url', 'url');
  const initTitle = getDraftParam('add_title', 'title');
  const initGroup = getDraftParam('group', 'group');
  let initFavicon = getDraftParam('add_favicon', 'favicon');

  urlInput.value = initUrl;
  titleInput.value = initTitle;
  if (initGroup) groupInput.value = initGroup;

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
    faviconRow.style.display = '';
  }

  // ── Dynamic favicon on URL change ───────────────────────────────────────

  urlInput.addEventListener('input', function () {
    const val = urlInput.value.trim();
    urlInput.classList.remove('input-error');
    clearMsg();
    updateStatusDot(val);

    if (val) {
      try {
        const { hostname } = new URL(val);
        faviconDomain.textContent = hostname;
        faviconPreview.src = getSmartFavicon(val);
      } catch {
        faviconDomain.textContent = val;
        faviconPreview.src = '';
      }
      faviconRow.style.display = '';
    } else {
      faviconDomain.textContent = '—';
      faviconPreview.src = '';
      faviconRow.style.display = 'none';
    }
  });

  // ── Status dot ──────────────────────────────────────────────────────────

  function updateStatusDot(val) {
    if (!val) {
      statusDot.className = 'status-dot';
      return;
    }
    if (!isUrl(val)) {
      statusDot.className = 'status-dot invalid';
      return;
    }
    // Check duplicate via storage
    chrome.storage.local.get('browsermain_shortcuts', function (result) {
      const shortcuts = result['browsermain_shortcuts'] || [];
      const isDuplicate = shortcuts.some(function (s) { return s.url.toLowerCase() === val.toLowerCase(); });
      if (isDuplicate) {
        statusDot.className = 'status-dot duplicate';
      } else {
        statusDot.className = 'status-dot valid';
      }
    });
  }

  updateStatusDot(initUrl);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showError(msg) {
    msgBar.className = 'msg-bar visible error';
    msgBar.textContent = '⚠ ' + msg;
  }

  function showWarning(msg) {
    msgBar.className = 'msg-bar visible warning';
    msgBar.textContent = '⚠ ' + msg;
  }

  function clearMsg() {
    msgBar.className = 'msg-bar';
    msgBar.textContent = '';
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();

    const url = urlInput.value.trim();
    const title = titleInput.value.trim();

    if (!url) {
      urlInput.classList.add('input-error');
      showError('URL is required');
      urlInput.focus();
      return;
    }

    if (!isUrl(url)) {
      urlInput.classList.add('input-error');
      showError('Enter a valid http/https URL');
      urlInput.focus();
      return;
    }

    const favicon = faviconPreview.src && !faviconPreview.src.startsWith('data:')
      ? faviconPreview.src
      : getSmartFavicon(url);

    const group = groupInput.value.trim() || undefined;

    btnSave.disabled = true;

    chrome.runtime.sendMessage(
      { type: 'ADD_SHORTCUT', url, title, favicon, group },
      function (response) {
        btnSave.disabled = false;

        if (chrome.runtime.lastError) {
          showError('Extension error: ' + chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success) {
          chrome.runtime.sendMessage({ type: 'SHORTCUT_ADDED' });
          form.style.display = 'none';
          successFlash.classList.add('visible');
          setTimeout(function () { window.close(); }, 800);
        } else if (response && response.duplicate) {
          showWarning('Already in your shortcuts');
        } else {
          showError('Could not save. Try again.');
        }
      }
    );
  });

  // ── Load existing groups for suggestions ─────────────────────────────────

  chrome.storage.local.get('browsermain_shortcuts', function (result) {
    const shortcuts = result['browsermain_shortcuts'] || [];
    const groups = Array.from(
      new Set(shortcuts.map(function (s) { return s.group; }).filter(function (g) { return !!g; }))
    ).sort();
    groups.forEach(function (g) {
      var option = document.createElement('option');
      option.value = g;
      groupDatalist.appendChild(option);
    });
    if (groups.length > 0) {
      groupHint.textContent = groups.length === 1
        ? '1 group available'
        : groups.length + ' groups available';
    } else {
      groupHint.textContent = 'No groups yet';
    }
  });

  // ── Cancel / Close ──────────────────────────────────────────────────────

  btnCancel.addEventListener('click', function () { window.close(); });
  btnClose.addEventListener('click', function () { window.close(); });

  // ── Escape closes popup ─────────────────────────────────────────────────

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.close();
  });

  // ── Clear error state on input ──────────────────────────────────────────

  urlInput.addEventListener('input', function () {
    urlInput.classList.remove('input-error');
    clearMsg();
  });

})();
