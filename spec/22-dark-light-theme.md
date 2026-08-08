# Dark/Light Theme

## Overview
Full dark mode and light mode support via Tailwind CSS's `class` strategy with CSS custom properties. Theme preference persists in localStorage (or SQLite settings) and applies immediately on toggle.

## Requirements
- Tailwind configured with `darkMode: 'class'`.
- Theme toggle: Light, Dark, System (follows OS preference).
- System mode uses `prefers-color-scheme` media query.
- All components support both themes — no hardcoded colors.
- Theme preference persisted in `localStorage` key `theme`.
- Theme applies on app startup before render (no flash).

## CSS Architecture
```css
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-accent: #3b82f6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}

.dark {
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border: #334155;
  --color-accent: #60a5fa;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-danger: #f87171;
}
```

## Theme Application
```ts
// On startup
const theme = localStorage.getItem('theme') || 'system';
applyTheme(theme);

function applyTheme(theme: string) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // System
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  }
}
```

## Tailwind Config
```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
      }
    }
  }
};
```

## Component Usage
```tsx
<div className="bg-bg-primary text-text-primary border-border">
  {/* Always themed */}
</div>
```

## Edge Cases
- System theme changes while app running → listen to `matchMedia` change event.
- Fresh install → default to system theme.
- Corrupted localStorage → fallback to system.
- Print mode → always light theme.

## Dependencies
- Feature 20 (Dashboard UI), all UI components

## Acceptance Criteria
- [ ] Dark/light/system modes all work.
- [ ] Theme persists across app restarts.
- [ ] No white flash on dark mode startup.
- [ ] System theme auto-detected on first launch.
- [ ] All components styled with theme variables — no hardcoded colors.
- [ ] OS theme change detected while app running.
