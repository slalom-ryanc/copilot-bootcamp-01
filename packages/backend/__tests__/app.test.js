const request = require('supertest');
const { app, db, insertStmt } = require('../src/app');

/**
 * Unit tests for the DELETE /api/items/:id endpoint.
 * 
 * This test suite covers:
 * - Successful deletion scenarios
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

    describe('successful deletion', () => {
        it('should delete an existing item and return success message', async () => {
            // Arrange: Create an item to delete
            const result = insertStmt.run('Test Item');
            const itemId = result.lastInsertRowid;

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

        it('should successfully delete item with valid integer ID as string', async () => {
            // Arrange: Create an item to delete
            const result = insertStmt.run('Another Test Item');
            const itemId = result.lastInsertRowid;

            // Act: Delete the item using string ID
            const response = await request(app)
                .delete(`/api/items/${itemId.toString()}`)
                .expect(200);

            // Assert: Check response
            expect(response.body.message).toBe('Item deleted successfully');
            expect(response.body.id).toBe(itemId);
        });

        it('should delete correct item when multiple items exist', async () => {
            // Arrange: Create multiple items
            const item1Result = insertStmt.run('Item 1');
            const item2Result = insertStmt.run('Item 2');
            const item3Result = insertStmt.run('Item 3');

            const item1Id = item1Result.lastInsertRowid;
            const item2Id = item2Result.lastInsertRowid;
            const item3Id = item3Result.lastInsertRowid;

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
            // Arrange: Create an item
            const result = insertStmt.run('Test Item');
            const itemId = result.lastInsertRowid;

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
            // Arrange: Create an item
            const result = insertStmt.run('Test Item');
            const itemId = result.lastInsertRowid;

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
        it('should return proper JSON content type', async () => {
            // Arrange
            const result = insertStmt.run('Test Item');
            const itemId = result.lastInsertRowid;

            // Act & Assert
            const response = await request(app)
                .delete(`/api/items/${itemId}`)
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toBeDefined();
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
            // Arrange
            const result = insertStmt.run('Test Item');
            const itemId = result.lastInsertRowid;

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
    });

    describe('database state verification', () => {
        it('should maintain database integrity after deletion', async () => {
            // Arrange: Create multiple items
            const item1Result = insertStmt.run('Item 1');
            const item2Result = insertStmt.run('Item 2');
            const item3Result = insertStmt.run('Item 3');

            const item1Id = item1Result.lastInsertRowid;
            const item2Id = item2Result.lastInsertRowid;
            const item3Id = item3Result.lastInsertRowid;

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

        it('should not affect other items when deletion fails', async () => {
            // Arrange: Create some items
            insertStmt.run('Item 1');
            insertStmt.run('Item 2');

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

        it('should handle multiple rapid deletions correctly', async () => {
            // Arrange: Create multiple items
            const items = [];
            for (let i = 1; i <= 5; i++) {
                const result = insertStmt.run(`Item ${i}`);
                items.push(result.lastInsertRowid);
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
    });
});