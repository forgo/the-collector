// downloads/download-manager.js
// Download queue management and execution

/**
 * Download state tracking
 */
var downloadState = {
  isDownloading: false,
  completed: 0,
  failed: 0,
  total: 0,
  errors: []
};

/**
 * Reset download state
 */
function resetDownloadState() {
  downloadState.isDownloading = false;
  downloadState.completed = 0;
  downloadState.failed = 0;
  downloadState.total = 0;
  downloadState.errors = [];
}

/**
 * Get current download progress
 * @returns {{completed: number, failed: number, total: number, percent: number}}
 */
function getDownloadProgress() {
  var done = downloadState.completed + downloadState.failed;
  var percent = downloadState.total > 0 ? Math.round((done / downloadState.total) * 100) : 0;

  return {
    completed: downloadState.completed,
    failed: downloadState.failed,
    total: downloadState.total,
    done: done,
    percent: percent,
    isComplete: done === downloadState.total,
    isDownloading: downloadState.isDownloading
  };
}

/**
 * Execute a single download using Chrome downloads API
 * @param {object} item - Download item {url, filename, directory, willRename}
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function downloadSingle(item) {
  return new Promise(function(resolve) {
    var filePath = item.filename;
    if (item.directory) {
      var cleanDir = item.directory.replace(/[\/\\]+$/, '');
      filePath = cleanDir + '/' + item.filename;
    }

    // Determine conflict action based on per-item setting
    // willRename: true = 'uniquify' (auto-rename), false = 'overwrite'
    var conflictAction = (item.willRename !== false) ? 'uniquify' : 'overwrite';

    chrome.downloads.download({
      url: item.url,
      filename: filePath,
      saveAs: false,
      conflictAction: conflictAction
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message,
          url: item.url
        });
      } else {
        resolve({
          success: true,
          downloadId: downloadId,
          url: item.url
        });
      }
    });
  });
}

/**
 * Download multiple items sequentially
 * @param {Array} downloads - Array of download items
 * @param {function} [onProgress] - Progress callback (completed, failed, total)
 * @returns {Promise<{completed: number, failed: number, errors: Array}>}
 */
function downloadSequential(downloads, onProgress) {
  resetDownloadState();
  downloadState.isDownloading = true;
  downloadState.total = downloads.length;

  var index = 0;

  function processNext() {
    if (index >= downloads.length) {
      downloadState.isDownloading = false;
      return Promise.resolve({
        completed: downloadState.completed,
        failed: downloadState.failed,
        errors: downloadState.errors
      });
    }

    var item = downloads[index];
    index++;

    return downloadSingle(item).then(function(result) {
      if (result.success) {
        downloadState.completed++;
      } else {
        downloadState.failed++;
        downloadState.errors.push({
          url: result.url,
          error: result.error
        });
      }

      if (onProgress) {
        onProgress(downloadState.completed, downloadState.failed, downloadState.total);
      }

      return processNext();
    });
  }

  return processNext();
}

/**
 * Download multiple items in parallel (faster but may overwhelm browser)
 * @param {Array} downloads - Array of download items
 * @param {function} [onProgress] - Progress callback (completed, failed, total)
 * @param {number} [concurrency=5] - Max concurrent downloads
 * @returns {Promise<{completed: number, failed: number, errors: Array}>}
 */
function downloadParallel(downloads, onProgress, concurrency) {
  concurrency = concurrency || 5;
  resetDownloadState();
  downloadState.isDownloading = true;
  downloadState.total = downloads.length;

  var index = 0;
  var activeCount = 0;
  var resolveAll;

  var promise = new Promise(function(resolve) {
    resolveAll = resolve;
  });

  function checkComplete() {
    if (index >= downloads.length && activeCount === 0) {
      downloadState.isDownloading = false;
      resolveAll({
        completed: downloadState.completed,
        failed: downloadState.failed,
        errors: downloadState.errors
      });
    }
  }

  function processNext() {
    while (activeCount < concurrency && index < downloads.length) {
      var item = downloads[index];
      index++;
      activeCount++;

      downloadSingle(item).then(function(result) {
        activeCount--;

        if (result.success) {
          downloadState.completed++;
        } else {
          downloadState.failed++;
          downloadState.errors.push({
            url: result.url,
            error: result.error
          });
        }

        if (onProgress) {
          onProgress(downloadState.completed, downloadState.failed, downloadState.total);
        }

        processNext();
        checkComplete();
      });
    }

    checkComplete();
  }

  processNext();
  return promise;
}

/**
 * Build a file path from directory and filename
 * @param {string} directory - Directory path
 * @param {string} filename - Filename
 * @returns {string} Full file path
 */
function buildFilePath(directory, filename) {
  if (!directory) return filename;
  var cleanDir = directory.replace(/[\/\\]+$/, '');
  return cleanDir + '/' + filename;
}

/**
 * Sanitize a directory path for use in downloads
 * @param {string} path - Directory path
 * @returns {string} Sanitized path
 */
function sanitizeDirectoryPath(path) {
  if (!path) return '';
  // Remove invalid characters and normalize slashes
  return path
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}

/**
 * Calculate total download size (if sizes are known)
 * @param {Array} downloads - Array of download items with optional size property
 * @returns {number} Total size in bytes, or 0 if unknown
 */
function calculateTotalSize(downloads) {
  var total = 0;
  downloads.forEach(function(d) {
    if (d.size && typeof d.size === 'number') {
      total += d.size;
    }
  });
  return total;
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted string like "1.5 MB"
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  var k = 1024;
  var sizes = ['B', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Export for use in other modules
window.DownloadManager = {
  downloadSingle: downloadSingle,
  downloadSequential: downloadSequential,
  downloadParallel: downloadParallel,
  getProgress: getDownloadProgress,
  resetState: resetDownloadState,
  buildFilePath: buildFilePath,
  sanitizeDirectoryPath: sanitizeDirectoryPath,
  calculateTotalSize: calculateTotalSize,
  formatBytes: formatBytes
};
