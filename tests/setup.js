/**
 * Test setup file
 * Configures the test environment with necessary globals and mocks
 */

import { chrome, resetChromeMocks } from './mocks/chrome-api.js';

// Make chrome available globally (simulating browser environment)
globalThis.chrome = chrome;

// Mock window object for modules that attach to window
globalThis.window = globalThis;

// Mock CSS.escape for DOM-related code
globalThis.CSS = {
  escape: (str) => str.replace(/([^\w-])/g, '\\$1')
};

// Mock document for DOM-related code (minimal)
globalThis.document = {
  querySelectorAll: () => [],
  querySelector: () => null
};

// Reset mocks before each test
beforeEach(() => {
  resetChromeMocks();
});
