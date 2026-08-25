# DESIGN.md - UI Design System & Component Guidelines

This document defines the visual design system, color tokens, typography rules, component standards, and layout guidelines for the AI Task & Performance Planner application. All UI implementation in the Electron Renderer process (`src/renderer/`) MUST strictly adhere to this specification.

---

## 1. Design Vision & UX Principles

The application is a high-performance, local-first desktop environment. The UI must feel fast, premium, precise, and non-distracting.

- **Dark-First, Dual-Theme Architecture**: Seamless support for both Dark mode (default preferred for focus) and Light mode, driven by Tailwind CSS variables without color flickering.
- **Visual Hierarchy & Clarity**: Information is organized into predictable panels, cards, and data badges with clear typographic scale.
- **Consistent Desktop Shell**: Fixed persistent Header and Status Bar, with a collapsible Navigation Sidebar and a smooth scrollable Content View.
- **Accessible & Keyboard-Friendly**: All interactive elements have visible focus indicators and accessible keyboard shortcuts.

---

## 2. Color Palette & Theme Tokens

The application uses CSS Custom Properties (`:root` and `.dark`) wired directly into Tailwind CSS. **Never hardcode hex or rgb values inside components.**

### 2.1 CSS Variables Definitions

The design system uses an indigo-tinted dual theme. The dark theme is the default and is bound to `:root`; the light theme overrides via the `.light` class. All values below are the **current implemented palette** in `src/renderer/src/assets/main.css`.

```css
:root {
  /* Backgrounds */
  --color-bg-primary: #0b1020;
  --color-bg-secondary: #121830;
  --color-bg-tertiary: #1d2440;
  --color-bg-surface: #131a33;
  --color-bg-elevated: #1e2747;

  /* Typography */
  --color-text-primary: rgba(235, 240, 255, 0.94);
  --color-text-secondary: rgba(200, 210, 235, 0.62);
  --color-text-muted: rgba(190, 200, 230, 0.38);
  --color-text-inverse: #0b1020;

  /* Borders & Dividers */
  --color-border: rgba(150, 170, 220, 0.14);
  --color-border-subtle: rgba(150, 170, 220, 0.08);
  --color-border-focus: #818cf8;

  /* Accents & Statuses */
  --color-accent: #818cf8;
  --color-accent-hover: #a5b4fc;
  --color-accent-subtle: rgba(129, 140, 248, 0.16);

  --color-success: #34d399;
  --color-success-subtle: rgba(52, 211, 153, 0.12);

  --color-warning: #fbbf24;
  --color-warning-subtle: rgba(251, 191, 36, 0.12);

  --color-danger: #f87171;
  --color-danger-subtle: rgba(248, 113, 113, 0.12);

  --color-info: #818cf8;
  --color-info-subtle: rgba(129, 140, 248, 0.12);
}

.light {
  /* Backgrounds */
  --color-bg-primary: #f6f7fb;
  --color-bg-secondary: #eef0f8;
  --color-bg-tertiary: #e3e6f2;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #ffffff;

  /* Typography */
  --color-text-primary: #16192e;
  --color-text-secondary: #4a5072;
  --color-text-muted: #9499b5;
  --color-text-inverse: #ffffff;

  /* Borders & Dividers */
  --color-border: #dde1ef;
  --color-border-subtle: #eef0f8;
  --color-border-focus: #6366f1;

  /* Accents & Statuses */
  --color-accent: #6366f1;
  --color-accent-hover: #4f46e5;
  --color-accent-subtle: rgba(99, 102, 241, 0.1);

  --color-success: #10b981;
  --color-success-subtle: rgba(16, 185, 129, 0.1);

  --color-warning: #d97706;
  --color-warning-subtle: rgba(217, 119, 6, 0.1);

  --color-danger: #ef4444;
  --color-danger-subtle: rgba(239, 68, 68, 0.1);

  --color-info: #6366f1;
  --color-info-subtle: rgba(99, 102, 241, 0.1);
}
```

### 2.2 Domain Semantic Badges

