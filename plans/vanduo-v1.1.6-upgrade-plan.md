# Vanduo Framework v1.1.6 Upgrade Plan

## Overview

This document outlines the complete upgrade plan for migrating the browser-chess-pure-js project from Vanduo Framework v1.0.0 to v1.1.6. This is a **breaking change** release that requires careful migration.

## Breaking Changes Summary

The major breaking changes between v1.0.0 and v1.1.6 are:

### 1. CSS Class Prefixing (v1.1.0)
All CSS classes now use the `vd-` prefix to prevent collisions with other frameworks:

| Old Class | New Class |
|-----------|-----------|
| `.container-lg` | `.vd-container-lg` |
| `.row` | `.vd-row` |
| `.col-12` | `.vd-col-12` |
| `.card` | `.vd-card` |
| `.btn` | `.vd-btn` |
| `.btn-primary` | `.vd-btn-primary` |
| `.btn-group` | `.vd-btn-group` |
| `.form-group` | `.vd-form-group` |
| `.form-label` | `.vd-form-label` |
| `.input` | `.vd-input` |
| `.d-flex` | `.vd-d-flex` |
| `.text-gradient` | `.vd-text-gradient` |
| `.shadow-lg` | `.vd-shadow-lg` |

### 2. Manual Initialization Required (v1.1.0)
The framework no longer auto-initializes. You must explicitly call:

```javascript
Vanduo.init();
```

### 3. New Module Formats (v1.1.0)
- ESM format: `vanduo.esm.js`
- CommonJS format: `vanduo.cjs.js`
- IIFE format: `vanduo.js` (same as before for CDN usage)

## Current State Analysis

### Files Using Vanduo Classes

#### [`index.html`](index.html)
Currently uses non-prefixed classes:
- Layout: `.container-lg`, `.row`, `.col-12`, `.col-lg-8`, `.col-lg-4`
- Components: `.card`, `.card-elevated`, `.card-body`, `.btn`, `.btn-sm`, `.btn-primary`, `.btn-block`, `.btn-group`
- Forms: `.form-group`, `.form-label`, `.input`
- Utilities: `.d-flex`, `.align-items-center`, `.justify-content-between`, `.text-gradient`, `.shadow-lg`, `.mt-5`, `.mr-2`
- Special: `.is-active` (state class, may need prefix)

**Critical Missing**: No `Vanduo.init()` call is present!

#### [`styles/theme.css`](styles/theme.css)
Uses Vanduo CSS variables which remain compatible:
- Color variables: `--primary-*`, `--gray-*`, `--yellow-*`
- Spacing: `--spacing-*`
- Typography: `--font-size-*`, `--font-weight-*`
- Effects: `--shadow-*`, `--radius-*`
- These variables are unchanged in v1.1.6

#### [`styles/layout.css`](styles/layout.css)
Contains custom chess-specific styles and some Vanduo references:
- Uses CSS variables (compatible)
- Custom modal styles (no changes needed)
- Custom chess board styles (no changes needed)

#### JavaScript Files
Need to check for hardcoded class names in:
- [`js/main.js`](js/main.js)
- [`js/ui/BoardView.js`](js/ui/BoardView.js)
- [`js/ui/Controls.js`](js/ui/Controls.js)
- [`js/ui/GameEndModal.js`](js/ui/GameEndModal.js)
- [`js/ui/ThemeCustomizer.js`](js/ui/ThemeCustomizer.js)

## Migration Steps

### Phase 1: Update Vanduo Framework Files

#### Step 1.1: Download v1.1.6 Distribution
Download the latest release from:
```
https://github.com/Nostromo-618/vanduo-framework/releases/tag/v1.1.6
```

Required files:
- `vanduo.min.css` → `dist/vanduo.min.css`
- `vanduo.min.js` → `dist/vanduo.min.js`
- `vanduo.esm.js` (optional, for future module usage)
- Icons folder (if changed)

#### Step 1.2: Update CDN Links (if using CDN)
```html
<!-- Old -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Nostromo-618/vanduo-framework@v1.0.0/dist/vanduo.min.css">
<script src="https://cdn.jsdelivr.net/gh/Nostromo-618/vanduo-framework@v1.0.0/dist/vanduo.min.js"></script>

<!-- New -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Nostromo-618/vanduo-framework@v1.1.6/dist/vanduo.min.css">
<script src="https://cdn.jsdelivr.net/gh/Nostromo-618/vanduo-framework@v1.1.6/dist/vanduo.min.js"></script>
<script>Vanduo.init();</script>
```

