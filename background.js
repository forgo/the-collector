// background.js - Service Worker for Manifest V3
// Note: Service workers are ephemeral - don't rely on persistent in-memory state

// Use chrome.storage.session for temporary state (persists across service worker restarts but not browser restarts)
// Track active popup window ID
async function getActivePopupWindowId() {
  const result = await chrome.storage.session.get('activePopupWindowId');
  return result.activePopupWindowId || null;
}

async function setActivePopupWindowId(windowId) {
  await chrome.storage.session.set({ activePopupWindowId: windowId });
}

async function clearActivePopupWindowId() {
  await chrome.storage.session.remove('activePopupWindowId');
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Use async handler pattern for Manifest V3
  handleMessage(request, sender).then(sendResponse);
  return true; // Indicates we will respond asynchronously
});

async function handleMessage(request, sender) {
  switch (request.action) {
    case 'openPopup':
      return handleOpenPopup(request);

    case 'openDirectoryPicker':
      // Browser extensions can't use native directory picker directly
      return { error: 'Directory picker not available in extensions. Use the text input.' };

    case 'setDownloadDirectory':
      await chrome.storage.local.set({ downloadDirectory: request.directory });
      return { success: true };

    case 'openInWindow':
      return handleOpenInWindow();

    default:
      return { error: 'Unknown action' };
  }
}

async function handleOpenPopup(request) {
  const activeWindowId = await getActivePopupWindowId();

  if (activeWindowId) {
    try {
      // Check if window still exists
      const existingWindow = await chrome.windows.get(activeWindowId);
      if (existingWindow) {
        // Focus existing window and update URL
        await chrome.windows.update(activeWindowId, { focused: true });
        const tabs = await chrome.tabs.query({ windowId: activeWindowId });
        if (tabs.length > 0) {
          await chrome.tabs.update(tabs[0].id, { url: request.url });
        }
        return { success: true, windowId: activeWindowId };
      }
    } catch (e) {
      // Window no longer exists, clear the stored ID
      await clearActivePopupWindowId();
    }
  }

  // Create new popup window
  const newWindow = await chrome.windows.create({
    url: request.url,
    type: 'popup',
    width: 800,
    height: 600
  });

  await setActivePopupWindowId(newWindow.id);

  // Inject content script using Manifest V3 API
  if (newWindow.tabs && newWindow.tabs.length > 0) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: newWindow.tabs[0].id },
        files: ['content.js']
      });
    } catch (e) {
      console.warn('Could not inject content script:', e.message);
    }
  }

  return { success: true, windowId: newWindow.id };
}

async function handleOpenInWindow() {
  const newWindow = await chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: 700,
    height: 800
  });

  return { success: true, windowId: newWindow.id };
}

// Clean up stored window ID when window is closed
chrome.windows.onRemoved.addListener(async (windowId) => {
  const activeWindowId = await getActivePopupWindowId();
  if (activeWindowId === windowId) {
    await clearActivePopupWindowId();
  }
});

// Clean up stale storage on extension startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    // Remove old/stale keys (including legacy 'imageUrls' and current 'navigationStack')
    await chrome.storage.local.remove(['imageUrls', 'navigationStack']);
    console.log('Storage cleaned up on startup.');
  } catch (e) {
    console.error('Error removing storage keys:', e);
  }
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Image Explorer installed');
  } else if (details.reason === 'update') {
    console.log('Image Explorer updated to version', chrome.runtime.getManifest().version);
  }
});
