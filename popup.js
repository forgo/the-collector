// popup.js
// Main popup logic for Image Explorer extension
// Depends on: Constants, UrlUtils, FilenameUtils, ThemeManager (loaded before this file)

// Detect which browser API to use (Firefox uses 'browser', Chrome uses 'chrome')
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

// Module aliases for cleaner code
const IMAGE_EXTENSIONS = window.Constants ? window.Constants.IMAGE_EXTENSIONS : ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const GROUP_COLORS = window.Constants ? window.Constants.GROUP_COLORS : ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9c27b0', '#00acc1', '#ff7043', '#8bc34a', '#e91e63', '#3f51b5'];
const THEME_PRESETS = window.ThemeManager ? window.ThemeManager.THEME_PRESETS : {};
const THEME_SCHEMA = window.ThemeManager ? window.ThemeManager.THEME_SCHEMA : { properties: {} };

// State
let currentView = 'list';
const selectedUrls = new Set();
let groups = []; // { id, name, directory, color, urls: [] }
let imageURLs = [];
let imageMeta = {}; // { url: { width, height, type, filename } }
let urlMeta = {}; // { url: { source, addedAt, validated, contentType } }
let draggedUrl = null;
const failedUrls = new Set(); // Track URLs that failed to load (CORS, etc.)
let imageMetaSaveTimer = null; // Debounce timer for saving imageMeta
let settings = Object.assign({}, window.Constants ? window.Constants.DEFAULT_SETTINGS : {
  downloadDirectory: '',
  ungroupedDirectory: '',
  filenameTemplate: '{name}',
  autoRename: false,
  confirmDownload: false,
  listThumbnailSize: 60,
  gridThumbnailSize: 90,
  showDimensions: true,
  showFiletype: true,
  clearOnDownload: false,
  rememberGroups: true,
  theme: 'default',
  customTheme: null,
  uiScale: 'medium',
  density: 'comfortable'
});

// Debounced save for imageMeta to prevent rapid storage writes
function saveImageMetaDebounced() {
  if (imageMetaSaveTimer) {
    clearTimeout(imageMetaSaveTimer);
  }
  imageMetaSaveTimer = setTimeout(function() {
    imageMetaSaveTimer = null;
    browserAPI.storage.local.set({ imageMeta: imageMeta });
  }, 500); // Wait 500ms after last update before saving
}

// Use module function if available, otherwise fallback to inline implementation
function isImageUrl(url) {
  if (window.UrlUtils && window.UrlUtils.isImageUrl) {
    return window.UrlUtils.isImageUrl(url);
  }
  // Fallback implementation
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    if (IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext))) return true;
    if (pathname.includes('/image') || pathname.includes('/img') ||
        pathname.includes('/photo') || pathname.includes('/media')) return true;
    const lastSegment = pathname.split('/').pop();
    if (lastSegment && !lastSegment.includes('.')) return true;
  } catch {
    const lowerUrl = url.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext));
  }
  return false;
}

// Delegate to FilenameUtils module
function getFilenameFromUrl(url, existingNames) {
  if (window.FilenameUtils && window.FilenameUtils.getFilenameFromUrl) {
    return window.FilenameUtils.getFilenameFromUrl(url, existingNames);
  }
  // Minimal fallback
  let filename = 'image';
  let extension = '.jpg';
  try {
    if (url.startsWith('data:image/')) {
      const mimeMatch = url.match(/^data:image\/(\w+)/);
      extension = mimeMatch ? '.' + mimeMatch[1].replace('jpeg', 'jpg') : '.png';
    } else {
      const urlObj = new URL(url);
      const lastSegment = urlObj.pathname.split('/').pop() || '';
      const extMatch = lastSegment.match(/\.(\w+)$/);
      if (extMatch) {
        extension = '.' + extMatch[1].toLowerCase();
        filename = lastSegment.slice(0, -extension.length) || 'image';
      } else {
        filename = lastSegment || 'image';
      }
    }
  } catch (e) { /* use defaults */ }
  return filename + extension;
}

// Delegate to FilenameUtils module
function applyFilenameTemplate(template, context) {
  if (window.FilenameUtils && window.FilenameUtils.applyFilenameTemplate) {
    return window.FilenameUtils.applyFilenameTemplate(template, context);
  }
  // Minimal fallback - just replace {name} and add extension
  const name = context.name || 'image';
  const extension = context.extension || '.jpg';
  const result = template.replace(/\{name\}/gi, name).replace(/[<>:"/\\|?*]/g, '_');
  return result + extension;
}

/**
 * Centralized filename update function
 * Updates filename across all views and persists to storage
 * @param {string} url - The image URL
 * @param {string} newName - The new filename (without extension)
 * @param {string} source - Where the change originated ('list', 'preview', 'download')
 */
function updateFilename(url, newName, source) {
  if (!url || !newName) return;

  // Get the extension from the current filename or generate one
  let extension = '';
  const item = document.querySelector('.image-item[data-url="' + CSS.escape(url) + '"]');
  if (item) {
    const extSpan = item.querySelector('.filename-extension');
    extension = extSpan ? extSpan.textContent : '';
  }

  // Fallback: get extension from imageMeta or URL
  if (!extension) {
    if (imageMeta[url] && imageMeta[url].customFilename) {
      const parts = imageMeta[url].customFilename.split('.');
      if (parts.length > 1) {
        extension = '.' + parts.pop();
      }
    }
    if (!extension) {
      const generated = getFilenameFromUrl(url);
      const extMatch = generated.match(/(\.\w+)$/);
      extension = extMatch ? extMatch[1] : '.jpg';
    }
  }

  // Build full filename
  const fullFilename = newName + extension;

  // 1. Update imageMeta (in-memory state)
  if (!imageMeta[url]) {
    imageMeta[url] = {};
  }
  imageMeta[url].customFilename = fullFilename;

  // 2. Update list view DOM (if not the source to avoid loops)
  if (source !== 'list' && item) {
    const filenameInput = item.querySelector('.filename-input');
    if (filenameInput && filenameInput.value !== newName) {
      filenameInput.value = newName;
    }
  }

  // 3. Update preview modal if open and showing this image
  if (source !== 'preview') {
    const previewInput = document.getElementById('preview-filename-input');
    const previewModal = document.getElementById('preview-modal');
    if (previewInput && previewModal && previewModal.classList.contains('visible')) {
      // Check if this is the image being previewed
      const previewImage = document.getElementById('preview-image');
      if (previewImage && previewImage.src === url) {
        if (previewInput.value !== newName) {
          previewInput.value = newName;
        }
      }
    }
  }

  // 4. Update download preview if open
  if (source !== 'download' && typeof pendingDownloads !== 'undefined' && pendingDownloads) {
    const downloadItem = pendingDownloads.find(function(d) { return d.url === url; });
    if (downloadItem && downloadItem.filename !== fullFilename) {
      downloadItem.filename = fullFilename;
      // Re-render download tree if modal is visible
      const downloadModal = document.getElementById('download-preview-modal');
      if (downloadModal && downloadModal.classList.contains('visible')) {
        // Defer re-render to avoid issues during event handling
        setTimeout(function() {
          if (typeof detectConflicts === 'function' && typeof buildTreeStructure === 'function' && typeof renderDownloadTree === 'function') {
            const downloadsWithConflicts = detectConflicts(pendingDownloads);
            pendingDownloads = downloadsWithConflicts;
            const tree = buildTreeStructure(downloadsWithConflicts);
            renderDownloadTree(tree);
          }
        }, 0);
      }
    }
  }

  // 5. Save to Chrome storage (debounced)
  saveImageMetaDebounced();
}

/**
 * Centralized selection update function
 * Updates selection state across all views
 * @param {string} url - The image URL
 * @param {boolean} selected - Whether the item should be selected
 * @param {string} source - Where the change originated ('list', 'grid', 'checkbox', 'bulk')
 */
// Selection functions using SelectionUtils module for DOM updates
function updateSelection(url, selected, source) {
  if (!url) return;

  // 1. Update in-memory selection state
  if (selected) {
    selectedUrls.add(url);
  } else {
    selectedUrls.delete(url);
  }

  // 2. Update DOM using SelectionUtils if available
  if (window.SelectionUtils && window.SelectionUtils.updateSelectionDOM) {
    window.SelectionUtils.updateSelectionDOM(url, selected);
  } else {
    const items = document.querySelectorAll('.image-item[data-url="' + CSS.escape(url) + '"]');
    items.forEach(function(item) {
      item.classList.toggle('selected', selected);
      const checkbox = item.querySelector('.item-checkbox');
      if (checkbox) checkbox.checked = selected;
    });
  }

  // 3. Update selection bar and action buttons
  updateSelectionBar();
}

/**
 * Centralized bulk selection update
 * @param {string[]} urls - Array of URLs to update
 * @param {boolean} selected - Whether items should be selected
 * @param {string} source - Where the change originated
 */
function updateSelectionBulk(urls, selected, source) {
  if (!urls || urls.length === 0) return;

  // Batch update in-memory state
  urls.forEach(function(url) {
    if (selected) {
      selectedUrls.add(url);
    } else {
      selectedUrls.delete(url);
    }
  });

  // Batch update DOM using SelectionUtils if available
  if (window.SelectionUtils && window.SelectionUtils.updateSelectionDOMBulk) {
    window.SelectionUtils.updateSelectionDOMBulk(urls, selected);
  } else {
    const urlSet = new Set(urls);
    document.querySelectorAll('.image-item').forEach(function(item) {
      const itemUrl = item.dataset.url;
      if (urlSet.has(itemUrl)) {
        item.classList.toggle('selected', selected);
        const checkbox = item.querySelector('.item-checkbox');
        if (checkbox) checkbox.checked = selected;
      }
    });
  }

  // Update UI once after all changes
  updateSelectionBar();
}

/**
 * Centralized clear all selections
 */
function clearAllSelections() {
  selectedUrls.clear();

  // Update DOM using SelectionUtils if available
  if (window.SelectionUtils && window.SelectionUtils.clearSelectionDOM) {
    window.SelectionUtils.clearSelectionDOM();
  } else {
    document.querySelectorAll('.image-item.selected').forEach(function(item) {
      item.classList.remove('selected');
      const checkbox = item.querySelector('.item-checkbox');
      if (checkbox) checkbox.checked = false;
    });
  }

  updateSelectionBar();
}

/**
 * Centralized image removal function
 * Removes image from all state and storage, cleans up metadata
 * @param {string} url - The image URL to remove
 */
function removeImageCentralized(url) {
  if (!url) return;

  // 1. Remove from in-memory state immediately (optimistic update)
  imageURLs = imageURLs.filter(function(u) { return u !== url; });
  selectedUrls.delete(url);
  groups.forEach(function(g) {
    g.urls = g.urls.filter(function(u) { return u !== url; });
  });

  // 2. Clean up metadata
  delete imageMeta[url];
  delete urlMeta[url];
  failedUrls.delete(url);

  // 3. Update download preview if open
  if (typeof pendingDownloads !== 'undefined' && pendingDownloads) {
    const hadDownload = pendingDownloads.some(function(d) { return d.url === url; });
    if (hadDownload) {
      pendingDownloads = pendingDownloads.filter(function(d) { return d.url !== url; });
      // Re-render download tree if modal is visible
      const downloadModal = document.getElementById('download-preview-modal');
      if (downloadModal && downloadModal.classList.contains('visible')) {
        setTimeout(function() {
          if (typeof detectConflicts === 'function' && typeof buildTreeStructure === 'function' && typeof renderDownloadTree === 'function') {
            const downloadsWithConflicts = detectConflicts(pendingDownloads);
            pendingDownloads = downloadsWithConflicts;
            const tree = buildTreeStructure(downloadsWithConflicts);
            renderDownloadTree(tree);
            if (typeof updatePreviewSummary === 'function') {
              updatePreviewSummary();
            }
          }
        }, 0);
      }
    }
  }

  // 4. Close preview modal if showing this image
  const previewModal = document.getElementById('preview-modal');
  const previewImage = document.getElementById('preview-image');
  if (previewModal && previewModal.classList.contains('visible') && previewImage && previewImage.src === url) {
    previewModal.classList.remove('visible');
  }

  // 5. Persist to storage
  browserAPI.storage.local.get('navigationStack', function(result) {
    const stack = result.navigationStack || [];
    const newStack = stack.filter(function(u) { return u !== url; });
    browserAPI.storage.local.set({
      navigationStack: newStack,
      imageMeta: imageMeta,
      urlMeta: urlMeta
    });
  });
  saveGroups();

  // 6. Re-render UI
  renderAll();
}

/**
 * Centralized bulk image removal
 * @param {string[]} urls - Array of URLs to remove
 */
function removeImagesBulk(urls) {
  if (!urls || urls.length === 0) return;

  const urlSet = new Set(urls);

  // 1. Remove from in-memory state
  imageURLs = imageURLs.filter(function(u) { return !urlSet.has(u); });
  urls.forEach(function(url) {
    selectedUrls.delete(url);
    delete imageMeta[url];
    delete urlMeta[url];
    failedUrls.delete(url);
  });
  groups.forEach(function(g) {
    g.urls = g.urls.filter(function(u) { return !urlSet.has(u); });
  });

  // 2. Update download preview if open
  if (typeof pendingDownloads !== 'undefined' && pendingDownloads) {
    const hadDownloads = pendingDownloads.some(function(d) { return urlSet.has(d.url); });
    if (hadDownloads) {
      pendingDownloads = pendingDownloads.filter(function(d) { return !urlSet.has(d.url); });
      const downloadModal = document.getElementById('download-preview-modal');
      if (downloadModal && downloadModal.classList.contains('visible')) {
        setTimeout(function() {
          if (typeof detectConflicts === 'function' && typeof buildTreeStructure === 'function' && typeof renderDownloadTree === 'function') {
            const downloadsWithConflicts = detectConflicts(pendingDownloads);
            pendingDownloads = downloadsWithConflicts;
            const tree = buildTreeStructure(downloadsWithConflicts);
            renderDownloadTree(tree);
            if (typeof updatePreviewSummary === 'function') {
              updatePreviewSummary();
            }
          }
        }, 0);
      }
    }
  }

  // 3. Close preview modal if showing a removed image
  const previewModal = document.getElementById('preview-modal');
  const previewImage = document.getElementById('preview-image');
  if (previewModal && previewModal.classList.contains('visible') && previewImage && urlSet.has(previewImage.src)) {
    previewModal.classList.remove('visible');
  }

  // 4. Persist to storage
  browserAPI.storage.local.get('navigationStack', function(result) {
    const stack = result.navigationStack || [];
    const newStack = stack.filter(function(u) { return !urlSet.has(u); });
    browserAPI.storage.local.set({
      navigationStack: newStack,
      imageMeta: imageMeta,
      urlMeta: urlMeta
    });
  });
  saveGroups();

  // 5. Re-render UI
  renderAll();
}

/**
 * Centralized group directory update function
 * Updates directory across all views and persists to storage
 * @param {string|null} groupId - The group ID, or null for ungrouped
 * @param {string} directory - The new directory path
 * @param {string} source - Where the change originated ('modal', 'inline')
 */
function updateGroupDirectory(groupId, directory, source) {
  const cleanDirectory = directory ? directory.trim() : '';

  if (groupId === null) {
    // Update ungrouped directory
    settings.ungroupedDirectory = cleanDirectory;
    saveSettings();
  } else {
    // Update group directory
    const group = groups.find(function(g) { return g.id === groupId; });
    if (group) {
      group.directory = cleanDirectory;
      saveGroups();
    }
  }

  // Update all path preview displays in the main UI
  // Group path previews
  groups.forEach(function(group) {
    const section = document.querySelector('.group-section[data-group-id="' + group.id + '"]');
    if (section) {
      const pathRow = section.querySelector('.group-path');
      if (pathRow) {
        const rootDir = settings.downloadDirectory || 'Downloads';
        const subDir = group.directory || group.name;
        pathRow.textContent = rootDir + '/' + subDir;
      }
    }
  });

  // Ungrouped path preview
  const ungroupedSection = document.getElementById('ungrouped-section');
  if (ungroupedSection) {
    const pathRow = ungroupedSection.querySelector('.group-path');
    if (pathRow) {
      const rootDir = settings.downloadDirectory || 'Downloads';
      const subDir = settings.ungroupedDirectory || 'Ungrouped';
      pathRow.textContent = rootDir + '/' + subDir;
    }
  }

  // Update download preview if open
  if (typeof pendingDownloads !== 'undefined' && pendingDownloads && pendingDownloads.length > 0) {
    const downloadModal = document.getElementById('download-preview-modal');
    if (downloadModal && downloadModal.classList.contains('visible')) {
      // Re-build the download list with new directories
      setTimeout(function() {
        // Re-calculate directories for each pending download
        pendingDownloads.forEach(function(download) {
          const downloadGroup = groups.find(function(g) { return g.urls.includes(download.url); });
          if (downloadGroup) {
            const rootDir = settings.downloadDirectory || '';
            const subDir = downloadGroup.directory || downloadGroup.name;
            download.directory = rootDir ? rootDir + '/' + subDir : subDir;
          } else {
            // Ungrouped
            const rootDir = settings.downloadDirectory || '';
            const subDir = settings.ungroupedDirectory || 'Ungrouped';
            download.directory = rootDir ? rootDir + '/' + subDir : subDir;
          }
        });

        if (typeof detectConflicts === 'function' && typeof buildTreeStructure === 'function' && typeof renderDownloadTree === 'function') {
          const downloadsWithConflicts = detectConflicts(pendingDownloads);
          pendingDownloads = downloadsWithConflicts;
          const tree = buildTreeStructure(downloadsWithConflicts);
          renderDownloadTree(tree);
        }
      }, 0);
    }
  }
}

function getFileExtension(url) {
  const filename = getFilenameFromUrl(url);
  const ext = filename.split('.').pop();
  return ext ? ext.toUpperCase() : 'Unknown';
}

// Delegate group utilities to GroupManager module
function generateGroupId() {
  if (window.GroupManager && window.GroupManager.generateGroupId) {
    return window.GroupManager.generateGroupId();
  }
  return 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

function getGroupForUrl(url) {
  if (window.GroupManager && window.GroupManager.getGroupForUrl) {
    return window.GroupManager.getGroupForUrl(url, groups);
  }
  return groups.find(function(g) { return g.urls.includes(url); });
}

function getUngroupedUrls() {
  if (window.GroupManager && window.GroupManager.getUngroupedUrls) {
    return window.GroupManager.getUngroupedUrls(imageURLs, groups);
  }
  const groupedUrls = new Set(groups.flatMap(function(g) { return g.urls; }));
  return imageURLs.filter(function(url) { return !groupedUrls.has(url); });
}

// Format dimensions with simple 'x' character
function formatDimensions(width, height) {
  return width + ' x ' + height;
}

function init() {
  const statusDiv = document.getElementById('status');

  // Load stored data
  browserAPI.storage.local.get([
    'navigationStack', 'downloadDirectory', 'groups', 'currentView', 'imageMeta', 'urlMeta', 'settings'
  ], function(result) {
    const allUrls = result.navigationStack || [];
    groups = result.groups || [];
    currentView = result.currentView || 'list';
    imageMeta = result.imageMeta || {};
    urlMeta = result.urlMeta || {};

    // Load settings
    if (result.settings) {
      settings = { ...settings, ...result.settings };
    }
    if (result.downloadDirectory) {
      settings.downloadDirectory = result.downloadDirectory;
    }

    // Apply settings to UI
    applySettingsToUI();

    // Filter to only image URLs
    imageURLs = allUrls.filter(url => isImageUrl(url));

    // Clean up groups - remove URLs that no longer exist
    groups.forEach(g => {
      g.urls = g.urls.filter(url => imageURLs.includes(url));
    });

    // Set initial view
    setView(currentView);
    renderAll();
    setupEventListeners(statusDiv);
    setupPreviewModal();
    setupConfirmModal();
    setupDirectoryEditModal();
    setupDownloadPreviewModal();
    setupDropSelectionModal();
    setupTabs();
    setupSettingsListeners();
  });
}

function applySettingsToUI() {
  const directoryInput = document.getElementById('directory-input');
  if (directoryInput) directoryInput.value = settings.downloadDirectory || '';

  const filenameTemplate = document.getElementById('filename-template');
  if (filenameTemplate) filenameTemplate.value = settings.filenameTemplate || '{name}';

  const autoRename = document.getElementById('auto-rename');
  if (autoRename) autoRename.checked = settings.autoRename;

  const confirmDownload = document.getElementById('confirm-download');
  if (confirmDownload) confirmDownload.checked = settings.confirmDownload;

  const listThumbnailSize = document.getElementById('list-thumbnail-size');
  const listThumbnailValue = document.getElementById('list-thumbnail-value');
  if (listThumbnailSize) {
    listThumbnailSize.value = settings.listThumbnailSize || 60;
    if (listThumbnailValue) listThumbnailValue.textContent = listThumbnailSize.value + 'px';
  }

  const gridThumbnailSize = document.getElementById('grid-thumbnail-size');
  const gridThumbnailValue = document.getElementById('grid-thumbnail-value');
  if (gridThumbnailSize) {
    gridThumbnailSize.value = settings.gridThumbnailSize || 90;
    if (gridThumbnailValue) gridThumbnailValue.textContent = gridThumbnailSize.value + 'px';
  }

  const showDimensions = document.getElementById('show-dimensions');
  if (showDimensions) showDimensions.checked = settings.showDimensions !== false;

  const showFiletype = document.getElementById('show-filetype');
  if (showFiletype) showFiletype.checked = settings.showFiletype !== false;

  const clearOnDownload = document.getElementById('clear-on-download');
  if (clearOnDownload) clearOnDownload.checked = settings.clearOnDownload;

  const rememberGroups = document.getElementById('remember-groups');
  if (rememberGroups) rememberGroups.checked = settings.rememberGroups !== false;

  // Theme settings
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) themeSelect.value = settings.theme || 'default';

  const customThemeInput = document.getElementById('custom-theme-json');
  if (customThemeInput && settings.customTheme) {
    customThemeInput.value = JSON.stringify(settings.customTheme, null, 2);
  }

  // UI Scale setting
  const uiScaleSelect = document.getElementById('ui-scale-select');
  if (uiScaleSelect) uiScaleSelect.value = settings.uiScale || 'medium';

  // Density setting
  const densitySelect = document.getElementById('density-select');
  if (densitySelect) densitySelect.value = settings.density || 'comfortable';

  // Apply the current theme, UI scale, and density
  applyTheme(settings.theme, settings.customTheme);
  applyUIScale(settings.uiScale);
  applyDensity(settings.density);
}

// Delegate theme functions to ThemeManager module
function applyUIScale(scale) {
  if (window.ThemeManager && window.ThemeManager.applyUIScale) {
    return window.ThemeManager.applyUIScale(scale);
  }
  // Fallback
  const root = document.documentElement;
  const validScales = ['small', 'medium', 'large'];
  root.setAttribute('data-ui-scale', validScales.includes(scale) ? scale : 'medium');
}

function applyDensity(density) {
  if (window.ThemeManager && window.ThemeManager.applyDensity) {
    return window.ThemeManager.applyDensity(density);
  }
  // Fallback
  const root = document.documentElement;
  const validDensities = ['compact', 'comfortable', 'spacious'];
  root.setAttribute('data-density', validDensities.includes(density) ? density : 'comfortable');
}

function applyTheme(themeId, customOverrides) {
  if (window.ThemeManager && window.ThemeManager.applyTheme) {
    return window.ThemeManager.applyTheme(themeId, customOverrides);
  }
  // Minimal fallback - just apply preset variables
  const root = document.documentElement;
  if (themeId && THEME_PRESETS[themeId]) {
    Object.entries(THEME_PRESETS[themeId].variables).forEach(function(entry) {
      root.style.setProperty(entry[0], entry[1]);
    });
  }
}

function validateCustomTheme(jsonStr) {
  if (window.ThemeManager && window.ThemeManager.validateCustomTheme) {
    return window.ThemeManager.validateCustomTheme(jsonStr);
  }
  // Minimal fallback
  if (!jsonStr || !jsonStr.trim()) return { valid: true, theme: null };
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'Theme must be a JSON object' };
    }
    return { valid: true, theme: parsed };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON: ' + e.message };
  }
}

