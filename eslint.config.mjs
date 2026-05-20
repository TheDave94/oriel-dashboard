import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';
import prettier from 'eslint-config-prettier';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    // Source-level `// eslint-disable-next-line security/detect-object-injection`
    // markers document Codacy-flagged bracket-access call sites. We load the
    // security plugin here (rules off) so those directives resolve to a known
    // rule name. We also disable reportUnusedDisableDirectives so the markers
    // stay quiet for ESLint while remaining authoritative for Codacy.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    plugins: {
      '@typescript-eslint': tseslint,
      security,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Prettier handles formatting
      ...prettier.rules,
      // Pragmatic overrides
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'webpack.config.ts'],
  },
];
