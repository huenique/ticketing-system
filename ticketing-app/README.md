# Ticketing System

This is a ticketing system application that allows users to manage support tickets through a flexible interface.

## Recent Refactoring

The codebase was recently refactored to improve maintainability and organization while preserving all functionality and appearance. The changes include:

### New File Structure

- **Types**: Created `types/tickets.ts` to centralize all interfaces and type definitions.
- **Constants**: Created `constants/tickets.ts` to store preset data and constants.
- **Utils**: Created `utils/ticketUtils.ts` to contain helper functions that were previously inline.
- **Components**: Extracted reusable components like `TabNavigation` and `TicketWidget` into separate files.
- **Hooks**: Created custom hooks to manage related state and logic:
  - `useTickets`: Main ticket management logic
  - `useTabs`: Tab operations (adding, renaming, dragging)
  - `useColumns`: Column operations (adding, renaming, dragging)
  - `useWidgets`: Widget operations for ticket dialogs

### Benefits of the Refactoring

1. **Improved Maintainability**: Smaller, focused files are easier to understand and modify.
2. **Better Separation of Concerns**: Logic is now grouped by functionality rather than mixed together.
3. **Enhanced Reusability**: Components and hooks can be reused in other parts of the application.
4. **Type Safety**: Centralized type definitions ensure consistency across the application.
5. **Easier Testing**: Isolated functionality is more testable.

### No Functional Changes

The refactoring preserved all existing functionality:

- Tab management (adding, renaming, closing, and dragging)
- Table management (column manipulation, row handling)
- Ticket viewing and editing
- Widget-based ticket detail customization
- All styling and user experience elements

## Running the Application

[Add instructions for running the application]