function saveSettings() {
  browserAPI.storage.local.set({
    settings: settings,
    downloadDirectory: settings.downloadDirectory
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      this.classList.add('active');
      document.getElementById(targetTab + '-tab').classList.add('active');
    });
  });
}

function setupSettingsListeners() {
  const directoryInput = document.getElementById('directory-input');
  if (directoryInput) {
    directoryInput.addEventListener('change', function() {
      settings.downloadDirectory = this.value.trim();
      saveSettings();
    });
  }

  const filenameTemplate = document.getElementById('filename-template');
  if (filenameTemplate) {
    filenameTemplate.addEventListener('change', function() {
      settings.filenameTemplate = this.value.trim() || '{name}';
      saveSettings();
    });
  }

  const checkboxSettings = [
    { id: 'auto-rename', key: 'autoRename' },
    { id: 'confirm-download', key: 'confirmDownload' },
    { id: 'show-dimensions', key: 'showDimensions' },
    { id: 'show-filetype', key: 'showFiletype' },
    { id: 'clear-on-download', key: 'clearOnDownload' },
    { id: 'remember-groups', key: 'rememberGroups' }
  ];

  checkboxSettings.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', function() {
        settings[key] = this.checked;
        saveSettings();
        if (key === 'showDimensions' || key === 'showFiletype') {
          renderAll();
        }
      });
    }
  });

  // List thumbnail size slider
  const listThumbnailSlider = document.getElementById('list-thumbnail-size');
  const listThumbnailValue = document.getElementById('list-thumbnail-value');
  if (listThumbnailSlider) {
    listThumbnailSlider.addEventListener('input', function() {
      if (listThumbnailValue) listThumbnailValue.textContent = this.value + 'px';
      settings.listThumbnailSize = parseInt(this.value, 10);
      saveSettings();
      if (currentView === 'list') {
        renderAll();
      }
    });
  }

  // Grid thumbnail size slider
  const gridThumbnailSlider = document.getElementById('grid-thumbnail-size');
  const gridThumbnailValue = document.getElementById('grid-thumbnail-value');
  if (gridThumbnailSlider) {
    gridThumbnailSlider.addEventListener('input', function() {
      if (gridThumbnailValue) gridThumbnailValue.textContent = this.value + 'px';
      settings.gridThumbnailSize = parseInt(this.value, 10);
      saveSettings();
      if (currentView === 'grid') {
        renderAll();
      }
    });
  }

  // UI Scale selector
  const uiScaleSelect = document.getElementById('ui-scale-select');
  if (uiScaleSelect) {
    uiScaleSelect.addEventListener('change', function() {
      settings.uiScale = this.value;
      applyUIScale(settings.uiScale);
      saveSettings();
      // Re-initialize icons with new sizes
      setupHeaderIcons();
      renderAll();
    });
  }

  // Density selector
  const densitySelect = document.getElementById('density-select');
  if (densitySelect) {
    densitySelect.addEventListener('change', function() {
      settings.density = this.value;
      applyDensity(settings.density);
      saveSettings();
      renderAll();
    });
  }

  // Theme preset selector
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', function() {
      settings.theme = this.value;
      applyTheme(settings.theme, settings.customTheme);
      saveSettings();
    });
  }

  // Custom theme JSON input
  const customThemeInput = document.getElementById('custom-theme-json');
  const customThemeError = document.getElementById('custom-theme-error');
  const applyCustomThemeBtn = document.getElementById('apply-custom-theme');

  if (applyCustomThemeBtn && customThemeInput) {
    applyCustomThemeBtn.addEventListener('click', function() {
      const result = validateCustomTheme(customThemeInput.value);
      if (result.valid) {
        settings.customTheme = result.theme;
        applyTheme(settings.theme, settings.customTheme);
        saveSettings();
        if (customThemeError) {
          customThemeError.textContent = result.theme ? 'Custom overrides applied!' : 'Custom overrides cleared.';
          customThemeError.style.color = 'var(--color-success)';
          setTimeout(function() { customThemeError.textContent = ''; }, 2000);
        }
      } else {
        if (customThemeError) {
          customThemeError.textContent = result.error;
          customThemeError.style.color = 'var(--color-danger)';
        }
      }
    });
  }

  // Show schema button
  const showSchemaBtn = document.getElementById('show-theme-schema');
  if (showSchemaBtn && customThemeInput) {
    showSchemaBtn.addEventListener('click', function() {
      const schemaExample = {
        '__comment': 'Example: override just the colors you want to change',
        '--bg-body': '#your-color',
        '--text-primary': '#your-color',
        '--color-primary': '#your-color'
      };
      customThemeInput.value = JSON.stringify(schemaExample, null, 2);
      customThemeInput.focus();
    });
  }
}

function setView(view) {
  currentView = view;
  const listBtn = document.getElementById('list-view-btn');
  const gridBtn = document.getElementById('grid-view-btn');

  listBtn.classList.toggle('active', view === 'list');
  gridBtn.classList.toggle('active', view === 'grid');

  // Update all image lists with view class
  document.querySelectorAll('.image-list').forEach(list => {
    list.className = 'image-list ' + view + '-view';
  });

  // Save preference
  browserAPI.storage.local.set({ currentView: view });
}

// Get thumbnail size in pixels based on current view and settings
function getThumbnailSize() {
  if (currentView === 'grid') {
    return settings.gridThumbnailSize || 90;
  }
  return settings.listThumbnailSize || 60;
}

function renderAll() {
  renderGroups();
  renderUngrouped();
  updateSelectionBar();
}

function createImageItem(url, existingNames) {
  const li = document.createElement('li');
  li.className = 'image-item';
  if (selectedUrls.has(url)) {
    li.classList.add('selected');
  }
  li.dataset.url = url;
  li.draggable = true;

  // Get thumbnail size based on current view
  const thumbSize = getThumbnailSize();

  // For grid view, set the item width; for list view, set the img-container size
  if (currentView === 'grid') {
    li.style.width = thumbSize + 'px';
  }

  // Drag events
  li.addEventListener('dragstart', handleDragStart);
  li.addEventListener('dragend', handleDragEnd);
  li.addEventListener('dragover', handleItemDragOver);
  li.addEventListener('dragleave', handleItemDragLeave);

  // Generate unique filename if existingNames provided
  const existingNamesSet = existingNames || new Set();

  // Container for image
  const imgContainer = document.createElement('div');
  imgContainer.className = 'img-container';

  // Apply thumbnail size for list view (grid uses aspect-ratio on container)
  if (currentView === 'list') {
    imgContainer.style.width = thumbSize + 'px';
    imgContainer.style.height = thumbSize + 'px';
  }

  // Loading placeholder
  const loading = document.createElement('div');
  loading.className = 'loading';
  imgContainer.appendChild(loading);

  // Image element
  const img = document.createElement('img');
  img.alt = 'Collected image';

  // Check if this URL previously failed to load
  if (failedUrls.has(url)) {
    loading.textContent = 'Failed';
    loading.className = 'loading error';
    img.style.display = 'none';
  } else {
    loading.textContent = 'Loading...';

    img.addEventListener('load', function() {
      loading.style.display = 'none';
      img.style.display = 'block';
      failedUrls.delete(url); // Remove from failed set if it loads successfully

      // Store dimensions
      if (!imageMeta[url]) {
        imageMeta[url] = {};
      }
      imageMeta[url].width = img.naturalWidth;
      imageMeta[url].height = img.naturalHeight;
      imageMeta[url].type = getFileExtension(url);
      imageMeta[url].filename = getFilenameFromUrl(url);

      // Update meta display
      const metaEl = li.querySelector('.dimensions');
      if (metaEl && settings.showDimensions) {
        metaEl.textContent = formatDimensions(img.naturalWidth, img.naturalHeight);
      }

      // Save metadata (debounced to prevent rapid writes)
      saveImageMetaDebounced();
    });

    img.addEventListener('error', function() {
      loading.textContent = 'Failed';
      loading.className = 'loading error';
      img.style.display = 'none';
      failedUrls.add(url); // Mark as failed to prevent retry loops
    });

    img.src = url;
    img.style.display = 'none';
  }

  imgContainer.appendChild(img);

  // Preview trigger (magnifying glass)
  const previewTrigger = document.createElement('div');
  previewTrigger.className = 'preview-trigger';
  previewTrigger.innerHTML = '&#128269;'; // Magnifying glass emoji
  previewTrigger.addEventListener('click', function(e) {
    e.stopPropagation();
    showPreviewModal(url);
  });
  imgContainer.appendChild(previewTrigger);

  li.appendChild(imgContainer);

  // Details container
  const details = document.createElement('div');
  details.className = 'item-details';

  // Filename edit wrapper (input + extension)
  const filenameEdit = document.createElement('div');
  filenameEdit.className = 'filename-edit';

  // Filename input - use custom filename from imageMeta if available, or generate unique name
  const input = document.createElement('input');
  input.type = 'text';
  const savedMeta = imageMeta[url];
  let displayFilename;
  if (savedMeta && savedMeta.customFilename) {
    displayFilename = savedMeta.customFilename;
    // Add custom filename to set so subsequent items don't conflict
    existingNamesSet.add(displayFilename.toLowerCase());
  } else {
    // Generate unique filename based on existing names in the group/list
    displayFilename = getFilenameFromUrl(url, existingNamesSet);
    // Add to set so subsequent items in the same render don't conflict
    existingNamesSet.add(displayFilename.toLowerCase());
  }

  // Split filename into name and extension
  const extMatch = displayFilename.match(/(\.[^.]+)$/);
  const extension = extMatch ? extMatch[1] : '';
  const nameWithoutExt = extension ? displayFilename.slice(0, -extension.length) : displayFilename;

  input.value = nameWithoutExt;
  input.className = 'filename-input';
  input.placeholder = 'Filename';
  // Prevent drag behavior from interfering with text selection/cursor positioning
  input.addEventListener('mousedown', function(e) {
    e.stopPropagation();
  });
  filenameEdit.appendChild(input);

  // Extension label (non-editable)
  const extSpan = document.createElement('span');
  extSpan.className = 'filename-extension';
  extSpan.textContent = extension;
  filenameEdit.appendChild(extSpan);

  details.appendChild(filenameEdit);

  // Metadata display
  const metaDiv = document.createElement('div');
  metaDiv.className = 'image-meta';

  if (settings.showDimensions) {
    const dimensions = document.createElement('span');
    dimensions.className = 'dimensions';
    const cached = imageMeta[url];
    dimensions.textContent = cached ? formatDimensions(cached.width, cached.height) : '...';
    metaDiv.appendChild(dimensions);
  }

  if (settings.showFiletype) {
    const fileType = document.createElement('span');
    fileType.textContent = getFileExtension(url);
    metaDiv.appendChild(fileType);
  }

  details.appendChild(metaDiv);
  li.appendChild(details);

  // Action area (checkbox + remove button)
  const actions = document.createElement('div');
  actions.className = 'item-actions';

  // Checkbox for selection
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'item-checkbox';
  checkbox.checked = selectedUrls.has(url);
  checkbox.addEventListener('change', function(e) {
    e.stopPropagation();
    toggleSelection(url, li, checkbox.checked);
  });
  actions.appendChild(checkbox);

  // Download button for individual item
  const downloadBtn = Icons.createIconButton('download', {
    size: 'sm',
    variant: 'ghost',
    title: 'Download this image'
  });
  downloadBtn.classList.add('item-download-btn');
  downloadBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    showDownloadPreviewForSingleImage(url, li);
  });
  actions.appendChild(downloadBtn);

  // Remove button
  const removeBtn = Icons.createIconButton('x-mark', {
    size: 'sm',
    variant: 'danger',
    title: 'Remove from list'
  });
  removeBtn.classList.add('item-remove-btn');
  removeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    removeImage(url);
  });
  actions.appendChild(removeBtn);

  li.appendChild(actions);

  // Click on item to toggle selection
  li.addEventListener('click', function(e) {
    if (e.target === checkbox || e.target === input || e.target === removeBtn || e.target === previewTrigger) return;
    checkbox.checked = !checkbox.checked;
    toggleSelection(url, li, checkbox.checked);
  });

  return li;
}

