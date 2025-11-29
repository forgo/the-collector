# Implementation Plan: Advanced Filter/Select and Batch Edit Features

## Overview

This plan covers the implementation of:
1. **Advanced Filter & Selection System** - Filter button with name/type/extension/size criteria
2. **Batch Rename System** - Rename items by group or selection with templates
3. **Improved Filename Template Help** - Expandable documentation in modals and settings
4. **Unknown/Ambiguous Item Handling** - Special grouping for unrecognized formats
5. **Enhanced Metadata Tracking** - Original vs. customized names, file type detection

---

## Phase 1: Data Model Enhancements

### 1.1 Enhanced Metadata Structure

Extend `imageMeta[url]` to track:

```javascript
imageMeta[url] = {
  // Existing
  width: number,
  height: number,
  type: string,           // File extension (e.g., "jpg")
  filename: string,       // Current display filename
  customFilename: string, // User-edited name

  // New fields
  originalFilename: string,  // Original extracted name (never modified)
  mediaType: string,         // 'image' | 'video' | 'audio' | 'document' | 'unknown'
  mimeType: string,          // Actual MIME type if known (from HEAD request or file)
  fileTypeVerified: boolean, // true if verified via HEAD request
  ambiguous: boolean,        // true if extension doesn't match detected type
  source: string,            // 'content-script' | 'external-drop' | 'file-drop'
  batchRenamed: boolean,     // true if renamed via batch operation
}
```

### 1.2 New "Unknown" Section

Add alongside "Ungrouped":
- Items where `mediaType === 'unknown'` or `ambiguous === true`
- Visual differentiation with warning indicator
- Option to "Categorize" (assign mediaType/extension manually)

**Files to modify:**
- `popup.js` - Add Unknown section rendering
- `popup.html` - Add Unknown section HTML
- `styles/groups.css` - Add Unknown section styles
- `src/shared/constants.js` - Add MEDIA_TYPES constant

---

## Phase 2: Advanced Filter Modal

### 2.1 Filter Modal UI

New modal triggered by filter button in selection controls:

```html
<div class="filter-modal" id="filter-modal">
  <div class="filter-dialog">
    <h4>Filter & Select</h4>

    <!-- Name Filters -->
    <div class="filter-section">
      <h5>Filename</h5>
      <select id="filter-name-mode">
        <option value="contains">Contains</option>
        <option value="starts">Starts with</option>
        <option value="ends">Ends with</option>
        <option value="regex">Regex</option>
      </select>
      <input type="text" id="filter-name-value" placeholder="Enter pattern...">
    </div>

    <!-- Media Type Filters -->
    <div class="filter-section">
      <h5>Media Type</h5>
      <div class="checkbox-grid">
        <label><input type="checkbox" value="image" checked> Images</label>
        <label><input type="checkbox" value="video"> Videos</label>
        <label><input type="checkbox" value="audio"> Audio</label>
        <label><input type="checkbox" value="document"> Documents</label>
        <label><input type="checkbox" value="unknown"> Unknown</label>
      </div>
    </div>

    <!-- File Type Filters -->
    <div class="filter-section">
      <h5>File Extension</h5>
      <div class="checkbox-grid" id="filter-extensions">
        <!-- Dynamically populated based on collected items -->
      </div>
      <input type="text" id="filter-custom-ext" placeholder="Custom: .heic, .raw">
    </div>

    <!-- Size Filters (for images) -->
    <div class="filter-section">
      <h5>Dimensions (pixels)</h5>
      <div class="dimension-inputs">
        <label>Width: <input type="number" id="filter-min-width" placeholder="min"> - <input type="number" id="filter-max-width" placeholder="max"></label>
        <label>Height: <input type="number" id="filter-min-height" placeholder="min"> - <input type="number" id="filter-max-height" placeholder="max"></label>
      </div>
    </div>

    <!-- Actions -->
    <div class="filter-actions">
      <button id="filter-select">Select Matching</button>
      <button id="filter-deselect">Deselect Matching</button>
      <button id="filter-clear">Clear Filters</button>
    </div>

    <div class="filter-preview">
      <span id="filter-match-count">0</span> items match
    </div>
  </div>
</div>
```

### 2.2 Filter Logic Module

New file: `src/ui/filter.js`

