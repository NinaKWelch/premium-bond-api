import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Apply to all TS source and test files
  { files: ['src/**/*.ts', 'tests/**/*.ts'] },

  // TypeScript-aware recommended rules
  ...tseslint.configs.recommended,

  {
    rules: {
      // Disallow any — keeps type safety strict
      '@typescript-eslint/no-explicit-any': 'error',

      // Unused variables are always a bug; prefix with _ to intentionally ignore
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Enforce import type for type-only imports — cleaner output and avoids
      // accidentally importing runtime code for types
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // console.log left in production code is usually an oversight;
      // console.error is intentional (used in the error handler)
      'no-console': ['warn', { allow: ['error'] }],
    },
  }
);
