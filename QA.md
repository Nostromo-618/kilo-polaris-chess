# QA Automation Strategy with Playwright

This document outlines the QA automation approach for Browser Chess using Playwright.

## Philosophy

- **Framework-free repository**: Only `tests/` folder is committed
- **All npm artifacts gitignored**: `node_modules/`, `package.json`, `playwright-report/`
- **Chromium-only**: Single browser target for time efficiency
- **Responsive coverage**: Desktop + mobile viewport testing

---

## Test Categories

### 1. End-to-End (E2E) Tests

Located in `tests/e2e/`:

| Test Suite | Coverage |
|------------|----------|
| **Game Initialization** | New game button, default settings, board rendering |
| **Piece Movement** | Selection highlighting, legal move indicators, move execution |
| **Full Game Flow** | Complete games (Scholar's Mate), game-end modal display |
| **Special Moves** | Castling (kingside/queenside), en passant, pawn promotion |
| **UI Controls** | Theme switching, difficulty levels, play color choice |
| **Responsive Layout** | Mobile viewport (iPhone 12), layout stacking |

### 2. Engine Logic Tests

Located in `tests/engine/`:

| Test Suite | Coverage |
|------------|----------|
| **Rules** | Legal move generation, check detection, attacked squares |
| **GameState** | State transitions, draw detection, repetition tracking |

These use `page.evaluate()` to test JavaScript modules directly in browser context.

---

## Quick Start

```bash
# 1. Install Playwright (from project root)
npm init -y
npx playwright@latest install chromium

# 2. Start local server
npx serve . -p 3000 &

# 3. Run all tests
npx playwright test

# 4. Run with UI (debugging)
npx playwright test --ui

# 5. View HTML report
npx playwright show-report
```

---

## Viewport Configurations

| Viewport | Resolution | Use Case |
|----------|------------|----------|
| Desktop | 1280 × 720 | Primary testing |
| Mobile | iPhone 12 (390 × 844) | Responsive verification |

---

## Test Execution Modes

```bash
# All tests
npx playwright test

# Specific folder
npx playwright test tests/e2e/

# Single file
npx playwright test tests/e2e/piece-movement.spec.js

# Headed (visible browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate trace on failure
npx playwright test --trace on
```

---

## CI/CD Integration

For GitHub Actions (example):

```yaml
- name: Install Playwright
  run: npx playwright@latest install chromium --with-deps

- name: Start server
  run: npx serve . -p 3000 &

- name: Run tests
  run: npx playwright test
```

> Note: If adding CI, create the workflow file separately (not committed to this repo).

---

## Coverage Targets

- [x] Game start and initialization
- [x] Basic piece movement and captures
- [x] Special moves (castling, en passant, promotion)
- [x] Game end scenarios (checkmate, stalemate, draw)
- [x] UI controls and theming
- [x] Responsive mobile layout
- [x] Engine logic (via browser context evaluation)
- [x] Board coordinate labels
- [x] Undo/take-back feature
- [x] Thinking time persistence
- [x] Zobrist hashing (transposition table performance)
