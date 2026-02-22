const path = require('node:path')
const { FlatCompat } = require('@eslint/eslintrc')
const js = require('@eslint/js')

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

module.exports = [
  {
    ignores: [
      'tmp/**',
      'backend/migrations/**',
      'backend/logs/**',
      'backend/backups/**',
      'backend/node_modules/**'
    ]
  },
  ...compat.config({
    env: {
      browser: true,
      node: true,
      es2021: true
    },
    extends: [
      'eslint:recommended',
      'plugin:import/recommended',
      'plugin:promise/recommended',
      'prettier'
    ],
    plugins: ['prettier'],
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script'
    },
    rules: {
      camelcase: 0,
      'prettier/prettier': 2,
      'no-async-promise-executor': 0,
      'no-param-reassign': 'error',
      'no-control-regex': 0
      ,
      'no-unused-vars': 0,
      'promise/always-return': 0,
      'promise/catch-or-return': 0,
      'promise/no-nesting': 0
    }
  })
]
