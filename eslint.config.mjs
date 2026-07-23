import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'
import pluginVue from 'eslint-plugin-vue'

const nuxtGlobals = {
  useNuxtApp: 'readonly',
  useAsyncData: 'readonly',
  useFetch: 'readonly',
  useState: 'readonly',
  useRoute: 'readonly',
  useRouter: 'readonly',
  useRuntimeConfig: 'readonly',
  useSsrFetch: 'readonly',
  useMockApi: 'readonly',
  defineEventHandler: 'readonly',
  defineNuxtConfig: 'readonly',
  definePageMeta: 'readonly',
  navigateTo: 'readonly',
  $fetch: 'readonly',
  ref: 'readonly',
  computed: 'readonly',
  watch: 'readonly',
  onMounted: 'readonly',
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/coverage/**',
      'apps/extension/public/**',
      'packages/nuxt/test/fixtures/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      'prefer-const': 'error',
    },
  },
  {
    files: ['apps/playground/**/*.{ts,vue}', 'packages/nuxt/src/runtime/**/*.{ts,vue}'],
    languageOptions: {
      globals: nuxtGlobals,
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
      globals: nuxtGlobals,
    },
    plugins: {
      vue: pluginVue,
    },
    rules: {
      ...pluginVue.configs['flat/essential'].rules,
      'no-undef': 'off',
    },
  },
)
