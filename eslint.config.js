// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

/**
 * ADR-0017: SDKs de fornecedor só podem ser importados em adapters,
 * shared/db e shared/observability. O resto do código fala com portas.
 */
const vendorSdks = [
  { group: ['stripe', 'stripe/*'], message: 'Stripe só em adapters/ (ADR-0017).' },
  { group: ['@sentry/*'], message: 'Sentry só em shared/observability/ (ADR-0017).' },
  { group: ['@prisma/*', '**/generated/prisma/*'], message: 'Prisma só em adapters/ e shared/db/ (ADR-0017).' },
  { group: ['pg', 'pg/*'], message: 'Driver do banco só em shared/db/ (ADR-0017).' },
]

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/generated/**', '**/node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
      globals: globals.browser,
    },
  },
  {
    files: ['apps/web/**/*.{ts,vue}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/api/**/*.ts', '*.js', '*.ts'],
    languageOptions: { globals: globals.node },
  },

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'error',
    },
  },

  // Fronteiras de dependência (ADR-0017)
  {
    files: ['apps/api/src/**/*.ts'],
    ignores: [
      'apps/api/src/**/adapters/**',
      'apps/api/src/shared/db/**',
      'apps/api/src/shared/observability/**',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: vendorSdks }],
    },
  },
  // O núcleo de regras não faz I/O nem depende de framework (ADR-0003)
  {
    files: ['apps/api/src/modules/*/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...vendorSdks,
            { group: ['fastify', 'fastify/*', '@fastify/*'], message: 'core/ não depende de HTTP (ADR-0003).' },
            { group: ['**/adapters/**', '**/http/**', '**/app/**'], message: 'core/ não importa camadas externas (ADR-0003).' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'core/ recebe o horário por parâmetro (Clock), não chama Date.now().',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'core/ recebe o horário por parâmetro (Clock), não chama new Date().',
        },
      ],
    },
  },
)
