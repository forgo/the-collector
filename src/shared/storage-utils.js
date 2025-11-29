// shared/storage-utils.js
// Chrome storage abstraction and utilities

/**
 * Storage keys used by the extension
 */
const STORAGE_KEYS = {
  NAVIGATION_STACK: 'navigationStack',
  GROUPS: 'groups',
  CURRENT_VIEW: 'currentView',
  IMAGE_META: 'imageMeta',
  URL_META: 'urlMeta',
  SETTINGS: 'settings',
  DOWNLOAD_DIRECTORY: 'downloadDirectory'
};

/**
 * Get data from Chrome local storage
 * @param {string|string[]} keys - Key(s) to retrieve
 * @returns {Promise<object>} Promise resolving to stored data
 */
function storageGet(keys) {
  return new Promise(function(resolve, reject) {
    try {
      chrome.storage.local.get(keys, function(result) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Set data in Chrome local storage
 * @param {object} data - Key-value pairs to store
 * @returns {Promise<void>} Promise resolving when data is saved
 */
function storageSet(data) {
  return new Promise(function(resolve, reject) {
    try {
      chrome.storage.local.set(data, function() {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Remove data from Chrome local storage
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>} Promise resolving when data is removed
 */
function storageRemove(keys) {
  return new Promise(function(resolve, reject) {
    try {
      chrome.storage.local.remove(keys, function() {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Clear all data from Chrome local storage
 * @returns {Promise<void>} Promise resolving when storage is cleared
 */
function storageClear() {
  return new Promise(function(resolve, reject) {
    try {
      chrome.storage.local.clear(function() {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Save navigation stack (image URLs)
 * @param {string[]} urls - Array of image URLs
 * @returns {Promise<void>}
 */
function saveNavigationStack(urls) {
  return storageSet({ navigationStack: urls });
}

/**
 * Load navigation stack
 * @returns {Promise<string[]>} Array of image URLs
 */
function loadNavigationStack() {
  return storageGet(STORAGE_KEYS.NAVIGATION_STACK).then(function(result) {
    return result.navigationStack || [];
  });
}

/**
 * Save groups
 * @param {Array} groups - Array of group objects
 * @returns {Promise<void>}
 */
function saveGroups(groups) {
  return storageSet({ groups: groups });
}

/**
 * Load groups
 * @returns {Promise<Array>} Array of group objects
 */
function loadGroups() {
  return storageGet(STORAGE_KEYS.GROUPS).then(function(result) {
    return result.groups || [];
  });
}

/**
 * Save settings
 * @param {object} settings - Settings object
 * @returns {Promise<void>}
 */
function saveSettings(settings) {
  return storageSet({
    settings: settings,
    downloadDirectory: settings.downloadDirectory
  });
}

/**
 * Load settings
 * @param {object} defaults - Default settings to merge with
 * @returns {Promise<object>} Settings object
 */
function loadSettings(defaults) {
  return storageGet([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.DOWNLOAD_DIRECTORY]).then(function(result) {
    const settings = Object.assign({}, defaults || {}, result.settings || {});
    if (result.downloadDirectory) {
      settings.downloadDirectory = result.downloadDirectory;
    }
    return settings;
  });
}

/**
 * Save image metadata
 * @param {object} imageMeta - Image metadata object
 * @returns {Promise<void>}
 */
function saveImageMeta(imageMeta) {
  return storageSet({ imageMeta: imageMeta });
}

/**
 * Load image metadata
 * @returns {Promise<object>} Image metadata object
 */
function loadImageMeta() {
  return storageGet(STORAGE_KEYS.IMAGE_META).then(function(result) {
    return result.imageMeta || {};
  });
}

/**
 * Save current view mode
 * @param {string} view - 'list' or 'grid'
 * @returns {Promise<void>}
 */
function saveCurrentView(view) {
  return storageSet({ currentView: view });
}

/**
 * Load all extension data at once
 * @returns {Promise<object>} All stored data
 */
function loadAllData() {
  return storageGet([
    STORAGE_KEYS.NAVIGATION_STACK,
    STORAGE_KEYS.GROUPS,
    STORAGE_KEYS.CURRENT_VIEW,
    STORAGE_KEYS.IMAGE_META,
    STORAGE_KEYS.URL_META,
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.DOWNLOAD_DIRECTORY
  ]);
}

/**
 * Clear all extension data (for reset functionality)
 * @returns {Promise<void>}
 */
function clearAllData() {
  return storageSet({
    navigationStack: [],
    groups: [],
    imageMeta: {},
    urlMeta: {}
  });
}

// Export for use in other modules
window.StorageUtils = {
  STORAGE_KEYS: STORAGE_KEYS,
  get: storageGet,
  set: storageSet,
  remove: storageRemove,
  clear: storageClear,
  saveNavigationStack: saveNavigationStack,
  loadNavigationStack: loadNavigationStack,
  saveGroups: saveGroups,
  loadGroups: loadGroups,
  saveSettings: saveSettings,
  loadSettings: loadSettings,
  saveImageMeta: saveImageMeta,
  loadImageMeta: loadImageMeta,
  saveCurrentView: saveCurrentView,
  loadAllData: loadAllData,
  clearAllData: clearAllData
};