| Badge Category | Priority / Status     | Dark Theme Style                                           | Light Theme Style                                   |
| :------------- | :-------------------- | :--------------------------------------------------------- | :-------------------------------------------------- |
| **Priority**   | High                  | `bg-red-500/10 text-red-400 border-red-500/20`             | `bg-red-50 text-red-700 border-red-200`             |
| **Priority**   | Medium                | `bg-amber-500/10 text-amber-400 border-amber-500/20`       | `bg-amber-50 text-amber-700 border-amber-200`       |
| **Priority**   | Low                   | `bg-slate-500/10 text-slate-400 border-slate-500/20`       | `bg-slate-100 text-slate-600 border-slate-200`      |
| **Status**     | Backlog / Todo        | `bg-slate-500/10 text-slate-400`                           | `bg-slate-100 text-slate-700`                       |
| **Status**     | In Progress           | `bg-blue-500/10 text-blue-400 border-blue-500/20`          | `bg-blue-50 text-blue-700 border-blue-200`          |
| **Status**     | Completed             | `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| **Type**       | Fixed Recurring Block | `bg-purple-500/10 text-purple-400 border-purple-500/20`    | `bg-purple-50 text-purple-700 border-purple-200`    |

---

## 3. Typography & Hierarchy

The application uses standard sans-serif font family stack with tabular monospace font for numbers, timers, and code listings.

### 3.1 Typographic Scale

| Role               | Class Name              | Font Size / Weight    | Line Height | Usage                                                    |
| :----------------- | :---------------------- | :-------------------- | :---------- | :------------------------------------------------------- |
| **Title 1**        | `text-2xl font-bold`    | 24px / Bold (700)     | 1.33        | Primary View Headers (Backlog, Today, Reports)           |
| **Title 2**        | `text-xl font-semibold` | 20px / SemiBold (600) | 1.4         | Modal Headers, Section Titles                            |
| **Title 3**        | `text-lg font-medium`   | 18px / Medium (500)   | 1.55        | View toolbar titles, prominent card titles               |
| **Body Primary**   | `text-base font-normal` | 16px / Regular (400)  | 1.625       | Task names, descriptions, primary inputs                 |
| **Body Secondary** | `text-sm font-normal`   | 14px / Regular (400)  | 1.43        | Secondary text, button labels, timestamps                |
| **Body Muted**     | `text-xs font-normal`   | 13px / Regular (400)  | 1.38        | Subtitles, help texts, annotations                       |
| **Timer / Code**   | `font-mono text-sm`     | 14px / Monospace      | 1.4         | Live Header Timer readout (`00:45:12`), estimate pilling |

> **Base font**: the document body is `15px` with `1.6` line-height. The Tailwind `fontSize` tokens are overridden as follows: `2xs` 11px, `xs` 13px, `sm` 14px, `base` 16px, `lg` 18px, `xl` 20px, `2xl` 24px.

---

## 4. Layout Architecture & Spacing

### 4.1 Shell Wireframe Layout

The screen layout consists of 4 distinct regions:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header Bar (h-14)                                                      │
│ [☰ Toggle Sidebar] App Logo & Name             [⏱ Active Task Timer]   │
├─────────────────┬──────────────────────────────────────────────────────┤
│ Sidebar (w-56)  │ Main Scrollable Content Area                         │
│                 │ (flex-1 overflow-y-auto p-6)                         │
│ 📥 Backlog      │                                                      │
│ 📅 Today        │                                                      │
│ 💡 Daily Plan   │                                                      │
│ 📊 Reports      │                                                      │
│                 │                                                      │
│ ⚙️ Settings     │                                                      │
├─────────────────┴──────────────────────────────────────────────────────┤
│ Status Footer (h-8) [DB Sync: ✅ | API Key: 🔑 | Time: 21:44]           │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Spacing & Container Rules

- **Grid Baseline**: 4px scaling (`p-1`=4px, `p-2`=8px, `p-3`=12px, `p-4`=16px, `p-6`=24px).
- **View Padding**: All main view content containers MUST use `p-6` (24px) for page padding.
- **Card Spacing**: Task lists and card grids use `space-y-3` or `gap-3` (12px spacing).
- **Responsive Breakpoint**: Below 1024px, the sidebar collapses into icon-only mode (`w-16`). Minimum app window dimensions are `900x600px`. (Current implementation uses a persistent labeled `w-56` sidebar.)

---

## 5. Iconography Standard (`lucide-react`)

**Lucide React is the single source of truth for all icons.** No custom SVG files or external icon fonts are permitted.

### 5.1 Icon Sizing Rules

- **Inline Text / Badges**: `size-4` (16px)
- **Action Buttons / Header Widget**: `size-5` (20px)
- **Sidebar Navigation / Section Icons**: `size-5` (20px)
- **App Logo / Hero Empty State**: `size-8` (32px) to `size-10` (40px)

### 5.2 Key Icon Map

| Context / Element     | Icon Component  | Usage Example                                        |
| :-------------------- | :-------------- | :--------------------------------------------------- |
| Backlog View          | `Inbox`         | `<Inbox className="size-5" />`                       |
| Today View            | `Calendar`      | `<Calendar className="size-5" />`                    |
| Daily Plan View       | `Lightbulb`     | `<Lightbulb className="size-5" />`                   |
| Reports View          | `BarChart3`     | `<BarChart3 className="size-5" />`                   |
| Settings              | `Settings`      | `<Settings className="size-5" />`                    |
| Add Task              | `Plus`          | `<Plus className="size-4" />`                        |
| Start / Play Timer    | `Play`          | `<Play className="size-4 text-emerald-500" />`       |
| Pause Timer           | `Pause`         | `<Pause className="size-4 text-amber-500" />`        |
| Complete Task         | `CheckCircle2`  | `<CheckCircle2 className="size-4" />`                |
| High Priority Warning | `AlertTriangle` | `<AlertTriangle className="size-4 text-red-500" />`  |
| Drag Handle           | `GripVertical`  | `<GripVertical className="size-4 text-slate-400" />` |
| Loading Spinner       | `Loader2`       | `<Loader2 className="size-4 animate-spin" />`        |

---

## 6. Component Guidelines

### 6.1 Buttons (`/components/ui/button.tsx`)

- **Primary**: `bg-accent text-white hover:bg-accent-hover rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors`
- **Secondary**: `bg-bg-tertiary text-text-primary hover:bg-border rounded-md px-4 py-2 text-sm font-medium transition-colors`
- **Ghost**: `text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md p-2 transition-colors`
- **Danger**: `bg-danger text-white hover:bg-red-600 rounded-md px-4 py-2 text-sm font-medium transition-colors`
- **Icon Buttons**: Icon-only buttons MUST include an `aria-label` attribute (e.g. `<button aria-label="Pause timer">`).

### 6.2 Task Cards (`/components/tasks/task-card.tsx`)

- Cards use `bg-bg-surface border border-border rounded-lg p-4 shadow-sm hover:border-accent/40 transition-all`.
- **Drag Handle**: Displays `GripVertical` icon on hover for reordering.
- **Priority Badge**: Displayed in top-right corner.
- **Time Estimate / Log Pill**: Displays `⏱ estimated_minutes m` alongside actual duration.

### 6.3 TipTap Markdown Editor Container

- Sandboxed inside a card container (`bg-bg-surface border border-border rounded-lg p-4 min-h-[160px]`).
- Toolbar features compact icon buttons for formatting (`Bold`, `Italic`, `List`, `Code`, `CheckSquare`).
- Editor content rendered in clean typography using Tailwind Typography / Prose classes.

### 6.4 Modals & Dialog Overlay

- Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center`
- Modal Box: `bg-bg-surface border border-border rounded-xl max-w-lg w-full p-6 shadow-xl`
- Closing: Dismissible via pressing `Esc` or clicking top-right `X` button.

---

## 7. Animations & Interactive States

- **Transitions**: Use standard `transition-colors duration-150 ease-in-out` for hover and active button states.
- **Focus Rings**: Interactive elements MUST display a visible focus ring for keyboard navigation:
  `focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary`
- **Live Active Timer Pulse**: When a task timer is actively running in the header bar, display a subtle pulsing green indicator:
  `<span className="size-2 rounded-full bg-emerald-500 animate-pulse" />`
- **Loading Skeleton**: Use `animate-pulse bg-bg-tertiary rounded` for layout loading placeholders.

---

## 8. UI Consistency Checklist for Developers

When building or modifying components in `src/renderer/`, verify against this checklist:

- [ ] All colors use CSS variables / Tailwind theme tokens (`bg-bg-primary`, `text-text-primary`, `border-border`).
- [ ] No inline hex or RGB colors in JSX.
- [ ] All icons imported directly from `lucide-react`.
- [ ] Icon-only buttons have descriptive `aria-label` attributes.
- [ ] Typography sizes strictly follow the Typographic Scale in Section 3.
- [ ] Component files kept small (< 150 lines) with extracted UI helpers.
- [ ] Both Light mode and Dark mode look visually balanced with proper contrast.
