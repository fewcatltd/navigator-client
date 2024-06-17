module.exports = {
  plugins: ['prettier'],
  extends: ['fbjs', 'prettier'],
  rules: {
    'no-unused-vars': [
      'error',
      {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
    ],
    'no-constant-condition': ['error', {checkLoops: false}],
    'eol-last': ['error', 'always'],
    'no-unreachable': 'off',
  },
  globals: {BigInt: true},
}
