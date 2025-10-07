module.exports = {
    extends: ['../../.eslintrc.js'],
    env: {
        node: true,
        jest: true,
        commonjs: true,
    },
    parserOptions: {
        sourceType: 'script', // Backend uses CommonJS
    },
    rules: {
        // Node.js specific rules
        'no-console': 'off', // Console is acceptable in backend
        'prefer-const': 'error',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

        // Backend-specific best practices
        'handle-callback-err': 'error',
        'no-path-concat': 'error',
        'no-process-exit': 'error',

        // Error handling
        'no-throw-literal': 'error',
        'prefer-promise-reject-errors': 'error',
    },
};