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
        { preferReadonlySignalProperties: true },
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
    // Still on Default change detection. This list only shrinks: see
    // "OnPush goes leaf-first" in AGENTS.md.
    files: [
      'src/app/app.component.ts',
      'src/app/documentation/documentation.component.ts',
      'src/app/filament/filament-detail/filament-detail.component.ts',
      'src/app/filament/filament-list-container/filament-list-container.component.ts',
      'src/app/print/edit-print-detail/edit-print-detail.component.ts',
      'src/app/print/print-list/print-list.component.ts',
      'src/app/printer/printer-detail/printer-detail.component.ts',
      'src/app/printer-maintenance/printer-maintenance.component.ts',
      'src/app/settings/settings.component.ts',
    ],
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
