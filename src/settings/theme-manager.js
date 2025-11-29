// settings/theme-manager.js
// Theme management: presets, application, and validation

/**
 * Built-in theme presets
 * @type {Object.<string, {name: string, variables: Object.<string, string>}>}
 */
const THEME_PRESETS = {
  'default': {
    name: 'Default Light',
    variables: {} // Uses CSS defaults
  },
  'dark': {
    name: 'Dark',
    variables: {
      '--color-primary': '#64b5f6',
      '--color-primary-hover': '#42a5f5',
      '--color-primary-light': '#1e3a5f',
      '--color-secondary': '#64b5f6',
      '--color-secondary-hover': '#42a5f5',
      '--bg-body': '#1e1e1e',
      '--bg-header': '#252526',
      '--bg-content': '#1e1e1e',
      '--bg-item': '#2d2d2d',
      '--bg-item-hover': '#3c3c3c',
      '--bg-item-selected': '#264f78',
      '--bg-input': '#3c3c3c',
      '--bg-group-header': '#252526',
      '--text-primary': '#cccccc',
      '--text-secondary': '#9d9d9d',
      '--text-muted': '#6d6d6d',
      '--text-link': '#64b5f6',
      '--border-color': '#3c3c3c',
      '--border-color-focus': '#64b5f6',
      '--border-selection': '#64b5f6',
      '--tab-bg-active': '#1e1e1e',
      '--tab-text': '#9d9d9d',
      '--tab-text-active': '#64b5f6',
      '--tab-border-active': '#64b5f6',
      '--item-border-selected': '#64b5f6'
    }
  },
  'dracula': {
    name: 'Dracula',
    variables: {
      '--color-primary': '#bd93f9',
      '--color-primary-hover': '#a77bdb',
      '--color-primary-light': '#44475a',
      '--color-secondary': '#bd93f9',
      '--color-secondary-hover': '#a77bdb',
      '--color-danger': '#ff5555',
      '--color-danger-hover': '#ff3333',
      '--color-success': '#50fa7b',
      '--color-success-hover': '#3de068',
      '--bg-body': '#282a36',
      '--bg-header': '#21222c',
      '--bg-content': '#282a36',
      '--bg-item': '#44475a',
      '--bg-item-hover': '#545775',
      '--bg-item-selected': '#44475a',
      '--bg-input': '#44475a',
      '--bg-group-header': '#21222c',
      '--text-primary': '#f8f8f2',
      '--text-secondary': '#c0c0c0',
      '--text-muted': '#6272a4',
      '--text-link': '#8be9fd',
      '--border-color': '#44475a',
      '--border-color-focus': '#bd93f9',
      '--border-selection': '#ff79c6',
      '--btn-primary-bg': '#bd93f9',
      '--btn-primary-hover': '#a77bdb',
      '--btn-danger-bg': '#ff5555',
      '--btn-danger-hover': '#ff3333',
      '--btn-success-bg': '#50fa7b',
      '--btn-success-hover': '#3de068',
      '--btn-success-text': '#282a36',
      '--tab-bg-active': '#282a36',
      '--tab-text': '#6272a4',
      '--tab-text-active': '#bd93f9',
      '--tab-border-active': '#bd93f9',
      '--item-border-selected': '#ff79c6'
    }
  },
  'nord': {
    name: 'Nord',
    variables: {
      '--color-primary': '#88c0d0',
      '--color-primary-hover': '#81a1c1',
      '--color-primary-light': '#3b4252',
      '--color-secondary': '#88c0d0',
      '--color-secondary-hover': '#81a1c1',
      '--color-danger': '#bf616a',
      '--color-danger-hover': '#a54e56',
      '--color-success': '#a3be8c',
      '--color-success-hover': '#8fbf6f',
      '--bg-body': '#2e3440',
      '--bg-header': '#3b4252',
      '--bg-content': '#2e3440',
      '--bg-item': '#3b4252',
      '--bg-item-hover': '#434c5e',
      '--bg-item-selected': '#4c566a',
      '--bg-input': '#3b4252',
      '--bg-group-header': '#3b4252',
      '--text-primary': '#eceff4',
      '--text-secondary': '#d8dee9',
      '--text-muted': '#7b88a1',
      '--text-link': '#88c0d0',
      '--border-color': '#4c566a',
      '--border-color-focus': '#88c0d0',
      '--border-selection': '#88c0d0',
      '--btn-primary-bg': '#5e81ac',
      '--btn-primary-hover': '#81a1c1',
      '--btn-danger-bg': '#bf616a',
      '--btn-success-bg': '#a3be8c',
      '--tab-bg-active': '#2e3440',
      '--tab-text': '#7b88a1',
      '--tab-text-active': '#88c0d0',
      '--tab-border-active': '#88c0d0',
      '--item-border-selected': '#88c0d0'
    }
  },
  'solarized-dark': {
    name: 'Solarized Dark',
    variables: {
      '--color-primary': '#268bd2',
      '--color-primary-hover': '#1e6fa8',
      '--color-primary-light': '#073642',
      '--color-secondary': '#268bd2',
      '--color-danger': '#dc322f',
      '--color-success': '#859900',
      '--bg-body': '#002b36',
      '--bg-header': '#073642',
      '--bg-content': '#002b36',
      '--bg-item': '#073642',
      '--bg-item-hover': '#0a4050',
      '--bg-item-selected': '#0d5166',
      '--bg-input': '#073642',
      '--bg-group-header': '#073642',
      '--text-primary': '#839496',
      '--text-secondary': '#657b83',
      '--text-muted': '#586e75',
      '--text-link': '#2aa198',
      '--border-color': '#0a4050',
      '--border-color-focus': '#268bd2',
      '--border-selection': '#268bd2',
      '--tab-bg-active': '#002b36',
      '--tab-text': '#657b83',
      '--tab-text-active': '#268bd2',
      '--tab-border-active': '#268bd2',
      '--item-border-selected': '#268bd2'
    }
  },
  'monokai': {
    name: 'Monokai',
    variables: {
      '--color-primary': '#66d9ef',
      '--color-primary-hover': '#52b8cc',
      '--color-primary-light': '#3e3d32',
      '--color-secondary': '#66d9ef',
      '--color-danger': '#f92672',
      '--color-success': '#a6e22e',
      '--bg-body': '#272822',
      '--bg-header': '#1e1f1c',
      '--bg-content': '#272822',
      '--bg-item': '#3e3d32',
      '--bg-item-hover': '#49483e',
      '--bg-item-selected': '#49483e',
      '--bg-input': '#3e3d32',
      '--bg-group-header': '#1e1f1c',
      '--text-primary': '#f8f8f2',
      '--text-secondary': '#cfcfc2',
      '--text-muted': '#75715e',
      '--text-link': '#66d9ef',
      '--border-color': '#49483e',
      '--border-color-focus': '#66d9ef',
      '--border-selection': '#f92672',
      '--btn-primary-bg': '#66d9ef',
      '--btn-primary-text': '#272822',
      '--btn-danger-bg': '#f92672',
      '--btn-success-bg': '#a6e22e',
      '--btn-success-text': '#272822',
      '--tab-bg-active': '#272822',
      '--tab-text': '#75715e',
      '--tab-text-active': '#66d9ef',
      '--tab-border-active': '#66d9ef',
      '--item-border-selected': '#f92672'
    }
  },
  'github-light': {
    name: 'GitHub Light',
    variables: {
      '--color-primary': '#0969da',
      '--color-primary-hover': '#0550ae',
      '--color-primary-light': '#ddf4ff',
      '--color-secondary': '#0969da',
      '--color-danger': '#cf222e',
      '--color-success': '#1a7f37',
      '--bg-body': '#ffffff',
      '--bg-header': '#f6f8fa',
      '--bg-content': '#ffffff',
      '--bg-item': '#f6f8fa',
      '--bg-item-hover': '#eaeef2',
      '--bg-item-selected': '#ddf4ff',
      '--bg-input': '#ffffff',
      '--bg-group-header': '#f6f8fa',
      '--text-primary': '#24292f',
      '--text-secondary': '#57606a',
      '--text-muted': '#8c959f',
      '--text-link': '#0969da',
      '--border-color': '#d0d7de',
      '--border-color-focus': '#0969da',
      '--border-selection': '#0969da',
      '--btn-primary-bg': '#2da44e',
      '--btn-danger-bg': '#cf222e',
      '--btn-success-bg': '#2da44e',
      '--tab-text': '#57606a',
      '--tab-text-active': '#0969da',
      '--tab-border-active': '#fd8c73',
      '--item-border-selected': '#0969da'
    }
  }
};

