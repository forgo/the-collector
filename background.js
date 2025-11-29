// background.js
let activePopupWindow = null;  // Track the active popup window

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'openPopup') {
    // Only open a new popup if one doesn't exist
    if (activePopupWindow) {
      // If a popup is already open, focus on it and navigate to the new link
      chrome.windows.update(activePopupWindow.id, { focused: true });
      chrome.tabs.update(activePopupWindow.tabs[0].id, { url: request.url });
    } else {
      // Otherwise, create a new popup
      chrome.windows.create({
        url: request.url,
        type: 'popup',
        width: 800,
        height: 600
      }, function(newWindow) {
        activePopupWindow = newWindow;  // Store the new popup window ID
        // Inject content.js into the new popup window's tab
        chrome.tabs.executeScript(newWindow.tabs[0].id, { file: 'content.js' });
      });
    }
  }
});

chrome.windows.onRemoved.addListener(function(windowId) {
  // Reset the active popup window when it's closed
  if (activePopupWindow && activePopupWindow.id === windowId) {
    activePopupWindow = null;
  }
});

// Clean up stale storage on extension startup
chrome.runtime.onStartup.addListener(() => {
  // Remove old/stale keys (including legacy 'imageUrls' and current 'navigationStack')
  chrome.storage.local.remove(['imageUrls', 'navigationStack'], function() {
    if (chrome.runtime.lastError) {
      console.error('Error removing storage keys:', chrome.runtime.lastError);
    } else {
      console.log('Storage cleaned up on startup.');
    }
  });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'openDirectoryPicker') {
    // Browser extensions can't use native directory picker directly
    sendResponse({ error: 'Directory picker not available in extensions. Use the text input.' });
  } else if (request.action === 'setDownloadDirectory') {
    chrome.storage.local.set({ downloadDirectory: request.directory }, function() {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'openInWindow') {
    // Open the popup as a standalone window
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 700,
      height: 800
    }, function(newWindow) {
      sendResponse({ success: true, windowId: newWindow.id });
    });
    return true;
  }
});
