# Delete Confirmation Dialog Design

## Overview
A critical safety feature that prevents accidental permanent data loss. When a user attempts to delete a task, this dialog intercepts the action and requires explicit confirmation.

## Layout & Content
- **Backdrop**: A semi-transparent overlay covering the entire screen to focus attention.
- **Dialog Box**: Centered modal window.
- **Header**: Contains a warning icon and the title "Delete Task?".
- **Body**: Text explaining the consequence, e.g., "Are you sure you want to delete '[Task Title]'? This action cannot be undone."
- **Footer**:
  - **Cancel Button**: Neutral styling, closes the dialog.
  - **Delete Button**: Destructive styling (red), executes the delete action.

## Interactions
- **Focus Trap**: Keyboard focus should be trapped within the dialog while it is open.
- **Escape Key**: Closes the dialog.
- **Enter Key**: Default action (should probably be Cancel to be safe, but can be configured).

## Styling
- **Overlay**: `fixed inset-0 bg-background/80 backdrop-blur-sm z-50`
- **Dialog Box**: `fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg bg-background p-6 shadow-lg sm:rounded-lg border border-border`
- **Destructive Button**: `bg-destructive text-destructive-foreground hover:bg-destructive/90`
