// background.js - Background script (Service Worker for Chrome MV3, Event Page for Firefox MV2)
// Note: Service workers are ephemeral - don't rely on persistent in-memory state

// Detect browser API (Firefox uses 'browser', Chrome uses 'chrome')
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

// Check if session storage is available (Chrome MV3 only)
const hasSessionStorage = browserAPI.storage && browserAPI.storage.session;

// Fallback storage for Firefox (uses local storage with a prefix)
const SESSION_KEY_PREFIX = "_session_";

// Track active popup window ID
async function getActivePopupWindowId() {
  if (hasSessionStorage) {
    const result = await browserAPI.storage.session.get("activePopupWindowId");
    return result.activePopupWindowId || null;
  } else {
    // Fallback to local storage for Firefox
    const result = await browserAPI.storage.local.get(
      SESSION_KEY_PREFIX + "activePopupWindowId"
    );
    return result[SESSION_KEY_PREFIX + "activePopupWindowId"] || null;
  }
}

async function setActivePopupWindowId(windowId) {
  if (hasSessionStorage) {
    await browserAPI.storage.session.set({ activePopupWindowId: windowId });
  } else {
    const data = {};
    data[SESSION_KEY_PREFIX + "activePopupWindowId"] = windowId;
    await browserAPI.storage.local.set(data);
  }
}

async function clearActivePopupWindowId() {
  if (hasSessionStorage) {
    await browserAPI.storage.session.remove("activePopupWindowId");
  } else {
    await browserAPI.storage.local.remove(
      SESSION_KEY_PREFIX + "activePopupWindowId"
    );
  }
}

// Handle messages from content scripts and popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Use async handler pattern for Manifest V3
  handleMessage(request, sender).then(sendResponse);
  return true; // Indicates we will respond asynchronously
});

async function handleMessage(request, sender) {
  switch (request.action) {
    case "openPopup":
      return handleOpenPopup(request);

    case "openDirectoryPicker":
      // Browser extensions can't use native directory picker directly
      return {
        error:
          "Directory picker not available in extensions. Use the text input.",
      };

    case "setDownloadDirectory":
      await browserAPI.storage.local.set({
        downloadDirectory: request.directory,
      });
      return { success: true };

    case "openInWindow":
      return handleOpenInWindow();

    default:
      return { error: "Unknown action" };
  }
}

async function handleOpenPopup(request) {
  const activeWindowId = await getActivePopupWindowId();

  if (activeWindowId) {
    try {
      // Check if window still exists
      const existingWindow = await browserAPI.windows.get(activeWindowId);
      if (existingWindow) {
        // Focus existing window and update URL
        await browserAPI.windows.update(activeWindowId, { focused: true });
        const tabs = await browserAPI.tabs.query({ windowId: activeWindowId });
        if (tabs.length > 0) {
          await browserAPI.tabs.update(tabs[0].id, { url: request.url });
        }
        return { success: true, windowId: activeWindowId };
      }
    } catch (e) {
      // Window no longer exists, clear the stored ID
      await clearActivePopupWindowId();
    }
  }

  // Create new popup window
  const newWindow = await browserAPI.windows.create({
    url: request.url,
    type: "popup",
    width: 800,
    height: 600,
  });

  await setActivePopupWindowId(newWindow.id);

  // Inject content script - use chrome.scripting for MV3, or skip for MV2 (content scripts auto-inject)
  if (browserAPI.scripting && newWindow.tabs && newWindow.tabs.length > 0) {
    try {
      await browserAPI.scripting.executeScript({
        target: { tabId: newWindow.tabs[0].id },
        files: ["content.js"],
      });
    } catch (e) {
      console.warn("Could not inject content script:", e.message);
    }
  }

  return { success: true, windowId: newWindow.id };
}

async function handleOpenInWindow() {
  const newWindow = await browserAPI.windows.create({
    url: browserAPI.runtime.getURL("popup.html"),
    type: "popup",
    width: 700,
    height: 800,
  });

  return { success: true, windowId: newWindow.id };
}

// Clean up stored window ID when window is closed
browserAPI.windows.onRemoved.addListener(async (windowId) => {
  const activeWindowId = await getActivePopupWindowId();
  if (activeWindowId === windowId) {
    await clearActivePopupWindowId();
  }
});

// Clean up stale storage on extension startup
browserAPI.runtime.onStartup.addListener(async () => {
  try {
    // Remove old/stale keys (including legacy 'imageUrls' and current 'navigationStack')
    await browserAPI.storage.local.remove(["imageUrls", "navigationStack"]);
    console.log("Storage cleaned up on startup.");
  } catch (e) {
    console.error("Error removing storage keys:", e);
  }
});

// Handle extension installation/update
browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("The Collector installed");
  } else if (details.reason === "update") {
    console.log(
      "The Collector updated to version",
      browserAPI.runtime.getManifest().version
    );
  }
});
