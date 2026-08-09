# Priority Badge Design

## Overview
A small, reusable UI component that visually indicates the priority level of a task (`high`, `medium`, or `low`) at a glance.

## Layout & Content
- A pill-shaped container.
- Text label: "High", "Medium", or "Low" (capitalized).
- (Optional) A small icon, such as an arrow up/down or a colored dot.

## Variants & Styling
- **Base Style**: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors`
- **High Priority**: 
  - Background: Light Red / Destructive
  - Text: Dark Red / Destructive Foreground
  - `bg-destructive/10 text-destructive`
- **Medium Priority**:
  - Background: Light Yellow / Orange
  - Text: Dark Yellow / Orange
  - `bg-orange-500/10 text-orange-500`
- **Low Priority**:
  - Background: Light Gray / Muted
  - Text: Dark Gray / Muted Foreground
  - `bg-muted text-muted-foreground`

## Interactions
- Primarily presentation-only. No click actions by default unless it's used as a trigger for a priority-selection dropdown menu in the edit mode.
