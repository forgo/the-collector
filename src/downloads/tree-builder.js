// downloads/tree-builder.js
// Download tree structure building and conflict detection

/**
 * Detect filename conflicts in a list of downloads
 * @param {Array} downloads - Array of download objects with {directory, filename, url}
 * @param {boolean} [autoRenameDefault=true] - Default auto-rename setting for conflicts
 * @returns {Array} Downloads with hasConflict and willRename properties added
 */
function detectConflicts(downloads, autoRenameDefault) {
  if (!downloads || downloads.length === 0) return [];

  autoRenameDefault = autoRenameDefault !== false;

  // Count occurrences of each full path
  var pathCounts = {};
  downloads.forEach(function(d) {
    var fullPath = d.directory ? d.directory + '/' + d.filename : d.filename;
    pathCounts[fullPath] = (pathCounts[fullPath] || 0) + 1;
  });

  // Mark conflicts
  return downloads.map(function(d) {
    var fullPath = d.directory ? d.directory + '/' + d.filename : d.filename;
    var hasConflict = pathCounts[fullPath] > 1;

    return {
      directory: d.directory,
      filename: d.filename,
      url: d.url,
      group: d.group,
      hasConflict: hasConflict,
      // Preserve existing willRename if set, otherwise use default
      willRename: d.willRename !== undefined ? d.willRename : (hasConflict ? autoRenameDefault : true)
    };
  });
}

/**
 * Build a tree structure from downloads for display
 * Groups downloads by directory
 * @param {Array} downloads - Array of download objects
 * @returns {Object} Tree structure: { directory: [{filename, hasConflict, url, index, willRename}] }
 */
function buildTreeStructure(downloads) {
  if (!downloads) return {};

  var tree = {};

  downloads.forEach(function(d, index) {
    var dir = d.directory || '(root)';
    if (!tree[dir]) {
      tree[dir] = [];
    }
    tree[dir].push({
      filename: d.filename,
      hasConflict: d.hasConflict || false,
      url: d.url,
      index: index,
      willRename: d.willRename !== false
    });
  });

  return tree;
}

/**
 * Get sorted directory names from a tree structure
 * @param {Object} tree - Tree structure from buildTreeStructure
 * @returns {Array} Sorted directory names
 */
function getSortedDirectories(tree) {
  return Object.keys(tree).sort();
}

/**
 * Count total files and conflicts in a tree
 * @param {Object} tree - Tree structure from buildTreeStructure
 * @returns {{total: number, conflicts: number, willOverwrite: number}}
 */
function getTreeStats(tree) {
  var total = 0;
  var conflicts = 0;
  var willOverwrite = 0;

  Object.keys(tree).forEach(function(dir) {
    tree[dir].forEach(function(file) {
      total++;
      if (file.hasConflict) {
        conflicts++;
        if (!file.willRename) {
          willOverwrite++;
        }
      }
    });
  });

  return {
    total: total,
    conflicts: conflicts,
    willOverwrite: willOverwrite
  };
}

/**
 * Check if any downloads have conflicts set to overwrite
 * @param {Array} downloads - Array of download objects
 * @returns {boolean} True if any conflicts will overwrite
 */
function hasOverwriteConflicts(downloads) {
  if (!downloads) return false;

  return downloads.some(function(d) {
    return d.hasConflict && d.willRename === false;
  });
}

/**
 * Check if any downloads have conflicts at all
 * @param {Array} downloads - Array of download objects
 * @returns {boolean} True if any downloads have conflicts
 */
function hasAnyConflicts(downloads) {
  if (!downloads) return false;

  return downloads.some(function(d) {
    return d.hasConflict;
  });
}

/**
 * Get all unique directories from downloads
 * @param {Array} downloads - Array of download objects
 * @returns {Array} Unique directory names
 */
function getUniqueDirectories(downloads) {
  if (!downloads) return [];

  var dirs = new Set();
  downloads.forEach(function(d) {
    if (d.directory) {
      dirs.add(d.directory);
    }
  });

  return Array.from(dirs).sort();
}

/**
 * Group downloads by their directory
 * @param {Array} downloads - Array of download objects
 * @returns {Object} Downloads grouped by directory
 */
function groupByDirectory(downloads) {
  if (!downloads) return {};

  var grouped = {};
  downloads.forEach(function(d) {
    var dir = d.directory || '';
    if (!grouped[dir]) {
      grouped[dir] = [];
    }
    grouped[dir].push(d);
  });

  return grouped;
}

/**
 * Split a filename into name and extension
 * @param {string} filename - Full filename
 * @returns {{name: string, extension: string}}
 */
function splitFilename(filename) {
  if (!filename) return { name: '', extension: '' };

  var match = filename.match(/^(.+?)(\.[^.]+)$/);
  if (match) {
    return { name: match[1], extension: match[2] };
  }
  return { name: filename, extension: '' };
}

// Export for use in other modules
window.TreeBuilder = {
  detectConflicts: detectConflicts,
  buildTreeStructure: buildTreeStructure,
  getSortedDirectories: getSortedDirectories,
  getTreeStats: getTreeStats,
  hasOverwriteConflicts: hasOverwriteConflicts,
  hasAnyConflicts: hasAnyConflicts,
  getUniqueDirectories: getUniqueDirectories,
  groupByDirectory: groupByDirectory,
  splitFilename: splitFilename
};