// Track the currently previewed URL for filename editing
let currentPreviewUrl = null;

function showPreviewModal(url) {
  const modal = document.getElementById('preview-modal');
  const img = document.getElementById('preview-img');
  const dimensions = document.getElementById('preview-dimensions');
  const filenameInput = document.getElementById('preview-filename-input');
  const extension = document.getElementById('preview-extension');
  const type = document.getElementById('preview-type');

  currentPreviewUrl = url;
  img.src = url;

  const meta = imageMeta[url] || {};
  dimensions.textContent = meta.width ? formatDimensions(meta.width, meta.height) + ' px' : 'Loading...';

  // Get current filename - check if there's a custom one set in the list item
  const item = document.querySelector('.image-item[data-url="' + CSS.escape(url) + '"]');
  const listInput = item ? item.querySelector('.filename-input') : null;
  const listExtSpan = item ? item.querySelector('.filename-extension') : null;

  // Read the name and extension from the list item (now split)
  let nameWithoutExt;
  let ext;
  if (listInput && listExtSpan) {
    nameWithoutExt = listInput.value;
    ext = listExtSpan.textContent;
  } else {
    // Fallback - generate from URL
    const fullFilename = getFilenameFromUrl(url);
    const extMatch = fullFilename.match(/(\.[^.]+)$/);
    ext = extMatch ? extMatch[1] : '.' + getFileExtension(url).toLowerCase();
    nameWithoutExt = ext ? fullFilename.slice(0, -ext.length) : fullFilename;
  }

  filenameInput.value = nameWithoutExt;
  extension.textContent = ext;
  type.textContent = getFileExtension(url);

  modal.classList.add('visible');

  // Focus the input after a short delay
  setTimeout(function() {
    filenameInput.focus();
    filenameInput.select();
  }, 100);
}

function setupPreviewModal() {
  const modal = document.getElementById('preview-modal');
  const closeBtn = document.getElementById('close-preview');
  const filenameInput = document.getElementById('preview-filename-input');
  let previewOriginalFilename = ''; // Track original to detect changes

  function saveFilenameAndClose() {
    // Save the filename using centralized updater (syncs to all views)
    // Only save if value actually changed
    if (currentPreviewUrl && filenameInput) {
      const newNameWithoutExt = filenameInput.value.trim();
      if (newNameWithoutExt && newNameWithoutExt !== previewOriginalFilename) {
        updateFilename(currentPreviewUrl, newNameWithoutExt, 'preview');
      }
    }
    currentPreviewUrl = null;
    previewOriginalFilename = '';
    modal.classList.remove('visible');
  }

  // Store original value when preview modal opens
  modal.addEventListener('transitionend', function() {
    if (modal.classList.contains('visible') && filenameInput) {
      previewOriginalFilename = filenameInput.value;
    }
  });

  closeBtn.addEventListener('click', saveFilenameAndClose);

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      saveFilenameAndClose();
    }
  });

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('visible')) {
      saveFilenameAndClose();
    }
  });

  // Save on Enter key in filename input
  if (filenameInput) {
    filenameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveFilenameAndClose();
      }
    });
  }
}

// Confirmation modal
let confirmCallback = null;

function showConfirmModal(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmCallback = onConfirm;

  modal.classList.add('visible');
}

function setupConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  const cancelBtn = document.getElementById('confirm-cancel');
  const okBtn = document.getElementById('confirm-ok');

  function closeModal() {
    modal.classList.remove('visible');
    confirmCallback = null;
  }

  cancelBtn.addEventListener('click', closeModal);

  okBtn.addEventListener('click', function() {
    if (confirmCallback) {
      confirmCallback();
    }
    closeModal();
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// Directory edit modal
let dirEditGroupId = null; // null means editing ungrouped, otherwise group ID
let dirEditIsUngrouped = false;

function showDirectoryEditModal(groupId, currentDir) {
  const modal = document.getElementById('dir-edit-modal');
  const input = document.getElementById('dir-edit-input');
  const title = modal.querySelector('h4');
  const hint = modal.querySelector('.hint');

  dirEditGroupId = groupId;
  dirEditIsUngrouped = groupId === null;
  input.value = currentDir;

  // Update modal text based on whether editing ungrouped or group
  if (dirEditIsUngrouped) {
    title.textContent = 'Ungrouped Download Folder';
    hint.textContent = 'Leave empty to use "Ungrouped" as the folder name.';
  } else {
    title.textContent = 'Custom Download Folder';
    hint.textContent = 'Leave empty to use the group name as the folder name.';
  }

  modal.classList.add('visible');
  input.focus();
  input.select();
}

function setupDirectoryEditModal() {
  const modal = document.getElementById('dir-edit-modal');
  const input = document.getElementById('dir-edit-input');
  const cancelBtn = document.getElementById('dir-edit-cancel');
  const saveBtn = document.getElementById('dir-edit-save');

  function closeModal() {
    modal.classList.remove('visible');
    dirEditGroupId = null;
    dirEditIsUngrouped = false;
  }

  function saveAndClose() {
    // Use centralized directory update handler
    if (dirEditIsUngrouped) {
      updateGroupDirectory(null, input.value, 'modal');
    } else if (dirEditGroupId) {
      updateGroupDirectory(dirEditGroupId, input.value, 'modal');
    }
    closeModal();
  }

  cancelBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', saveAndClose);

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndClose();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// Download preview modal
let pendingDownloads = [];
let currentDownloadScope = 'all'; // 'all' or 'selected'
let currentDownloadGroupId = null; // null for global, groupId for group-specific
let includeUngroupedInDownload = true; // Whether to include ungrouped images in global download

// Build download list based on current scope and group filter
// Options: { scope: 'all'|'selected', groupId: null|string, includeUngrouped: bool }
function buildDownloadList(options) {
  options = options || {};
  const scope = options.scope || currentDownloadScope;
  const groupId = options.groupId !== undefined ? options.groupId : currentDownloadGroupId;
  const includeUngrouped = options.includeUngrouped !== undefined ? options.includeUngrouped : includeUngroupedInDownload;

  const rootDirectory = settings.downloadDirectory || '';
  let urlsToProcess;

  // Determine which URLs to process based on scope and group filter
  if (groupId) {
    // Group-specific download
    const group = groups.find(function(g) { return g.id === groupId; });
    if (!group) return [];

    if (scope === 'selected') {
      // Only selected URLs within this group
      urlsToProcess = group.urls.filter(function(url) { return selectedUrls.has(url); });
    } else {
      // All URLs in this group
      urlsToProcess = group.urls;
    }
  } else {
    // Global download
    const ungroupedUrls = getUngroupedUrls();
    const groupedUrls = groups.flatMap(function(g) { return g.urls; });

    if (scope === 'selected' && selectedUrls.size > 0) {
      // Filter selected URLs based on includeUngrouped
      urlsToProcess = Array.from(selectedUrls).filter(function(url) {
        if (!includeUngrouped && ungroupedUrls.includes(url)) {
          return false;
        }
        return true;
      });
    } else {
      // All URLs, optionally excluding ungrouped
      if (includeUngrouped) {
        urlsToProcess = imageURLs;
      } else {
        urlsToProcess = groupedUrls;
      }
    }
  }

  const downloads = [];

  // Track filenames per directory to ensure uniqueness
  const filenamesByDirectory = {};

  urlsToProcess.forEach(function(url) {
    const item = document.querySelector('.image-item[data-url="' + CSS.escape(url) + '"]');
    const input = item ? item.querySelector('.filename-input') : null;
    const extSpan = item ? item.querySelector('.filename-extension') : null;

    const group = getGroupForUrl(url);
    let directory = rootDirectory;

    if (group) {
      const subDir = group.directory || group.name;
      if (rootDirectory) {
        directory = rootDirectory + '/' + subDir;
      } else {
        directory = subDir;
      }
    } else {
      // Ungrouped - use custom ungrouped directory or default to 'Ungrouped'
      const ungroupedSubDir = settings.ungroupedDirectory || 'Ungrouped';
      if (rootDirectory) {
        directory = rootDirectory + '/' + ungroupedSubDir;
      } else {
        directory = ungroupedSubDir;
      }
    }

    // Initialize set for this directory if needed
    if (!filenamesByDirectory[directory]) {
      filenamesByDirectory[directory] = new Set();
    }
    const existingNames = filenamesByDirectory[directory];

    let filename;
    let useTemplate = false;
    let baseName = '';
    let extension = '';

    // Get the default filename from URL for comparison
    const urlFilename = getFilenameFromUrl(url);

    if (input && document.activeElement === input) {
      // User is actively editing (input is focused) - use their input directly
      extension = extSpan ? extSpan.textContent : '';
      filename = input.value.trim() + extension;
    } else if (imageMeta[url] && imageMeta[url].customFilename) {
      // Check if customFilename is actually different from URL default
      // If it matches, treat as if no custom filename (apply template)
      const customFn = imageMeta[url].customFilename;
      if (customFn === urlFilename) {
        // Not actually custom - apply template
        useTemplate = true;
        var extMatch = urlFilename.match(/(\.[^.]+)$/);
        if (extMatch) {
          extension = extMatch[1];
          baseName = urlFilename.slice(0, -extension.length);
        } else {
          baseName = urlFilename;
          extension = '.jpg';
        }
      } else {
        // Genuinely custom filename - use it directly
        filename = customFn;
      }
    } else {
      // No custom filename - apply template
      useTemplate = true;
      var extMatch = urlFilename.match(/(\.[^.]+)$/);
      if (extMatch) {
        extension = extMatch[1];
        baseName = urlFilename.slice(0, -extension.length);
      } else {
        baseName = urlFilename;
        extension = '.jpg';
      }
    }

    // Apply template if needed
    if (useTemplate && settings.filenameTemplate && settings.filenameTemplate !== '{name}') {
      const groupName = group ? group.name : (settings.ungroupedDirectory || 'Ungrouped');
      filename = applyFilenameTemplate(settings.filenameTemplate, {
        name: baseName,
        extension: extension,
        index: downloads.length + 1,
        group: groupName
      });
    } else if (useTemplate) {
      // Default template or {name} - just use the URL filename
      filename = baseName + extension;
    }

    // Make filename unique if needed
    if (existingNames.size > 0) {
      const extMatch2 = filename.match(/(\.[^.]+)$/);
      const fnExt = extMatch2 ? extMatch2[1] : '';
      const fnBase = extMatch2 ? filename.slice(0, -fnExt.length) : filename;
      let counter = 1;
      while (existingNames.has(filename.toLowerCase())) {
        filename = fnBase + '_' + counter + fnExt;
        counter++;
      }
    }

    // Track this filename to prevent duplicates
    existingNames.add(filename.toLowerCase());

    downloads.push({ url: url, filename: filename, directory: directory });
  });

  return downloads;
}

// Delegate tree-building utilities to TreeBuilder module
function detectConflicts(downloads) {
  if (window.TreeBuilder && window.TreeBuilder.detectConflicts) {
    return window.TreeBuilder.detectConflicts(downloads, settings.autoRename);
  }
  // Fallback implementation
  const pathCounts = {};
  downloads.forEach(function(d) {
    const fullPath = d.directory ? d.directory + '/' + d.filename : d.filename;
    pathCounts[fullPath] = (pathCounts[fullPath] || 0) + 1;
  });
  return downloads.map(function(d) {
    const fullPath = d.directory ? d.directory + '/' + d.filename : d.filename;
    const hasConflict = pathCounts[fullPath] > 1;
    return Object.assign({}, d, {
      hasConflict: hasConflict,
      willRename: d.willRename !== undefined ? d.willRename : (hasConflict ? settings.autoRename : true)
    });
  });
}

function buildTreeStructure(downloads) {
  if (window.TreeBuilder && window.TreeBuilder.buildTreeStructure) {
    return window.TreeBuilder.buildTreeStructure(downloads);
  }
  // Fallback implementation
  const tree = {};
  downloads.forEach(function(d, index) {
    const dir = d.directory || '(root)';
    if (!tree[dir]) tree[dir] = [];
    tree[dir].push({
      filename: d.filename,
      hasConflict: d.hasConflict,
      url: d.url,
      index: index,
      willRename: d.willRename !== false
    });
  });
  return tree;
}

function renderDownloadTree(tree) {
  const container = document.getElementById('tree-container');
  container.innerHTML = '';

  let hasAnyConflicts = false;
  const sortedDirs = Object.keys(tree).sort();

  sortedDirs.forEach(dir => {
    const folderEl = document.createElement('div');
    folderEl.className = 'tree-folder';
    folderEl.textContent = '📁 ' + dir + '/';
    container.appendChild(folderEl);

    tree[dir].forEach(file => {
      const fileEl = document.createElement('div');
      fileEl.className = 'tree-file' + (file.hasConflict ? ' conflict' : '');
      fileEl.dataset.index = file.index;

      // File prefix
      const prefix = document.createElement('span');
      prefix.className = 'tree-file-prefix';
      prefix.textContent = '└─ ';
      fileEl.appendChild(prefix);

      // Filename display (editable on click)
      const filenameSpan = document.createElement('span');
      filenameSpan.className = 'tree-filename';
      filenameSpan.textContent = file.filename;
      fileEl.appendChild(filenameSpan);

      if (file.hasConflict) {
        hasAnyConflicts = true;

        // Conflict indicator with behavior info
        const conflictBadge = document.createElement('span');
        conflictBadge.className = 'conflict-badge';

        const willRename = pendingDownloads[file.index].willRename !== false;
        if (willRename) {
          conflictBadge.innerHTML = '<span class="conflict-icon rename-icon">↻</span>';
          conflictBadge.title = 'Will be auto-renamed to avoid overwriting';
          conflictBadge.classList.add('will-rename');
        } else {
          conflictBadge.innerHTML = '<span class="conflict-icon overwrite-icon">!</span>';
          conflictBadge.title = 'Will overwrite existing file';
          conflictBadge.classList.add('will-overwrite');
        }
        fileEl.appendChild(conflictBadge);

        // Toggle button for rename/overwrite
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'tree-toggle-btn icon-btn icon-btn-ghost icon-btn-sm';
        toggleBtn.title = willRename ? 'Click to overwrite instead' : 'Click to auto-rename instead';
        toggleBtn.innerHTML = willRename
          ? '<span class="toggle-label">Rename</span>'
          : '<span class="toggle-label">Overwrite</span>';
        toggleBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          // Toggle the willRename flag
          pendingDownloads[file.index].willRename = !pendingDownloads[file.index].willRename;
          // Re-render the tree
          const newTree = buildTreeStructure(pendingDownloads);
          renderDownloadTree(newTree);
        });
        fileEl.appendChild(toggleBtn);
      }

      // Edit button (pencil icon) for inline rename
      const editBtn = Icons.createIconButton('pencil', {
        size: 'sm',
        variant: 'ghost',
        title: 'Rename file',
        className: 'tree-edit-btn'
      });
      editBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        startInlineRename(fileEl, file.index, filenameSpan);
      });
      fileEl.appendChild(editBtn);

      container.appendChild(fileEl);
    });
  });

  // Show/hide conflict legend and disable download button if conflicts exist
  const legend = document.getElementById('conflict-legend');
  const downloadBtn = document.getElementById('download-preview-confirm');

  // Check if any conflicts are set to overwrite
  let hasOverwriteConflicts = false;
  pendingDownloads.forEach(d => {
    if (d.hasConflict && d.willRename === false) {
      hasOverwriteConflicts = true;
    }
  });

  legend.classList.toggle('visible', hasAnyConflicts);

  // Update legend text based on conflict states
  if (legend && hasAnyConflicts) {
    if (hasOverwriteConflicts) {
      legend.innerHTML = '<span class="legend-item conflict">⚠ Some files will overwrite existing files</span>';
    } else {
      legend.innerHTML = '<span class="legend-item rename">↻ Duplicate filenames will be auto-renamed</span>';
    }
  }

  // Enable download button (conflicts are now manageable per-item)
  if (downloadBtn) {
    downloadBtn.disabled = false;
    downloadBtn.title = '';
  }

  return hasAnyConflicts;
}

// Start inline rename for a tree item
function startInlineRename(fileEl, index, filenameSpan) {
  const currentFilename = pendingDownloads[index].filename;

  // Split filename into name and extension
  const extMatch = currentFilename.match(/(\.[^.]+)$/);
  const extension = extMatch ? extMatch[1] : '';
  const nameWithoutExt = extension ? currentFilename.slice(0, -extension.length) : currentFilename;

  // Create inline edit container
  const editContainer = document.createElement('div');
  editContainer.className = 'tree-inline-edit';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tree-rename-input';
  input.value = nameWithoutExt;

  const extLabel = document.createElement('span');
  extLabel.className = 'tree-rename-ext';
  extLabel.textContent = extension;

  const saveBtn = Icons.createIconButton('check', {
    size: 'sm',
    variant: 'success',
    title: 'Save',
    className: 'tree-save-btn'
  });

  const cancelBtn = Icons.createIconButton('x-mark', {
    size: 'sm',
    variant: 'ghost',
    title: 'Cancel',
    className: 'tree-cancel-btn'
  });

  editContainer.appendChild(input);
  editContainer.appendChild(extLabel);
  editContainer.appendChild(saveBtn);
  editContainer.appendChild(cancelBtn);

  // Hide the filename span and other controls
  filenameSpan.style.display = 'none';
  const conflictBadge = fileEl.querySelector('.conflict-badge');
  const toggleBtn = fileEl.querySelector('.tree-toggle-btn');
  const editBtn = fileEl.querySelector('.tree-edit-btn');
  if (conflictBadge) conflictBadge.style.display = 'none';
  if (toggleBtn) toggleBtn.style.display = 'none';
  if (editBtn) editBtn.style.display = 'none';

  // Insert edit container after the prefix
  const prefix = fileEl.querySelector('.tree-file-prefix');
  prefix.after(editContainer);

  // Focus and select the input
  input.focus();
  input.select();

  function saveRename() {
    const newName = input.value.trim();
    if (newName && newName !== nameWithoutExt) {
      const url = pendingDownloads[index].url;
      // Use centralized updater - this will sync to all views including
      // updating pendingDownloads and re-rendering the download tree
      updateFilename(url, newName, 'download');
    } else {
      // Even if name didn't change, re-render to restore UI state
      const downloadsWithConflicts = detectConflicts(pendingDownloads);
      pendingDownloads = downloadsWithConflicts;
      const newTree = buildTreeStructure(downloadsWithConflicts);
      renderDownloadTree(newTree);
    }
    updatePreviewSummary();
  }

  function cancelRename() {
    editContainer.remove();
    filenameSpan.style.display = '';
    if (conflictBadge) conflictBadge.style.display = '';
    if (toggleBtn) toggleBtn.style.display = '';
    if (editBtn) editBtn.style.display = '';
  }

  saveBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    saveRename();
  });

  cancelBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    cancelRename();
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  });

  // Prevent clicks on edit container from propagating
  editContainer.addEventListener('click', function(e) {
    e.stopPropagation();
  });
}