```javascript
window.FilterUtils = {
  // Build filter criteria object from modal inputs
  buildFilterCriteria(),

  // Apply criteria to all items, return matching URLs
  getMatchingUrls(criteria, imageURLs, imageMeta),

  // Individual matchers
  matchesName(filename, mode, pattern),
  matchesMediaType(mediaType, allowedTypes),
  matchesExtension(extension, allowedExtensions),
  matchesDimensions(width, height, constraints),

  // Get unique extensions from current collection
  getUniqueExtensions(imageURLs, imageMeta),
};
```

**Files to create:**
- `src/ui/filter.js`
- `styles/filter.css`

**Files to modify:**
- `popup.html` - Add filter modal HTML and filter button
- `popup.js` - Wire up filter modal, add filter button to selection controls

---

## Phase 3: Batch Rename System

### 3.1 Batch Rename Modal

```html
<div class="batch-rename-modal" id="batch-rename-modal">
  <div class="batch-rename-dialog">
    <h4>Batch Rename</h4>
    <p class="batch-rename-scope" id="batch-rename-scope">Renaming 15 items</p>

    <!-- Template Selection -->
    <div class="rename-section">
      <h5>Rename Template</h5>
      <select id="batch-rename-preset">
        <option value="custom">Custom template</option>
        <option value="sequential">Sequential ({index})</option>
        <option value="date-index">Date + Index ({date}_{index})</option>
        <option value="group-index">Group + Index ({group}_{index})</option>
        <option value="clean-url">Clean from URL</option>
        <option value="lowercase">Lowercase original</option>
        <option value="sanitize">Sanitize special chars</option>
      </select>

      <input type="text" id="batch-rename-template" value="{name}"
             placeholder="e.g., {group}_{date}_{index}">
    </div>

    <!-- Template Help (expandable) -->
    <details class="template-help">
      <summary>Template tokens reference</summary>
      <div class="help-content">
        <table class="token-table">
          <tr><th>Token</th><th>Description</th><th>Example</th></tr>
          <tr><td>{name}</td><td>Original filename (without extension)</td><td>landscape</td></tr>
          <tr><td>{index}</td><td>Sequential number</td><td>1, 2, 3...</td></tr>
          <tr><td>{group}</td><td>Group name</td><td>Vacation</td></tr>
          <tr><td>{date}</td><td>Current date</td><td>2024-01-15</td></tr>
          <tr><td>{time}</td><td>Current time</td><td>14-30-45</td></tr>
          <tr><td>{YYYY}</td><td>4-digit year</td><td>2024</td></tr>
          <tr><td>{MM}</td><td>2-digit month</td><td>01</td></tr>
          <tr><td>{DD}</td><td>2-digit day</td><td>15</td></tr>
          <!-- etc. -->
        </table>
      </div>
    </details>

    <!-- Preview -->
    <div class="rename-preview">
      <h5>Preview</h5>
      <div class="preview-list" id="batch-rename-preview">
        <!-- Shows before → after for first N items -->
      </div>
    </div>

    <!-- Actions -->
    <div class="rename-actions">
      <button id="batch-rename-cancel" class="btn-secondary">Cancel</button>
      <button id="batch-rename-apply" class="btn-primary">Apply to {name}</button>
    </div>
  </div>
</div>
```

### 3.2 Batch Rename Logic

New file: `src/ui/batch-rename.js`

```javascript
window.BatchRename = {
  // Show modal for selection or group
  showBatchRenameModal(urls, groupId = null),

  // Apply preset to template input
  applyPreset(presetId),

  // Generate preview of renames
  generatePreview(urls, template, imageMeta),

  // Apply renames to all items
  applyBatchRename(urls, template, imageMeta),

  // Preset implementations
  presets: {
    sequential: (index) => String(index + 1),
    'date-index': (index, meta) => `${formatDate()}_{index + 1}`,
    'group-index': (index, meta, groupName) => `${groupName}_{index + 1}`,
    'clean-url': (url) => cleanFilenameFromUrl(url),
    lowercase: (name) => name.toLowerCase(),
    sanitize: (name) => sanitizeFilename(name),
  }
};
```

**Entry points:**
- From group header menu: "Batch rename group"
- From selection bar: "Batch rename selected"

**Files to create:**
- `src/ui/batch-rename.js`
- `styles/batch-rename.css`

