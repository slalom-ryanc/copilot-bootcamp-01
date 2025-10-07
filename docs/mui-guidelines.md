# MUI Guidelines

This document outlines the guidelines and best practices for using Material-UI (MUI) components in this project.

## Overview

MUI is a React component library that implements Google's Material Design. This project uses MUI to provide a consistent, accessible, and professionally designed user interface.

## Installation and Setup

MUI should be installed as a dependency in the frontend package:

```bash
npm install @mui/material @emotion/react @emotion/styled
```

For icons:
```bash
npm install @mui/icons-material
```

## Theme Configuration

### Theme Provider Setup

Always wrap your app with the MUI ThemeProvider:

```javascript
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Your app components */}
    </ThemeProvider>
  );
}
```

### Custom Theme Guidelines

- Define consistent color palettes using the theme configuration
- Use theme breakpoints for responsive design
- Customize typography scales appropriately for the application
- Define consistent spacing using theme spacing units

## Component Usage Guidelines

### Import Organization

Follow the project's import organization guidelines with MUI imports:

```javascript
// External dependencies (MUI first, then others)
import { Button, TextField, Box, Typography } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import React, { useState } from 'react';

// Project components
import CustomDialog from '../components/CustomDialog';

// Utilities and constants
import { validateEmail } from '../utils/validation';

// Styles
import './MyComponent.css';
```

### Component Selection

#### Layout Components
- Use `Box` for flexible layout containers
- Use `Container` for consistent page layouts
- Use `Grid` for complex layouts requiring precise control
- Use `Stack` for simple vertical or horizontal layouts

#### Form Components
- Use `TextField` for all text inputs
- Use `Select` for dropdown selections
- Use `Checkbox` and `Radio` for selections
- Use `Button` for actions
- Implement proper form validation with MUI's built-in error states

#### Navigation Components
- Use `AppBar` for top navigation
- Use `Drawer` for side navigation
- Use `Tabs` for section navigation
- Use `Breadcrumbs` for hierarchical navigation

#### Data Display
- Use `Table` components for tabular data
- Use `List` components for simple data lists
- Use `Card` for grouped content
- Use `Typography` for all text content

### Styling Best Practices

#### Use the sx Prop

Prefer the `sx` prop for component-specific styling:

```javascript
<Box
  sx={{
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    p: 3,
    bgcolor: 'background.paper',
    borderRadius: 1,
  }}
>
  <Typography variant="h5" component="h2">
    Title
  </Typography>
  <TextField label="Name" variant="outlined" />
</Box>
```

#### Theme Integration

Always use theme values instead of hardcoded values:

```javascript
// Good - uses theme values
<Button
  sx={{
    mt: theme.spacing(2),
    bgcolor: theme.palette.primary.main,
  }}
>
  Submit
</Button>

// Better - using theme shortcuts in sx
<Button
  sx={{
    mt: 2,
    bgcolor: 'primary.main',
  }}
>
  Submit
</Button>
```

#### Responsive Design

Use MUI's breakpoint system for responsive design:

```javascript
<Box
  sx={{
    display: { xs: 'block', md: 'flex' },
    gap: { xs: 1, md: 3 },
    p: { xs: 2, md: 4 },
  }}
>
  Content
</Box>
```

### Accessibility Guidelines

- Always provide meaningful labels for form controls
- Use proper ARIA attributes when needed
- Ensure sufficient color contrast
- Make interactive elements keyboard accessible
- Use semantic HTML elements when possible

```javascript
<TextField
  label="Email Address"
  type="email"
  required
  aria-describedby="email-helper-text"
  helperText="We'll never share your email"
  id="email-helper-text"
/>
```

## Component Patterns

### Form Handling

Use controlled components with proper validation:

```javascript
function UserForm({ onSubmit }) {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Validate and submit
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Name"
        value={formData.name}
        onChange={handleChange('name')}
        error={!!errors.name}
        helperText={errors.name}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleChange('email')}
        error={!!errors.email}
        helperText={errors.email}
        margin="normal"
      />
      <Button
        type="submit"
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
      >
        Submit
      </Button>
    </Box>
  );
}
```

### Loading States

Implement proper loading states for better user experience:

```javascript
function DataTable() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      {/* Table content */}
    </TableContainer>
  );
}
```

### Error Handling

Use MUI components for consistent error display:

```javascript
function ErrorBoundary({ error, onRetry }) {
  return (
    <Alert 
      severity="error" 
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}
```

## Performance Considerations

### Tree Shaking

Import only the components you need:

```javascript
// Good - specific imports
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

// Avoid - imports entire library
import * as MUI from '@mui/material';
```

### Bundle Size

- Use MUI's built-in tree shaking
- Consider using `@mui/lab` components cautiously as they may have larger bundle sizes
- Monitor bundle size when adding new MUI components

## Testing with MUI Components

### Testing Library Integration

Test MUI components using React Testing Library:

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MyComponent from './MyComponent';

const theme = createTheme();

function renderWithTheme(component) {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
}

describe('MyComponent', () => {
  it('should submit form when button is clicked', () => {
    const mockSubmit = jest.fn();
    renderWithTheme(<MyComponent onSubmit={mockSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(mockSubmit).toHaveBeenCalled();
  });
});
```

## Migration Guidelines

When migrating existing components to MUI:

1. Start with layout components (`Box`, `Container`, `Grid`)
2. Replace form elements with MUI equivalents
3. Update styling to use the `sx` prop and theme values
4. Ensure accessibility standards are maintained
5. Test thoroughly for visual and functional regressions

## Common Patterns to Avoid

- Don't mix MUI styling with external CSS frameworks
- Avoid overriding MUI component styles with `!important`
- Don't use inline styles when `sx` prop is available
- Avoid creating custom components that duplicate MUI functionality
- Don't ignore the theme system - always use theme values

## Resources

- [MUI Documentation](https://mui.com/)
- [Material Design Guidelines](https://material.io/design)
- [MUI System Documentation](https://mui.com/system/getting-started/overview/)
- [MUI Theme Customization](https://mui.com/material-ui/customization/theming/)