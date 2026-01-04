// Check if session storage is available (Chrome MV3 only)
const hasSessionStorage = !!browser.storage?.session;

// Fallback storage prefix for Firefox
const SESSION_KEY_PREFIX = '_session_';

// Track active popup window ID
async function getActivePopupWindowId(): Promise<number | null> {
  if (hasSessionStorage) {
    const result = await browser.storage.session.get('activePopupWindowId');
    return (result.activePopupWindowId as number) || null;
  } else {
    const key = SESSION_KEY_PREFIX + 'activePopupWindowId';
    const result = await browser.storage.local.get(key);
    return (result[key] as number) || null;
  }
}

async function setActivePopupWindowId(windowId: number): Promise<void> {
  if (hasSessionStorage) {
    await browser.storage.session.set({ activePopupWindowId: windowId });
  } else {
    const data: Record<string, number> = {};
    data[SESSION_KEY_PREFIX + 'activePopupWindowId'] = windowId;
    await browser.storage.local.set(data);
  }
}

async function clearActivePopupWindowId(): Promise<void> {
  if (hasSessionStorage) {
    await browser.storage.session.remove('activePopupWindowId');
  } else {
    await browser.storage.local.remove(SESSION_KEY_PREFIX + 'activePopupWindowId');
  }
}

interface OpenPopupRequest {
  action: 'openPopup';
  url: string;
}

interface OpenInWindowRequest {
  action: 'openInWindow';
}

interface SetDownloadDirectoryRequest {
  action: 'setDownloadDirectory';
  directory: string;
}

interface OpenDirectoryPickerRequest {
  action: 'openDirectoryPicker';
}

interface OpenGalleryRequest {
  action: 'openGallery';
  groupId?: string;
  startIndex?: number;
}

type MessageRequest =
  | OpenPopupRequest
  | OpenInWindowRequest
  | SetDownloadDirectoryRequest
  | OpenDirectoryPickerRequest
  | OpenGalleryRequest;

interface MessageResponse {
  success?: boolean;
  windowId?: number;
  error?: string;
}

async function handleOpenPopup(request: OpenPopupRequest): Promise<MessageResponse> {
  const activeWindowId = await getActivePopupWindowId();

  if (activeWindowId) {
    try {
      // Check if window still exists
      const existingWindow = await browser.windows.get(activeWindowId);
      if (existingWindow) {
        // Focus existing window and update URL
        await browser.windows.update(activeWindowId, { focused: true });
        const tabs = await browser.tabs.query({ windowId: activeWindowId });
        if (tabs.length > 0 && tabs[0].id) {
          await browser.tabs.update(tabs[0].id, { url: request.url });
        }
        return { success: true, windowId: activeWindowId };
      }
    } catch {
      // Window no longer exists, clear the stored ID
      await clearActivePopupWindowId();
    }
  }

  // Create new popup window
  const newWindow = await browser.windows.create({
    url: request.url,
    type: 'popup',
    width: 800,
    height: 600,
  });

  if (newWindow?.id) {
    await setActivePopupWindowId(newWindow.id);
  }

  // Inject content script - use browser.scripting for MV3
  if (browser.scripting && newWindow?.tabs && newWindow.tabs.length > 0 && newWindow.tabs[0].id) {
    try {
      await browser.scripting.executeScript({
        target: { tabId: newWindow.tabs[0].id },
        files: ['content-scripts/content.js'],
      });
    } catch (e) {
      console.warn('Could not inject content script:', (e as Error).message);
    }
  }

  return { success: true, windowId: newWindow?.id };
}

async function handleOpenInWindow(): Promise<MessageResponse> {
  const newWindow = await browser.windows.create({
    url: browser.runtime.getURL('/popup.html'),
    type: 'popup',
    width: 700,
    height: 800,
  });

  return { success: true, windowId: newWindow?.id };
}

async function handleOpenGallery(request: OpenGalleryRequest): Promise<MessageResponse> {
  // Build gallery URL with query params
  // Type assertion needed since WXT types are generated at build time
  const baseUrl = browser.runtime.getURL as (path: string) => string;
  let galleryUrl = baseUrl('/gallery.html');
  const params = new URLSearchParams();

  if (request.groupId) {
    params.set('mode', 'group');
    params.set('groupId', request.groupId);
  } else {
    params.set('mode', 'all');
  }

  if (request.startIndex !== undefined) {
    params.set('startIndex', String(request.startIndex));
  }

  const queryString = params.toString();
  if (queryString) {
    galleryUrl += '?' + queryString;
  }

  // Create gallery window - larger and can go fullscreen
  const newWindow = await browser.windows.create({
    url: galleryUrl,
    type: 'popup',
    width: 1200,
    height: 800,
  });

  return { success: true, windowId: newWindow?.id };
}

async function handleMessage(request: MessageRequest): Promise<MessageResponse> {
  switch (request.action) {
    case 'openPopup':
      return handleOpenPopup(request);

    case 'openDirectoryPicker':
      return {
        error: 'Directory picker not available in extensions. Use the text input.',
      };

    case 'setDownloadDirectory':
      await browser.storage.local.set({
        downloadDirectory: request.directory,
      });
      return { success: true };

    case 'openInWindow':
      return handleOpenInWindow();

    case 'openGallery':
      return handleOpenGallery(request);

    default:
      return { error: 'Unknown action' };
  }
}

export default defineBackground(() => {
  // Handle messages from content scripts and popup
  browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    handleMessage(request as MessageRequest).then(sendResponse);
    return true; // Indicates we will respond asynchronously
  });

  // Clean up stored window ID when window is closed
  browser.windows.onRemoved.addListener(async (windowId) => {
    const activeWindowId = await getActivePopupWindowId();
    if (activeWindowId === windowId) {
      await clearActivePopupWindowId();
    }
  });

  // Clean up stale storage on extension startup
  browser.runtime.onStartup.addListener(async () => {
    try {
      // Remove old/stale keys (including legacy 'imageUrls' and current 'navigationStack')
      await browser.storage.local.remove(['imageUrls', 'navigationStack']);
      console.log('Storage cleaned up on startup.');
    } catch (e) {
      console.error('Error removing storage keys:', e);
    }
  });

  // Handle extension installation/update
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('The Collector installed');
    } else if (details.reason === 'update') {
      console.log('The Collector updated to version', browser.runtime.getManifest().version);
    }
  });
});
