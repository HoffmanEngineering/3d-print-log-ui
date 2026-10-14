// @ts-check
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    ignores: ['projects/**/*'],
  },
  {
    // `max-len` is not enabled, but older code still carries disable comments
    // for it. Flat config reports unused directives by default; eslintrc did not.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  {
    files: ['**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { prefix: 'app', style: 'kebab-case', type: 'element' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { prefix: 'app', style: 'camelCase', type: 'attribute' },
      ],
      '@angular-eslint/prefer-signals': [
        'error',
        { preferReadonlySignalProperties: false },
      ],
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-host-metadata-property': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['src/app/documentation/primitives/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { prefix: 'doc', style: 'kebab-case', type: 'element' },
      ],
    },
  },
  {
    // Declared by DocumentationModule, whose imports are their template scope.
    files: [
      'src/app/documentation/generated/pages/*.ts',
      'src/app/documentation/docs/docs-getting-started/docs-getting-started.component.ts',
      'src/app/documentation/docs/docs-release-notes/docs-release-notes.component.ts',
    ],
    rules: {
      '@angular-eslint/prefer-standalone': 'off',
    },
  }
);
