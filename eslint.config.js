import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/', 'types/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
  {
    // Node contexts: build config, palette validation script.
    files: ['*.config.js', 'scripts/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // The visual suite straddles both: the spec bodies are Node, but probes.js
    // and every page.evaluate callback are serialised into a browser.
    files: ['test/visual/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  prettier,
];
