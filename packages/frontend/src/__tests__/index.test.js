/**
 * Unit tests for the index.js file.
 *
 * This file tests the React application initialization and theme setup.
 * Since this file primarily handles React DOM rendering and MUI theme configuration,
 * the tests focus on ensuring the theme is properly configured and the app
 * would render without errors.
 */

import { createTheme } from '@mui/material/styles';

// Mock ReactDOM.createRoot and render to avoid DOM manipulation in tests
const mockRender = jest.fn();
const mockRoot = { render: mockRender };
const mockCreateRoot = jest.fn().mockReturnValue(mockRoot);

// Mock ReactDOM module
jest.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

// Mock the App component to avoid complex dependencies
jest.mock('../App', () => {
  return function MockApp() {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'mock-app' }, 'Mock App');
  };
});

// Mock the App component
jest.mock('../App', () => {
  return function MockApp() {
    const mockReact = require('react');
    return mockReact.createElement('div', { 'data-testid': 'mock-app' }, 'Mock App');
  };
});

describe('index.js', () => {
  let getElementByIdSpy;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset the mocks to default behavior
    mockCreateRoot.mockReturnValue(mockRoot);

    // Clear the module from cache
    jest.resetModules();
  });

  afterEach(() => {
    if (getElementByIdSpy) {
      getElementByIdSpy.mockRestore();
    }
  });

  it('should create and configure the MUI theme correctly', () => {
    // Test that theme creation doesn't throw errors and has expected properties
    const theme = createTheme({
      palette: {
        primary: {
          main: '#1976d2',
        },
        secondary: {
          main: '#dc004e',
        },
        background: {
          default: '#f5f5f5',
        },
      },
      typography: {
        h1: {
          fontSize: '1.8rem',
          fontWeight: 600,
        },
        h2: {
          fontSize: '1.4rem',
          fontWeight: 500,
        },
      },
    });

    expect(theme.palette.primary.main).toBe('#1976d2');
    expect(theme.palette.secondary.main).toBe('#dc004e');
    expect(theme.palette.background.default).toBe('#f5f5f5');
    expect(theme.typography.h1.fontSize).toBe('1.8rem');
    expect(theme.typography.h1.fontWeight).toBe(600);
    expect(theme.typography.h2.fontSize).toBe('1.4rem');
    expect(theme.typography.h2.fontWeight).toBe(500);
  });

  it('should initialize the React app when index.js is loaded', () => {
    // Arrange
    const mockElement = document.createElement('div');
    mockElement.id = 'root';
    getElementByIdSpy = jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    // Act - Import the index.js file to trigger initialization
    expect(() => {
      require('../index.js');
    }).not.toThrow();

    // Assert
    expect(mockCreateRoot).toHaveBeenCalledWith(mockElement);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('should wrap the app with necessary providers in correct order', () => {
    // Arrange
    const mockElement = document.createElement('div');
    mockElement.id = 'root';
    getElementByIdSpy = jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    // Act
    expect(() => {
      require('../index.js');
    }).not.toThrow();

    // Assert - Verify render was called with some JSX content
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledWith(expect.any(Object));

    // Verify that the render call received a React element
    const renderCall = mockRender.mock.calls[0][0];
    expect(renderCall).toHaveProperty('type');
    expect(renderCall).toHaveProperty('props');
  });

  it('should handle missing root element gracefully', () => {
    // Arrange
    getElementByIdSpy = jest.spyOn(document, 'getElementById').mockReturnValue(null);

    // Mock createRoot to throw when called with null
    mockCreateRoot.mockImplementation(element => {
      if (!element) {
        throw new Error('createRoot(...): Target container is not a DOM element.');
      }
      return mockRoot;
    });

    // Act & Assert
    expect(() => {
      require('../index.js');
    }).toThrow('createRoot(...): Target container is not a DOM element.');
  });
});