/**
 * Theme schema for documentation and validation
 * Lists all customizable CSS variables grouped by category
 * @type {{description: string, properties: Object.<string, string[]>}}
 */
const THEME_SCHEMA = {
  description: 'Theme customization schema for Image Explorer',
  properties: {
    'Base Colors': ['--color-primary', '--color-primary-hover', '--color-primary-light', '--color-secondary', '--color-secondary-hover', '--color-danger', '--color-danger-hover', '--color-success', '--color-success-hover', '--color-warning'],
    'Background Colors': ['--bg-body', '--bg-header', '--bg-content', '--bg-item', '--bg-item-hover', '--bg-item-selected', '--bg-input', '--bg-group-header', '--bg-modal-overlay', '--bg-tooltip'],
    'Text Colors': ['--text-primary', '--text-secondary', '--text-muted', '--text-inverse', '--text-link'],
    'Border Colors': ['--border-color', '--border-color-focus', '--border-selection'],
    'Border Radius': ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-round'],
    'Spacing': ['--spacing-xs', '--spacing-sm', '--spacing-md', '--spacing-lg', '--spacing-xl'],
    'Font Settings': ['--font-family', '--font-size-xs', '--font-size-sm', '--font-size-base', '--font-size-md', '--font-size-lg'],
    'Shadows': ['--shadow-sm', '--shadow-md', '--shadow-lg'],
    'Button Colors': ['--btn-primary-bg', '--btn-primary-hover', '--btn-primary-text', '--btn-secondary-bg', '--btn-secondary-hover', '--btn-secondary-text', '--btn-danger-bg', '--btn-danger-hover', '--btn-danger-text', '--btn-success-bg', '--btn-success-hover', '--btn-success-text'],
    'Tab Colors': ['--tab-bg', '--tab-bg-active', '--tab-text', '--tab-text-active', '--tab-border-active'],
    'Item Colors': ['--item-border-width', '--item-border-selected']
  }
};

