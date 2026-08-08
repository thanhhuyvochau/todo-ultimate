# TECHNICAL_STACK.md - Technical Stack & Engineering Architecture

This document details the complete technical stack, software engineering choices, libraries, and integration strategies for the Electron AI Task & Performance Planner application.

## 1. Stack Overview & Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ELECTRON MAIN PROCESS                              │
│                                                                             │
│   ┌───────────────────────┐   ┌───────────────────┐   ┌─────────────────┐   │
│   │   Electron Runtime    │   │ SQLite Database   │   │ OS safeStorage  │   │
│   │   (Node.js + V8)      │   │ (better-sqlite3)  │   │ API Key Vault   │   │
│   └───────────┬───────────┘   └─────────┬─────────┘   └────────┬────────┘   │
│               │                         │                      │            │
│               └─────────────────────────┼──────────────────────┘            │
│                                         │                                   │
│                        IPC Handler Layer (Main Side)                        │
└─────────────────────────────────────────┼───────────────────────────────────┘
                                          │ Context Bridge / Preload (IPC)
┌─────────────────────────────────────────┼───────────────────────────────────┘
│                        IPC Bridge Layer (Renderer Side)                     │
│                                         │                                   │
│   ┌─────────────────────────────────────▼──────────────────────────────┐    │
│   │                     React 18 Renderer Process                      │    │
│   │                                                                    │    │
│   │  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────┐  │    │
│   │  │ State (Zustand)      │  │ Notes (TipTap)   │  │ Styling      │  │    │
│   │  │ & Data Fetching      │  │ Markdown Engine  │  │ Tailwind CSS │  │    │
│   │  └──────────────────────┘  └──────────────────┘  └──────────────┘  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                          ELECTRON RENDERER PROCESS                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │ HTTPS (OpenAI SDK / JSON Mode)
                                          ▼
                             DeepSeek API (v1 / Chat)
```

## 2. Layer-by-Layer Technical Stack

### 2.1 Core Desktop Shell (Main Process)

- **Runtime / Engine:** Electron (bundled with Node.js & Chromium)
- **Language:** TypeScript 5.x (Strict mode enabled, `noUncheckedIndexedAccess: true`)
- **Build / Bundler Tool:** electron-vite / Vite
  - Fast HMR (Hot Module Replacement) during renderer development.
  - Native ES module resolution and clean main/preload/renderer bundle outputs.

**Process Separation & Security Settings:**

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` for renderer windows.

### 2.2 Local Database & Data Access

- **Database Engine:** SQLite3
- **Driver:** better-sqlite3
  - Synchronous execution in Electron Main Process for low-latency queries.
  - WAL Mode (`PRAGMA journal_mode = WAL;`) for fast concurrent reads and transactional safety.
- **Database Migrations:** Custom light migration runner (`schema.ts`) applying sequential SQL scripts on app startup.

### 2.3 Frontend Framework & UI Layer (Renderer Process)

- **UI Framework:** React 18 (Functional components, custom hooks, strictly typed)
- **Styling:** Tailwind CSS + PostCSS
  - Dark / Light mode theme support via CSS variables / Tailwind `dark` class.
- **Icons:** Lucide React (`lucide-react`)
- **State Management:** Zustand
  - Minimal overhead, zero boilerplate state management for task filters, timer status, and modal displays.
- **Rich Text / Markdown Notes Editor:** TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-code-block-lowlight`)
  - Stores notes as clean, human-readable Markdown strings in SQLite.

### 2.4 AI Integration Engine

- **AI Provider:** DeepSeek API (`https://api.deepseek.com/v1`)
- **SDK:** OpenAI Node.js SDK (`openai`) configured with custom base URL `https://api.deepseek.com/v1`.
- **Primary Models:**
  - `deepseek-chat` (Daily planning with JSON mode, performance reviews).
- **Reliability & Resilience:**
  - Request timeout: 30 seconds.
  - Retry policy: Exponential backoff (max 3 retries) using `p-retry` or custom wrapper.
  - Local response caching in `performance_reports` SQLite table.

### 2.5 Security & Key Management

- **API Key Vault:** Electron `safeStorage` API
  - Leverages native OS credentials stores:
    - macOS: Keychain Access
    - Windows: Data Protection API (DPAPI)
    - Linux: Secret Service API / Libsecret
  - API keys are encrypted before saving to disk and decrypted only in memory within the Main process when executing DeepSeek API calls.
  - Keys are never exposed to the Renderer process or unencrypted LocalStorage.

## 3. Communication Protocol (IPC Architecture)

Main and Renderer processes communicate exclusively through typed IPC handlers exposed via `preload.ts`:

### Key IPC Channels Table

| Channel         | Process Direction       | Payload                                | Description                                      |
| --------------- | ----------------------- | -------------------------------------- | ------------------------------------------------ |
| `tasks:getAll`  | Renderer → Main         | `{ status?: TaskStatus }`              | Fetches tasks from SQLite                        |
| `tasks:create`  | Renderer → Main         | `Omit<Task, 'id'>`                     | Creates a new task                               |
| `tasks:update`  | Renderer → Main         | `Partial<Task> & { id: string }`       | Updates task fields or markdown notes            |
| `timer:start`   | Renderer → Main         | `{ taskId: string }`                   | Starts background timer interval                 |
| `timer:pause`   | Renderer → Main         | `{ taskId: string }`                   | Pauses background timer & logs duration          |
| `ai:generatePlan` | Renderer → Main       | `AIScheduleInput`                      | Calls DeepSeek API for morning plan              |
| `ai:generateReport` | Renderer → Main     | `{ timeframeDays: number }`            | Calls DeepSeek API for productivity review       |
| `key:set`       | Renderer → Main         | `{ apiKey: string }`                   | Encrypts & saves API key via safeStorage         |

## 4. Development Toolchain & Quality Assurance

- **Package Manager:** npm
- **Linter & Formatter:** ESLint + Prettier + `eslint-plugin-react-hooks`
- **Testing Framework:** Vitest
  - Main process tests mock SQLite with in-memory database (`:memory:`).
  - Services tested directly without full Electron boot overhead.
- **Packaging & Distribution:** electron-builder
  - Target outputs: `.dmg` (macOS), `.exe` / `.msi` (Windows), `.AppImage` / `.deb` (Linux).
