import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: 'readonly',
        CSS: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
    }
  },
  {
    // Legacy popup.js - relax rules until full refactor
    files: ['popup.js'],
    languageOptions: {
      globals: {
        Icons: 'readonly',
        FloatingUIDOM: 'readonly',
      }
    },
    rules: {
      'no-var': 'warn',
      'prefer-const': 'warn',
      'eqeqeq': 'warn',
      'no-unused-vars': 'off',
      'no-redeclare': 'warn',
      'no-useless-escape': 'warn',
    }
  },
  {
    // Test files configuration
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      }
    }
  },
  {
    // Ignore patterns
    ignores: ['node_modules/**', 'dist/**', '*.min.js']
  }
];
