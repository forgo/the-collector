import { resolve } from 'path';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  // Vite configuration
  vite: () => ({
    resolve: {
      alias: {
        '@': resolve(__dirname, '.'),
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
  }),

  // Manifest configuration
  manifest: {
    name: 'The Collector',
    version: '2.0.0',
    description: 'Collect, organize, and batch-download images from web pages',
    permissions: ['storage', 'activeTab', 'tabs', 'downloads'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    // Allow loading images from any source
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'; img-src 'self' https: http: data: blob:;",
    },
    // Firefox Add-ons publishing configuration
    browser_specific_settings: {
      gecko: {
        id: 'the-collector@forgo.dev',
        strict_min_version: '109.0',
      },
    },
  },
});
