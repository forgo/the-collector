// shared/constants.js
// Centralized constants for the Image Explorer extension

/**
 * Supported image file extensions
 * @type {string[]}
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

/**
 * Group colors for visual distinction
 * @type {string[]}
 */
const GROUP_COLORS = [
  '#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9c27b0',
  '#00acc1', '#ff7043', '#8bc34a', '#e91e63', '#3f51b5'
];

/**
 * Default settings for the extension
 * @type {object}
 */
const DEFAULT_SETTINGS = {
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
};

/**
 * Valid UI scale options
 * @type {string[]}
 */
const VALID_UI_SCALES = ['small', 'medium', 'large'];

/**
 * Valid density options
 * @type {string[]}
 */
const VALID_DENSITIES = ['compact', 'comfortable', 'spacious'];

// Export for use in other modules
window.Constants = {
  IMAGE_EXTENSIONS: IMAGE_EXTENSIONS,
  GROUP_COLORS: GROUP_COLORS,
  DEFAULT_SETTINGS: DEFAULT_SETTINGS,
  VALID_UI_SCALES: VALID_UI_SCALES,
  VALID_DENSITIES: VALID_DENSITIES
};
