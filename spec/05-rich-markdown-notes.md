# Rich Markdown Notes Editor

## Overview
Integrate a TipTap rich-text editor for task descriptions. Notes are edited in styled WYSIWYG and stored as clean Markdown strings in SQLite, keeping the data portable and human-readable.

## Requirements
- TipTap editor with extensions: `StarterKit`, `TaskList`, `TaskItem`, `CodeBlock`.
- Toolbar: bold, italic, strikethrough, headings (H1–H3), bullet list, ordered list, task list, code block, blockquote, link.
- Live preview: togglable between edit mode and rendered Markdown preview.
- Auto-save: debounced save (1.5s) to SQLite via IPC on content change.
- Save button: manual save indicator with last-saved timestamp.
- Content limit: 100,000 characters.

## Data Flow
```
TipTap Editor → editor.getHTML() / Markdown serializer → content string
→ IPC: tasks:update({ id, description }) → SQLite → IpcResult<Task>
```

## UI Behavior
- Expandable editor panel within task card/detail view.
- Toolbar positioned above editor, sticky on scroll.
- Editor height: min 150px, auto-grows to fill available space.
- Preview mode renders Markdown with proper typography styling.
- "Saved" indicator shows green checkmark + relative time.

## Edge Cases
- Unsaved changes on close → warning prompt.
- Very long content → virtualized scrolling.
- Image paste → convert to base64 data URI or reject with message.
- Empty content → allowed (description is optional).

## Error Handling
- Save failure → retain local state, show retry button, exponential backoff retry.
- Content too large → `VALIDATION_ERROR`, trim warning.

## Dependencies
- Feature 4 (Backlog CRUD), Feature 2 (IPC Bridge)

## Acceptance Criteria
- [ ] WYSIWYG editing with all toolbar options functional.
- [ ] Content persists as valid Markdown in SQLite.
- [ ] Auto-save triggers on content change with debounce.
- [ ] Manual save shows confirmation indicator.
- [ ] Toggle between edit and preview modes.
- [ ] Unsaved changes prompt on navigation.
