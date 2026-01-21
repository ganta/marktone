import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',

  // custom directories
  srcDir: 'src',
  entrypointsDir: 'app',
  publicDir: '../public',

  manifest: {
    permissions: ['storage'],
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
});
