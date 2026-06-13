# Monochromatic Minimalist UI Implementation Plan

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

**Goal:** Redesign the landing, login, and registration pages of the AI Command Center into a premium, monochromatic, Apple-HIG inspired minimalist theme while resolving broken button styling.

**Architecture:** Update variables and base component styles in `globals.css` using slate, silver, and white grays. Clean up markup and inline styles on the page routes to align with the new design tokens and classes.

**Tech Stack:** Next.js (App Router), Vanilla CSS.

---

### Task 1: Update globals.css Design Tokens and Button Classes

**Files:**
- Modify: `c:/Users/KIIT/Downloads/FED/AI Command Center/src/app/globals.css`

**Step 1: Write minimal implementation**
Replace the design tokens and button/input styles in `globals.css` with a high-contrast monochromatic system that styles both `<button>` and `.btn` classes.

```css
/* Update :root tokens */
:root {
  --bg-main: #0a0b10;
  --bg-card: rgba(18, 19, 26, 0.8);
  --bg-card-hover: rgba(24, 25, 34, 0.9);
  --border-color: rgba(255, 255, 255, 0.08);
  --border-color-hover: rgba(255, 255, 255, 0.16);
  --border-focus: rgba(255, 255, 255, 0.6);
  
  --foreground: #f9fafb;
  --foreground-muted: #9ca3af;
  --foreground-dimmed: #4b5563;

  --success: #10b981;
  --success-glow: rgba(16, 185, 129, 0.1);
  --warning: #f59e0b;
  --warning-glow: rgba(245, 158, 11, 0.1);
  --danger: #ef4444;
  --danger-glow: rgba(239, 68, 68, 0.1);

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --transition-fast: 120ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-normal: 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Base interactive styling for buttons and anchors acting as buttons */
.btn-primary, button.btn-primary,
.btn-secondary, button.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.btn-primary, button.btn-primary {
  background: #ffffff;
  color: #0a0b10;
  border: none;
}

.btn-primary:hover, button.btn-primary:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.08);
}

.btn-primary:active, button.btn-primary:active {
  transform: translateY(0) scale(0.98);
}

.btn-secondary, button.btn-secondary {
  background: rgba(255, 255, 255, 0.03);
  color: #ffffff;
  border: 1px solid var(--border-color);
}

.btn-secondary:hover, button.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--border-color-hover);
}

.btn-secondary:active, button.btn-secondary:active {
  transform: scale(0.98);
}

/* Text inputs styling */
input, select, textarea {
  background: #000000;
  border: 1px solid var(--border-color);
  color: #ffffff;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  transition: all var(--transition-fast);
}

input:focus, select:focus, textarea:focus {
  border-color: var(--border-focus);
  box-shadow: none;
}
```

**Step 2: Verify changes**
Verify that Next.js dev server runs without build errors.

**Step 3: Commit**
```bash
git add src/app/globals.css
git commit -m "style: update global variables and component styles to monochrome"
```

---

### Task 2: Redesign Main Landing Page

**Files:**
- Modify: `c:/Users/KIIT/Downloads/FED/AI Command Center/src/app/page.js`

**Step 1: Write minimal implementation**
Align styling of the title logo, card items, and primary buttons using the clean `.btn-primary` and `.btn-secondary` design. Remove outdated gradient hues.

```jsx
// src/app/page.js
// Update the Ω icon to use a monochrome background:
// background: "#ffffff", color: "#0a0b10", boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)"
// Update features section headers:
// h3 colors should use silver / gray instead of green/pink.
```

**Step 2: Verify changes**
Check that the buttons render correctly with margins/padding and high-contrast styling.

**Step 3: Commit**
```bash
git add src/app/page.js
git commit -m "style: apply monochrome layout to landing page"
```

---

### Task 3: Redesign Login Page

**Files:**
- Modify: `c:/Users/KIIT/Downloads/FED/AI Command Center/src/app/login/page.js`

**Step 1: Write minimal implementation**
Apply clean input styles and update the submit button and the Google OAuth button to match the monochrome scheme.

```jsx
// src/app/login/page.js
// Update primary sign-in button and Google login button classes and style attributes
```

**Step 2: Verify changes**
Verify page builds and renders properly.

**Step 3: Commit**
```bash
git add src/app/login/page.js
git commit -m "style: apply monochrome layout to login page"
```

---

### Task 4: Redesign Register Page

**Files:**
- Modify: `c:/Users/KIIT/Downloads/FED/AI Command Center/src/app/register/page.js`

**Step 1: Write minimal implementation**
Apply same clean styling to inputs, registration buttons, and the Google button.

**Step 2: Verify changes**
Verify page builds and renders properly.

**Step 3: Commit**
```bash
git add src/app/register/page.js
git commit -m "style: apply monochrome layout to register page"
```