### Phase 2: Update HTML Classes

#### Step 2.1: Update [`index.html`](index.html)

**Before:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ... -->
  <link rel="stylesheet" href="dist/vanduo.min.css" />
  <script src="dist/vanduo.min.js"></script>
</head>
<body>
  <div id="app-root">
    <header class="app-header glass-panel">
      <div class="container-lg d-flex align-items-center justify-content-between">
        <!-- ... -->
      </div>
    </header>

    <main class="app-main container-lg">
      <div class="row">
        <section class="col-12 col-lg-8 board-section">
          <div id="board-container" class="card-elevated"></div>
        </section>

        <aside class="col-12 col-lg-4">
          <div class="card card-elevated side-panel glass-panel">
            <section class="card-body controls-section">
              <!-- ... -->
              <div class="form-group">
                <label class="form-label">Play as:</label>
                <div class="btn-group" id="color-choice">
                  <button data-color="white" class="btn btn-sm is-active">White</button>
                  <!-- ... -->
                </div>
              </div>
              <!-- ... -->
              <button id="new-game-btn" class="btn btn-primary btn-block shadow-lg">
                <i class="ph-duotone ph-play mr-2"></i> New Game
              </button>
            </section>
          </div>
        </aside>
      </div>
    </main>
  </div>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

**After:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ... -->
  <link rel="stylesheet" href="dist/vanduo.min.css" />
  <script src="dist/vanduo.min.js"></script>
</head>
<body>
  <div id="app-root">
    <header class="app-header glass-panel">
      <div class="vd-container-lg vd-d-flex vd-align-items-center vd-justify-content-between">
        <!-- ... -->
      </div>
    </header>

    <main class="app-main vd-container-lg">
      <div class="vd-row">
        <section class="vd-col-12 vd-col-lg-8 board-section">
          <div id="board-container" class="vd-card-elevated"></div>
        </section>

        <aside class="vd-col-12 vd-col-lg-4">
          <div class="vd-card vd-card-elevated side-panel glass-panel">
            <section class="vd-card-body controls-section">
              <!-- ... -->
              <div class="vd-form-group">
                <label class="vd-form-label">Play as:</label>
                <div class="vd-btn-group" id="color-choice">
                  <button data-color="white" class="vd-btn vd-btn-sm vd-is-active">White</button>
                  <!-- ... -->
                </div>
              </div>
              <!-- ... -->
              <button id="new-game-btn" class="vd-btn vd-btn-primary vd-btn-block vd-shadow-lg">
                <i class="ph-duotone ph-play vd-mr-2"></i> New Game
              </button>
            </section>
          </div>
        </aside>
      </div>
    </main>
  </div>
  <script>Vanduo.init();</script>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

#### Complete Class Migration Table for index.html

| Line | Old Class | New Class |
|------|-----------|-----------|
| 29 | `container-lg` | `vd-container-lg` |
| 29 | `d-flex` | `vd-d-flex` |
| 29 | `align-items-center` | `vd-align-items-center` |
| 29 | `justify-content-between` | `vd-justify-content-between` |
| 40 | `container-lg` | `vd-container-lg` |
| 41 | `row` | `vd-row` |
| 42 | `col-12 col-lg-8` | `vd-col-12 vd-col-lg-8` |
| 43 | `card-elevated` | `vd-card-elevated` |
| 46 | `col-12 col-lg-4` | `vd-col-12 vd-col-lg-4` |
| 47 | `card card-elevated` | `vd-card vd-card-elevated` |
| 48 | `card-body` | `vd-card-body` |
| 49 | `text-gradient` | `vd-text-gradient` |
| 51 | `form-group` | `vd-form-group` |
| 52 | `form-label` | `vd-form-label` |
| 53 | `btn-group` | `vd-btn-group` |
| 54 | `btn btn-sm is-active` | `vd-btn vd-btn-sm vd-is-active` |
| 55 | `btn btn-sm` | `vd-btn vd-btn-sm` |
| 56 | `btn btn-sm` | `vd-btn vd-btn-sm` |
| 60 | `form-group` | `vd-form-group` |
| 61 | `form-label` | `vd-form-label` |
| 62 | `input` | `vd-input` |
| 71 | `form-group mt-5` | `vd-form-group vd-mt-5` |
| 77 | `btn btn-primary btn-block shadow-lg` | `vd-btn vd-btn-primary vd-btn-block vd-shadow-lg` |
| 78 | `mr-2` | `vd-mr-2` |
| 83 | `card-body` | `vd-card-body` |
| 84 | `text-gradient` | `vd-text-gradient` |
| 92 | `card-body` | `vd-card-body` |
| 93 | `text-gradient` | `vd-text-gradient` |

