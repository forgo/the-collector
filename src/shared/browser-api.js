/**
 * browser-api.js - Cross-browser API compatibility layer
 *
 * Firefox uses `browser.*` with Promises
 * Chrome uses `chrome.*` with callbacks (or Promises in MV3)
 *
 * This module provides a unified API that works in both browsers.
 */

// Detect which API is available
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

// Check if we're in Firefox (has native Promise support for browser.*)
const isFirefox = typeof browser !== 'undefined';

/**
 * Promisified storage.local.get
 * @param {string|string[]} keys - Keys to retrieve
 * @returns {Promise<object>} Storage data
 */
function storageGet(keys) {
  return new Promise((resolve, reject) => {
    browserAPI.storage.local.get(keys, (result) => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Promisified storage.local.set
 * @param {object} data - Data to store
 * @returns {Promise<void>}
 */
function storageSet(data) {
  return new Promise((resolve, reject) => {
    browserAPI.storage.local.set(data, () => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Promisified storage.local.remove
 * @param {string|string[]} keys - Keys to remove
 * @returns {Promise<void>}
 */
function storageRemove(keys) {
  return new Promise((resolve, reject) => {
    browserAPI.storage.local.remove(keys, () => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Promisified downloads.download
 * Note: Firefox and Chrome have slightly different options support
 * @param {object} options - Download options
 * @returns {Promise<number>} Download ID
 */
function download(options) {
  return new Promise((resolve, reject) => {
    // Normalize options for cross-browser compatibility
    const normalizedOptions = {
      url: options.url,
      filename: options.filename,
      saveAs: options.saveAs || false,
    };

    // conflictAction is supported in both, but values may differ
    // Chrome/Firefox both support: 'uniquify', 'overwrite', 'prompt'
    if (options.conflictAction) {
      normalizedOptions.conflictAction = options.conflictAction;
    }

    browserAPI.downloads.download(normalizedOptions, (downloadId) => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
      } else {
        resolve(downloadId);
      }
    });
  });
}

/**
 * Send a message to the background script
 * @param {object} message - Message to send
 * @returns {Promise<any>} Response from background
 */
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage(message, (response) => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Add a listener for storage changes
 * @param {function} callback - Callback function(changes, areaName)
 */
function onStorageChanged(callback) {
  browserAPI.storage.onChanged.addListener(callback);
}

// Export for use in other modules
window.BrowserAPI = {
  // Raw browser API reference
  api: browserAPI,
  isFirefox: isFirefox,

  // Storage operations
  storage: {
    get: storageGet,
    set: storageSet,
    remove: storageRemove,
    onChanged: onStorageChanged,
  },

  // Downloads
  downloads: {
    download: download,
  },

  // Runtime
  runtime: {
    sendMessage: sendMessage,
    getURL: (path) => browserAPI.runtime.getURL(path),
    lastError: () => browserAPI.runtime.lastError,
  },
};
