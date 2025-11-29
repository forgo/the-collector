# The Collector Extension - Refactoring & Audit Prompt

## Project Overview

**Extension Name:** The Collector
**Current Version:** 1.0
**Manifest Version:** 2 (requires migration to v3)
**Primary Purpose:** Browser extension for collecting, organizing, and batch-downloading images from web pages

---

## Current State Assessment

### File Size Analysis

| File            | Lines   | Status                                                 |
| --------------- | ------- | ------------------------------------------------------ |
| `popup.js`      | ~5,000+ | 🔴 Critical - Monolithic, immediate refactoring needed |
| `popup.html`    | ~3,000  | 🟡 Large but acceptable - CSS could be extracted       |
| `content.js`    | ~470    | 🟢 Well-structured, good encapsulation                 |
| `background.js` | ~70     | 🟢 Minimal and focused                                 |
| `icons.js`      | ~260    | 🟢 Clean utility module with JSDoc                     |

### What Works Well

- Comprehensive theming system (5 built-in themes, 50+ CSS variables)
- Modular icon system with Heroicons integration
- Clean background.js with single responsibility
- Content script with IIFE encapsulation
- Functional group management and download system
- Responsive UI with list/grid views

### What Needs Improvement

- `popup.js` is a 5,000+ line monolith handling UI, state, downloads, themes, and settings
- Manifest v2 is deprecated (Chrome requires v3 for new submissions)
- No automated tests
- No README or CHANGELOG
- Inconsistent async patterns (callbacks vs promises vs async/await)
- Limited error handling
- CSS embedded in HTML (3,000 lines in popup.html)

---

## Refactoring Plan

### Phase 1: Code Modularization (Priority: HIGH)

**Objective:** Break `popup.js` into focused, single-responsibility modules

#### Proposed Module Structure

```
/src
├── /popup
│   ├── popup.js              # Entry point, initialization, event delegation
│   ├── state.js              # State management (selectedUrls, groups, imageURLs, settings)
│   ├── ui/
│   │   ├── render.js         # DOM rendering (renderAll, renderGroups, renderUngrouped)
│   │   ├── modals.js         # Modal dialogs (preview, confirm, directory edit, download preview)
│   │   ├── selection.js      # Selection management (updateSelection, clearAllSelections)
│   │   └── drag-drop.js      # Drag and drop functionality
│   ├── downloads/
│   │   ├── download-manager.js   # Download queue, conflict detection
│   │   ├── filename-utils.js     # Template processing, unique name generation
│   │   └── tree-builder.js       # Download preview tree structure
│   ├── groups/
│   │   ├── group-manager.js      # CRUD operations for groups
│   │   └── group-ui.js           # Group-specific UI components
│   └── settings/
│       ├── settings-manager.js   # Settings load/save/defaults
│       └── theme-manager.js      # Theme application and custom themes
├── /content
│   └── content.js            # Keep as-is (already well-structured)
├── /background
│   └── background.js         # Keep as-is (already minimal)
├── /shared
│   ├── icons.js              # Move existing icons.js here
│   ├── storage-utils.js      # Chrome storage abstractions
│   └── url-utils.js          # URL parsing, validation, image detection
├── /styles
│   ├── variables.css         # CSS custom properties (themes)
│   ├── components.css        # Button, input, modal styles
│   ├── layout.css            # Grid, flex, spacing
│   └── popup.css             # Main stylesheet (imports others)
└── /assets
    └── /icons                # Keep existing structure
```

#### Key Functions to Extract from popup.js

**To `state.js`:**

- `selectedUrls`, `groups`, `imageURLs`, `imageMeta`, `urlMeta`, `settings`
- State initialization and persistence

**To `ui/render.js`:**

- `renderAll()`, `renderGroups()`, `renderUngrouped()`
- `createImageItem()`, `createGroupSection()`
- View mode switching (list/grid)

**To `ui/modals.js`:**