/**
 * Apply theme by setting CSS variables on root element
 * @param {string} themeId - Theme preset ID (e.g., 'dark', 'dracula')
 * @param {Object.<string, string>} [customOverrides] - Custom CSS variable overrides
 */
function applyTheme(themeId, customOverrides) {
  var root = document.documentElement;

  // First, remove all theme variables to reset to CSS defaults
  var allVars = Object.values(THEME_SCHEMA.properties).flat();
  allVars.forEach(function(varName) {
    root.style.removeProperty(varName);
  });

  // Apply preset theme variables
  if (themeId && THEME_PRESETS[themeId]) {
    var preset = THEME_PRESETS[themeId];
    Object.entries(preset.variables).forEach(function(entry) {
      root.style.setProperty(entry[0], entry[1]);
    });
  }

  // Apply custom overrides on top
  if (customOverrides && typeof customOverrides === 'object') {
    Object.entries(customOverrides).forEach(function(entry) {
      if (entry[0].startsWith('--')) {
        root.style.setProperty(entry[0], entry[1]);
      }
    });
  }
}

/**
 * Validate custom theme JSON string
 * @param {string} jsonStr - JSON string to validate
 * @returns {{valid: boolean, theme?: object, error?: string}}
 */
function validateCustomTheme(jsonStr) {
  if (!jsonStr || !jsonStr.trim()) {
    return { valid: true, theme: null };
  }

  try {
    var parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'Theme must be a JSON object' };
    }

    // Check that all keys are valid CSS variable names
    for (var key of Object.keys(parsed)) {
      if (!key.startsWith('--')) {
        return { valid: false, error: 'All keys must start with "--" (e.g., "--bg-body")' };
      }
    }

    return { valid: true, theme: parsed };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON: ' + e.message };
  }
}

/**
 * Apply UI scale by setting data attribute on root element
 * Controls font and icon sizes
 * @param {string} scale - 'small', 'medium', or 'large'
 */
function applyUIScale(scale) {
  var root = document.documentElement;
  var validScales = window.Constants ? window.Constants.VALID_UI_SCALES : ['small', 'medium', 'large'];

  if (validScales.includes(scale)) {
    root.setAttribute('data-ui-scale', scale);
  } else {
    root.setAttribute('data-ui-scale', 'medium');
  }
}

/**
 * Apply density by setting data attribute on root element
 * Controls spacing only
 * @param {string} density - 'compact', 'comfortable', or 'spacious'
 */
function applyDensity(density) {
  var root = document.documentElement;
  var validDensities = window.Constants ? window.Constants.VALID_DENSITIES : ['compact', 'comfortable', 'spacious'];

  if (validDensities.includes(density)) {
    root.setAttribute('data-density', density);
  } else {
    root.setAttribute('data-density', 'comfortable');
  }
}

/**
 * Get list of available theme presets
 * @returns {Array<{id: string, name: string}>}
 */
function getThemeList() {
  return Object.entries(THEME_PRESETS).map(function(entry) {
    return { id: entry[0], name: entry[1].name };
  });
}

/**
 * Check if a theme ID is valid
 * @param {string} themeId - Theme ID to check
 * @returns {boolean}
 */
function isValidTheme(themeId) {
  return themeId in THEME_PRESETS;
}

// Export for use in popup.js
window.ThemeManager = {
  THEME_PRESETS: THEME_PRESETS,
  THEME_SCHEMA: THEME_SCHEMA,
  applyTheme: applyTheme,
  validateCustomTheme: validateCustomTheme,
  applyUIScale: applyUIScale,
  applyDensity: applyDensity,
  getThemeList: getThemeList,
  isValidTheme: isValidTheme
};