### Phase 3: Update JavaScript Files

#### Step 3.1: Add Vanduo.init() to [`js/main.js`](js/main.js)

The framework must be initialized after DOM is ready:

```javascript
// At the start of main.js, after imports
import { Game } from './Game.js';

// Initialize Vanduo Framework
if (typeof Vanduo !== 'undefined') {
  Vanduo.init();
}

// Rest of the code...
```

Or add it directly in [`index.html`](index.html:105) before the module script:
```html
<script>Vanduo.init();</script>
<script type="module" src="js/main.js"></script>
```

#### Step 3.2: Update UI Components with Hardcoded Classes

##### [`js/ui/BoardView.js`](js/ui/BoardView.js)
**Status:** ✅ No changes needed

This file uses custom chess-specific classes that are not Vanduo classes:
- `chess-square`, `chess-piece` - Custom classes
- `highlight-selected`, `highlight-legal`, `highlight-last-move` - Custom classes

These are defined in [`styles/theme.css`](styles/theme.css) and [`styles/layout.css`](styles/layout.css) and don't need prefixing.

##### [`js/ui/Controls.js`](js/ui/Controls.js)
**Status:** ⚠️ Requires update

| Line | Old Class | New Class |
|------|-----------|-----------|
| 50 | `is-active` | `vd-is-active` |
| 73 | `is-active` | `vd-is-active` |
| 74 | `is-active` | `vd-is-active` |

##### [`js/ui/GameEndModal.js`](js/ui/GameEndModal.js)
**Status:** ⚠️ Requires update

| Line | Old Class | New Class |
|------|-----------|-----------|
| 25 | `modal` | `vd-modal` |
| 31 | `modal-backdrop` | `vd-modal-backdrop` |
| 32 | `modal-dialog` | `vd-modal-dialog` |
| 33 | `modal-content` | `vd-modal-content` |
| 34 | `modal-header` | `vd-modal-header` |
| 35 | `modal-title` | `vd-modal-title` |
| 36 | `modal-close` | `vd-modal-close` |
| 40 | `modal-body` | `vd-modal-body` |
| 44 | `modal-footer` | `vd-modal-footer` |
| 45 | `btn btn-primary` | `vd-btn vd-btn-primary` |
| 46 | `mr-2` | `vd-mr-2` |
| 48 | `btn btn-secondary` | `vd-btn vd-btn-secondary` |

##### [`js/ui/ThemeCustomizer.js`](js/ui/ThemeCustomizer.js)
**Status:** ⚠️ Requires update

| Line | Old Class | New Class |
|------|-----------|-----------|
| 17 | `modal` | `vd-modal` |
| 18 | `modal-overlay` | `vd-modal-overlay` |
| 19 | `modal-container` | `vd-modal-container` |
| 20 | `modal-header` | `vd-modal-header` |
| 21 | `modal-title` | `vd-modal-title` |
| 22 | `modal-close` | `vd-modal-close` |
| 26 | `modal-body` | `vd-modal-body` |
| 28 | `mb-5` | `vd-mb-5` |
| 29 | `text-sm font-bold text-muted uppercase tracking-wider mb-3` | `vd-text-sm vd-font-bold vd-text-muted vd-uppercase vd-tracking-wider vd-mb-3` |
| 30 | `btn-group w-full` | `vd-btn-group vd-w-full` |
| 31 | `btn w-1/3` | `vd-btn vd-w-1/3` |
| 32 | `mr-2` | `vd-mr-2` |
| 34 | `btn w-1/3` | `vd-btn vd-w-1/3` |
| 35 | `mr-2` | `vd-mr-2` |
| 37 | `btn w-1/3` | `vd-btn vd-w-1/3` |
| 38 | `mr-2` | `vd-mr-2` |
| 45 | `text-sm font-bold text-muted uppercase tracking-wider mb-3` | `vd-text-sm vd-font-bold vd-text-muted vd-uppercase vd-tracking-wider vd-mb-3` |
| 55 | `modal-footer` | `vd-modal-footer` |
| 56 | `btn btn-ghost` | `vd-btn vd-btn-ghost` |
| 126 | `is-active` | `vd-is-active` |
| 131 | `is-active` | `vd-is-active` |
| 199 | `is-active` | `vd-is-active` |
| 200 | `btn-primary` | `vd-btn-primary` |
| 202 | `is-active` | `vd-is-active` |
| 203 | `btn-primary` | `vd-btn-primary` |