// Update the preview summary after changes
function updatePreviewSummary() {
  const summary = document.getElementById('preview-summary');
  if (summary && pendingDownloads.length > 0) {
    const groupCount = new Set(pendingDownloads.map(d => d.directory || '(root)')).size;
    summary.textContent = pendingDownloads.length + ' image' + (pendingDownloads.length !== 1 ? 's' : '') +
      ' in ' + groupCount + ' folder' + (groupCount !== 1 ? 's' : '');
  }
}

// Refresh the download preview with current scope settings
function refreshDownloadPreview() {
  const downloads = buildDownloadList();
  pendingDownloads = downloads;

  const summary = document.getElementById('preview-summary');
  const downloadBtn = document.getElementById('download-preview-confirm');

  if (downloads.length === 0) {
    summary.textContent = 'No images to download';
    document.getElementById('tree-container').innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">No images match the current selection</div>';
    document.getElementById('conflict-legend').classList.remove('visible');
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Download';
    return;
  }

  const downloadsWithConflicts = detectConflicts(downloads);
  const tree = buildTreeStructure(downloadsWithConflicts);

  const groupCount = new Set(downloads.map(d => d.directory || '(root)')).size;
  summary.textContent = downloads.length + ' image' + (downloads.length !== 1 ? 's' : '') +
    ' in ' + groupCount + ' folder' + (groupCount !== 1 ? 's' : '');

  renderDownloadTree(tree);

  // Update ungrouped option count when scope changes
  updateUngroupedOption();

  // Update download button text based on scope
  downloadBtn.disabled = false;
  if (currentDownloadScope === 'selected') {
    downloadBtn.textContent = 'Download Selected (' + downloads.length + ')';
  } else {
    downloadBtn.textContent = 'Download All (' + downloads.length + ')';
  }
}

// Count selected URLs within a specific group
function countSelectedInGroup(groupId) {
  if (!groupId) {
    return selectedUrls.size;
  }
  const group = groups.find(function(g) { return g.id === groupId; });
  if (!group) return 0;
  return group.urls.filter(function(url) { return selectedUrls.has(url); }).length;
}

// Update the scope toggle visibility and labels
function updateScopeToggle(totalCount, selectedCount) {
  const scopeToggle = document.querySelector('.download-scope-toggle');
  const scopeAllBtn = document.getElementById('scope-all');
  const scopeSelectedBtn = document.getElementById('scope-selected');

  // Hide toggle if no selection or all are selected (no meaningful choice)
  if (selectedCount === 0 || selectedCount === totalCount) {
    scopeToggle.style.display = 'none';
    currentDownloadScope = 'all';
    return;
  }

  // Show toggle with clear counts
  scopeToggle.style.display = 'flex';
  scopeAllBtn.textContent = 'All (' + totalCount + ')';
  scopeSelectedBtn.textContent = 'Selected (' + selectedCount + ')';

  // Update active state
  if (currentDownloadScope === 'all') {
    scopeAllBtn.classList.add('active');
    scopeSelectedBtn.classList.remove('active');
  } else {
    scopeSelectedBtn.classList.add('active');
    scopeAllBtn.classList.remove('active');
  }
}

// Update ungrouped checkbox visibility and state
function updateUngroupedOption() {
  const downloadOptions = document.getElementById('download-options');
  const includeUngroupedCheckbox = document.getElementById('include-ungrouped');
  const ungroupedCountSpan = document.getElementById('ungrouped-download-count');
  const ungroupedUrls = getUngroupedUrls();

  // Hide for group-specific downloads, show for global
  if (currentDownloadGroupId) {
    downloadOptions.style.display = 'none';
    return;
  }

  // Count ungrouped based on current scope
  let ungroupedCount;
  if (currentDownloadScope === 'selected' && selectedUrls.size > 0) {
    ungroupedCount = ungroupedUrls.filter(function(url) { return selectedUrls.has(url); }).length;
  } else {
    ungroupedCount = ungroupedUrls.length;
  }

  ungroupedCountSpan.textContent = ungroupedCount;

  // Show/hide based on whether there are ungrouped images
  if (ungroupedCount === 0) {
    downloadOptions.style.display = 'none';
    includeUngroupedInDownload = true; // Reset to default
  } else {
    downloadOptions.style.display = 'block';
    includeUngroupedCheckbox.checked = includeUngroupedInDownload;
    includeUngroupedCheckbox.disabled = false;
  }
}

// Initialize and show the download preview modal
function showDownloadPreview() {
  // Reset to global scope
  currentDownloadGroupId = null;
  currentDownloadScope = 'all';
  includeUngroupedInDownload = true;

  // Calculate counts and update scope toggle
  const totalCount = imageURLs.length;
  const selectedCount = selectedUrls.size;
  updateScopeToggle(totalCount, selectedCount);

  // Update ungrouped option
  updateUngroupedOption();

  const downloads = buildDownloadList();

  if (downloads.length === 0) {
    return false;
  }

  const downloadsWithConflicts = detectConflicts(downloads);
  const tree = buildTreeStructure(downloadsWithConflicts);

  pendingDownloads = downloads;

  const summary = document.getElementById('preview-summary');
  const groupCount = new Set(downloads.map(d => d.directory || '(root)')).size;
  summary.textContent = downloads.length + ' image' + (downloads.length !== 1 ? 's' : '') +
    ' in ' + groupCount + ' folder' + (groupCount !== 1 ? 's' : '');

  renderDownloadTree(tree);

  // Update download button text (scope is always 'all' initially)
  const downloadBtn = document.getElementById('download-preview-confirm');
  downloadBtn.disabled = false;
  downloadBtn.textContent = 'Download All (' + downloads.length + ')';

  const modal = document.getElementById('download-preview-modal');
  modal.classList.add('visible');

  return true;
}

// Show download preview for a specific group
function showDownloadPreviewForGroup(groupId) {
  const group = groups.find(function(g) { return g.id === groupId; });
  if (!group || group.urls.length === 0) {
    return false;
  }

  // Set group-specific scope
  currentDownloadGroupId = groupId;
  currentDownloadScope = 'all';

  // Calculate counts for this group and update scope toggle
  const totalCount = group.urls.length;
  const selectedCount = countSelectedInGroup(groupId);
  updateScopeToggle(totalCount, selectedCount);

  // Hide ungrouped option for group-specific downloads
  updateUngroupedOption();

  const downloads = buildDownloadList();

  if (downloads.length === 0) {
    return false;
  }

  const downloadsWithConflicts = detectConflicts(downloads);
  const tree = buildTreeStructure(downloadsWithConflicts);

  pendingDownloads = downloads;

  const summary = document.getElementById('preview-summary');
  const groupCount = new Set(downloads.map(d => d.directory || '(root)')).size;
  summary.textContent = downloads.length + ' image' + (downloads.length !== 1 ? 's' : '') +
    ' from "' + group.name + '" in ' + groupCount + ' folder' + (groupCount !== 1 ? 's' : '');

  renderDownloadTree(tree);

  // Update download button text (scope is always 'all' initially)
  const downloadBtn = document.getElementById('download-preview-confirm');
  downloadBtn.disabled = false;
  downloadBtn.textContent = 'Download All (' + downloads.length + ')';

  const modal = document.getElementById('download-preview-modal');
  modal.classList.add('visible');

  return true;
}

// Show download preview for a single image
function showDownloadPreviewForSingleImage(url, itemElement) {
  // Get the filename from the item's input
  const input = itemElement.querySelector('.filename-input');
  const extSpan = itemElement.querySelector('.filename-extension');
  const filename = (input ? input.value : 'image') + (extSpan ? extSpan.textContent : '');

  // Build the full directory path including root directory
  const rootDirectory = settings.downloadDirectory || '';
  let directory = rootDirectory;

  // Check if this item is within a group section
  const groupSection = itemElement.closest('.group-section');
  if (groupSection) {
    const groupId = groupSection.dataset.groupId;
    const group = groups.find(function(g) { return g.id === groupId; });
    if (group) {
      // Use custom directory path if set, otherwise use group name
      const subDir = group.directory || group.name;
      if (rootDirectory) {
        directory = rootDirectory + '/' + subDir;
      } else {
        directory = subDir;
      }
    }
  } else {
    // Ungrouped section - use custom subdirectory or default
    const ungroupedSubDir = settings.ungroupedDirectory || 'Ungrouped';
    if (rootDirectory) {
      directory = rootDirectory + '/' + ungroupedSubDir;
    } else {
      directory = ungroupedSubDir;
    }
  }

  // Build the single download entry
  const downloads = [{
    url: url,
    filename: filename,
    directory: directory
  }];

  // Hide scope toggle since there's only one image
  const scopeToggle = document.querySelector('.scope-toggle');
  if (scopeToggle) scopeToggle.style.display = 'none';

  // Hide ungrouped option (not relevant for single image download)
  const downloadOptions = document.getElementById('download-options');
  if (downloadOptions) downloadOptions.style.display = 'none';

  const downloadsWithConflicts = detectConflicts(downloads);
  const tree = buildTreeStructure(downloadsWithConflicts);

  pendingDownloads = downloads;

  const summary = document.getElementById('preview-summary');
  const folderName = directory || '(root)';
  summary.textContent = '1 image in "' + folderName + '"';

  renderDownloadTree(tree);

  // Update download button text for single image
  const downloadBtn = document.getElementById('download-preview-confirm');
  downloadBtn.disabled = false;
  downloadBtn.textContent = 'Download (1)';

  const modal = document.getElementById('download-preview-modal');
  modal.classList.add('visible');

  return true;
}

