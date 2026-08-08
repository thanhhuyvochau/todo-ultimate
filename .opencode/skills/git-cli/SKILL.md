---
name: git-cli
description: Enforces Conventional Commits v1.0.0 rules, commit message formatting, scopes, breaking changes, and approval guidelines for OpenCode agents.
---

# SKILL: Conventional Commits Guideline for OpenCode

This skill instructs OpenCode AI agents on how to construct commit messages that strictly adhere to the Conventional Commits v1.0.0 specification.

## 1. Absolute Rule: Explicit Approval First

Before executing any `git commit` command or modifying repository history, the agent MUST explicitly request user approval.

- Do NOT run `git commit` automatically.
- Show the user the exact staged changes (`git diff --staged`) and the proposed commit message.
- Wait for explicit permission (e.g., "Yes", "Commit it", "Approved") from the user.

## 2. Commit Message Structure

The commit message MUST follow this structural layout:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Format Specifications

- **Type (Required):** Must be lowercase. Noun describing the intent of the change.
- **Scope (Optional):** A noun describing the codebase section wrapped in parentheses (e.g., `(main)`, `(ipc)`, `(ui)`, `(db)`).
- **Separator (Required):** Must be a colon `:` followed by a single space.
- **Description (Required):**
  - Use imperative, present tense ("add" not "added", "fix" not "fixed").
  - Do NOT capitalize the first letter.
  - Do NOT end with a period `.`.
- **Blank Lines:** A blank line MUST separate the header from the body, and the body from the footer(s).

## 3. Allowed Types

| Type      | Purpose                                                              | SemVer Mapping |
| --------- | ------------------------------------------------------------------- | -------------- |
| `feat`    | A new feature for the user or system                                | MINOR          |
| `fix`     | A bug fix for the user or system                                    | PATCH          |
| `docs`    | Documentation only changes                                          | None           |
| `style`   | Code formatting (whitespace, semi-colons) with no logic changes     | None           |
| `refactor`| Code change that neither fixes a bug nor adds a feature             | None           |
| `perf`    | A code change that improves performance                             | PATCH          |
| `test`    | Adding missing tests or correcting existing tests                   | None           |
| `build`   | Changes affecting build system or external dependencies             | None           |
| `ci`      | Changes to CI configuration files and scripts                       | None           |
| `chore`   | Other changes that don't modify src or test files                   | None           |

## 4. Breaking Changes (MAJOR)

A Breaking Change indicates an incompatible API or structural change and MUST be signaled in one of two ways:

### Option A: Explanation in Footer (Preferred for detail)

Include `BREAKING CHANGE:` (in uppercase) at the start of the footer, followed by a space and description.

```
feat(api): send user auth token in header

BREAKING CHANGE: `auth_token` query parameter is no longer supported. Use `Authorization` header instead.
```

### Option B: The `!` Indicator

Add a `!` immediately before the `:` in the header.

```
feat(ipc)!: redesign task duration payloads
```

## 5. Examples & Reference

**Feature with Scope**

```
feat(timer): add background-safe IPC interval logger
```

**Bug Fix with Ticket Footer**

```
fix(db): prevent SQLite locked error during concurrent transactions

Closes #142
```

**Chore / Refactor**

```
refactor(store): migrate task state management to Zustand
```

## 6. OpenCode Agent Execution Protocol

When asked to commit changes, follow this exact workflow:

1. Stage files using `git add <files>`.
2. Generate the proposed conventional commit message based on `git diff --staged`.
3. Output the proposed commit message to the user for review.
4. STOP and WAIT for explicit approval.
5. Only execute `git commit -m "..."` once the user confirms.
