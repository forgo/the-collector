// groups/group-manager.js
// Group management: creation, deletion, updates, and queries

/**
 * Generate a unique group ID
 * @returns {string} Unique group ID in format 'group_timestamp_random'
 */
function generateGroupId() {
  return 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Find which group a URL belongs to
 * @param {string} url - The URL to look up
 * @param {Array} groups - Array of group objects
 * @returns {object|undefined} The group containing the URL, or undefined
 */
function getGroupForUrl(url, groups) {
  if (!groups || !Array.isArray(groups)) return undefined;
  return groups.find(function(g) {
    return g.urls && g.urls.includes(url);
  });
}

/**
 * Get all URLs that don't belong to any group
 * @param {Array} imageURLs - All image URLs
 * @param {Array} groups - Array of group objects
 * @returns {Array} URLs not in any group
 */
function getUngroupedUrls(imageURLs, groups) {
  if (!imageURLs) return [];
  if (!groups || groups.length === 0) return imageURLs.slice();

  var groupedUrls = new Set();
  groups.forEach(function(g) {
    if (g.urls) {
      g.urls.forEach(function(url) {
        groupedUrls.add(url);
      });
    }
  });

  return imageURLs.filter(function(url) {
    return !groupedUrls.has(url);
  });
}

/**
 * Create a new group object
 * @param {string} name - Group name
 * @param {Array} urls - URLs to include in the group
 * @param {number} colorIndex - Index into GROUP_COLORS array
 * @returns {object} New group object
 */
function createGroup(name, urls, colorIndex) {
  var GROUP_COLORS = window.Constants ? window.Constants.GROUP_COLORS :
    ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9c27b0'];

  return {
    id: generateGroupId(),
    name: name || 'New Group',
    directory: '',
    color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
    urls: urls || []
  };
}

/**
 * Remove URLs from all groups except the target
 * @param {Array} groups - Array of group objects (mutated)
 * @param {Set|Array} urls - URLs to remove
 * @param {string} [exceptGroupId] - Group ID to exclude from removal
 */
function removeUrlsFromGroups(groups, urls, exceptGroupId) {
  var urlSet = urls instanceof Set ? urls : new Set(urls);

  groups.forEach(function(g) {
    if (g.id !== exceptGroupId) {
      g.urls = g.urls.filter(function(u) {
        return !urlSet.has(u);
      });
    }
  });
}

/**
 * Add URLs to a specific group
 * @param {object} group - Target group object (mutated)
 * @param {Set|Array} urls - URLs to add
 */
function addUrlsToGroup(group, urls) {
  if (!group || !group.urls) return;

  var urlsToAdd = urls instanceof Set ? Array.from(urls) : urls;

  urlsToAdd.forEach(function(url) {
    if (group.urls.indexOf(url) === -1) {
      group.urls.push(url);
    }
  });
}

/**
 * Delete a group by ID
 * @param {Array} groups - Array of group objects
 * @param {string} groupId - ID of group to delete
 * @returns {Array} New array without the deleted group
 */
function deleteGroup(groups, groupId) {
  return groups.filter(function(g) {
    return g.id !== groupId;
  });
}

/**
 * Update a group's properties
 * @param {Array} groups - Array of group objects
 * @param {string} groupId - ID of group to update
 * @param {object} updates - Properties to update
 * @returns {object|null} Updated group or null if not found
 */
function updateGroup(groups, groupId, updates) {
  var group = groups.find(function(g) {
    return g.id === groupId;
  });

  if (group) {
    Object.assign(group, updates);
    return group;
  }
  return null;
}

/**
 * Find a group by ID
 * @param {Array} groups - Array of group objects
 * @param {string} groupId - ID to find
 * @returns {object|undefined} The group or undefined
 */
function findGroupById(groups, groupId) {
  return groups.find(function(g) {
    return g.id === groupId;
  });
}

/**
 * Get all URLs that belong to a specific group
 * @param {Array} groups - Array of group objects
 * @param {string} groupId - ID of group
 * @returns {Array} URLs in the group, or empty array
 */
function getGroupUrls(groups, groupId) {
  var group = findGroupById(groups, groupId);
  return group ? group.urls.slice() : [];
}

/**
 * Clean up groups by removing URLs that no longer exist
 * @param {Array} groups - Array of group objects (mutated)
 * @param {Array} validUrls - Array of valid URLs to keep
 */
function cleanupGroups(groups, validUrls) {
  var validSet = new Set(validUrls);

  groups.forEach(function(g) {
    g.urls = g.urls.filter(function(url) {
      return validSet.has(url);
    });
  });
}

/**
 * Get counts for group summary
 * @param {Array} groups - Array of group objects
 * @param {Array} imageURLs - All image URLs
 * @returns {{grouped: number, ungrouped: number, total: number}}
 */
function getGroupCounts(groups, imageURLs) {
  var ungrouped = getUngroupedUrls(imageURLs, groups);
  var grouped = imageURLs.length - ungrouped.length;

  return {
    grouped: grouped,
    ungrouped: ungrouped.length,
    total: imageURLs.length
  };
}

// Export for use in other modules
window.GroupManager = {
  generateGroupId: generateGroupId,
  getGroupForUrl: getGroupForUrl,
  getUngroupedUrls: getUngroupedUrls,
  createGroup: createGroup,
  removeUrlsFromGroups: removeUrlsFromGroups,
  addUrlsToGroup: addUrlsToGroup,
  deleteGroup: deleteGroup,
  updateGroup: updateGroup,
  findGroupById: findGroupById,
  getGroupUrls: getGroupUrls,
  cleanupGroups: cleanupGroups,
  getGroupCounts: getGroupCounts
};