function setupDownloadPreviewModal() {
  const modal = document.getElementById('download-preview-modal');
  const cancelBtn = document.getElementById('download-preview-cancel');
  const confirmBtn = document.getElementById('download-preview-confirm');
  const scopeAllBtn = document.getElementById('scope-all');
  const scopeSelectedBtn = document.getElementById('scope-selected');

  function closeModal() {
    modal.classList.remove('visible');
    pendingDownloads = [];
    currentDownloadGroupId = null;
    currentDownloadScope = 'all';
    includeUngroupedInDownload = true;

    // Restore visibility of elements that may have been hidden for single image download
    const scopeToggle = document.querySelector('.scope-toggle');
    if (scopeToggle) scopeToggle.style.display = '';

    const downloadOptions = document.getElementById('download-options');
    if (downloadOptions) downloadOptions.style.display = '';
  }

  cancelBtn.addEventListener('click', closeModal);

  confirmBtn.addEventListener('click', function() {
    if (pendingDownloads.length > 0 && !confirmBtn.disabled) {
      const statusDiv = document.getElementById('status');
      downloadImages(pendingDownloads, statusDiv);
    }
    closeModal();
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Scope toggle button handlers
  scopeAllBtn.addEventListener('click', function() {
    if (currentDownloadScope === 'all') return;

    currentDownloadScope = 'all';
    scopeAllBtn.classList.add('active');
    scopeSelectedBtn.classList.remove('active');

    refreshDownloadPreview();
  });

  scopeSelectedBtn.addEventListener('click', function() {
    if (currentDownloadScope === 'selected') return;

    currentDownloadScope = 'selected';
    scopeSelectedBtn.classList.add('active');
    scopeAllBtn.classList.remove('active');

    refreshDownloadPreview();
  });

  // Include ungrouped checkbox handler
  const includeUngroupedCheckbox = document.getElementById('include-ungrouped');
  includeUngroupedCheckbox.addEventListener('change', function() {
    includeUngroupedInDownload = this.checked;
    refreshDownloadPreview();
  });
}

// ==========================================================================
// DROP SELECTION MODAL
// Shows when multiple items are detected in a drop, allowing user to choose
// ==========================================================================

let pendingDropItems = null;
let pendingDropGroupId = null;

function setupDropSelectionModal() {
  const modal = document.getElementById('drop-select-modal');
  const cancelBtn = document.getElementById('drop-select-cancel');
  const confirmBtn = document.getElementById('drop-select-confirm');
  const selectAllBtn = document.getElementById('drop-select-all');
  const selectNoneBtn = document.getElementById('drop-select-none');
  const selectRecommendedBtn = document.getElementById('drop-select-recommended');
  const itemsContainer = document.getElementById('drop-select-items');

  function closeModal() {
    modal.classList.remove('visible');
    pendingDropItems = null;
    pendingDropGroupId = null;
  }

  function updateSelectionCount() {
    if (!pendingDropItems) return;
    const selectedCount = pendingDropItems.items.filter(i => i.selected).length;
    const countSpan = document.getElementById('drop-select-count');
    countSpan.textContent = selectedCount + ' of ' + pendingDropItems.items.length + ' selected';
    confirmBtn.disabled = selectedCount === 0;
    confirmBtn.textContent = selectedCount === 0 ? 'Add Selected' : 'Add Selected (' + selectedCount + ')';
  }

  function updateItemUI(index) {
    const itemEl = itemsContainer.querySelector('[data-index="' + index + '"]');
    if (itemEl && pendingDropItems) {
      const item = pendingDropItems.items[index];
      const checkbox = itemEl.querySelector('input[type="checkbox"]');
      checkbox.checked = item.selected;
      itemEl.classList.toggle('selected', item.selected);
    }
    updateSelectionCount();
  }

  function setAllSelected(selected) {
    if (!pendingDropItems) return;
    pendingDropItems.items.forEach(function(item, idx) {
      item.selected = selected;
      updateItemUI(idx);
    });
  }

  function setRecommendedSelection() {
    if (!pendingDropItems) return;
    pendingDropItems.items.forEach(function(item, idx) {
      // Select primary and unknown, deselect duplicates and UI elements
      item.selected = item.hint !== ITEM_HINTS.DUPLICATE && item.hint !== ITEM_HINTS.UI_ELEMENT;
      updateItemUI(idx);
    });
  }

  cancelBtn.addEventListener('click', closeModal);

  confirmBtn.addEventListener('click', function() {
    if (!pendingDropItems) return;

    const selectedItems = pendingDropItems.items.filter(function(i) { return i.selected; });

    if (selectedItems.length > 0) {
      addSelectedDropItems(selectedItems, pendingDropGroupId);
    }
    closeModal();
  });

  selectAllBtn.addEventListener('click', function() {
    setAllSelected(true);
  });

  selectNoneBtn.addEventListener('click', function() {
    setAllSelected(false);
  });

  selectRecommendedBtn.addEventListener('click', function() {
    setRecommendedSelection();
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Handle clicks on items
  itemsContainer.addEventListener('click', function(e) {
    const itemEl = e.target.closest('.drop-select-item');
    if (!itemEl || !pendingDropItems) return;

    const index = parseInt(itemEl.dataset.index, 10);
    const item = pendingDropItems.items[index];

    // Toggle selection
    item.selected = !item.selected;
    updateItemUI(index);
  });
}

/**
 * Render items in the drop selection modal
 */
function renderDropSelectionItems(dropData) {
  const container = document.getElementById('drop-select-items');
  container.innerHTML = '';

  // Source labels for display
  const sourceLabels = {
    [DROP_SOURCES.FILE]: 'File',
    [DROP_SOURCES.HTML_IMG]: 'Image',
    [DROP_SOURCES.HTML_SVG]: 'SVG',
    [DROP_SOURCES.URI_LIST]: 'URL',
    [DROP_SOURCES.TEXT_URL]: 'Text',
    [DROP_SOURCES.EMBEDDED]: 'Embedded'
  };

  const hintLabels = {
    [ITEM_HINTS.PRIMARY]: { text: 'Primary', class: 'hint-primary' },
    [ITEM_HINTS.DUPLICATE]: { text: 'Duplicate', class: 'hint-duplicate' },
    [ITEM_HINTS.UI_ELEMENT]: { text: 'UI Element', class: 'hint-ui' },
  };

  // Pre-select recommended items
  dropData.items.forEach(function(item) {
    if (item.selected === undefined) {
      item.selected = item.hint === ITEM_HINTS.PRIMARY || item.hint === ITEM_HINTS.UNKNOWN;
    }
  });

  dropData.items.forEach(function(item, index) {
    const itemEl = document.createElement('div');
    itemEl.className = 'drop-select-item' + (item.selected ? ' selected' : '');
    itemEl.dataset.index = index;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.selected;
    checkbox.addEventListener('click', function(e) {
      e.stopPropagation(); // Let the parent click handler deal with it
    });
    itemEl.appendChild(checkbox);

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'drop-select-thumb';
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.filename || 'Image';
    img.onerror = function() {
      this.style.display = 'none';
      thumb.textContent = (item.format || '?').toUpperCase();
      thumb.style.fontSize = '10px';
      thumb.style.color = 'var(--text-muted)';
    };
    thumb.appendChild(img);
    itemEl.appendChild(thumb);

    // Info
    const info = document.createElement('div');
    info.className = 'drop-select-info';

    const filename = document.createElement('div');
    filename.className = 'drop-select-filename';
    filename.textContent = item.filename || 'Unknown';
    filename.title = item.url;
    info.appendChild(filename);

    const meta = document.createElement('div');
    meta.className = 'drop-select-meta';

    // Format badge
    if (item.format) {
      const formatBadge = document.createElement('span');
      formatBadge.className = 'drop-select-badge format';
      formatBadge.textContent = item.format.toUpperCase();
      meta.appendChild(formatBadge);
    }

    // Source badge
    const sourceBadge = document.createElement('span');
    sourceBadge.className = 'drop-select-badge source';
    sourceBadge.textContent = sourceLabels[item.source] || item.source;
    meta.appendChild(sourceBadge);

    // Hint badge (if applicable)
    if (hintLabels[item.hint]) {
      const hintBadge = document.createElement('span');
      hintBadge.className = 'drop-select-badge ' + hintLabels[item.hint].class;
      hintBadge.textContent = hintLabels[item.hint].text;
      meta.appendChild(hintBadge);
    }

    info.appendChild(meta);
    itemEl.appendChild(info);

    container.appendChild(itemEl);
  });

  // Update summary
  const summary = document.getElementById('drop-select-summary');
  summary.textContent = 'Found ' + dropData.items.length + ' image' + (dropData.items.length !== 1 ? 's' : '');

  // Update count
  updateDropSelectionCount();
}

function updateDropSelectionCount() {
  if (!pendingDropItems) return;

  const selectedCount = pendingDropItems.items.filter(function(i) { return i.selected; }).length;
  const totalCount = pendingDropItems.items.length;

  const countSpan = document.getElementById('drop-select-count');
  countSpan.textContent = selectedCount + ' of ' + totalCount + ' selected';

  const confirmBtn = document.getElementById('drop-select-confirm');
  confirmBtn.disabled = selectedCount === 0;
  confirmBtn.textContent = selectedCount === 0 ? 'Add Selected' : 'Add Selected (' + selectedCount + ')';
}

/**
 * Show drop feedback toast (global version)
 */
function showDropFeedback(message, type) {
  const feedback = document.getElementById('drop-feedback');
  if (feedback) {
    feedback.textContent = message;
    feedback.className = 'drop-feedback visible ' + type;
    setTimeout(function() {
      feedback.classList.remove('visible');
    }, 2000);
  }
}

/**
 * Add selected drop items to the collection
 */
function addSelectedDropItems(items, groupId) {
  const urls = items.map(function(item) { return item.url; }).filter(Boolean);

  if (urls.length === 0) {
    showDropFeedback('No valid images to add', 'error');
    return;
  }

  // Filter out already existing URLs
  const newUrls = urls.filter(function(url) {
    return !imageURLs.includes(url);
  });

  if (newUrls.length === 0) {
    showDropFeedback('Images already in collection', 'error');
    return;
  }

  // Add to storage
  browserAPI.storage.local.get(['navigationStack', 'groups', 'urlMeta'], function(result) {
    const stack = result.navigationStack || [];
    const storedGroups = result.groups || [];
    const urlMeta = result.urlMeta || {};

    newUrls.forEach(function(url) {
      if (!stack.includes(url)) {
        stack.push(url);
        urlMeta[url] = {
          source: 'external-drop',
          addedAt: Date.now()
        };
      }

      // Add to group if specified
      if (groupId) {
        const group = storedGroups.find(function(g) { return g.id === groupId; });
        if (group && !group.urls.includes(url)) {
          group.urls.push(url);
        }
      }
    });

    browserAPI.storage.local.set({
      navigationStack: stack,
      groups: storedGroups,
      urlMeta: urlMeta
    }, function() {
      // Update local state
      newUrls.forEach(function(url) {
        if (!imageURLs.includes(url)) {
          imageURLs.push(url);
        }
      });
      groups = storedGroups;

      renderAll();

      // Scroll to and highlight new items
      setTimeout(function() {
        newUrls.forEach(function(url) {
          const item = document.querySelector('.image-item[data-url="' + CSS.escape(url) + '"]');
          if (item) {
            item.classList.add('newly-added');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function() {
              item.classList.remove('newly-added');
            }, 1500);
          }
        });
      }, 100);

      const groupName = groupId ? groups.find(function(g) { return g.id === groupId; })?.name : 'Ungrouped';
      if (newUrls.length === 1) {
        showDropFeedback('Added to ' + groupName, 'success');
      } else {
        showDropFeedback('Added ' + newUrls.length + ' images to ' + groupName, 'success');
      }
    });
  });
}

/**
 * Show the drop selection modal
 */
function showDropSelectionModal(dropData, groupId) {
  pendingDropItems = dropData;
  pendingDropGroupId = groupId;

  renderDropSelectionItems(dropData);

  const modal = document.getElementById('drop-select-modal');
  modal.classList.add('visible');
}

/**
 * Handle a drop event with the new extraction system
 */
function handleDropWithSelection(e, groupId) {
  // Extract items from the drop data
  const items = extractDropItems(e.dataTransfer);

  // Analyze and sort items for smart recommendations
  const dropData = analyzeAndSortItems(items);

  // Hide the overlay
  const overlay = document.getElementById('external-drop-overlay');
  overlay.classList.remove('visible', 'invalid');

  if (dropData.items.length === 0) {
    showDropFeedback('No valid items found', 'error');
    return;
  }

  // Filter to only image items for now
  const imageItems = dropData.items.filter(function(item) {
    return item.mediaType === MEDIA_TYPES.IMAGE && item.url;
  });

  if (imageItems.length === 0) {
    showDropFeedback('No valid images found', 'error');
    return;
  }

  // If single image item, add it directly
  if (imageItems.length === 1) {
    addSelectedDropItems(imageItems, groupId);
    return;
  }

  // If all items are primary/recommended and no duplicates or UI elements, add all directly
  const nonRecommended = imageItems.filter(function(item) {
    return item.hint === ITEM_HINTS.DUPLICATE || item.hint === ITEM_HINTS.UI_ELEMENT;
  });

  if (nonRecommended.length === 0) {
    addSelectedDropItems(imageItems, groupId);
    return;
  }

  // Show selection modal for multiple items with mixed recommendations
  showDropSelectionModal({ items: imageItems, recommended: dropData.recommended }, groupId);
}

function renderGroups() {
  const container = document.getElementById('groups-container');
  container.innerHTML = '';

  groups.forEach(group => {
    const section = document.createElement('div');
    section.className = 'group-section';
    section.dataset.groupId = group.id;

    // Drop zone handlers
    section.addEventListener('dragover', handleDragOver);
    section.addEventListener('dragleave', handleDragLeave);
    section.addEventListener('drop', handleDrop);

    // Header
    const header = document.createElement('div');
    header.className = 'group-header';

    const colorDot = document.createElement('div');
    colorDot.className = 'group-color';
    colorDot.style.backgroundColor = group.color;
    header.appendChild(colorDot);

    // Group info area (name + path preview)
    const groupInfo = document.createElement('div');
    groupInfo.className = 'group-info';

    // Top row: name input + count
    const infoRow = document.createElement('div');
    infoRow.className = 'group-info-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'group-name';
    nameInput.value = group.name;
    nameInput.addEventListener('change', function() {
      updateGroup(group.id, { name: nameInput.value });
      renderGroups(); // Re-render to update path preview
    });
    infoRow.appendChild(nameInput);

    const count = document.createElement('span');
    count.className = 'group-count';
    count.textContent = '(' + group.urls.length + ')';
    infoRow.appendChild(count);

    groupInfo.appendChild(infoRow);

    // Path preview row
    const pathRow = document.createElement('div');
    pathRow.className = 'group-path';

    const rootDir = settings.downloadDirectory || 'Downloads';
    const subDir = group.directory || group.name;
    pathRow.textContent = rootDir + '/' + subDir;

    // Edit button for custom directory
    const editBtn = Icons.createIconButton('pencil', {
      title: 'Edit folder path',
      size: 'sm',
      variant: 'ghost',
      className: 'group-path-edit',
      onClick: function(e) {
        e.stopPropagation();
        showDirectoryEditModal(group.id, group.directory || '');
      }
    });
    pathRow.appendChild(document.createTextNode(' '));
    pathRow.appendChild(editBtn);

    groupInfo.appendChild(pathRow);
    header.appendChild(groupInfo);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'group-actions';

    // Calculate selection state for this group
    const groupUrlCount = group.urls.length;
    const selectedInGroup = group.urls.filter(function(url) { return selectedUrls.has(url); }).length;
    const isEmpty = groupUrlCount === 0;
    const allSelected = groupUrlCount > 0 && selectedInGroup === groupUrlCount;
    const noneSelected = selectedInGroup === 0;

    // Select All button - check-circle icon
    const selectAllBtn = Icons.createIconButton('check-circle', {
      title: isEmpty ? 'No images to select' : (allSelected ? 'All images already selected' : 'Select all images in group'),
      size: 'sm',
      disabled: isEmpty || allSelected,
      onClick: function() { selectAllInGroup(group.id); }
    });
    selectAllBtn.dataset.action = 'select-all';
    selectAllBtn.dataset.groupId = group.id;
    actions.appendChild(selectAllBtn);

    // Deselect button - x-circle icon
    const deselectBtn = Icons.createIconButton('x-circle', {
      title: noneSelected ? 'No images selected' : 'Deselect all images in group',
      size: 'sm',
      disabled: noneSelected,
      onClick: function() { deselectAllInGroup(group.id); }
    });
    deselectBtn.dataset.action = 'deselect';
    deselectBtn.dataset.groupId = group.id;
    actions.appendChild(deselectBtn);

    // Download button - download icon
    const downloadBtn = Icons.createIconButton('download', {
      title: isEmpty ? 'No images to download' : 'Download all images in this group',
      size: 'sm',
      variant: 'primary',
      disabled: isEmpty,
      onClick: function() { showDownloadPreviewForGroup(group.id); }
    });
    actions.appendChild(downloadBtn);

    // Remove All button - trash icon
    const removeAllBtn = Icons.createIconButton('trash', {
      title: isEmpty ? 'No images to remove' : 'Remove all images from group',
      size: 'sm',
      variant: 'danger',
      disabled: isEmpty,
      onClick: function() {
        showConfirmModal(
          'Remove All Images',
          'Remove all ' + group.urls.length + ' images from "' + group.name + '"? This cannot be undone.',
          function() { removeAllInGroup(group.id); }
        );
      }
    });
    actions.appendChild(removeAllBtn);

    // Delete group button - x-mark icon
    const deleteBtn = Icons.createIconButton('x-mark', {
      title: 'Delete group',
      size: 'sm',
      variant: 'danger',
      className: 'group-delete-btn',
      onClick: function() {
        showConfirmModal(
          'Delete Group',
          'Delete the group "' + group.name + '"? Images will be moved to Ungrouped.',
          function() { deleteGroup(group.id); }
        );
      }
    });
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    section.appendChild(header);

    // Images list
    const imagesList = document.createElement('ul');
    imagesList.className = 'image-list ' + currentView + '-view group-images';
    imagesList.dataset.groupId = group.id;

    if (group.urls.length === 0) {
      imagesList.classList.add('empty');
      imagesList.textContent = 'Drag images here';
    } else {
      // Track existing filenames within this group to ensure uniqueness
      const existingNames = new Set();
      group.urls.forEach(function(url) {
        imagesList.appendChild(createImageItem(url, existingNames));
      });
    }

    section.appendChild(imagesList);
    container.appendChild(section);
  });
}

function renderUngrouped() {
  const list = document.getElementById('ungrouped-list');
  const countEl = document.getElementById('ungrouped-count');
  const pathEl = document.getElementById('ungrouped-path');
  const ungroupedUrls = getUngroupedUrls();

  list.className = 'image-list ' + currentView + '-view';
  list.innerHTML = '';

  countEl.textContent = '(' + ungroupedUrls.length + ')';

  // Update path display
  const rootDir = settings.downloadDirectory || 'Downloads';
  const ungroupedSubDir = settings.ungroupedDirectory || 'Ungrouped';
  const editBtn = document.getElementById('ungrouped-path-edit');

  // Update the path text (preserve the edit button)
  if (pathEl) {
    pathEl.textContent = rootDir + '/' + ungroupedSubDir + ' ';
    pathEl.appendChild(editBtn);
  }

  // Update ungrouped section button states (will be called again by updateSelectionBar but needed for initial render)
  updateUngroupedActionButtons();

  if (ungroupedUrls.length === 0) {
    if (imageURLs.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No images added yet.';
      li.className = 'empty-message';
      list.appendChild(li);
    } else {
      // Show drop zone placeholder when there are grouped images but no ungrouped
      list.classList.add('empty');
      list.textContent = 'Drag images here';
    }
    return;
  }

  // Track existing filenames within ungrouped to ensure uniqueness
  const existingNames = new Set();
  ungroupedUrls.forEach(function(url) {
    list.appendChild(createImageItem(url, existingNames));
  });
}

// Drag and drop handlers
let dropTargetItem = null; // Track the item we're hovering over
let dropPosition = null; // 'before' or 'after'
let dropGhost = null; // Ghost placeholder element
let draggedItemSize = { width: 0, height: 0 }; // Cached size of dragged item
let draggedUrls = []; // URLs being dragged (single or multiple)

function createDropGhost(sourceItem, isMultiple) {
  if (dropGhost) return dropGhost;

  const ghost = document.createElement('li');
  ghost.className = 'image-item drop-ghost';
  ghost.setAttribute('aria-hidden', 'true');

  const inner = document.createElement('div');
  inner.className = 'drop-ghost-inner';

  if (isMultiple && draggedUrls.length > 1) {
    // Create summary ghost for multiple items
    const summary = document.createElement('div');
    summary.className = 'drop-ghost-summary';

    const count = draggedUrls.length;
    summary.innerHTML = '<span class="ghost-count">' + count + '</span><span class="ghost-label">images</span>';

    inner.appendChild(summary);
  } else if (sourceItem) {
    // Clone the source item's content for preview
    const clone = sourceItem.cloneNode(true);
    clone.classList.remove('dragging', 'selected');
    clone.removeAttribute('draggable');
    clone.removeAttribute('data-url');

    // Remove interactive elements from clone
    clone.querySelectorAll('button, input, .item-checkbox').forEach(function(el) {
      el.remove();
    });

    // Move clone's children to inner
    while (clone.firstChild) {
      inner.appendChild(clone.firstChild);
    }
  }

  ghost.appendChild(inner);
  dropGhost = ghost;
  return ghost;
}

function removeDropGhost() {
  if (dropGhost && dropGhost.parentNode) {
    dropGhost.parentNode.removeChild(dropGhost);
  }
  dropGhost = null;
}

function updateDropGhostSize() {
  if (!dropGhost) return;

  // Use cached size (captured before item was hidden)
  if (currentView === 'grid') {
    dropGhost.style.width = draggedItemSize.width + 'px';
    dropGhost.style.height = draggedItemSize.height + 'px';
  } else {
    dropGhost.style.width = '';
    dropGhost.style.height = draggedItemSize.height + 'px';
  }
}

// Get group name for a URL
function getGroupNameForUrl(url) {
  const group = groups.find(function(g) { return g.urls.includes(url); });
  return group ? group.name : 'Ungrouped';
}

function handleDragStart(e) {
  const item = e.target.closest('.image-item');
  const url = item.dataset.url;

  // Check if this item is part of a multi-selection
  const isSelected = selectedUrls.has(url);
  const hasMultipleSelected = selectedUrls.size > 1;

  // Capture size BEFORE hiding items
  draggedItemSize = {
    width: item.offsetWidth,
    height: item.offsetHeight
  };

  if (isSelected && hasMultipleSelected) {
    // Multi-selection drag - move all selected items
    draggedUrls = Array.from(selectedUrls);
    draggedUrl = url; // The item they clicked on

    // Create ghost showing multiple items
    createDropGhost(item, true);

    // Hide all selected items
    draggedUrls.forEach(function(u) {
      const el = document.querySelector('.image-item[data-url="' + CSS.escape(u) + '"]');
      if (el) el.classList.add('dragging');
    });
  } else {
    // Single item drag
    draggedUrls = [url];
    draggedUrl = url;

    createDropGhost(item, false);
    item.classList.add('dragging');
  }

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/x-collector-internal', draggedUrls.join(','));
}

function cancelDrag() {
  // Remove dragging class from all items
  document.querySelectorAll('.image-item.dragging').forEach(function(item) {
    item.classList.remove('dragging');
  });
  removeDropGhost();
  draggedUrl = null;
  draggedUrls = [];
  dropTargetItem = null;
  dropPosition = null;
}

function handleDragEnd() {
  // Remove dragging class from all items
  document.querySelectorAll('.image-item.dragging').forEach(function(item) {
    item.classList.remove('dragging');
  });
  document.querySelectorAll('.group-section, .ungrouped-section').forEach(function(s) {
    s.classList.remove('drag-over');
  });
  // Remove drag-over from image lists (for empty list styling)
  document.querySelectorAll('.image-list.drag-over').forEach(function(list) {
    list.classList.remove('drag-over');
  });
  // Remove ghost element
  removeDropGhost();
  draggedUrl = null;
  draggedUrls = [];
  dropTargetItem = null;
  dropPosition = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');

  // If not hovering directly over an item, show ghost at end of this section's list
  // This handles dragging into empty groups or spaces between items
  const targetItem = e.target.closest('.image-item');
  if (!targetItem || targetItem.classList.contains('drop-ghost')) {
    const section = e.currentTarget;
    const imageList = section.querySelector('.image-list');
    if (imageList && dropGhost) {
      // Add drag-over to image list too (for empty list styling)
      imageList.classList.add('drag-over');

      // Only move ghost if it's not already in this list
      const ghostParent = dropGhost.parentNode;
      if (ghostParent !== imageList) {
        imageList.appendChild(dropGhost);
        updateDropGhostSize();
        dropTargetItem = null;
        dropPosition = null;
      }
    }
  }
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
  // Also remove from image list
  const imageList = e.currentTarget.querySelector('.image-list');
  if (imageList) {
    imageList.classList.remove('drag-over');
  }
}

// Handle dragover on individual items for position detection
function handleItemDragOver(e) {
  if (!draggedUrl) return;

  e.preventDefault();
  e.stopPropagation();

  const item = e.target.closest('.image-item');
  if (!item || item.classList.contains('drop-ghost')) return;

  // Don't show indicator on the dragged item itself
  if (item.dataset.url === draggedUrl) {
    removeDropGhost();
    dropTargetItem = null;
    dropPosition = null;
    return;
  }

  const rect = item.getBoundingClientRect();
  let newPosition;

  // Use horizontal detection for grid view, vertical for list view
  if (currentView === 'grid') {
    const mouseX = e.clientX;
    const itemMidX = rect.left + rect.width / 2;
    newPosition = mouseX < itemMidX ? 'before' : 'after';
  } else {
    const mouseY = e.clientY;
    const itemMidY = rect.top + rect.height / 2;
    newPosition = mouseY < itemMidY ? 'before' : 'after';
  }

  // Only update if target or position changed
  if (dropTargetItem !== item || dropPosition !== newPosition) {
    dropTargetItem = item;
    dropPosition = newPosition;

    // Insert ghost at the correct position
    const ghost = createDropGhost();
    updateDropGhostSize();

    if (newPosition === 'before') {
      item.parentNode.insertBefore(ghost, item);
    } else {
      item.parentNode.insertBefore(ghost, item.nextSibling);
    }
  }

  // Also mark the group section as drag-over
  const section = item.closest('.group-section, .ungrouped-section');
  if (section) {
    section.classList.add('drag-over');
  }
}

function handleItemDragLeave() {
  // Ghost cleanup is handled by handleDragEnd and handleDrop
  // We don't remove ghost on item leave because we might be entering another item
}

function clearDropIndicators() {
  removeDropGhost();
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  // Also remove from image list
  const imageListEl = e.currentTarget.querySelector('.image-list');
  if (imageListEl) {
    imageListEl.classList.remove('drag-over');
  }

  if (!draggedUrl || draggedUrls.length === 0) return;

  const targetGroupId = e.currentTarget.dataset.groupId;

  // Calculate insertion index based on drop target item
  let insertIndex = -1; // -1 means append to end
  if (dropTargetItem && dropPosition) {
    const section = e.currentTarget;
    // Exclude ghost element and dragging item from the item count
    const items = Array.from(section.querySelectorAll('.image-item:not(.drop-ghost):not(.dragging)'));
    const targetIndex = items.indexOf(dropTargetItem);

    if (targetIndex !== -1) {
      if (dropPosition === 'before') {
        insertIndex = targetIndex;
      } else {
        insertIndex = targetIndex + 1;
      }
    }
  }

  // Store info for potential undo
  const movedUrls = draggedUrls.slice();
  const primaryUrl = draggedUrl;
  const wasMultiMove = movedUrls.length > 1;

  // Capture original locations BEFORE moving (for undo)
  const originalLocations = {};
  if (wasMultiMove) {
    movedUrls.forEach(function(url) {
      const group = getGroupForUrl(url);
      originalLocations[url] = group ? group.id : null; // null = ungrouped
    });
  }

  // Move all dragged URLs
  if (wasMultiMove) {
    moveUrlsToGroup(movedUrls, targetGroupId, insertIndex);

    // Show post-drop confirmation with undo option
    showMoveConfirmation(movedUrls, primaryUrl, targetGroupId, originalLocations);
  } else {
    moveUrlToGroup(primaryUrl, targetGroupId, insertIndex);
  }

  // Clear indicators
  clearDropIndicators();
  dropTargetItem = null;
  dropPosition = null;
  draggedUrls = [];
}

// Show a brief confirmation after multi-move with option to move just one
function showMoveConfirmation(movedUrls, primaryUrl, targetGroupId, originalLocations) {
  const targetGroup = groups.find(function(g) { return g.id === targetGroupId; });
  const targetName = targetGroup ? targetGroup.name : 'Ungrouped';
  const count = movedUrls.length;

  const modal = document.getElementById('drag-intent-modal');
  const dialog = modal.querySelector('.drag-intent-dialog');

  // Update modal content for post-drop confirmation
  dialog.querySelector('h4').textContent = 'Moved ' + count + ' images';
  dialog.querySelector('.drag-intent-description').textContent =
    'All selected images were moved to "' + targetName + '". Did you only want to move one?';

  const singleDetail = document.getElementById('drag-single-detail');
  const selectedCount = document.getElementById('drag-selected-count');
  const selectedDetail = document.getElementById('drag-selected-detail');

  // Single option - move just the clicked item
  const filename = imageMeta[primaryUrl]?.name || getFilenameFromUrl(primaryUrl);
  singleDetail.textContent = 'Move only "' + filename + '" to ' + targetName;

  // Set preview image for single option
  const previewContainer = document.getElementById('drag-single-preview');
  const previewImg = previewContainer.querySelector('img');
  previewImg.src = primaryUrl;
  previewImg.alt = filename;
  previewContainer.classList.add('visible');

  // Multi option - keep as is
  selectedCount.textContent = count + ' images';
  selectedDetail.textContent = 'Keep all ' + count + ' images in ' + targetName;

  // Update button labels
  document.getElementById('drag-intent-single').querySelector('.option-title').textContent = 'Just this one';
  document.getElementById('drag-intent-selected').querySelector('.option-title').textContent = 'Keep all';

  modal.classList.add('visible');

  function cleanup() {
    modal.classList.remove('visible');
    document.getElementById('drag-intent-single').removeEventListener('click', handleMoveSingleOnly);
    document.getElementById('drag-intent-selected').removeEventListener('click', handleKeepAll);
    document.getElementById('drag-intent-cancel').removeEventListener('click', handleKeepAll);

    // Reset modal text for next use
    dialog.querySelector('h4').textContent = 'Move Images';
    dialog.querySelector('.drag-intent-description').textContent =
      'You have multiple images selected. What would you like to move?';
    document.getElementById('drag-intent-single').querySelector('.option-title').textContent = 'Move this image only';
    document.getElementById('drag-intent-selected').querySelector('.option-title').textContent = 'Move all selected';

    // Reset preview image
    previewContainer.classList.remove('visible');
    previewImg.src = '';
  }

  function handleMoveSingleOnly() {
    cleanup();

    // Move only the clicked item: restore others to their original locations
    const othersToUndo = movedUrls.filter(function(u) { return u !== primaryUrl; });

    // Remove others from target group first
    if (targetGroupId) {
      const tg = groups.find(function(g) { return g.id === targetGroupId; });
      if (tg) {
        tg.urls = tg.urls.filter(function(u) { return !othersToUndo.includes(u); });
      }
    }

    // Restore each item to its original group
    othersToUndo.forEach(function(url) {
      const originalGroupId = originalLocations[url];
      if (originalGroupId) {
        // Was in a group - add it back
        const originalGroup = groups.find(function(g) { return g.id === originalGroupId; });
        if (originalGroup && !originalGroup.urls.includes(url)) {
          originalGroup.urls.push(url);
        }
      }
      // If originalGroupId is null, it was ungrouped - no action needed as it's already not in any group
    });

    saveGroups();
    renderAll();
  }

  function handleKeepAll() {
    cleanup();
    // Do nothing - all items already moved
  }

  document.getElementById('drag-intent-single').addEventListener('click', handleMoveSingleOnly);
  document.getElementById('drag-intent-selected').addEventListener('click', handleKeepAll);
  document.getElementById('drag-intent-cancel').addEventListener('click', handleKeepAll);
}

function moveUrlToGroup(url, targetGroupId, insertIndex) {
  // Default insertIndex to -1 (append to end) if not provided
  if (insertIndex === undefined) {
    insertIndex = -1;
  }

  // Find source group
  const sourceGroup = groups.find(function(g) { return g.urls.includes(url); });

  // Remove from all groups first
  groups.forEach(function(g) {
    g.urls = g.urls.filter(function(u) { return u !== url; });
  });

  // Add to target group at specified position
  const targetGroup = groups.find(function(g) { return g.id === targetGroupId; });
  if (targetGroup && !targetGroup.urls.includes(url)) {
    if (insertIndex >= 0 && insertIndex <= targetGroup.urls.length) {
      targetGroup.urls.splice(insertIndex, 0, url);
    } else {
      targetGroup.urls.push(url);
    }
  } else if (!targetGroupId) {
    // Moving to ungrouped - reorder within imageURLs
    // Get current ungrouped URLs (excluding the dragged one)
    const groupedUrls = new Set(groups.flatMap(function(g) { return g.urls; }));
    const ungroupedUrls = imageURLs.filter(function(u) { return !groupedUrls.has(u) && u !== url; });

    // Calculate target position in imageURLs
    if (insertIndex >= 0 && insertIndex <= ungroupedUrls.length) {
      // Find the URL at insertIndex in ungrouped to get its position in imageURLs
      const targetUrl = ungroupedUrls[insertIndex];
      const targetPosInImageURLs = targetUrl ? imageURLs.indexOf(targetUrl) : imageURLs.length;

      // Remove from current position in imageURLs
      const currentPos = imageURLs.indexOf(url);
      if (currentPos !== -1) {
        imageURLs.splice(currentPos, 1);
      }

      // Insert at new position (adjust if we removed from before)
      const adjustedPos = currentPos !== -1 && currentPos < targetPosInImageURLs
        ? targetPosInImageURLs - 1
        : targetPosInImageURLs;

      imageURLs.splice(adjustedPos, 0, url);

      // Save imageURLs order
      browserAPI.storage.local.set({ imageURLs: imageURLs });
    }
  }

  saveGroups();
  renderAll();
}

// Move multiple URLs to a group at once
function moveUrlsToGroup(urls, targetGroupId, insertIndex) {
  if (insertIndex === undefined) {
    insertIndex = -1;
  }

  // Remove all URLs from their current groups
  groups.forEach(function(g) {
    g.urls = g.urls.filter(function(u) { return !urls.includes(u); });
  });

  const targetGroup = groups.find(function(g) { return g.id === targetGroupId; });

  if (targetGroup) {
    // Add all URLs to target group at specified position
    if (insertIndex >= 0 && insertIndex <= targetGroup.urls.length) {
      // Insert in order at the position
      for (let i = 0; i < urls.length; i++) {
        if (!targetGroup.urls.includes(urls[i])) {
          targetGroup.urls.splice(insertIndex + i, 0, urls[i]);
        }
      }
    } else {
      // Append all to end
      urls.forEach(function(url) {
        if (!targetGroup.urls.includes(url)) {
          targetGroup.urls.push(url);
        }
      });
    }
  } else if (!targetGroupId) {
    // Moving to ungrouped - reorder within imageURLs
    const groupedUrls = new Set(groups.flatMap(function(g) { return g.urls; }));
    const ungroupedUrls = imageURLs.filter(function(u) {
      return !groupedUrls.has(u) && !urls.includes(u);
    });

    if (insertIndex >= 0 && insertIndex <= ungroupedUrls.length) {
      const targetUrl = ungroupedUrls[insertIndex];
      let targetPosInImageURLs = targetUrl ? imageURLs.indexOf(targetUrl) : imageURLs.length;

      // Remove all dragged URLs from imageURLs
      urls.forEach(function(url) {
        const pos = imageURLs.indexOf(url);
        if (pos !== -1) {
          imageURLs.splice(pos, 1);
          // Adjust target position if we removed from before it
          if (pos < targetPosInImageURLs) {
            targetPosInImageURLs--;
          }
        }
      });

      // Insert all at the target position in order
      for (let i = 0; i < urls.length; i++) {
        imageURLs.splice(targetPosInImageURLs + i, 0, urls[i]);
      }

      browserAPI.storage.local.set({ imageURLs: imageURLs });
    }
  }

  saveGroups();
  renderAll();
}

function toggleSelection(url, liElement, isSelected) {
  // Use centralized selection handler
  updateSelection(url, isSelected, 'checkbox');
}

function updateSelectionBar() {
  const headerSelection = document.getElementById('header-selection');
  const selectedCount = document.getElementById('selected-count');
  const count = selectedUrls.size;

  selectedCount.textContent = count;
  headerSelection.classList.toggle('visible', count > 0);

  // Update global selection buttons
  const globalSelectAll = document.getElementById('global-select-all');
  const globalDeselectAll = document.getElementById('global-deselect-all');
  const totalImages = imageURLs.length;
  const allSelected = totalImages > 0 && count === totalImages;
  const noneSelected = count === 0;

  if (globalSelectAll) {
    globalSelectAll.disabled = totalImages === 0 || allSelected;
    globalSelectAll.title = totalImages === 0 ? 'No images to select' : (allSelected ? 'All images already selected' : 'Select all images');
  }
  if (globalDeselectAll) {
    globalDeselectAll.disabled = noneSelected;
    globalDeselectAll.title = noneSelected ? 'No images selected' : 'Deselect all images';
  }

  // Also update group action buttons
  updateGroupActionButtons();
  updateUngroupedActionButtons();
}

// Update group-level select/deselect button states
function updateGroupActionButtons() {
  groups.forEach(function(group) {
    const selectAllBtn = document.querySelector('[data-action="select-all"][data-group-id="' + group.id + '"]');
    const deselectBtn = document.querySelector('[data-action="deselect"][data-group-id="' + group.id + '"]');

    if (!selectAllBtn && !deselectBtn) return;

    const groupUrlCount = group.urls.length;
    const selectedInGroup = group.urls.filter(function(url) { return selectedUrls.has(url); }).length;
    const isEmpty = groupUrlCount === 0;
    const allSelected = groupUrlCount > 0 && selectedInGroup === groupUrlCount;
    const noneSelected = selectedInGroup === 0;

    if (selectAllBtn) {
      selectAllBtn.disabled = isEmpty || allSelected;
      selectAllBtn.title = isEmpty ? 'No images to select' : (allSelected ? 'All images already selected' : 'Select all images in group');
    }
    if (deselectBtn) {
      deselectBtn.disabled = noneSelected;
      deselectBtn.title = noneSelected ? 'No images selected' : 'Deselect all images in group';
    }
  });
}

// Update ungrouped section button states
function updateUngroupedActionButtons() {
  const selectAllBtn = document.getElementById('ungrouped-select-all');
  const deselectBtn = document.getElementById('ungrouped-deselect');
  const removeAllBtn = document.getElementById('ungrouped-remove-all');

  if (!selectAllBtn && !deselectBtn && !removeAllBtn) return;

  const ungrouped = getUngroupedUrls();
  const ungroupedCount = ungrouped.length;
  const selectedInUngrouped = ungrouped.filter(function(url) { return selectedUrls.has(url); }).length;
  const isEmpty = ungroupedCount === 0;
  const allSelected = ungroupedCount > 0 && selectedInUngrouped === ungroupedCount;
  const noneSelected = selectedInUngrouped === 0;

  if (selectAllBtn) {
    selectAllBtn.disabled = isEmpty || allSelected;
    selectAllBtn.title = isEmpty ? 'No images to select' : (allSelected ? 'All images already selected' : 'Select all ungrouped images');
  }
  if (deselectBtn) {
    deselectBtn.disabled = noneSelected;
    deselectBtn.title = noneSelected ? 'No images selected' : 'Deselect all ungrouped images';
  }
  if (removeAllBtn) {
    removeAllBtn.disabled = isEmpty;
    removeAllBtn.title = isEmpty ? 'No images to remove' : 'Remove all ungrouped images';
  }
}

function deselectAll() {
  // Use centralized handler
  clearAllSelections();
}

function selectAllGlobal() {
  // Select all images across all groups and ungrouped
  updateSelectionBulk(imageURLs, true, 'bulk');
}

function selectAllInGroup(groupId) {
  const group = groups.find(function(g) { return g.id === groupId; });
  if (!group) return;
  // Use centralized bulk selection handler
  updateSelectionBulk(group.urls, true, 'bulk');
}

function deselectAllInGroup(groupId) {
  const group = groups.find(function(g) { return g.id === groupId; });
  if (!group) return;
  // Use centralized bulk selection handler
  updateSelectionBulk(group.urls, false, 'bulk');
}

// Ungrouped section actions
function selectAllUngrouped() {
  const ungroupedUrls = getUngroupedUrls();
  // Use centralized bulk selection handler
  updateSelectionBulk(ungroupedUrls, true, 'bulk');
}

function deselectAllUngrouped() {
  const ungroupedUrls = getUngroupedUrls();
  // Use centralized bulk selection handler
  updateSelectionBulk(ungroupedUrls, false, 'bulk');
}

function removeAllUngrouped() {
  const ungroupedUrls = getUngroupedUrls();
  if (ungroupedUrls.length === 0) return;
  // Use centralized bulk removal handler
  removeImagesBulk(ungroupedUrls);
}

function removeAllInGroup(groupId) {
  const group = groups.find(function(g) { return g.id === groupId; });
  if (!group || group.urls.length === 0) return;
  // Use centralized bulk removal handler
  removeImagesBulk(group.urls.slice()); // slice() to copy array before it's modified
}

function showNewGroupModal() {
  const modal = document.getElementById('add-to-group-modal');
  const countSpan = document.getElementById('add-to-group-count');
  const nameInput = document.getElementById('new-group-name-input');
  const createBtn = document.getElementById('create-new-group-btn');
  const existingGroupsSection = document.getElementById('existing-groups-section');
  const cancelBtn = document.getElementById('add-to-group-cancel');
  const dialogTitle = modal.querySelector('h4');

  // Update title for empty group creation
  dialogTitle.innerHTML = 'Create new group';

  // Hide the "Add X images to group" count
  countSpan.style.display = 'none';

  // Clear and set default name
  nameInput.value = 'Group' + (groups.length + 1);

  // Hide existing groups section for empty group creation
  existingGroupsSection.style.display = 'none';
  // Also hide the divider
  const divider = modal.querySelector('.add-to-group-divider');
  if (divider) divider.style.display = 'none';

  // Show modal
  modal.classList.add('visible');
  nameInput.focus();
  nameInput.select();

  function cleanup() {
    modal.classList.remove('visible');
    createBtn.removeEventListener('click', handleCreate);
    cancelBtn.removeEventListener('click', handleCancel);
    nameInput.removeEventListener('keydown', handleKeydown);
    // Restore original title for next use
    dialogTitle.innerHTML = 'Add <span id="add-to-group-count">0</span> images to group';
    countSpan.style.display = '';
    if (divider) divider.style.display = '';
  }

  function handleCreate() {
    const name = nameInput.value.trim() || ('Group' + (groups.length + 1));
    createEmptyGroupWithName(name);
    cleanup();
  }

  function handleCancel() {
    cleanup();
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }

  createBtn.addEventListener('click', handleCreate);
  cancelBtn.addEventListener('click', handleCancel);
  nameInput.addEventListener('keydown', handleKeydown);
}

function createEmptyGroupWithName(name) {
  const groupId = generateGroupId();
  const colorIndex = groups.length % GROUP_COLORS.length;
  const newGroup = {
    id: groupId,
    name: name,
    directory: '',
    color: GROUP_COLORS[colorIndex],
    urls: []
  };

  groups.push(newGroup);
  saveGroups();
  renderAll();
}

// Legacy function - now shows modal
function createEmptyGroup() {
  showNewGroupModal();
}

function showAddToGroupModal() {
  if (selectedUrls.size === 0) return;

  const modal = document.getElementById('add-to-group-modal');
  const countSpan = document.getElementById('add-to-group-count');
  const nameInput = document.getElementById('new-group-name-input');
  const createBtn = document.getElementById('create-new-group-btn');
  const existingGroupsList = document.getElementById('existing-groups-list');
  const existingGroupsSection = document.getElementById('existing-groups-section');
  const cancelBtn = document.getElementById('add-to-group-cancel');

  // Update count
  countSpan.textContent = selectedUrls.size;

  // Clear and set default name
  nameInput.value = 'Group' + (groups.length + 1);

  // Populate existing groups, filtering out groups where all selected items already belong
  existingGroupsList.innerHTML = '';

  // Filter groups: exclude a group if ALL selected URLs are already in it
  const selectedUrlsArray = Array.from(selectedUrls);
  const eligibleGroups = groups.filter(function(group) {
    const allSelectedInThisGroup = selectedUrlsArray.every(function(url) {
      return group.urls.includes(url);
    });
    return !allSelectedInThisGroup;
  });

  if (eligibleGroups.length === 0) {
    existingGroupsSection.style.display = 'none';
  } else {
    existingGroupsSection.style.display = 'flex';
    eligibleGroups.forEach(function(group) {
      const option = document.createElement('div');
      option.className = 'existing-group-option';
      option.dataset.groupId = group.id;

      const colorDot = document.createElement('div');
      colorDot.className = 'existing-group-color';
      colorDot.style.background = group.color;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'existing-group-name';
      nameSpan.textContent = group.name;

      const countSpan = document.createElement('span');
      countSpan.className = 'existing-group-count';
      countSpan.textContent = group.urls.length + ' images';

      option.appendChild(colorDot);
      option.appendChild(nameSpan);
      option.appendChild(countSpan);
      existingGroupsList.appendChild(option);
    });
  }

  // Show modal
  modal.classList.add('visible');
  nameInput.focus();
  nameInput.select();

  function cleanup() {
    modal.classList.remove('visible');
    createBtn.removeEventListener('click', handleCreate);
    cancelBtn.removeEventListener('click', handleCancel);
    existingGroupsList.removeEventListener('click', handleExistingGroupClick);
    nameInput.removeEventListener('keydown', handleKeydown);
  }

  function handleCreate() {
    const name = nameInput.value.trim() || ('Group' + (groups.length + 1));
    createGroupWithName(name);
    cleanup();
  }

  function handleCancel() {
    cleanup();
  }

  function handleExistingGroupClick(e) {
    const option = e.target.closest('.existing-group-option');
    if (option) {
      const groupId = option.dataset.groupId;
      addSelectionToExistingGroup(groupId);
      cleanup();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }

  createBtn.addEventListener('click', handleCreate);
  cancelBtn.addEventListener('click', handleCancel);
  existingGroupsList.addEventListener('click', handleExistingGroupClick);
  nameInput.addEventListener('keydown', handleKeydown);
}

function createGroupWithName(name) {
  if (selectedUrls.size === 0) return;

  const groupId = generateGroupId();
  const colorIndex = groups.length % GROUP_COLORS.length;
  const newGroup = {
    id: groupId,
    name: name,
    directory: '',
    color: GROUP_COLORS[colorIndex],
    urls: Array.from(selectedUrls)
  };

  // Remove these URLs from other groups
  groups.forEach(function(g) {
    g.urls = g.urls.filter(function(u) { return !selectedUrls.has(u); });
  });

  groups.push(newGroup);
  saveGroups();

  deselectAll();
  renderAll();
}

function addSelectionToExistingGroup(groupId) {
  if (selectedUrls.size === 0) return;

  const targetGroup = groups.find(function(g) { return g.id === groupId; });
  if (!targetGroup) return;

  // Remove URLs from other groups and add to target
  groups.forEach(function(g) {
    if (g.id === groupId) {
      // Add selected URLs to this group (avoid duplicates)
      selectedUrls.forEach(function(url) {
        if (g.urls.indexOf(url) === -1) {
          g.urls.push(url);
        }
      });
    } else {
      // Remove selected URLs from other groups
      g.urls = g.urls.filter(function(u) { return !selectedUrls.has(u); });
    }
  });

  saveGroups();
  deselectAll();
  renderAll();
}

// Legacy function for backwards compatibility
function createGroupFromSelection() {
  showAddToGroupModal();
}

function deleteGroup(groupId) {
  groups = groups.filter(function(g) { return g.id !== groupId; });
  saveGroups();
  renderAll();
}

function updateGroup(groupId, updates) {
  const group = groups.find(function(g) { return g.id === groupId; });
  if (group) {
    Object.assign(group, updates);
    saveGroups();
  }
}

function saveGroups() {
  browserAPI.storage.local.set({ groups: groups });
}

function removeImage(url) {
  // Use centralized removal handler
  removeImageCentralized(url);
}

function setupEventListeners(statusDiv) {
  // View toggle
  document.getElementById('list-view-btn').addEventListener('click', function() {
    setView('list');
    renderAll();
  });

  document.getElementById('grid-view-btn').addEventListener('click', function() {
    setView('grid');
    renderAll();
  });

  // Selection bar buttons
  document.getElementById('create-group-btn').addEventListener('click', createGroupFromSelection);

  // Global selection buttons
  document.getElementById('global-select-all').addEventListener('click', selectAllGlobal);
  document.getElementById('global-deselect-all').addEventListener('click', deselectAll);

  // Add empty group button
  document.getElementById('add-group').addEventListener('click', createEmptyGroup);

  // Clear all button
  document.getElementById('flush').addEventListener('click', function() {
    const totalImages = imageURLs.length;
    if (totalImages === 0) return;

    showConfirmModal(
      'Clear All Images',
      'Remove all ' + totalImages + ' images and ' + groups.length + ' groups? This cannot be undone.',
      function() {
        browserAPI.storage.local.set({ navigationStack: [], groups: [], imageMeta: {} }, function() {
          imageURLs = [];
          selectedUrls.clear();
          groups = [];
          imageMeta = {};
          renderAll();
          showStatus(statusDiv, 'All images cleared', 'success');
        });
      }
    );
  });

  // Download button - shows preview modal
  document.getElementById('download').addEventListener('click', function() {
    if (imageURLs.length === 0) {
      showStatus(statusDiv, 'No images to download', 'error');
      return;
    }

    showDownloadPreview();
  });

  // Ungrouped section action buttons
  document.getElementById('ungrouped-select-all').addEventListener('click', selectAllUngrouped);
  document.getElementById('ungrouped-deselect').addEventListener('click', deselectAllUngrouped);

  // Ungrouped path edit button
  document.getElementById('ungrouped-path-edit').addEventListener('click', function(e) {
    e.stopPropagation();
    showDirectoryEditModal(null, settings.ungroupedDirectory || '');
  });
  document.getElementById('ungrouped-remove-all').addEventListener('click', function() {
    const ungroupedUrls = getUngroupedUrls();
    if (ungroupedUrls.length === 0) return;
    showConfirmModal(
      'Remove All Ungrouped',
      'Remove all ' + ungroupedUrls.length + ' ungrouped images? This cannot be undone.',
      removeAllUngrouped
    );
  });

  // Make ungrouped section a drop zone (uses same handlers as groups)
  const ungroupedSection = document.getElementById('ungrouped-section');
  ungroupedSection.addEventListener('dragover', handleDragOver);
  ungroupedSection.addEventListener('dragleave', handleDragLeave);
  ungroupedSection.addEventListener('drop', handleDrop);
}

function downloadImages(downloads, statusDiv) {
  let completed = 0;
  let failed = 0;
  const total = downloads.length;

  showStatus(statusDiv, 'Downloading 0/' + total + '...', 'info');

  downloads.forEach(function(item) {
    let filePath = item.filename;
    if (item.directory) {
      const cleanDir = item.directory.replace(/[\/\\]+$/, '');
      filePath = cleanDir + '/' + item.filename;
    }

    // Determine conflict action based on per-item setting or global setting
    // willRename: true = 'uniquify' (auto-rename), false = 'overwrite'
    const conflictAction = (item.willRename !== false) ? 'uniquify' : 'overwrite';

    browserAPI.downloads.download({
      url: item.url,
      filename: filePath,
      saveAs: false,
      conflictAction: conflictAction
    }, function() {
      if (browserAPI.runtime.lastError) {
        console.error('Download error:', browserAPI.runtime.lastError);
        failed++;
      } else {
        completed++;
      }

      const done = completed + failed;
      if (done === total) {
        if (failed > 0) {
          showStatus(statusDiv, 'Downloaded ' + completed + '/' + total + ' (' + failed + ' failed)', 'error');
        } else {
          showStatus(statusDiv, 'Downloaded ' + completed + ' images successfully!', 'success');

          // Clear list if setting enabled
          if (settings.clearOnDownload) {
            browserAPI.storage.local.set({ navigationStack: [], groups: [] }, function() {
              imageURLs = [];
              selectedUrls.clear();
              groups = [];
              renderAll();
            });
          }
        }
      } else {
        showStatus(statusDiv, 'Downloading ' + done + '/' + total + '...', 'info');
      }
    });
  });
}

function showStatus(statusDiv, message, type) {
  if (!statusDiv) return;
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  statusDiv.style.display = 'block';

  if (type === 'success') {
    setTimeout(function() {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}

// Check if running in standalone window (not browser action popup)
function checkIfWindowed() {
  // Browser action popups have a fixed size constraint
  // Standalone windows opened via chrome.windows.create are larger (700x800)
  // Use a small delay to let the window size settle after opening
  setTimeout(function() {
    // If the window is larger than the popup dimensions, we're in a standalone window
    if (window.innerWidth > 650 || window.innerHeight > 720) {
      document.body.classList.add('windowed');
    }
  }, 50);
}

// Setup floating tooltips using floating-ui
function setupFloatingTooltips() {
  const tooltip = document.getElementById('floating-tooltip');
  const tooltipText = document.getElementById('floating-tooltip-text');
  const tooltipArrow = document.getElementById('floating-tooltip-arrow');

  if (!tooltip || !window.FloatingUIDOM) {
    // Fallback: if floating-ui didn't load, use simple title attributes
    document.querySelectorAll('.info-icon[data-tooltip]').forEach(function(icon) {
      icon.title = icon.dataset.tooltip;
    });
    return;
  }

  const { computePosition, flip, shift, offset, arrow } = window.FloatingUIDOM;

  function showTooltip(referenceEl) {
    const text = referenceEl.dataset.tooltip;
    if (!text) return;

    tooltipText.textContent = text;
    tooltip.classList.add('visible');

    computePosition(referenceEl, tooltip, {
      placement: 'top',
      middleware: [
        offset(8),
        flip({ fallbackPlacements: ['bottom', 'left', 'right'] }),
        shift({ padding: 8 }),
        arrow({ element: tooltipArrow })
      ]
    }).then(function(result) {
      const x = result.x;
      const y = result.y;
      const placement = result.placement;
      const middlewareData = result.middlewareData;

      Object.assign(tooltip.style, {
        left: x + 'px',
        top: y + 'px'
      });

      // Position the arrow
      if (middlewareData.arrow) {
        const arrowX = middlewareData.arrow.x;
        const arrowY = middlewareData.arrow.y;

        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right'
        }[placement.split('-')[0]];

        Object.assign(tooltipArrow.style, {
          left: arrowX != null ? arrowX + 'px' : '',
          top: arrowY != null ? arrowY + 'px' : '',
          right: '',
          bottom: ''
        });
        tooltipArrow.style[staticSide] = '-4px';
      }
    });
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
  }

  // Attach event listeners to all info icons
  document.querySelectorAll('.info-icon[data-tooltip]').forEach(function(icon) {
    icon.addEventListener('mouseenter', function() {
      showTooltip(icon);
    });
    icon.addEventListener('mouseleave', hideTooltip);
    icon.addEventListener('focus', function() {
      showTooltip(icon);
    });
    icon.addEventListener('blur', hideTooltip);
  });
}

// Handle undock button
function setupUndockButton() {
  const undockBtn = document.getElementById('undock-btn');
  if (undockBtn) {
    undockBtn.addEventListener('click', function() {
      browserAPI.runtime.sendMessage({ action: 'openInWindow' }, function(response) {
        if (response && response.success) {
          // Close the popup after opening window
          window.close();
        }
      });
    });
  }
}

// Listen for storage changes to live-update when images are added from the website
function setupStorageListener() {
  let renderDebounceTimer = null;

  browserAPI.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName !== 'local') return;

    // Ignore imageMeta-only changes - these are triggered by our own image loads
    // and would cause infinite loops
    if (changes.imageMeta && !changes.navigationStack && !changes.groups && !changes.urlMeta) {
      return;
    }

    let newUrls = [];
    let needsRender = false;

    // Sync urlMeta if it changed (from content script or external drop)
    if (changes.urlMeta) {
      const newUrlMeta = changes.urlMeta.newValue || {};
      urlMeta = newUrlMeta;
    }

    // Handle navigation stack changes (new images added)
    if (changes.navigationStack) {
      const oldStack = changes.navigationStack.oldValue || [];
      const newStack = changes.navigationStack.newValue || [];

      // Find newly added URLs
      newUrls = newStack.filter(url => !oldStack.includes(url));

      if (newUrls.length > 0) {
        // Update our local state
        // URLs are trusted because they've been validated at their source:
        // - content-script: from actual <img> elements on the page
        // - external-drop: validated via HEAD request in popup
        newUrls.forEach(url => {
          if (!imageURLs.includes(url)) {
            imageURLs.push(url);

          }
        });
        needsRender = true;
      }
    }

    // Handle groups changes (images added directly to groups)
    if (changes.groups) {
      const newGroups = changes.groups.newValue || [];
      groups = newGroups;
      needsRender = true;
    }

    if (needsRender) {
      // Debounce renders to prevent rapid re-rendering
      if (renderDebounceTimer) {
        clearTimeout(renderDebounceTimer);
      }

      renderDebounceTimer = setTimeout(function() {
        renderDebounceTimer = null;

        // Re-render with animation for new items
        renderAll();

        // Scroll to and highlight the newly added items
        if (newUrls.length > 0) {
          setTimeout(function() {
            newUrls.forEach(url => {
              const item = document.querySelector('.image-item[data-url="' + CSS.escape(url) + '"]');
              if (item) {
                item.classList.add('newly-added');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Remove the animation class after it completes
                setTimeout(function() {
                  item.classList.remove('newly-added');
                }, 1500);
              }
            });
          }, 100);
        }
      }, 50); // 50ms debounce
    }
  });
}

// ===========================================
// DROP EXTRACTION SYSTEM
// Flexible system for extracting items from drag/drop data
// ===========================================

// Media type categories for extensibility
const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  UNKNOWN: 'unknown'
};

// Source classifications
const DROP_SOURCES = {
  FILE: 'file',           // Dragged from file system
  HTML_IMG: 'html_img',   // <img> tag from HTML
  HTML_SVG: 'html_svg',   // <svg> element from HTML
  URI_LIST: 'uri_list',   // text/uri-list
  TEXT_URL: 'text_url',   // text/plain URL
  EMBEDDED: 'embedded'    // URL extracted from query params
};

// Item hints for smart filtering
const ITEM_HINTS = {
  PRIMARY: 'primary',     // Likely the main content user wanted
  DUPLICATE: 'duplicate', // Same content in different format
  UI_ELEMENT: 'ui',       // Likely a UI icon/button
  UNKNOWN: 'unknown'
};

// Detect media type from URL or MIME type
function detectMediaType(url, mimeType) {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return MEDIA_TYPES.IMAGE;
    if (mimeType.startsWith('video/')) return MEDIA_TYPES.VIDEO;
    if (mimeType.startsWith('audio/')) return MEDIA_TYPES.AUDIO;
    if (mimeType === 'application/pdf') return MEDIA_TYPES.DOCUMENT;
  }

  if (url) {
    const lower = url.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif)(\?|$)/i.test(lower) || lower.startsWith('data:image/')) {
      return MEDIA_TYPES.IMAGE;
    }
    if (/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(lower)) {
      return MEDIA_TYPES.VIDEO;
    }
    if (/\.(mp3|wav|ogg|flac|m4a)(\?|$)/i.test(lower)) {
      return MEDIA_TYPES.AUDIO;
    }
    if (/\.pdf(\?|$)/i.test(lower)) {
      return MEDIA_TYPES.DOCUMENT;
    }
  }

  return MEDIA_TYPES.UNKNOWN;
}

