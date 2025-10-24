// Minimal flat config for this repo — keeps TypeScript parsing and basic rules.
// Avoid extending Next's config here to prevent circular config issues in the
// flat-config loader. We can re-introduce Next-specific rules later if desired.

module.exports = [
  {
    // Ignore build and deps
    ignores: ['.next/**', 'node_modules/**', 'dist/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: { ecmaVersion: 2024, sourceType: 'module' }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      react: require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks')
    },
    rules: {
      // relax a couple of strict rules for this codebase
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off'
      ,
      // react hooks rule — keep exhaustive deps as a warning so we catch missing deps
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
]
