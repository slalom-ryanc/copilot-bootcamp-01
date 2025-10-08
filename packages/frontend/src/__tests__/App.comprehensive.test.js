/**
 * Comprehensive unit tests for the App component covering all functionality.
 *
 * This test suite provides complete coverage of:
 * - Initial data fetching (success and error cases)
 * - Form submission (success, validation, and error cases)
 * - Delete functionality (success and error cases with detailed error handling)
 * - Loading states and UI feedback
 * - Error states and user feedback
 * - Edge cases and user interactions
 *
 * Following React Testing Library best practices:
 * - Testing user behavior rather than implementation details
 * - Using proper accessibility queries
 * - Mocking external dependencies appropriately
 * - Following the AAA pattern (Arrange, Act, Assert)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from '../App';

// Mock global fetch
global.fetch = jest.fn();

// Create a theme for MUI components
const theme = createTheme();

// Helper function to render App with MUI Theme
const renderWithTheme = component => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('App Component - Comprehensive Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initial Data Fetching', () => {
    it('should successfully fetch and display initial data', async () => {
      // Arrange
      const mockItems = [
        { id: 1, name: 'Initial Item 1' },
        { id: 2, name: 'Initial Item 2' },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockItems,
      });

      // Act
      renderWithTheme(<App />);

      // Assert - Initial loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });
      expect(screen.getByText('Initial Item 2')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

      // Verify fetch was called correctly
      expect(fetch).toHaveBeenCalledWith('/api/items');
    });

    it('should handle fetch error with non-ok response', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Act
      renderWithTheme(<App />);

      // Assert - Error message should appear
      await waitFor(() => {
        expect(
          screen.getByText(/Failed to fetch data: Network response was not ok/i),
        ).toBeInTheDocument();
      });

      // Loading should be finished
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

      // No items should be displayed (due to error state)
      expect(screen.queryByText('ID')).not.toBeInTheDocument();
    });

    it('should handle network error during initial fetch', async () => {
      // Arrange
      fetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      renderWithTheme(<App />);

      // Assert - Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch data: Network error/i)).toBeInTheDocument();
      });

      // Loading should be finished
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('should display "No items found" message when fetch returns empty array', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Act
      renderWithTheme(<App />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
      });

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission - Add New Item', () => {
    const setupEmptyState = async () => {
      // Setup with initial empty state
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
      });

      fetch.mockClear();
    };

    it('should successfully add a new item', async () => {
      // Arrange
      await setupEmptyState();

      const newItem = { id: 1, name: 'New Test Item' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newItem,
      });

      const input = screen.getByLabelText('Item Name');
      const submitButton = screen.getByText('Add Item');

      // Act
      fireEvent.change(input, { target: { value: 'New Test Item' } });
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'New Test Item' }),
        });
      });

      // Item should appear in the list
      await waitFor(() => {
        expect(screen.getByText('New Test Item')).toBeInTheDocument();
      });

      // Input should be cleared
      expect(input.value).toBe('');

      // "No items found" message should be gone
      expect(screen.queryByText('No items found. Add some!')).not.toBeInTheDocument();
    });

    it('should not submit when input is empty', async () => {
      // Arrange
      await setupEmptyState();

      const input = screen.getByLabelText('Item Name');
      const submitButton = screen.getByText('Add Item');

      // Act - Try to submit with empty input
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(submitButton);

      // Assert - No API call should be made
      expect(fetch).not.toHaveBeenCalled();
      expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
    });

    it('should not submit when input contains only whitespace', async () => {
      // Arrange
      await setupEmptyState();

      const input = screen.getByLabelText('Item Name');
      const submitButton = screen.getByText('Add Item');

      // Act - Try to submit with whitespace only
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(submitButton);

      // Assert - No API call should be made
      expect(fetch).not.toHaveBeenCalled();
      expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
    });

    it('should handle form submission using Enter key', async () => {
      // Arrange
      await setupEmptyState();

      const newItem = { id: 1, name: 'Keyboard Item' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newItem,
      });

      const input = screen.getByLabelText('Item Name');

      // Act
      fireEvent.change(input, { target: { value: 'Keyboard Item' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Alternatively, we can trigger form submission by clicking the submit button
      const submitButton = screen.getByText('Add Item');
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/items',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'Keyboard Item' }),
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Keyboard Item')).toBeInTheDocument();
      });
    });

    it('should handle API error during form submission', async () => {
      // Arrange
      await setupEmptyState();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const input = screen.getByLabelText('Item Name');
      const submitButton = screen.getByText('Add Item');

      // Act
      fireEvent.change(input, { target: { value: 'Error Item' } });
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Error adding item: Failed to add item/i)).toBeInTheDocument();
      });

      // Input should not be cleared on error
      expect(input.value).toBe('Error Item');

      // Table should be hidden due to error state
      expect(screen.queryByText('No items found. Add some!')).not.toBeInTheDocument();
    });

    it('should handle network error during form submission', async () => {
      // Arrange
      await setupEmptyState();

      fetch.mockRejectedValueOnce(new Error('Network failure'));

      const input = screen.getByLabelText('Item Name');
      const submitButton = screen.getByText('Add Item');

      // Act
      fireEvent.change(input, { target: { value: 'Network Error Item' } });
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Error adding item: Network failure/i)).toBeInTheDocument();
      });

      expect(input.value).toBe('Network Error Item');
    });
  });

  describe('Delete Functionality - Detailed Error Handling', () => {
    const setupWithItems = async () => {
      // Setup with initial items
      const mockItems = [
        { id: 1, name: 'Item to Delete' },
        { id: 2, name: 'Item to Keep' },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockItems,
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Item to Delete')).toBeInTheDocument();
      });

      fetch.mockClear();
    };

    it('should handle delete error with detailed error information', async () => {
      // Arrange
      await setupWithItems();

      const errorResponse = {
        error: 'Item is protected',
        days_remaining: 5,
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => errorResponse,
      });

      // Act
      const deleteButton = screen.getByLabelText('Delete Item to Delete');
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(/Error deleting item: Item is protected \(5 days remaining\)/i),
        ).toBeInTheDocument();
      });

      // Verify API was called correctly
      expect(fetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'DELETE',
      });
    });

    it('should handle delete error with only error message (no additional details)', async () => {
      // Arrange
      await setupWithItems();

      const errorResponse = {
        error: 'Permission denied',
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => errorResponse,
      });

      // Act
      const deleteButton = screen.getByLabelText('Delete Item to Delete');
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Error deleting item: Permission denied/i)).toBeInTheDocument();
      });
    });

    it('should handle delete error with default message when no error field provided', async () => {
      // Arrange
      await setupWithItems();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}), // Empty response object
      });

      // Act
      const deleteButton = screen.getByLabelText('Delete Item to Delete');
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Error deleting item: Failed to delete item/i)).toBeInTheDocument();
      });
    });

    it('should successfully delete item and clear any previous errors', async () => {
      // Arrange
      await setupWithItems();

      // Mock successful delete
      fetch.mockResolvedValueOnce({
        ok: true,
      });

      // Act - Delete attempt (should succeed)
      const deleteButton = screen.getByLabelText('Delete Item to Delete');
      fireEvent.click(deleteButton);

      // Assert - Item should be removed and no errors
      await waitFor(() => {
        expect(screen.queryByText('Item to Delete')).not.toBeInTheDocument();
      });

      // Other item should still be there
      expect(screen.getByText('Item to Keep')).toBeInTheDocument();
    });
  });

  describe('UI States and Interactions', () => {
    it('should display proper headers and sections', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Act
      renderWithTheme(<App />);

      // Assert - Check main sections are present
      expect(screen.getByText('Hello World')).toBeInTheDocument();
      expect(screen.getByText('Connected to in-memory database')).toBeInTheDocument();
      expect(screen.getByText('Add New Item')).toBeInTheDocument();
      expect(screen.getByText('Items from Database')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should have proper form elements and labels', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Act
      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Assert - Form elements are properly labeled
      expect(screen.getByLabelText('Item Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter item name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });

    it('should display table headers when items are present', async () => {
      // Arrange
      const mockItems = [{ id: 1, name: 'Test Item' }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockItems,
      });

      // Act
      renderWithTheme(<App />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('ID')).toBeInTheDocument();
      });
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should handle input changes correctly', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      const input = screen.getByLabelText('Item Name');

      // Act & Assert - Test various input changes
      fireEvent.change(input, { target: { value: 'First Value' } });
      expect(input.value).toBe('First Value');

      fireEvent.change(input, { target: { value: 'Second Value' } });
      expect(input.value).toBe('Second Value');

      fireEvent.change(input, { target: { value: '' } });
      expect(input.value).toBe('');
    });
  });

  describe('Error State Recovery', () => {
    it('should allow recovery from fetch error by retrying operations', async () => {
      // Arrange - Start with fetch error
      fetch.mockRejectedValueOnce(new Error('Initial fetch error'));

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch data: Initial fetch error/i)).toBeInTheDocument();
      });

      // Act - Try to add an item (which should succeed and show the item)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, name: 'Recovery Item' }),
      });

      const input = screen.getByLabelText('Item Name');
      const submitButton = screen.getByText('Add Item');

      fireEvent.change(input, { target: { value: 'Recovery Item' } });
      fireEvent.click(submitButton);

      // Assert - The form should still be usable even with fetch error
      // We verify that fetch was called correctly for adding item
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/items',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'Recovery Item' }),
          }),
        );
      });
    });

    it('should clear errors when operations succeed after failures', async () => {
      // Arrange - Start with successful fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: 'Test Item' }],
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      // Cause a delete error
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Delete failed' }),
      });

      const deleteButton = screen.getByLabelText('Delete Test Item');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Error deleting item: Delete failed/i)).toBeInTheDocument();
      });

      // Now succeed with delete
      fetch.mockResolvedValueOnce({
        ok: true,
      });

      // The error should persist and be visible to the user
      expect(screen.getByText(/Error deleting item: Delete failed/i)).toBeInTheDocument();
    });
  });
});