// Extract format/extension from URL
function extractFormat(url) {
  if (!url) return null;
  if (url.startsWith('data:')) {
    const match = url.match(/^data:image\/(\w+)/);
    return match ? match[1] : null;
  }
  const match = url.match(/\.(\w+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : null;
}

// Suggest filename from URL
function suggestFilename(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const segments = path.split('/');
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment.includes('.')) {
      return decodeURIComponent(lastSegment);
    }
  } catch (e) {}
  return null;
}

// Check if URL looks like a UI element
function isLikelyUiElement(url, dimensions) {
  if (!url) return false;
  const lower = url.toLowerCase();

  // Check for common UI patterns in URL
  const uiPatterns = [
    /\/icon[s]?\//i,
    /\/ui\//i,
    /\/assets\/.*icon/i,
    /avatar/i,
    /logo/i,
    /favicon/i,
    /sprite/i,
    /button/i,
    /badge/i,
    /-icon\./i,
    /_icon\./i
  ];

  for (const pattern of uiPatterns) {
    if (pattern.test(lower)) return true;
  }

  // Small dimensions suggest UI element
  if (dimensions && dimensions.width && dimensions.height) {
    if (dimensions.width <= 64 && dimensions.height <= 64) return true;
  }

  return false;
}

// Get deduplication key (to identify same image in different formats)
function getDeduplicationKey(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    // Remove extension and common format suffixes
    let path = urlObj.pathname.replace(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i, '');
    // Remove common size suffixes like _200x200
    path = path.replace(/_\d+x\d+$/, '');
    path = path.replace(/-\d+x\d+$/, '');
    return urlObj.hostname + path;
  } catch (e) {
    return url;
  }
}

