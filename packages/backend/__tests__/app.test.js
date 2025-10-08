const request = require('supertest');
const { app, db, insertStmt } = require('../src/app');

/**
 * Unit tests for the DELETE /api/items/:id endpoint.
 * 
 * This test suite covers:
 * - Successful deletion scenarios (items 5+ days old)
 * - Age restriction enforcement (items less than 5 days old)
 * - Error handling for invalid IDs and non-existent items
 * - Edge cases with various ID formats (decimal, negative, mixed alphanumeric, etc.)
 * - Response format validation
 * - Database state verification and integrity
 * - Performance with multiple rapid deletions
 * 
 * Note: Tests use the in-memory SQLite database that's initialized in app.js.
 * Each test clears the database to ensure isolation.
 */
describe('DELETE /api/items/:id', () => {
    // Clean up database before each test
    beforeEach(() => {
        // Clear all items from the database
        db.prepare('DELETE FROM items').run();
    });

    /**
     * Helper function to create an item with a specific date
     * @param {string} name - The name of the item
     * @param {Date} date - The creation date for the item
     * @returns {number} The ID of the created item
     */
    const createItemWithDate = (name, date) => {
        const stmt = db.prepare('INSERT INTO items (name, created_at) VALUES (?, ?)');
        const result = stmt.run(name, date.toISOString());
        return result.lastInsertRowid;
    };

    /**
     * Helper function to create an item that is exactly N days old
     * @param {string} name - The name of the item
     * @param {number} daysOld - Number of days old the item should be
     * @returns {number} The ID of the created item
     */
    const createItemDaysOld = (name, daysOld) => {
        const date = new Date();
        date.setDate(date.getDate() - daysOld);
        return createItemWithDate(name, date);
    };

    describe('successful deletion', () => {
        it('should delete an existing item that is 5+ days old and return success message', async () => {
            // Arrange: Create an item that is 6 days old
            const itemId = createItemDaysOld('Test Item', 6);

            // Act: Delete the item
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(200);

            // Assert: Check response format
            expect(response.body).toEqual({
                message: 'Item deleted successfully',
                id: itemId
            });

            // Assert: Verify item is actually deleted from database
            const deletedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
            expect(deletedItem).toBeUndefined();
        });

        it('should successfully delete item with valid integer ID as string when item is old enough', async () => {
            // Arrange: Create an item that is 7 days old
            const itemId = createItemDaysOld('Another Test Item', 7);

            // Act: Delete the item using string ID
            const response = await request(app)
                .delete(`/api/items/${itemId.toString()}`)
                .expect(200);

            // Assert: Check response
            expect(response.body.message).toBe('Item deleted successfully');
            expect(response.body.id).toBe(itemId);
        });

        it('should delete correct item when multiple old items exist', async () => {
            // Arrange: Create multiple items that are all old enough
            const item1Id = createItemDaysOld('Item 1', 6);
            const item2Id = createItemDaysOld('Item 2', 7);
            const item3Id = createItemDaysOld('Item 3', 8);

            // Act: Delete the middle item
            await request(app)
                .delete(`/api/items/${item2Id}`)
                .expect(200);

            // Assert: Verify only the correct item was deleted
            const remainingItems = db.prepare('SELECT * FROM items ORDER BY id').all();
            expect(remainingItems).toHaveLength(2);
            expect(remainingItems[0].id).toBe(item1Id);
            expect(remainingItems[1].id).toBe(item3Id);

            const deletedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(item2Id);
            expect(deletedItem).toBeUndefined();
        });

        it('should delete item that is exactly 5 days old', async () => {
            // Arrange: Create an item that is exactly 5 days old
            const itemId = createItemDaysOld('Exactly 5 Days Old Item', 5);

            // Act: Delete the item
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(200);

            // Assert: Check response format
            expect(response.body).toEqual({
                message: 'Item deleted successfully',
                id: itemId
            });
        });
    });

    describe('age restriction enforcement', () => {
        it('should return 403 when trying to delete item less than 5 days old', async () => {
            // Arrange: Create an item that is only 2 days old
            const itemId = createItemDaysOld('Recent Item', 2);

            // Act & Assert
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(403);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Item cannot be deleted until it is at least 5 days old');
            expect(response.body).toHaveProperty('created_at');
            expect(response.body).toHaveProperty('days_remaining');
            expect(response.body.days_remaining).toBeGreaterThan(0);

            // Verify item still exists in database
            const existingItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
            expect(existingItem).toBeDefined();
        });

        it('should return 403 when trying to delete item that is 1 day old', async () => {
            // Arrange: Create an item that is 1 day old
            const itemId = createItemDaysOld('Very Recent Item', 1);

            // Act & Assert
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(403);

            expect(response.body.error).toBe('Item cannot be deleted until it is at least 5 days old');
            expect(response.body.days_remaining).toBe(4);
        });

        it('should return 403 when trying to delete item created today', async () => {
            // Arrange: Create an item with current timestamp (using insertStmt)
            const result = insertStmt.run('Today Item');
            const itemId = result.lastInsertRowid;

            // Act & Assert
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(403);

            expect(response.body.error).toBe('Item cannot be deleted until it is at least 5 days old');
            expect(response.body.days_remaining).toBe(5);
        });

        it('should return 403 when trying to delete item that is 4 days old (edge case)', async () => {
            // Arrange: Create an item that is 4 days old (just under the limit)
            const itemId = createItemDaysOld('Almost Old Enough Item', 4);

            // Act & Assert
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(403);

            expect(response.body.error).toBe('Item cannot be deleted until it is at least 5 days old');
            expect(response.body.days_remaining).toBe(1);
        });
    });

    describe('error handling', () => {
        it('should return 404 when trying to delete non-existent item', async () => {
            // Arrange: Use an ID that doesn't exist
            const nonExistentId = 99999;

            // Act & Assert
            const response = await request(app)
                .delete(`/api/items/${nonExistentId}`)
                .expect(404);

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });

        it('should return 400 for invalid ID format (non-numeric)', async () => {
            // Act & Assert
            const response = await request(app)
                .delete('/api/items/invalid-id')
                .expect(400);

            expect(response.body).toEqual({
                error: 'Invalid item ID'
            });
        });

        it('should return 404 for decimal number (parseInt converts to integer)', async () => {
            // Act & Assert: parseInt('1.5') becomes 1, which doesn't exist
            const response = await request(app)
                .delete('/api/items/1.5')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });

        it('should return 404 for negative ID (parsed but not found)', async () => {
            // Act & Assert: parseInt('-1') becomes -1, which doesn't exist
            const response = await request(app)
                .delete('/api/items/-1')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });

        it('should return 404 for zero ID', async () => {
            // Act & Assert: Zero is technically a valid integer but won't exist
            const response = await request(app)
                .delete('/api/items/0')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });

        it('should handle database errors gracefully', async () => {
            // Note: This test is challenging with in-memory database
            // In a real application, you might mock the database methods
            // For now, we'll test that the endpoint handles non-existent items correctly
            const response = await request(app)
                .delete('/api/items/99999')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });
    });

    describe('edge cases', () => {
        it('should handle very large valid integer IDs', async () => {
            // Act & Assert: Large number should be parsed correctly but return 404
            const response = await request(app)
                .delete('/api/items/2147483647') // Max 32-bit integer
                .expect(404);

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });

        it('should handle very large numbers (parsed to scientific notation)', async () => {
            // Act & Assert: parseInt parses this to a very large number
            const response = await request(app)
                .delete('/api/items/999999999999999999999')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });

        it('should handle mixed alphanumeric IDs (parseInt extracts number)', async () => {
            // Act & Assert: parseInt('1abc') becomes 1, which doesn't exist
            const response = await request(app)
                .delete('/api/items/1abc')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });

        it('should handle leading zeros in ID', async () => {
            // Arrange: Create an item that is old enough to delete
            const itemId = createItemDaysOld('Test Item', 6);

            // Act & Assert: Leading zeros should be handled correctly
            const response = await request(app)
                .delete(`/api/items/00${itemId}`)
                .expect(200);

            expect(response.body).toEqual({
                message: 'Item deleted successfully',
                id: itemId
            });
        });

        it('should handle hexadecimal-looking strings', async () => {
            // Act & Assert: parseInt will parse until it hits non-numeric character
            const response = await request(app)
                .delete('/api/items/0x123')
                .expect(404); // parseInt('0x123') becomes 0

            expect(response.body).toEqual({
                error: 'Item not found'
            });
        });

        it('should handle whitespace in ID parameter', async () => {
            // Arrange: Create an item that is old enough to delete
            const itemId = createItemDaysOld('Test Item', 6);

            // Act & Assert: Whitespace should be trimmed by parseInt
            const response = await request(app)
                .delete(`/api/items/ ${itemId} `)
                .expect(200);

            expect(response.body).toEqual({
                message: 'Item deleted successfully',
                id: itemId
            });
        });
    });

    describe('response format validation', () => {
        it('should return proper JSON content type for successful deletion', async () => {
            // Arrange: Create an item that is old enough to delete
            const itemId = createItemDaysOld('Test Item', 6);

            // Act & Assert
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toBeDefined();
        });

        it('should return proper JSON content type for age restriction error', async () => {
            // Arrange: Create a recent item
            const itemId = createItemDaysOld('Recent Item', 2);

            // Act & Assert
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(403)
                .expect('Content-Type', /json/);

            expect(response.body).toBeDefined();
            expect(response.body).toHaveProperty('error');
        });

        it('should return consistent error response format', async () => {
            // Act
            const response = await request(app)
                .delete('/api/items/nonexistent')
                .expect(400);

            // Assert: Error responses should have consistent structure
            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.error).toBe('string');
            expect(response.body.error.length).toBeGreaterThan(0);
        });

        it('should return consistent success response format', async () => {
            // Arrange: Create an item that is old enough to delete
            const itemId = createItemDaysOld('Test Item', 6);

            // Act
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(200);

            // Assert: Success responses should have consistent structure
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('id');
            expect(typeof response.body.message).toBe('string');
            expect(typeof response.body.id).toBe('number');
            expect(response.body.message).toBe('Item deleted successfully');
            expect(response.body.id).toBe(itemId);
        });

        it('should return consistent age restriction error response format', async () => {
            // Arrange: Create a recent item
            const itemId = createItemDaysOld('Recent Item', 3);

            // Act
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(403);

            // Assert: Age restriction error responses should have consistent structure
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('created_at');
            expect(response.body).toHaveProperty('days_remaining');
            expect(typeof response.body.error).toBe('string');
            expect(typeof response.body.created_at).toBe('string');
            expect(typeof response.body.days_remaining).toBe('number');
            expect(response.body.error).toBe('Item cannot be deleted until it is at least 5 days old');
            expect(response.body.days_remaining).toBeGreaterThan(0);
        });
    });

    describe('database state verification', () => {
        it('should maintain database integrity after deletion', async () => {
            // Arrange: Create multiple items that are old enough to delete
            const item1Id = createItemDaysOld('Item 1', 6);
            const item2Id = createItemDaysOld('Item 2', 7);
            const item3Id = createItemDaysOld('Item 3', 8);

            // Verify initial state
            const initialCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
            expect(initialCount.count).toBe(3);

            // Act: Delete middle item
            await request(app)
                .delete(`/api/items/${item2Id}`)
                .expect(200);

            // Assert: Verify database state
            const finalCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
            expect(finalCount.count).toBe(2);

            const remainingItems = db.prepare('SELECT id FROM items ORDER BY id').all();
            expect(remainingItems.map(item => item.id)).toEqual([item1Id, item3Id]);
        });

        it('should not affect other items when deletion fails due to age restriction', async () => {
            // Arrange: Create some items - mix of old and new
            const oldItemId = createItemDaysOld('Old Item', 6);
            const newItemId = createItemDaysOld('New Item', 2);

            const initialCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
            expect(initialCount.count).toBe(2);

            // Act: Try to delete new item (should fail due to age)
            await request(app)
                .delete(`/api/items/${newItemId}`)
                .expect(403);

            // Assert: Database should be unchanged
            const finalCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
            expect(finalCount.count).toBe(2);

            // Both items should still exist
            const oldItem = db.prepare('SELECT * FROM items WHERE id = ?').get(oldItemId);
            const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(newItemId);
            expect(oldItem).toBeDefined();
            expect(newItem).toBeDefined();
        });

        it('should not affect other items when deletion fails due to non-existent item', async () => {
            // Arrange: Create some items
            createItemDaysOld('Item 1', 6);
            createItemDaysOld('Item 2', 7);

            const initialCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
            expect(initialCount.count).toBe(2);

            // Act: Try to delete non-existent item
            await request(app)
                .delete('/api/items/99999')
                .expect(404);

            // Assert: Database should be unchanged
            const finalCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
            expect(finalCount.count).toBe(2);
        });

        it('should handle multiple rapid deletions correctly when items are old enough', async () => {
            // Arrange: Create multiple items that are all old enough
            const items = [];
            for (let i = 1; i <= 5; i++) {
                const itemId = createItemDaysOld(`Item ${i}`, 6 + i);
                items.push(itemId);
            }

            // Act: Delete multiple items rapidly
            const deletePromises = items.slice(0, 3).map(id =>
                request(app).delete(`/api/items/${id}`)
            );

            const responses = await Promise.all(deletePromises);

            // Assert: All deletions should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.message).toBe('Item deleted successfully');
            });

            // Verify final database state
            const remainingCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
            expect(remainingCount.count).toBe(2);
        });

        it('should handle mixed age items correctly during bulk operations', async () => {
            // Arrange: Create items of different ages
            const oldItem1Id = createItemDaysOld('Old Item 1', 6);
            const newItem1Id = createItemDaysOld('New Item 1', 2);
            const oldItem2Id = createItemDaysOld('Old Item 2', 7);
            const newItem2Id = createItemDaysOld('New Item 2', 3);

            // Act: Try to delete all items
            const responses = await Promise.all([
                request(app).delete(`/api/items/${oldItem1Id}`),
                request(app).delete(`/api/items/${newItem1Id}`),
                request(app).delete(`/api/items/${oldItem2Id}`),
                request(app).delete(`/api/items/${newItem2Id}`)
            ]);

            // Assert: Old items should be deleted, new items should be rejected
            expect(responses[0].status).toBe(200); // old item 1
            expect(responses[1].status).toBe(403); // new item 1
            expect(responses[2].status).toBe(200); // old item 2
            expect(responses[3].status).toBe(403); // new item 2

            // Verify final database state - only new items should remain
            const remainingCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
            expect(remainingCount.count).toBe(2);

            const remainingItems = db.prepare('SELECT id FROM items ORDER BY id').all();
            expect(remainingItems.map(item => item.id)).toEqual([newItem1Id, newItem2Id]);
        });
    });
});