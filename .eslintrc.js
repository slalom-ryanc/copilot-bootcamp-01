module.exports = {
    env: {
        es2022: true,
        node: true,
    },
    extends: ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        // Code style rules matching docs/code-style.md
        indent: ['error', 2],
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
        'max-len': ['error', { code: 100 }],
        'comma-dangle': ['error', 'always-multiline'],

        // Best practices
        'prefer-const': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-arrow-callback': 'error',

        // Spacing and formatting
        'space-before-blocks': 'error',
        'keyword-spacing': 'error',
        'comma-spacing': 'error',
        'key-spacing': 'error',
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],

        // Import organization (basic rules)
        'no-multiple-empty-lines': ['error', { max: 1 }],
        'eol-last': 'error',
    },
};