- `showPreviewModal()`, `showConfirmModal()`
- `showDirectoryEditModal()`, `showDownloadPreviewModal()`
- `showAddToGroupModal()`, `showNewGroupModal()`

**To `ui/selection.js`:**

- `updateSelection()`, `updateSelectionBulk()`, `clearAllSelections()`
- `toggleSelection()`, `updateSelectionBar()`
- `selectAllGlobal()`, `selectAllInGroup()`, `deselectAllInGroup()`

**To `ui/drag-drop.js`:**

- `handleDragStart()`, `handleDragEnd()`, `handleDragOver()`
- `createDropGhost()`, `moveGhostToPosition()`
- Drop confirmation modal handling

**To `downloads/download-manager.js`:**

- `startDownload()`, `buildDownloadList()`
- Download queue management
- Progress tracking

**To `downloads/filename-utils.js`:**

- `getFilenameFromUrl()`, `applyFilenameTemplate()`
- `updateFilename()`, unique name generation

**To `downloads/tree-builder.js`:**

- `buildTreeStructure()`, `renderDownloadTree()`
- `detectConflicts()`, conflict resolution UI

**To `groups/group-manager.js`:**

- `createGroupWithName()`, `deleteGroup()`, `updateGroup()`
- `saveGroups()`, `getGroupForUrl()`, `getUngroupedUrls()`

**To `settings/theme-manager.js`:**

- `THEME_PRESETS`, `applyTheme()`, `validateCustomTheme()`
- CSS variable application

**To `settings/settings-manager.js`:**

- `loadSettings()`, `saveSettings()`, `DEFAULT_SETTINGS`
- Settings UI bindings

---

### Phase 2: Manifest V3 Migration (Priority: HIGH)

**Objective:** Update to Manifest V3 for Chrome Web Store compatibility

#### Changes Required

```json
// manifest.json updates
{
  "manifest_version": 3,
  "action": {                    // Replaces "browser_action"
    "default_popup": "popup.html",
    "default_icon": { ... }
  },
  "background": {
    "service_worker": "background.js"  // Replaces "scripts" array
  },
  "host_permissions": ["<all_urls>"],  // Moved from "permissions"
  "permissions": ["storage", "activeTab", "tabs", "downloads"]
}
```

#### Code Changes for V3

- Convert background.js to service worker pattern
- Replace `chrome.browserAction` with `chrome.action`
- Ensure no persistent background page assumptions
- Update any deprecated API calls

---

### Phase 3: CSS Extraction (Priority: MEDIUM)

**Objective:** Extract inline CSS from popup.html to external stylesheets

#### Benefits

- Easier maintenance and theming
- Better caching
- Cleaner HTML structure
- Potential for CSS preprocessing (future)

#### Implementation

1. Create `/styles` directory
2. Extract CSS custom properties to `variables.css`
3. Group component styles into logical files
4. Use `@import` or concatenate for production
5. Update popup.html to link external stylesheet

---

### Phase 4: Testing Infrastructure (Priority: MEDIUM)

**Objective:** Establish automated testing for core functionality

#### Recommended Setup

```
/tests
├── setup.js                    # Test environment setup, Chrome API mocks
├── /unit
│   ├── filename-utils.test.js  # Template processing, URL parsing
│   ├── tree-builder.test.js    # Download tree structure
│   ├── state.test.js           # State management
│   └── url-utils.test.js       # URL validation, image detection
├── /integration
│   ├── download-flow.test.js   # End-to-end download process
│   └── group-management.test.js # Group CRUD operations
└── /mocks
    └── chrome-api.js           # Mock chrome.storage, chrome.downloads, etc.
```

#### Testing Priorities (by value/effort ratio)

1. **filename-utils.js** - Pure functions, easy to test, high bug risk
2. **url-utils.js** - Pure functions, critical for functionality
3. **tree-builder.js** - Complex logic, deterministic output
4. **state management** - Core to application, regression-prone

#### Tools

