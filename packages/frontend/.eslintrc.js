module.exports = {
    extends: [
        '../../.eslintrc.js',
        'react-app',
        'react-app/jest',
    ],
    env: {
        browser: true,
        es6: true,
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
    rules: {
        // React-specific rules
        'react/prop-types': 'warn',
        'react-hooks/exhaustive-deps': 'warn',
        'react/jsx-uses-react': 'error',
        'react/jsx-uses-vars': 'error',
        'react/jsx-no-undef': 'error',

        // JSX formatting
        'react/jsx-closing-bracket-location': 'error',
        'react/jsx-closing-tag-location': 'error',
        'react/jsx-curly-spacing': ['error', 'never'],
        'react/jsx-equals-spacing': ['error', 'never'],
        'react/jsx-indent': ['error', 2],
        'react/jsx-indent-props': ['error', 2],

        // Override some base rules for React
        'no-console': 'off', // Allow console in development

        // Testing Library rules - disable problematic ones for now
        'testing-library/no-unnecessary-act': 'warn',
        'testing-library/no-wait-for-multiple-assertions': 'warn',
    },
};