// Main extraction function - extracts ALL items from drop data
function extractDropItems(dataTransfer) {
  const items = [];
  const seen = new Set();

  // Helper to add item if not duplicate URL
  function addItem(item) {
    if (item.url && !seen.has(item.url)) {
      seen.add(item.url);
      items.push(item);
    }
  }

  // Helper to check if URL is absolute
  function isAbsoluteUrl(url) {
    return url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'));
  }

  // Helper to convert SVG to data URL
  function svgToDataUrl(svgString) {
    let cleanSvg = svgString.trim();
    if (!cleanSvg.includes('xmlns')) {
      cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const encoded = encodeURIComponent(cleanSvg)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    return 'data:image/svg+xml,' + encoded;
  }

  // 1. Extract from Files (drag from file system)
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      const mediaType = detectMediaType(null, file.type);

      // For now, we can't get URL from file without FileReader
      // We'll handle this case specially
      addItem({
        url: null,
        file: file,
        source: DROP_SOURCES.FILE,
        mediaType: mediaType,
        mimeType: file.type,
        filename: file.name,
        format: extractFormat(file.name),
        hint: ITEM_HINTS.PRIMARY
      });
    }
  }

  // 2. Extract from HTML (images and SVGs from webpages)
  const html = dataTransfer.getData('text/html');
  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract <img> elements
    const imgs = doc.querySelectorAll('img');
    imgs.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src && isAbsoluteUrl(src)) {
        const dimensions = {
          width: parseInt(img.getAttribute('width')) || null,
          height: parseInt(img.getAttribute('height')) || null
        };

        addItem({
          url: src,
          source: DROP_SOURCES.HTML_IMG,
          mediaType: MEDIA_TYPES.IMAGE,
          format: extractFormat(src),
          filename: suggestFilename(src),
          dimensions: dimensions,
          hint: isLikelyUiElement(src, dimensions) ? ITEM_HINTS.UI_ELEMENT :
                (index === 0 ? ITEM_HINTS.PRIMARY : ITEM_HINTS.UNKNOWN),
          dedupeKey: getDeduplicationKey(src)
        });
      }
    });

    // Extract <svg> elements
    const svgs = doc.querySelectorAll('svg');
    svgs.forEach((svg) => {
      const svgString = svg.outerHTML;
      const dataUrl = svgToDataUrl(svgString);
      const viewBox = svg.getAttribute('viewBox');
      let dimensions = null;

      if (viewBox) {
        const parts = viewBox.split(/\s+/);
        if (parts.length >= 4) {
          dimensions = { width: parseFloat(parts[2]), height: parseFloat(parts[3]) };
        }
      }

      addItem({
        url: dataUrl,
        source: DROP_SOURCES.HTML_SVG,
        mediaType: MEDIA_TYPES.IMAGE,
        format: 'svg',
        hint: isLikelyUiElement(dataUrl, dimensions) ? ITEM_HINTS.UI_ELEMENT : ITEM_HINTS.UNKNOWN,
        dimensions: dimensions
      });
    });
  }

  // 3. Extract from URI list
  const uriList = dataTransfer.getData('text/uri-list');
  if (uriList) {
    const urls = uriList.split(/[\r\n]+/).filter(u => u && !u.startsWith('#'));
    urls.forEach(url => {
      url = url.trim();
      if (isAbsoluteUrl(url)) {
        const mediaType = detectMediaType(url);
        addItem({
          url: url,
          source: DROP_SOURCES.URI_LIST,
          mediaType: mediaType,
          format: extractFormat(url),
          filename: suggestFilename(url),
          hint: ITEM_HINTS.UNKNOWN,
          dedupeKey: getDeduplicationKey(url)
        });

        // Check for embedded image URL (from search engines)
        const embedded = extractEmbeddedUrl(url);
        if (embedded && embedded !== url) {
          addItem({
            url: embedded,
            source: DROP_SOURCES.EMBEDDED,
            mediaType: detectMediaType(embedded),
            format: extractFormat(embedded),
            filename: suggestFilename(embedded),
            hint: ITEM_HINTS.PRIMARY, // Embedded URLs are often the actual content
            dedupeKey: getDeduplicationKey(embedded)
          });
        }
      }
    });
  }

  // 4. Extract from plain text (might be a URL)
  const text = dataTransfer.getData('text/plain');
  if (text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const url = urlMatch[0];
      const mediaType = detectMediaType(url);
      addItem({
        url: url,
        source: DROP_SOURCES.TEXT_URL,
        mediaType: mediaType,
        format: extractFormat(url),
        filename: suggestFilename(url),
        hint: ITEM_HINTS.UNKNOWN,
        dedupeKey: getDeduplicationKey(url)
      });
    }
  }

  return items;
}

