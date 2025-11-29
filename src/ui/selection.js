// ui/selection.js
// Selection management utilities and helpers

/**
 * Update DOM elements for a single selection change
 * @param {string} url - The URL whose selection changed
 * @param {boolean} selected - Whether it's now selected
 */
function updateSelectionDOM(url, selected) {
  var items = document.querySelectorAll('.image-item[data-url="' + CSS.escape(url) + '"]');
  items.forEach(function(item) {
    item.classList.toggle('selected', selected);
    var checkbox = item.querySelector('.item-checkbox');
    if (checkbox) {
      checkbox.checked = selected;
    }
  });
}

/**
 * Update DOM elements for bulk selection changes
 * More efficient than calling updateSelectionDOM for each URL
 * @param {Array|Set} urls - URLs that changed
 * @param {boolean} selected - Whether they're now selected
 */
function updateSelectionDOMBulk(urls, selected) {
  var urlSet = urls instanceof Set ? urls : new Set(urls);

  document.querySelectorAll('.image-item').forEach(function(item) {
    var itemUrl = item.dataset.url;
    if (urlSet.has(itemUrl)) {
      item.classList.toggle('selected', selected);
      var checkbox = item.querySelector('.item-checkbox');
      if (checkbox) {
        checkbox.checked = selected;
      }
    }
  });
}

/**
 * Clear all selection styling from DOM
 */
function clearSelectionDOM() {
  document.querySelectorAll('.image-item.selected').forEach(function(item) {
    item.classList.remove('selected');
    var checkbox = item.querySelector('.item-checkbox');
    if (checkbox) {
      checkbox.checked = false;
    }
  });
}

/**
 * Get count of selected URLs in a specific group
 * @param {Set} selectedUrls - Set of selected URLs
 * @param {Array} groupUrls - URLs in the group
 * @returns {number} Count of selected URLs in the group
 */
function getSelectedCountInGroup(selectedUrls, groupUrls) {
  if (!groupUrls || groupUrls.length === 0) return 0;

  var count = 0;
  groupUrls.forEach(function(url) {
    if (selectedUrls.has(url)) count++;
  });
  return count;
}

/**
 * Check if all URLs in a group are selected
 * @param {Set} selectedUrls - Set of selected URLs
 * @param {Array} groupUrls - URLs in the group
 * @returns {boolean} True if all group URLs are selected
 */
function isGroupFullySelected(selectedUrls, groupUrls) {
  if (!groupUrls || groupUrls.length === 0) return false;
  return groupUrls.every(function(url) {
    return selectedUrls.has(url);
  });
}

/**
 * Check if any URLs in a group are selected
 * @param {Set} selectedUrls - Set of selected URLs
 * @param {Array} groupUrls - URLs in the group
 * @returns {boolean} True if any group URLs are selected
 */
function isGroupPartiallySelected(selectedUrls, groupUrls) {
  if (!groupUrls || groupUrls.length === 0) return false;
  return groupUrls.some(function(url) {
    return selectedUrls.has(url);
  });
}

/**
 * Get selection state summary for UI updates
 * @param {Set} selectedUrls - Set of selected URLs
 * @param {Array} allUrls - All available URLs
 * @returns {{count: number, total: number, allSelected: boolean, noneSelected: boolean}}
 */
function getSelectionSummary(selectedUrls, allUrls) {
  var count = selectedUrls.size;
  var total = allUrls ? allUrls.length : 0;

  return {
    count: count,
    total: total,
    allSelected: total > 0 && count === total,
    noneSelected: count === 0
  };
}

/**
 * Update button states based on selection
 * @param {HTMLElement} selectAllBtn - Select all button
 * @param {HTMLElement} deselectBtn - Deselect button
 * @param {number} totalCount - Total items available
 * @param {number} selectedCount - Currently selected count
 */
function updateSelectionButtons(selectAllBtn, deselectBtn, totalCount, selectedCount) {
  var isEmpty = totalCount === 0;
  var allSelected = totalCount > 0 && selectedCount === totalCount;
  var noneSelected = selectedCount === 0;

  if (selectAllBtn) {
    selectAllBtn.disabled = isEmpty || allSelected;
    selectAllBtn.title = isEmpty ? 'No images to select' :
      (allSelected ? 'All images already selected' : 'Select all images');
  }

  if (deselectBtn) {
    deselectBtn.disabled = noneSelected;
    deselectBtn.title = noneSelected ? 'No images selected' : 'Deselect all images';
  }
}

/**
 * Filter URLs to get only those that are selected
 * @param {Set} selectedUrls - Set of selected URLs
 * @param {Array} urls - URLs to filter
 * @returns {Array} Only the URLs that are selected
 */
function getSelectedFromList(selectedUrls, urls) {
  if (!urls) return [];
  return urls.filter(function(url) {
    return selectedUrls.has(url);
  });
}

// Export for use in other modules
window.SelectionUtils = {
  updateSelectionDOM: updateSelectionDOM,
  updateSelectionDOMBulk: updateSelectionDOMBulk,
  clearSelectionDOM: clearSelectionDOM,
  getSelectedCountInGroup: getSelectedCountInGroup,
  isGroupFullySelected: isGroupFullySelected,
  isGroupPartiallySelected: isGroupPartiallySelected,
  getSelectionSummary: getSelectionSummary,
  updateSelectionButtons: updateSelectionButtons,
  getSelectedFromList: getSelectedFromList
};
