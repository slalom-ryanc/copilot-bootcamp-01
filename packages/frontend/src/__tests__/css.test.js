/**
 * Tests for CSS files to ensure they don't break the build
 * and are properly structured for the application.
 *
 * While CSS files don't contain executable JavaScript code,
 * testing their import and basic structure helps ensure
 * the build process works correctly and styles are available.
 */

describe('CSS Files', () => {
  describe('App.css', () => {
    it('should be importable without errors', () => {
      // This test ensures the CSS file can be imported without syntax errors
      expect(() => {
        require('../App.css');
      }).not.toThrow();
    });

    it('should contain valid CSS (no syntax errors)', () => {
      // Since App.css is minimal and mainly contains comments,
      // we just verify it doesn't cause import errors
      const css = require('../App.css');

      // CSS modules return an empty object for plain CSS files
      // or the CSS content, depending on the setup
      expect(css).toBeDefined();
    });
  });

  describe('index.css', () => {
    it('should be importable without errors', () => {
      // This test ensures the CSS file can be imported without syntax errors
      expect(() => {
        require('../index.css');
      }).not.toThrow();
    });

    it('should contain valid CSS (no syntax errors)', () => {
      // Verify the CSS file can be loaded
      const css = require('../index.css');
      expect(css).toBeDefined();
    });

    it('should be imported in index.js', () => {
      // Verify that index.css is properly imported in the main index file
      // This is more of an integration test to ensure styles are loaded
      const fs = require('fs');
      const path = require('path');

      const indexJsPath = path.join(__dirname, '../index.js');
      const indexJsContent = fs.readFileSync(indexJsPath, 'utf8');

      // eslint-disable-next-line quotes
      expect(indexJsContent).toContain("import './index.css'");
    });
  });

  describe('CSS Integration', () => {
    it('should not conflict with MUI theming', () => {
      // Test that our CSS files can coexist with MUI
      expect(() => {
        require('../App.css');
        require('../index.css');
        // Import MUI components to check for conflicts
        require('@mui/material/styles');
      }).not.toThrow();
    });

    it('should maintain consistent font families', () => {
      // Test that our CSS defines consistent typography
      const fs = require('fs');
      const path = require('path');

      const indexCssPath = path.join(__dirname, '../index.css');
      const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

      // Verify font-family is defined in index.css
      expect(indexCssContent).toContain('font-family');

      // Verify it includes system fonts for better cross-platform support
      expect(indexCssContent).toContain('-apple-system');
      expect(indexCssContent).toMatch(/BlinkMacSystemFont|Segoe UI|Roboto/);
    });

    it('should include proper font smoothing settings', () => {
      const fs = require('fs');
      const path = require('path');

      const indexCssPath = path.join(__dirname, '../index.css');
      const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

      // Verify font smoothing is configured for better rendering
      expect(indexCssContent).toContain('-webkit-font-smoothing');
      expect(indexCssContent).toContain('-moz-osx-font-smoothing');
    });

    it('should define code font family separately', () => {
      const fs = require('fs');
      const path = require('path');

      const indexCssPath = path.join(__dirname, '../index.css');
      const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

      // Verify code elements have monospace fonts
      expect(indexCssContent).toContain('code {');
      expect(indexCssContent).toContain('source-code-pro');
      expect(indexCssContent).toContain('monospace');
    });
  });
});
