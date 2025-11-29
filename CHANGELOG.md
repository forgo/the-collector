# Changelog

All notable changes to Image Explorer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Integration tests for download flows
- Firefox browser support

### Changed
- Performance optimizations for large image collections

## [1.1.0] - 2024-11-29

### Added
- Unit test suite with Vitest (174 tests)
- Chrome API mocks for testing
- README.md documentation
- CHANGELOG.md

### Changed
- Migrated from Manifest V2 to V3
- Extracted CSS from popup.html to external stylesheets
- Refactored popup.js into modular architecture:
  - `src/popup/state.js` - State management
  - `src/downloads/` - Download manager, filename utils, tree builder
  - `src/shared/` - Icons, storage utils, URL utils
  - `src/settings/` - Settings and theme management
- Background script converted to service worker

### Fixed
- Download conflict detection for duplicate filenames
- Theme persistence across sessions

## [1.0.0] - 2024-11-28

### Added
- Initial release
- Image collection from web pages via content script
- Group management with custom names and colors
- Batch downloading with progress tracking
- Filename templates with date/index tokens
- Download preview with tree structure visualization
- 5 built-in themes (dark, light, dracula, nord, solarized)
- Grid and list view modes
- Drag-and-drop image reordering
- Drag-and-drop between groups
- Custom download paths per group
- Image preview modal with zoom
- Selection management (individual, group, global)
- Minimum image size filtering
- Thumbnail size customization
- Keyboard shortcuts for common actions