### Phase 4: Update CSS Files

#### Step 4.1: Verify [`styles/theme.css`](styles/theme.css)
CSS variables remain compatible, but verify:
- Color variables work correctly
- Spacing variables are applied
- Typography variables function properly

#### Step 4.2: Update [`styles/layout.css`](styles/layout.css)
Check for any Vanduo class references that need prefixing.

### Phase 5: Testing

#### Step 5.1: Visual Regression Testing
- Verify board renders correctly
- Check all buttons and controls
- Test modal dialogs
- Verify responsive breakpoints
- Test dark mode

#### Step 5.2: Functional Testing
- Run existing Playwright tests
- Test all game controls
- Test theme customizer
- Test all difficulty levels

#### Step 5.3: Cross-browser Testing
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## Migration Script

For convenience, here's a Node.js script to automate class migration in HTML files:

```javascript
// migrate-to-v1.1.js
const fs = require('fs');
const path = require('path');

const classMappings = {
  // Layout
  'container-lg': 'vd-container-lg',
  'container-fluid': 'vd-container-fluid',
  'row': 'vd-row',
  'col-12': 'vd-col-12',
  'col-lg-8': 'vd-col-lg-8',
  'col-lg-4': 'vd-col-lg-4',
  
  // Components
  'card': 'vd-card',
  'card-elevated': 'vd-card-elevated',
  'card-body': 'vd-card-body',
  'btn': 'vd-btn',
  'btn-sm': 'vd-btn-sm',
  'btn-primary': 'vd-btn-primary',
  'btn-block': 'vd-btn-block',
  'btn-group': 'vd-btn-group',
  
  // Forms
  'form-group': 'vd-form-group',
  'form-label': 'vd-form-label',
  'input': 'vd-input',
  
  // Utilities
  'd-flex': 'vd-d-flex',
  'align-items-center': 'vd-align-items-center',
  'justify-content-between': 'vd-justify-content-between',
  'text-gradient': 'vd-text-gradient',
  'shadow-lg': 'vd-shadow-lg',
  'mt-5': 'vd-mt-5',
  'mr-2': 'vd-mr-2',
  'is-active': 'vd-is-active',
};

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedMappings = Object.entries(classMappings)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [oldClass, newClass] of sortedMappings) {
    const regex = new RegExp(`class="([^"]*)\\b${oldClass}\\b([^"]*)"`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, (match, before, after) => {
        return `class="${before}${newClass}${after}"`;
      });
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Migrated: ${filePath}`);
  }
}

// Migrate index.html
migrateFile('index.html');
console.log('Migration complete!');
```

## Rollback Plan

If issues arise after upgrade:

1. Revert to v1.0.0 dist files:
   ```bash
   git checkout HEAD~1 -- dist/
   ```

2. Revert HTML class changes:
   ```bash
   git checkout HEAD~1 -- index.html
   ```

3. Remove `Vanduo.init()` call if added

## Timeline

| Phase | Description | Priority |
|-------|-------------|----------|
| 1 | Update Vanduo Framework files | High |
| 2 | Update HTML classes | High |
| 3 | Update JavaScript files | High |
| 4 | Update CSS files | Medium |
| 5 | Testing | High |

## Benefits of Upgrading

1. **No CSS Collisions**: `vd-` prefix ensures Vanduo doesn't conflict with Bootstrap, Tailwind, etc.
2. **Tree-Shaking**: ESM format allows bundlers to remove unused components
3. **Memory Safety**: Lifecycle manager prevents leaks in SPAs
4. **Explicit Control**: Manual init gives control over when components initialize
5. **Bug Fixes**: Includes fixes from v1.1.0 through v1.1.6

## References

- [Vanduo Framework v1.1.6 Release](https://github.com/Nostromo-618/vanduo-framework/releases/tag/v1.1.6)
- [MIGRATION.md](https://github.com/Nostromo-618/vanduo-framework/blob/main/MIGRATION.md)
- [Full Documentation](https://vanduo.dev/documentation.html)

---

**Plan Created:** 2026-02-20  
**Framework Version:** Vanduo v1.1.6  
**Status:** Ready for Implementation
