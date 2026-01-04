# Changelog

All notable changes to The Collector will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2025-01-04

Complete rewrite with modern tooling and cross-browser support.

### Added

- **Gallery Mode** - Full-window slideshow viewer with keyboard navigation
  - Slideshow controls with configurable interval (1-10s)
  - Transition effects (fade, slide, zoom)
  - Accessible from header (all images) or per-group
- **Cross-Browser Support**
  - Chrome/Edge with Manifest V3
  - Firefox with Manifest V2
- **Modern Architecture**
  - WXT framework with hot reload development
  - React 19 + TypeScript 5.9
  - Radix UI primitives for accessible components
  - CSS Modules for scoped styling
- **Image Collection**
  - Hover buttons on webpage images
  - Drag & drop from external sources
  - Paste images from clipboard
- **Organization**
  - Color-coded groups with custom names
  - Drag-and-drop reordering within and between groups
  - Custom download paths per group
- **Batch Downloading**
  - Download preview with tree structure visualization
  - Filename templates with tokens ({date}, {index}, {group}, etc.)
  - Conflict detection for duplicate filenames
  - Progress tracking
- **Customization**
  - 7 built-in themes (Default Light, GitHub Light, Dark, Dracula, Nord, Solarized Dark, Monokai)
  - Grid and list view modes
  - Adjustable thumbnail sizes
  - UI scale and density options
- **Developer Experience**
  - Unit test suite with Vitest
  - ESLint and Prettier configuration
  - GitHub Actions CI/CD workflows
  - Chrome Web Store and Firefox Add-ons publishing automation

### Changed

- Complete codebase rewrite from vanilla JS to React + TypeScript
- Migrated from custom build system to WXT framework
- Updated minimum browser versions (Chrome 88+, Firefox 109+)

### Security

- Strict Content Security Policy
- No remote code execution
- All data stored locally