**Files to modify:**
- `popup.html` - Add modal HTML
- `popup.js` - Wire up modal and entry points
- Group header - Add "Batch rename" action button

---

## Phase 4: Enhanced Template Help

### 4.1 Settings Panel Enhancement

Add expandable `<details>` to the Filename Template setting:

```html
<div class="setting-item">
  <div class="setting-label-row">
    <label for="filename-template">Filename Template</label>
  </div>
  <input type="text" id="filename-template" value="{name}">

  <details class="template-help">
    <summary>Available tokens</summary>
    <div class="help-content">
      <!-- Same table as batch rename modal -->
    </div>
  </details>
</div>
```

### 4.2 Shared Help Component

Extract template help into reusable partial:
- Create `src/ui/template-help.js` with `renderTemplateHelp()` function
- Use in both settings panel and batch rename modal

---

## Phase 5: Unknown Item Handling

### 5.1 HEAD Request Enhancement

When items are added (especially external drops), optionally perform HEAD request:

```javascript
async function verifyItemType(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return {
      mimeType: contentType,
      verified: true,
      ambiguous: !extensionMatchesMime(getExtension(url), contentType)
    };
  } catch (e) {
    return { verified: false, ambiguous: true };
  }
}
```

### 5.2 Unknown Section UI

- Render after groups but before ungrouped
- Yellow/warning styling
- Per-item actions: "Set type..." dropdown
- Batch action: "Categorize all as..."

### 5.3 Categorization Modal

When user clicks "Set type" on unknown item:

```html
<div class="categorize-modal">
  <h4>Categorize Item</h4>
  <div class="categorize-options">
    <label><input type="radio" name="cat-type" value="image"> Image</label>
    <label><input type="radio" name="cat-type" value="video"> Video</label>
    <!-- etc. -->
  </div>
  <div class="extension-override">
    <label>File extension: <input type="text" placeholder=".jpg"></label>
  </div>
</div>
```

---

## Phase 6: Testing

### 6.1 New Test Files

- `tests/unit/filter.test.js` - Filter criteria matching
- `tests/unit/batch-rename.test.js` - Batch rename logic
- `tests/unit/metadata.test.js` - Enhanced metadata handling

### 6.2 Test Cases

**Filter tests:**
- Name matching (contains, starts, ends, regex)
- Media type filtering
- Extension filtering
- Dimension range filtering
- Combined criteria

**Batch rename tests:**
- Template application
- Preset functions
- Sequential numbering
- Name collision handling
- Original name preservation

---

## Implementation Order

### Sprint 1: Foundation
1. Enhance data model (imageMeta structure)
2. Add `originalFilename` tracking on item creation
3. Add filter button UI placeholder
4. Create filter modal HTML/CSS

### Sprint 2: Filter System
5. Implement filter.js module
6. Wire up filter modal functionality
7. Add filter tests

### Sprint 3: Batch Rename
8. Create batch rename modal HTML/CSS
9. Implement batch-rename.js module
10. Add entry points (group menu, selection bar)
11. Add batch rename tests

### Sprint 4: Polish
12. Enhanced template help (details/summary)
13. Unknown section implementation
14. HEAD request verification (optional feature)
15. Integration testing

---

## File Summary

**New files:**
- `src/ui/filter.js`
- `src/ui/batch-rename.js`
- `src/ui/template-help.js`
- `styles/filter.css`
- `styles/batch-rename.css`
- `tests/unit/filter.test.js`
- `tests/unit/batch-rename.test.js`

**Modified files:**
- `popup.html` - Add modals, filter button, template help
- `popup.js` - Wire up new features, enhance metadata tracking
- `src/shared/constants.js` - Add MEDIA_TYPES
- `src/downloads/filename-utils.js` - Export more utilities for batch rename
- `styles/groups.css` - Unknown section styles

---

## Questions for Clarification

1. **HEAD requests**: Should type verification via HEAD be automatic or opt-in? (Performance vs. accuracy tradeoff)

2. **Filter persistence**: Should filter criteria be saved/remembered between sessions?

3. **Batch rename scope**: For "selected across groups", should indexing be global (1-100) or restart per group?

4. **Unknown grouping priority**: Should ambiguous items always go to Unknown, or only when explicitly unrecognizable?
