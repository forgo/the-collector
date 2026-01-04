import { THEME_PRESETS, VALID_UI_SCALES, VALID_DENSITIES } from './constants';
import type { ThemeId, UIScale, Density } from '../types';

/**
 * Theme schema for documentation and validation
 */
export const THEME_SCHEMA = {
  description: 'Theme customization schema for The Collector',
  properties: {
    'Base Colors': [
      '--color-primary',
      '--color-primary-hover',
      '--color-primary-light',
      '--color-secondary',
      '--color-secondary-hover',
      '--color-danger',
      '--color-danger-hover',
      '--color-success',
      '--color-success-hover',
      '--color-warning',
    ],
    'Background Colors': [
      '--bg-body',
      '--bg-header',
      '--bg-content',
      '--bg-item',
      '--bg-item-hover',
      '--bg-item-selected',
      '--bg-input',
      '--bg-group-header',
      '--bg-modal-overlay',
      '--bg-tooltip',
    ],
    'Text Colors': [
      '--text-primary',
      '--text-secondary',
      '--text-muted',
      '--text-inverse',
      '--text-link',
    ],
    'Border Colors': ['--border-color', '--border-color-focus', '--border-selection'],
    'Border Radius': ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-round'],
    Spacing: ['--spacing-xs', '--spacing-sm', '--spacing-md', '--spacing-lg', '--spacing-xl'],
    'Font Settings': [
      '--font-family',
      '--font-size-xs',
      '--font-size-sm',
      '--font-size-base',
      '--font-size-md',
      '--font-size-lg',
    ],
    Shadows: ['--shadow-sm', '--shadow-md', '--shadow-lg'],
    'Button Colors': [
      '--btn-primary-bg',
      '--btn-primary-hover',
      '--btn-primary-text',
      '--btn-secondary-bg',
      '--btn-secondary-hover',
      '--btn-secondary-text',
      '--btn-danger-bg',
      '--btn-danger-hover',
      '--btn-danger-text',
      '--btn-success-bg',
      '--btn-success-hover',
      '--btn-success-text',
    ],
    'Tab Colors': [
      '--tab-bg',
      '--tab-bg-active',
      '--tab-text',
      '--tab-text-active',
      '--tab-border-active',
    ],
    'Item Colors': ['--item-border-width', '--item-border-selected'],
  },
};

/**
 * Apply theme by setting CSS variables on root element
 */
export function applyTheme(themeId: ThemeId, customOverrides?: Record<string, string>): void {
  const root = document.documentElement;

  // First, remove all theme variables to reset to CSS defaults
  const allVars = Object.values(THEME_SCHEMA.properties).flat();
  allVars.forEach((varName) => {
    root.style.removeProperty(varName);
  });

  // Apply preset theme variables
  if (themeId && THEME_PRESETS[themeId]) {
    const preset = THEME_PRESETS[themeId];
    Object.entries(preset.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  // Apply custom overrides on top
  if (customOverrides && typeof customOverrides === 'object') {
    Object.entries(customOverrides).forEach(([key, value]) => {
      if (key.startsWith('--')) {
        root.style.setProperty(key, value);
      }
    });
  }
}

/**
 * Validate custom theme JSON string
 */
export function validateCustomTheme(jsonStr: string): {
  valid: boolean;
  theme?: Record<string, string> | null;
  error?: string;
} {
  if (!jsonStr || !jsonStr.trim()) {
    return { valid: true, theme: null };
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'Theme must be a JSON object' };
    }

    // Check that all keys are valid CSS variable names
    for (const key of Object.keys(parsed)) {
      if (!key.startsWith('--')) {
        return {
          valid: false,
          error: 'All keys must start with "--" (e.g., "--bg-body")',
        };
      }
    }

    return { valid: true, theme: parsed };
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
}

/**
 * Apply UI scale by setting data attribute on root element
 */
export function applyUIScale(scale: UIScale): void {
  const root = document.documentElement;

  if (VALID_UI_SCALES.includes(scale)) {
    root.setAttribute('data-ui-scale', scale);
  } else {
    root.setAttribute('data-ui-scale', 'medium');
  }
}

/**
 * Apply density by setting data attribute on root element
 */
export function applyDensity(density: Density): void {
  const root = document.documentElement;

  if (VALID_DENSITIES.includes(density)) {
    root.setAttribute('data-density', density);
  } else {
    root.setAttribute('data-density', 'comfortable');
  }
}

/**
 * Get list of available theme presets
 */
export function getThemeList(): Array<{ id: ThemeId; name: string }> {
  return Object.entries(THEME_PRESETS).map(([id, preset]) => ({
    id: id as ThemeId,
    name: preset.name,
  }));
}

/**
 * Check if a theme ID is valid
 */
export function isValidTheme(themeId: string): themeId is ThemeId {
  return themeId in THEME_PRESETS;
}
