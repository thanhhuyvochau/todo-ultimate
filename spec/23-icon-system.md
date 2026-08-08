# Icon System

## Overview
Use Lucide React (`lucide-react`) as the sole icon library. All icons are imported by name and rendered as React components. No custom SVG files, no icon font, no other icon library.

## Requirements
- All icons from `lucide-react` only.
- Import individually: `import { Check, Plus, Timer } from 'lucide-react'`.
- Icons sized consistently via Tailwind classes (`size-4`, `size-5`, `size-6`).
- Icon colors match theme tokens.

## Icon Map (by usage)

| Context | Icon | Code |
|---------|------|------|
| Add task | Plus | `Plus` |
| Complete check | Check, CheckCircle2 | `Check`, `CheckCircle2` |
| Priority high | AlertTriangle | `AlertTriangle` |
| Priority medium | MinusCircle | `MinusCircle` |
| Priority low | ArrowDown | `ArrowDown` |
| Timer/Play | Play | `Play` |
| Timer/Pause | Pause | `Pause` |
| Edit | Pencil | `Pencil` |
| Delete | Trash2 | `Trash2` |
| Save | Save | `Save` |
| Settings | Settings | `Settings` |
| Backlog | Inbox | `Inbox` |
| Today | Calendar | `Calendar` |
| Plan | Lightbulb | `Lightbulb` |
| Reports | BarChart3 | `BarChart3` |
| Dark theme | Moon | `Moon` |
| Light theme | Sun | `Sun` |
| Search | Search | `Search` |
| Filter | Filter | `Filter` |
| Close/X | X | `X` |
| Expand | ChevronDown | `ChevronDown` |
| Collapse | ChevronUp | `ChevronUp` |
| Drag handle | GripVertical | `GripVertical` |
| Locked timer | Lock | `Lock` |
| Error/warning | AlertCircle | `AlertCircle` |
| Success | CheckCircle2 | `CheckCircle2` |
| Loading/spinner | Loader2 | `Loader2` |
| External link | ExternalLink | `ExternalLink` |
| Copy | Copy | `Copy` |
| Info | Info | `Info` |

## Usage Conventions
```tsx
import { Plus, type LucideIcon } from 'lucide-react';

// Inline with text
<button className="flex items-center gap-2">
  <Plus className="size-4 text-text-secondary" />
  <span>Add Task</span>
</button>

// Standalone with accessible label
<button aria-label="Delete task">
  <Trash2 className="size-5 text-danger" />
</button>

// With tooltip (future)
<Tooltip label="Start timer">
  <Play className="size-5 text-success cursor-pointer" />
</Tooltip>
```

## Rules
- No icon size below `size-3` (12px) — too small for recognition.
- No icon size above `size-10` (40px) — reserved for app logo.
- Standard size: `size-4` (16px) for inline, `size-5` (20px) for standalone buttons.
- Always provide `aria-label` on icon-only buttons.
- Never mix icon libraries.

## Dependencies
- All UI components

## Acceptance Criteria
- [ ] All icons from `lucide-react`.
- [ ] Consistent sizing via Tailwind `size-*` classes.
- [ ] Icon-only buttons have `aria-label`.
- [ ] No raw SVG files or other icon libs.
- [ ] Icon colors follow theme tokens.