- **Vitest** - Test runner with good async and ECMAScript module support
- **Manual mocks** - For Chrome APIs (avoid sinon dependency)

---

### Phase 5: Documentation (Priority: MEDIUM)

**Objective:** Create comprehensive documentation for users and developers

#### README.md Structure

```markdown
# The Collector

> Browser extension for collecting, organizing, and batch-downloading images

## Features

- Collect images from any webpage with one click
- Organize into color-coded groups
- Batch download with custom folder structure
- Filename templates with date/index tokens
- Multiple themes (dark, light, dracula, nord, etc.)
- Drag-and-drop reordering

## Installation

### From Source

1. Clone this repository
2. Open chrome://extensions
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder

### From Chrome Web Store

[Link when published]

## Usage

[Screenshots and workflow descriptions]

## Configuration

[Settings explanations]

## Development

[Setup instructions, building, testing]

## Contributing

[Guidelines]

## License

[License info]
```

#### CHANGELOG.md Structure

```markdown
# Changelog

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [1.0.0] - YYYY-MM-DD

### Added

- Initial release
- Image collection from web pages
- Group management with colors
- Batch downloading
- Theme system
```

---

### Phase 6: Code Quality (Priority: ONGOING)

**Objective:** Maintain consistent, high-quality code

#### ESLint Configuration

```json
{
  "env": {
    "browser": true,
    "webextensions": true,
    "es2021": true
  },
  "extends": ["eslint:recommended"],
  "rules": {
    "no-unused-vars": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "eqeqeq": ["error", "always"]
  }
}
```

#### Code Standards

- Use `const` by default, `let` when reassignment needed
- Prefer async/await over callbacks
- Early returns to reduce nesting
- Descriptive function and variable names
- JSDoc comments for public functions
- Maximum function length: ~50 lines (guideline)

---

### Phase 7: Cross-Browser Compatibility (Priority: LOW)

**Objective:** Support Firefox in addition to Chrome

#### Approach

```javascript
// shared/browser-api.js
const browserAPI = typeof browser !== "undefined" ? browser : chrome;
export default browserAPI;
```

#### Considerations

- Firefox uses `browser.*` with Promises
- Chrome uses `chrome.*` with callbacks (or Promises in newer versions)
- Some API differences (e.g., `downloads.download` options)
- Manifest differences for Firefox

---

## Implementation Order

### Immediate (This Sprint)

1. ✅ Feature work complete - ready for refactoring
2. Create `/src` directory structure
3. Extract `state.js` from popup.js
4. Extract `settings/theme-manager.js`

### Short-term (Next 2 Weeks)

5. Extract UI modules (render, modals, selection, drag-drop)
6. Extract download modules
7. Extract group modules
8. Update popup.js to import modules
9. Create README.md

### Medium-term (Next Month)

10. Manifest V3 migration
11. CSS extraction
12. Basic test suite for utilities
13. CHANGELOG.md

### Long-term (Ongoing)

14. Firefox compatibility
15. Expanded test coverage
16. Performance optimization
17. Feature enhancements

---

## Success Metrics

- [ ] No single file exceeds 500 lines
- [ ] All modules have single responsibility
- [ ] 80%+ test coverage on utility functions
- [ ] README with installation and usage instructions
- [ ] Manifest V3 compliant
- [ ] ESLint passes with no errors
- [ ] Works in Chrome and Firefox (stretch goal)

---

## Notes

### Current Patterns to Preserve

- IIFE encapsulation in content.js
- CSS custom properties for theming
- Message passing architecture
- Icon system in icons.js

### Anti-Patterns to Avoid

- Global state pollution
- Inline event handlers in HTML
- Mixing async patterns (pick one: async/await preferred)
- Deep nesting (max 3 levels)
- Magic numbers/strings (use constants)

### Dependencies Policy

- **Core:** Zero runtime dependencies (vanilla JS only)
- **Dev:** Minimal (ESLint, vitest for testing)
- **CDN:** Floating-UI for tooltips (already in use)
