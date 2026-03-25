# Browser Chess - Pure JavaScript

A client-side chess game that runs entirely in the browser. All computation happens client-side, making it perfect for static hosting on GitHub Pages.

## Features

- **Full rules-compliant chess engine**: All standard chess rules including castling, en passant, pawn promotion, and draw detection (50-move rule, threefold repetition, insufficient material)
- **5 difficulty levels**: From beginner-friendly to challenging with advanced search techniques
- **Non-blocking AI**: Web Worker-based computation keeps UI fully responsive
- **Modern UI**: Responsive design with system/light/dark theme support, glassmorphism effects
- **Board coordinate labels**: File (a-h) and rank (1-8) labels on the board
- **Undo feature**: Take back your last move (undoes both your move and the computer's response)
- **Persistent state**: Game progress, settings, and theme saved to localStorage
- **Static hosting ready**: Works on GitHub Pages or any static file server

## Architecture

All computation happens in the user's browser:

- **Engine**: Pure JavaScript chess engine in `js/engine/`
- **AI Worker**: Dedicated Web Worker for AI computation (`js/ai.worker.js`)
- **UI Components**: Modular UI components in `js/ui/`
- **Game Logic**: Game orchestration in `js/Game.js`
- **Main Entry**: Application initialization in `js/main.js`

The AI runs in a dedicated Web Worker thread, keeping the UI fully responsive. It uses minimax search with alpha-beta pruning, Zobrist hashing for transposition tables, killer move heuristics, null move pruning, late move reductions, and quiescence search.

## Getting Started

### Local Development

1. Clone or download this repository
2. Install dependencies: `npm install`
3. Serve the files using any static file server:

   **Using Python:**
   ```bash
   python3 -m http.server 8000
   ```

   **Using Node.js:**
   ```bash
   npx http-server
   ```

   **Using PHP:**
   ```bash
   php -S localhost:8000
   ```

4. Open `http://localhost:8000` in your browser

### Running Tests

```bash
npm test                # Run all Playwright tests
npm run test:quick      # Skip slow full-game tests
npm run test:headed     # Run in headed browser mode
```

## Browser Compatibility

Requires a modern browser that supports:
- ES6 modules (`import`/`export`)
- `async`/`await`
- `Promise`, `Map`, `Set`
- CSS Grid, CSS Custom Properties

Compatible with:
- Chrome/Edge 61+
- Firefox 60+
- Safari 11+

## Project Structure

```
browser-chess-pure-js/
├── index.html              # Main HTML file
├── js/
│   ├── engine/             # Chess engine modules
│   │   ├── Board.js        # Board representation utilities
│   │   ├── Rules.js        # Move generation and legality
│   │   ├── GameState.js    # Game state management
│   │   ├── Move.js         # Move structure
│   │   ├── Evaluator.js    # Position evaluation
│   │   └── AI.js           # AI search (Zobrist, alpha-beta, etc.)
│   ├── ui/                 # UI components
│   │   ├── BoardView.js    # Board rendering with coordinate labels
│   │   ├── Controls.js     # Game settings controls
│   │   ├── GameEndModal.js # Game over modal
│   │   └── DisclaimerModal.js
│   ├── ai.worker.js        # Web Worker for AI computation
│   ├── Game.js             # Game orchestration
│   ├── storage.js          # localStorage persistence
│   └── main.js             # Application entry point
├── styles/
│   ├── theme.css           # CSS variables and theme overrides
│   └── layout.css          # Board, modal, and component styles
├── tests/
│   ├── engine/             # Engine logic tests
│   └── e2e/                # End-to-end Playwright tests
├── dist/                   # Vanduo framework distribution
└── playwright.config.js    # Playwright configuration
```

## How It Works

1. **Game Initialization**: Click "New Game" to create a game with your selected color and difficulty
2. **Move Handling**: Click a piece to select it, then click a destination square to move
3. **AI Computation**: The AI runs in a Web Worker using iterative deepening with time limits
4. **Progressive Deepening**: Searches from depth 1 upward, respecting the thinking time limit
5. **Game End Detection**: Automatic detection of checkmate, stalemate, and all draw conditions

## Difficulty Levels

| Level | Depth | Randomness | Features |
|-------|-------|------------|----------|
| 1     | 1     | 35%        | Basic material evaluation |
| 2     | 2     | 20%        | MVV-LVA, killer moves |
| 3     | 3     | 10%        | + Transposition table |
| 4     | 4     | 5%         | + Quiescence search, null move pruning |
| 5     | 5     | 3%         | + Late move reductions, history heuristic |

## AI Features

- **Zobrist Hashing**: Fast incremental position hashing for transposition table (replaces slow string-based hashing)
- **MVV-LVA Move Ordering**: Captures sorted by Most Valuable Victim - Least Valuable Attacker
- **Killer Move Heuristic**: Remembers moves that caused cutoffs at each depth
- **History Heuristic**: Tracks quiet moves that cause cutoffs for better ordering
- **Transposition Table**: Caches evaluated positions (up to 100k entries) to avoid redundant search
- **Null Move Pruning**: Skip subtrees where opponent can't improve even with a free move
- **Late Move Reductions**: Search later moves at reduced depth, re-search if promising
- **Quiescence Search**: Extends search on captures to avoid tactical blindness
- **Positional Evaluation**: Material, piece-square tables, pawn structure, bishop pair, rook on open files, king safety

## Estimated Strength

- Level 5 plays at approximately 1800-1900 Elo strength

## Dependencies

- **@vanduo-oss/framework** (v1.3.1): UI component framework for styling
- **@playwright/test** (dev): End-to-end testing framework

## License

MIT License - see LICENSE file for details