// Helper to extract embedded image URL from search engine URLs
function extractEmbeddedUrl(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const imageParams = ['iai', 'imgurl', 'mediaurl', 'url', 'src', 'image', 'img'];
    for (const param of imageParams) {
      const value = urlObj.searchParams.get(param);
      if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
        return value;
      }
    }
  } catch (e) {}
  return null;
}

// Analyze items and suggest smart defaults
function analyzeAndSortItems(items) {
  // Mark duplicates (same base URL, different format)
  const byDedupeKey = groupBy(items.filter(i => i.dedupeKey), 'dedupeKey');

  for (const key in byDedupeKey) {
    const group = byDedupeKey[key];
    if (group.length > 1) {
      // Keep the first one as primary, mark others as duplicates
      group.slice(1).forEach(item => {
        if (item.hint !== ITEM_HINTS.UI_ELEMENT) {
          item.hint = ITEM_HINTS.DUPLICATE;
        }
      });
    }
  }

  // Sort: Primary first, then Unknown, then Duplicates, then UI elements
  const hintOrder = {
    [ITEM_HINTS.PRIMARY]: 0,
    [ITEM_HINTS.UNKNOWN]: 1,
    [ITEM_HINTS.DUPLICATE]: 2,
    [ITEM_HINTS.UI_ELEMENT]: 3
  };

  items.sort((a, b) => hintOrder[a.hint] - hintOrder[b.hint]);

  return {
    items: items,
    recommended: items.filter(i => i.hint === ITEM_HINTS.PRIMARY || i.hint === ITEM_HINTS.UNKNOWN),
    hasDuplicates: items.some(i => i.hint === ITEM_HINTS.DUPLICATE),
    hasUiElements: items.some(i => i.hint === ITEM_HINTS.UI_ELEMENT)
  };
}

// Helper to group array by property
function groupBy(arr, prop) {
  return arr.reduce((acc, item) => {
    const key = item[prop];
    if (key) {
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
    }
    return acc;
  }, {});
}

// External drag-and-drop support
function setupExternalDropZone() {
  const overlay = document.getElementById('external-drop-overlay');
  const dropText = document.getElementById('drop-text');
  const feedback = document.getElementById('drop-feedback');
  let dragCounter = 0;
  let targetGroupId = null;

  // Validate if the dragged data contains a valid image
  function validateDragData(e) {
    const types = e.dataTransfer.types;

    // Check for image file
    if (types.includes('Files')) {
      const items = e.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          return { valid: true, type: 'file', message: 'Drop image to add' };
        }
      }
      return { valid: false, type: 'file', message: 'Not an image file' };
    }

    // Check for image URL or text that might be a URL
    if (types.includes('text/uri-list') || types.includes('text/plain')) {
      return { valid: true, type: 'url', message: 'Drop to add image URL' };
    }

    // Check for HTML (dragged image from webpage)
    if (types.includes('text/html')) {
      return { valid: true, type: 'html', message: 'Drop image to add' };
    }

    return { valid: false, type: 'unknown', message: 'Cannot add this content' };
  }

  // Find which group the drop target is over
  function findTargetGroup(e) {
    const x = e.clientX;
    const y = e.clientY;

    // Check group sections
    const groupSections = document.querySelectorAll('.group-section');
    for (let i = 0; i < groupSections.length; i++) {
      const rect = groupSections[i].getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return groupSections[i].dataset.groupId;
      }
    }

    return null; // Will go to ungrouped
  }

  // Show feedback toast
  function showDropFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'drop-feedback visible ' + type;
    setTimeout(function() {
      feedback.classList.remove('visible');
    }, 2000);
  }

  // Show rejection animation
  function showRejection(message) {
    overlay.classList.add('reject');
    dropText.textContent = message;
    showDropFeedback(message, 'error');

    setTimeout(function() {
      overlay.classList.remove('reject', 'visible', 'invalid');
      dragCounter = 0;
    }, 500);
  }

  // Check if this is an internal drag (reordering existing items)
  function isInternalDrag(e) {
    return e.dataTransfer.types.includes('application/x-collector-internal');
  }

  // Drag enter on document
  document.addEventListener('dragenter', function(e) {
    // Only handle external drags (not internal reordering)
    if (isInternalDrag(e)) {
      return;
    }

    e.preventDefault();
    dragCounter++;

    if (dragCounter === 1) {
      const validation = validateDragData(e);
      overlay.classList.add('visible');

      if (validation.valid) {
        overlay.classList.remove('invalid');
        dropText.textContent = validation.message;
      } else {
        overlay.classList.add('invalid');
        dropText.textContent = validation.message;
      }
    }
  }, true);

  // Drag over on document
  document.addEventListener('dragover', function(e) {
    // Only handle external drags
    if (isInternalDrag(e)) {
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    // Update target group indicator
    targetGroupId = findTargetGroup(e);
    const validation = validateDragData(e);

    if (validation.valid) {
      if (targetGroupId) {
        const group = groups.find(function(g) { return g.id === targetGroupId; });
        dropText.textContent = 'Drop to add to "' + (group ? group.name : 'group') + '"';
      } else {
        dropText.textContent = 'Drop to add to Ungrouped';
      }
    }
  }, true);

  // Drag leave on document
  document.addEventListener('dragleave', function(e) {
    // Only handle external drags
    if (isInternalDrag(e)) {
      return;
    }

    e.preventDefault();
    dragCounter--;

    if (dragCounter === 0) {
      overlay.classList.remove('visible', 'invalid');
    }
  }, true);

  // Drop on document
  document.addEventListener('drop', function(e) {
    // Only handle external drags
    if (isInternalDrag(e)) {
      return;
    }

    e.preventDefault();
    dragCounter = 0;

    const validation = validateDragData(e);
    if (!validation.valid) {
      showRejection(validation.message);
      return;
    }

    // Determine target group
    targetGroupId = findTargetGroup(e);

    // Use the new drop extraction system with selection modal
    handleDropWithSelection(e, targetGroupId);
  }, true);
}

// Initialize header icons using the icon system
function setupHeaderIcons() {
  const iconSizeSm = Icons.getDensityIconSize('sm');
  const iconSizeXs = Math.round(iconSizeSm * 0.85); // Slightly smaller for edit buttons

  // View toggle buttons
  const listBtn = document.getElementById('list-view-btn');
  const gridBtn = document.getElementById('grid-view-btn');
  if (listBtn) Icons.setElementIcon(listBtn, 'list', { size: iconSizeSm });
  if (gridBtn) Icons.setElementIcon(gridBtn, 'grid', { size: iconSizeSm });

  // Global selection toggle buttons
  const globalSelectAll = document.getElementById('global-select-all');
  const globalDeselectAll = document.getElementById('global-deselect-all');
  if (globalSelectAll) Icons.setElementIcon(globalSelectAll, 'check-circle', { size: iconSizeSm });
  if (globalDeselectAll) Icons.setElementIcon(globalDeselectAll, 'x-circle', { size: iconSizeSm });

  // Add Group button (folder-plus icon to mean "create new group")
  const addGroupBtn = document.getElementById('add-group');
  if (addGroupBtn) {
    addGroupBtn.innerHTML = '';
    addGroupBtn.appendChild(Icons.createIcon('folder-plus', { size: iconSizeSm }));
    const span = document.createElement('span');
    span.textContent = 'New';
    addGroupBtn.appendChild(span);
  }

  // Download button
  const downloadBtn = document.getElementById('download');
  if (downloadBtn) {
    downloadBtn.innerHTML = '';
    downloadBtn.appendChild(Icons.createIcon('download', { size: iconSizeSm }));
    const span = document.createElement('span');
    span.textContent = 'Download';
    downloadBtn.appendChild(span);
  }

  // Remove All button (trash icon)
  const flushBtn = document.getElementById('flush');
  if (flushBtn) {
    flushBtn.innerHTML = '';
    flushBtn.appendChild(Icons.createIcon('trash', { size: iconSizeSm }));
    const span = document.createElement('span');
    span.textContent = 'Clear';
    flushBtn.appendChild(span);
  }

  // Ungrouped section buttons
  const ungroupedSelectAll = document.getElementById('ungrouped-select-all');
  const ungroupedDeselect = document.getElementById('ungrouped-deselect');
  const ungroupedRemoveAll = document.getElementById('ungrouped-remove-all');
  const ungroupedPathEdit = document.getElementById('ungrouped-path-edit');

  if (ungroupedSelectAll) Icons.setElementIcon(ungroupedSelectAll, 'check-circle', { size: iconSizeSm });
  if (ungroupedDeselect) Icons.setElementIcon(ungroupedDeselect, 'x-circle', { size: iconSizeSm });
  if (ungroupedRemoveAll) Icons.setElementIcon(ungroupedRemoveAll, 'trash', { size: iconSizeSm });
  if (ungroupedPathEdit) Icons.setElementIcon(ungroupedPathEdit, 'pencil', { size: iconSizeXs });

  // Selection bar buttons
  const createGroupBtn = document.getElementById('create-group-btn');

  if (createGroupBtn) {
    createGroupBtn.innerHTML = '';
    // Use arrow-right-end-on-rectangle to signify "move selected into group"
    createGroupBtn.appendChild(Icons.createIcon('arrow-right-end-on-rectangle', { size: iconSizeSm }));
    const span = document.createElement('span');
    span.textContent = 'Group';
    createGroupBtn.appendChild(span);
  }

  // Convert all info-icon spans to use the question-mark-circle SVG
  document.querySelectorAll('.info-icon[data-tooltip]').forEach(function(el) {
    el.textContent = ''; // Remove the "?"
    el.classList.add('info-icon-wrapper');
    // Remove any existing icons first
    el.querySelectorAll('.icon').forEach(function(icon) { icon.remove(); });
    el.appendChild(Icons.createIcon('question-mark-circle', { size: iconSizeSm, className: 'info-icon' }));
  });

  // Undock button icon
  const undockIcon = document.querySelector('.undock-icon');
  if (undockIcon) {
    undockIcon.innerHTML = '';
    undockIcon.appendChild(Icons.createIcon('arrow-top-right-on-square', { size: iconSizeSm }));
  }
}

// Setup event delegation for filename inputs
// This ensures filename changes in list view are saved and synced to other views
function setupFilenameInputListeners() {
  // Track original values to detect actual changes
  document.addEventListener('focus', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('filename-input')) {
      // Store original value when focused
      e.target.dataset.originalValue = e.target.value;
    }
  }, true);

  // Use event delegation on document for dynamically created inputs
  document.addEventListener('change', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('filename-input')) {
      const item = e.target.closest('.image-item');
      const url = item ? item.dataset.url : null;
      if (url) {
        const newName = e.target.value.trim();
        const originalValue = e.target.dataset.originalValue;
        // Only update if value actually changed
        if (newName && newName !== originalValue) {
          updateFilename(url, newName, 'list');
          e.target.dataset.originalValue = newName; // Update stored value
        }
      }
    }
  });

  // Also handle blur for immediate feedback (in case user doesn't press Enter)
  document.addEventListener('blur', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('filename-input')) {
      const item = e.target.closest('.image-item');
      const url = item ? item.dataset.url : null;
      if (url) {
        const newName = e.target.value.trim();
        const originalValue = e.target.dataset.originalValue;
        // Only update if value actually changed from when focused
        if (newName && newName !== originalValue) {
          updateFilename(url, newName, 'list');
          e.target.dataset.originalValue = newName; // Update stored value
        }
      }
    }
  }, true); // Use capture phase for blur
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  checkIfWindowed();
  setupUndockButton();
  setupFloatingTooltips();
  setupStorageListener();
  setupExternalDropZone();
  setupHeaderIcons();
  setupFilenameInputListeners();
  init();
});
