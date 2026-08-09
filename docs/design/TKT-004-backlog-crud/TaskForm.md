# Task Form Design

## Overview
The `TaskForm` is used for creating new tasks or fully editing existing ones. It ensures all required data (title, estimated minutes, priority) is captured and validated before submission.

## Layout & Fields
- **Title Input**: A text input field. Maximum length 200 characters. Required.
- **Estimated Time Input**: A numeric input field for minutes. Must be > 0 and <= 1440. Required.
- **Priority Selector**: A segmented control, dropdown, or set of radio buttons to select `low`, `medium`, or `high`.
- **Description (Rich Text)**: A TipTap-based rich text editor for markdown notes (placeholder for TKT-005, but space should be allocated). Optional.
- **Action Buttons**:
  - **Cancel**: Discards changes and closes the form.
  - **Save / Create**: Submits the form. Disabled if validation fails.

## Interactions
- **Validation**: Real-time validation on fields. If an input is invalid, a red error message appears below the respective field, and the input border turns red.
- **Keyboard Shortcuts**: Pressing `Enter` in the title field (when valid) submits the form. `Escape` cancels.
- **Loading State**: While the IPC call is resolving, the submit button shows a spinner and fields are disabled.

## Styling
- **Layout**: Can be rendered inside a Dialog/Modal, or inline in a dedicated panel. `flex flex-col gap-4`.
- **Inputs**: Standard UI kit inputs (`ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`).
- **Error Text**: `text-xs text-destructive mt-1`.
