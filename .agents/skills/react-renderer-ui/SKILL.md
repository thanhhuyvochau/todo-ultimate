---
name: react-renderer-ui
description: Governs code generation and UI architecture within the Electron Renderer Process (src/renderer/), covering React component standards, Zustand state management, and TipTap markdown editing.
---

# SKILL: React Frontend & Renderer UI Engineering

This skill governs code generation and UI architecture within the Electron Renderer Process (`src/renderer/`).

## 1. Core Principles & Boundaries

- **Pure Web Environment:** Treat the Renderer as a sandboxed web application.
- **NO Native Node.js Imports:** Never import `fs`, `path`, `child_process`, `electron`, or `better-sqlite3` directly in the Renderer. Communicate with the OS strictly via `window.api`.

## 2. React & Component Architecture

- **Functional Components Only:** Use React 18 functional components and hooks. No class components.
- **Named Exports:** Use `export function TaskCard()` instead of default exports.
- **Component Extraction:** Keep components small (< 150 lines). Extract repeated sub-elements into `/components/ui/`.

## 3. State Management & Data Fetching (Zustand)

- **Stores:** Maintain state in topic-specific Zustand stores (`useTaskStore`, `useTimerStore`).
- **Source of Truth:** Derive view filtering (e.g., active vs. backlog tasks) dynamically rather than maintaining duplicate array states.
- **Custom Hooks for IPC:** Encapsulate `window.api` calls inside dedicated hooks or store actions rather than executing raw inline promises inside component JSX bodies.

## 4. Notes & Markdown Editor (TipTap)

- **TipTap Extensions:** Configure TipTap with StarterKit, TaskList, TaskItem, and CodeBlock extensions.
- **Output Format:** Save note content as pure Markdown strings (`editor.getHTML()` / Markdown extensions) for SQLite persistence.
