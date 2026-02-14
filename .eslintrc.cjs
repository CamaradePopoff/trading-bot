module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['standard', 'prettier'],
  overrides: [
  ],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    camelcase: 0,
    'prettier/prettier': 2,
    'no-async-promise-executor': 0,
    'no-param-reassign': 'error',
    'no-control-regex': 0,
  }
}
