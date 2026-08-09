# Backlog View Design

## Overview
The Backlog View is the primary screen for managing tasks that are not yet scheduled for today or in progress. It lists all tasks with the `todo` status, allowing the user to view, sort, and manage their backlog.

## Layout & Layout Structure
- **Header**: Contains the view title ("Backlog") and a "New Task" button.
- **Controls Bar**:
  - **Search Bar**: A text input to filter tasks by title or description.
  - **Sort Dropdown**: Allows sorting by Priority (High to Low / Low to High), Created Date (Newest / Oldest), and Title (A-Z).
- **Task List Container**: A scrollable vertical list containing `TaskItem` components.
- **Empty State**: If no tasks exist, a friendly illustration or text prompting the user to create their first task is displayed.

## Interactions
- Clicking "New Task" opens the `TaskForm` (either as a modal or an inline addition at the top of the list).
- Selecting a sort option immediately reorders the task list.
- Typing in the search bar dynamically filters the list of tasks.
- Drag-and-drop interaction (to be fully implemented later, but designed for) to move tasks to the "Today" view.

## Styling (Tailwind / CSS)
- **Container**: `flex flex-col h-full bg-background text-foreground`
- **Header**: `flex justify-between items-center p-4 border-b border-border`
- **List**: `flex-1 overflow-y-auto p-4 space-y-2`
- **Typography**: Large, bold heading for the title. Subtle placeholder text for empty states.
