# Task Item Design

## Overview
The `TaskItem` component represents a single task row within the `BacklogView`. It provides a quick summary of the task and allows for inline editing and deletion.

## Layout & Content
- **Main Container**: A card or row layout that spans the full width of the list container.
- **Left Section**:
  - Drag handle icon (for future reordering/moving to Today).
  - Checkbox (disabled in Backlog, or used for selection).
- **Center Section**:
  - **Title**: The task title (truncated if too long).
  - **Estimated Time**: Displayed as a small label (e.g., "30m", "1h 15m").
- **Right Section**:
  - `PriorityBadge` component.
  - **Actions Menu / Icons**:
    - Edit button (pencil icon) to trigger inline editing.
    - Delete button (trash icon) to trigger the `DeleteConfirmationDialog`.

## Interactions
- **Hover State**: The background subtly changes color, and action icons (Edit/Delete) become visible or highlighted.
- **Inline Edit Mode**: When the edit button or title is clicked, the title turns into an input field, and the estimated time and priority can be quickly adjusted. "Save" and "Cancel" buttons appear.
- **Delete**: Clicking the delete icon stops event propagation and opens the confirmation dialog.

## Styling
- **Container**: `flex items-center gap-3 p-3 rounded-md bg-card border border-border hover:border-primary transition-colors`
- **Text**: `text-sm font-medium` for title, `text-xs text-muted-foreground` for meta data.
- **Icons**: Lucide React icons, sized `w-4 h-4 text-muted-foreground hover:text-foreground`.
