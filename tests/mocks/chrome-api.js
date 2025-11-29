/**
 * Chrome API mocks for testing
 * Provides mock implementations of chrome.* APIs used by the extension
 */

// In-memory storage for mock chrome.storage
const storageData = {
  local: {},
  session: {},
  sync: {},
};

// Create a mock storage area
function createStorageArea(areaName) {
  return {
    get: (keys, callback) => {
      const result = {};
      const keyList =
        typeof keys === "string"
          ? [keys]
          : Array.isArray(keys)
          ? keys
          : Object.keys(keys || storageData[areaName]);

      keyList.forEach((key) => {
        if (key in storageData[areaName]) {
          result[key] = storageData[areaName][key];
        }
      });

      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    },

    set: (items, callback) => {
      Object.assign(storageData[areaName], items);
      if (callback) {
        callback();
      }
      return Promise.resolve();
    },

    remove: (keys, callback) => {
      const keyList = typeof keys === "string" ? [keys] : keys;
      keyList.forEach((key) => {
        delete storageData[areaName][key];
      });
      if (callback) {
        callback();
      }
      return Promise.resolve();
    },

    clear: (callback) => {
      storageData[areaName] = {};
      if (callback) {
        callback();
      }
      return Promise.resolve();
    },
  };
}

// Mock chrome.downloads
const mockDownloads = {
  downloads: [],
  idCounter: 1,

  download: (options, callback) => {
    const id = mockDownloads.idCounter++;
    mockDownloads.downloads.push({
      id,
      url: options.url,
      filename: options.filename,
      conflictAction: options.conflictAction,
      state: "complete",
    });
    if (callback) {
      callback(id);
    }
    return Promise.resolve(id);
  },

  search: (query, callback) => {
    const results = mockDownloads.downloads.filter((d) => {
      if (query.id !== undefined && d.id !== query.id) return false;
      if (query.url && d.url !== query.url) return false;
      return true;
    });
    if (callback) {
      callback(results);
    }
    return Promise.resolve(results);
  },
};

// Mock chrome.runtime
const mockRuntime = {
  lastError: null,

  getURL: (path) => `chrome-extension://mock-extension-id/${path}`,

  getManifest: () => ({
    name: "The Collector",
    version: "1.1.0",
    manifest_version: 3,
  }),

  sendMessage: (message, callback) => {
    if (callback) {
      callback({ success: true });
    }
    return Promise.resolve({ success: true });
  },

  onMessage: {
    addListener: () => {},
    removeListener: () => {},
  },

  onInstalled: {
    addListener: () => {},
  },

  onStartup: {
    addListener: () => {},
  },
};

// Mock chrome.tabs
const mockTabs = {
  tabs: [],

  query: (queryInfo, callback) => {
    const results = mockTabs.tabs.filter((t) => {
      if (queryInfo.active !== undefined && t.active !== queryInfo.active)
        return false;
      if (queryInfo.windowId !== undefined && t.windowId !== queryInfo.windowId)
        return false;
      return true;
    });
    if (callback) {
      callback(results);
    }
    return Promise.resolve(results);
  },

  update: (tabId, updateProps, callback) => {
    const tab = mockTabs.tabs.find((t) => t.id === tabId);
    if (tab) {
      Object.assign(tab, updateProps);
    }
    if (callback) {
      callback(tab);
    }
    return Promise.resolve(tab);
  },
};

// Mock chrome.windows
const mockWindows = {
  windows: [],
  idCounter: 1,

  create: (createData, callback) => {
    const win = {
      id: mockWindows.idCounter++,
      ...createData,
      tabs: [{ id: 1, url: createData.url }],
    };
    mockWindows.windows.push(win);
    if (callback) {
      callback(win);
    }
    return Promise.resolve(win);
  },

  get: (windowId, callback) => {
    const win = mockWindows.windows.find((w) => w.id === windowId);
    if (callback) {
      callback(win);
    }
    return Promise.resolve(win);
  },

  update: (windowId, updateInfo, callback) => {
    const win = mockWindows.windows.find((w) => w.id === windowId);
    if (win) {
      Object.assign(win, updateInfo);
    }
    if (callback) {
      callback(win);
    }
    return Promise.resolve(win);
  },

  onRemoved: {
    addListener: () => {},
  },
};

// Mock chrome.scripting
const mockScripting = {
  executeScript: (injection, callback) => {
    if (callback) {
      callback([{ result: true }]);
    }
    return Promise.resolve([{ result: true }]);
  },
};

// Assemble the chrome mock object
export const chrome = {
  storage: {
    local: createStorageArea("local"),
    session: createStorageArea("session"),
    sync: createStorageArea("sync"),
  },
  downloads: mockDownloads,
  runtime: mockRuntime,
  tabs: mockTabs,
  windows: mockWindows,
  scripting: mockScripting,
};

// Helper to reset all mocks between tests
export function resetChromeMocks() {
  storageData.local = {};
  storageData.session = {};
  storageData.sync = {};
  mockDownloads.downloads = [];
  mockDownloads.idCounter = 1;
  mockTabs.tabs = [];
  mockWindows.windows = [];
  mockWindows.idCounter = 1;
  mockRuntime.lastError = null;
}

// Helper to set storage data for testing
export function setStorageData(area, data) {
  storageData[area] = { ...data };
}

// Helper to get storage data for assertions
export function getStorageData(area) {
  return { ...storageData[area] };
}

export default chrome;
