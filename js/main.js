import { BoardView } from "./ui/BoardView.js";
import { Controls } from "./ui/Controls.js";
import { GameEndModal } from "./ui/GameEndModal.js";
import { DisclaimerModal } from "./ui/DisclaimerModal.js";
import { Game } from "./Game.js";
import {
  getDisclaimerAccepted,
  getTheme,
  setTheme,
  getDifficulty,
  setDifficulty,
  getThinkingTime,
  setThinkingTime,
  getGame,
  setGame,
  clearGame,
} from "./storage.js";

/**
 * Main entry point for client-side chess application
 *
 * Persistence (localStorage):
 *   - Disclaimer acceptance      via storage.{get,set}DisclaimerAccepted
 *   - Theme preference           via storage.{get,set}Theme
 *   - Difficulty setting         via storage.{get,set}Difficulty
 *   - Thinking time              via storage.{get,set}ThinkingTime
 *   - In-progress game           via storage.{get,set,clear}Game
 */

const dom = {
  boardContainer: document.getElementById("board-container"),
  colorChoice: document.getElementById("color-choice"),
  difficultySelect: document.getElementById("difficulty-select"),
  thinkingTimeInput: document.getElementById("thinking-time"),
  newGameBtn: document.getElementById("new-game-btn"),
  undoBtn: document.getElementById("undo-btn"),
  statusText: document.getElementById("status-text"),
  turnIndicator: document.getElementById("turn-indicator"),
  lastMoveIndicator: document.getElementById("last-move-indicator"),
  moveHistory: document.getElementById("move-history"),
  gameEndModalContainer: document.getElementById("game-end-modal-container"),
  disclaimerModalContainer: document.getElementById("disclaimer-modal-container"),
};

// Initialize board view
const boardView = new BoardView(dom.boardContainer, {
  onSquareSelected: handleSquareSelected,
});

// Initialize controls
const controlsView = new Controls({
  colorChoiceContainer: dom.colorChoice,
  difficultySelect: dom.difficultySelect,
  newGameButton: dom.newGameBtn,
  thinkingTimeInput: dom.thinkingTimeInput,
  undoButton: dom.undoBtn,
  onNewGameRequested: handleNewGameRequested,
  onUndoRequested: handleUndoRequested,
});

// Initialize game end modal
const gameEndModal = new GameEndModal(dom.gameEndModalContainer, handleNewGameRequested);

// Game state
let game = null;
let isProcessingMove = false;
let gameSaveThrottle = null;

/**
 * Initialize new game with current control settings
 */
async function initializeGame() {
  clearGame();

  setDifficulty(controlsView.getDifficulty());
  setThinkingTime(Math.round(controlsView.getThinkingTime() / 1000));

  gameEndModal.hide();
  previousGameOver = false;
  controlsView.setUndoEnabled(false);

  const playerColor = controlsView.getSelectedColor();
  const difficulty = controlsView.getDifficulty();

  try {
    game = new Game({
      playerColor,
      difficulty,
      onUpdate: syncUIWithGame,
    });

    const snapshot = game.getSnapshot();

    boardView.render(game.getBoard(), {
      perspective: game.getPlayerColor(),
      lastMove: snapshot.lastMove,
      legalMoves: [],
      selected: null,
    });

    syncUIWithGame(snapshot);

    // If AI should move first
    if (game.getCurrentTurn() !== game.getPlayerColor() && !game.isGameOver()) {
      requestAnimationFrame(() => {
        if (!game || game.isGameOver()) return;
        if (game.getCurrentTurn() !== game.getPlayerColor()) {
          triggerAIMove();
        }
      });
    }
  } catch (error) {
    console.error('Game initialization error:', error);
    dom.statusText.textContent = "Failed to initialize game. Please refresh and try again.";
  }
}

/**
 * Restore an in-progress game from localStorage.
 */
async function restoreGame(savedState) {
  previousGameOver = false;
  gameEndModal.hide();
  controlsView.setUndoEnabled(false);

  const savedDifficulty = getDifficulty();

  try {
    game = Game.fromSaved(savedState, {
      difficulty: savedDifficulty || 3,
      onUpdate: syncUIWithGame,
    });

    const snapshot = game.getSnapshot();

    boardView.render(game.getBoard(), {
      perspective: game.getPlayerColor(),
      lastMove: snapshot.lastMove,
      legalMoves: [],
      selected: null,
    });

    syncUIWithGame(snapshot);

    if (!game.isGameOver() && game.getCurrentTurn() !== game.getPlayerColor()) {
      requestAnimationFrame(() => {
        if (!game || game.isGameOver()) return;
        if (game.getCurrentTurn() !== game.getPlayerColor()) {
          triggerAIMove();
        }
      });
    }
  } catch (error) {
    console.error('Game restore error:', error);
    clearGame();
    dom.statusText.textContent = "Ready. Select settings and click 'New Game' to start.";
  }
}

async function handleNewGameRequested() {
  if (isProcessingMove) return;
  await initializeGame();
}

function handleUndoRequested() {
  if (isProcessingMove) return;
  if (!game || game.isGameOver()) return;
  if (!game.canUndo()) return;

  const success = game.undo();
  if (success) {
    const snapshot = game.getSnapshot();

    boardView.render(game.getBoard(), {
      perspective: game.getPlayerColor(),
      selected: null,
      legalMoves: [],
      lastMove: snapshot.lastMove,
    });

    syncUIWithGame(snapshot);
    updateUndoButtonState();
  }
}

async function handleSquareSelected(square) {
  if (isProcessingMove) return;
  if (!game) return;
  if (game.getCurrentTurn() !== game.getPlayerColor()) return;
  if (game.isGameOver()) return;

  const result = game.handlePlayerSquareSelection(square);

  if (!result.changed) {
    boardView.updateHighlights({
      selected: result.selected,
      legalMoves: result.legalTargets,
      lastMove: result.lastMove,
    });
    return;
  }

  const snapshot = game.getSnapshot();
  syncUIWithGame(snapshot);

  boardView.render(game.getBoard(), {
    perspective: game.getPlayerColor(),
    selected: null,
    legalMoves: [],
    lastMove: snapshot.lastMove,
  });

  updateUndoButtonState();

  if (!game.isGameOver()) {
    requestAnimationFrame(() => {
      if (!game || game.isGameOver()) return;
      if (game.getCurrentTurn() !== game.getPlayerColor()) {
        triggerAIMove();
      }
    });
  }
}

async function triggerAIMove() {
  if (!game || game.isGameOver()) return;
  if (game.getCurrentTurn() === game.getPlayerColor()) return;

  isProcessingMove = true;
  syncBusyState(true);

  try {
    const timeout = controlsView.getThinkingTime();
    const aiMove = await game.computeAIMove(timeout);
    if (!aiMove) {
      syncUIWithGame(game.getSnapshot());
      return;
    }

    game.applyAIMove(aiMove);
    const snapshot = game.getSnapshot();
    syncUIWithGame(snapshot);

    boardView.render(game.getBoard(), {
      perspective: game.getPlayerColor(),
      selected: null,
      legalMoves: [],
      lastMove: snapshot.lastMove,
    });

    updateUndoButtonState();
  } catch (error) {
    console.error("AI move error:", error);
    dom.statusText.textContent = "An error occurred while computing AI move.";
  } finally {
    isProcessingMove = false;
    syncBusyState(false);
  }
}

function updateUndoButtonState() {
  if (game && !game.isGameOver() && game.canUndo() && !isProcessingMove) {
    controlsView.setUndoEnabled(true);
  } else {
    controlsView.setUndoEnabled(false);
  }
}

let previousGameOver = false;

/**
 * Synchronize UI with game snapshot.
 * Throttled localStorage saves to prevent excessive writes.
 */
function syncUIWithGame(snapshot) {
  if (!snapshot) return;

  dom.statusText.textContent = snapshot.statusText || '';
  dom.turnIndicator.textContent = snapshot.turnText || '';
  dom.lastMoveIndicator.textContent = snapshot.lastMoveText || '';

  // Move history
  dom.moveHistory.innerHTML = "";
  (snapshot.history || []).forEach((entry, index) => {
    const li = document.createElement("li");
    li.textContent = entry;
    li.dataset.index = String(index);
    dom.moveHistory.appendChild(li);
  });

  // Throttled save to localStorage (max once per 500ms)
  if (game && !game.isGameOver()) {
    if (gameSaveThrottle) clearTimeout(gameSaveThrottle);
    gameSaveThrottle = setTimeout(() => {
      try {
        setGame(game.getGameState());
      } catch {
        // Non-critical
      }
      gameSaveThrottle = null;
    }, 500);
  }

  const isGameOver = snapshot.gameOver || false;
  if (isGameOver && !previousGameOver && snapshot.result) {
    clearGame();
    const playerColor = snapshot.playerColor;
    gameEndModal.show(snapshot.result, playerColor);
  }
  previousGameOver = isGameOver;
}

function syncBusyState(isBusy) {
  if (isBusy) {
    dom.statusText.classList.add("busy");
    dom.statusText.textContent = "Computer is thinking...";
  } else {
    dom.statusText.classList.remove("busy");
    if (game) {
      syncUIWithGame(game.getSnapshot());
    }
  }
}

function setupThemeToggleButton() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (!themeBtn) return;

  let currentTheme = getTheme();
  applyThemeMode(currentTheme);
  updateThemeToggleUI(currentTheme);

  themeBtn.addEventListener('click', () => {
    const pref = getTheme();
    const modes = ['system', 'light', 'dark'];
    const nextMode = modes[(modes.indexOf(pref) + 1) % modes.length];
    applyThemeMode(nextMode);
    setTheme(nextMode);
    updateThemeToggleUI(nextMode);
  });

  document.addEventListener('theme:mode-change', (e) => {
    if (e.detail && e.detail.mode) {
      const mode = e.detail.mode;
      setTheme(mode);
      updateThemeToggleUI(mode);
    }
  });
}

function applyThemeMode(mode) {
  if (window.ThemeCustomizer && window.ThemeCustomizer.applyTheme) {
    window.ThemeCustomizer.applyTheme(mode);
  } else if (window.Vanduo && window.Vanduo.components && window.Vanduo.components.themeSwitcher) {
    window.Vanduo.components.themeSwitcher.setPreference(mode);
  } else {
    document.documentElement.setAttribute('data-theme', mode === 'system' ? '' : mode);
  }
}

function updateThemeToggleUI(activeMode) {
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (!themeBtn) return;
  const icon = themeBtn.querySelector('i');
  if (!icon) return;

  icon.classList.remove('ph-sun', 'ph-moon', 'ph-desktop');

  if (activeMode === 'light') {
    icon.classList.add('ph-sun');
  } else if (activeMode === 'dark') {
    icon.classList.add('ph-moon');
  } else {
    icon.classList.add('ph-desktop');
  }
}

function setupDisclaimerModal() {
  return new Promise((resolve) => {
    if (getDisclaimerAccepted()) {
      resolve();
      return;
    }

    const modal = new DisclaimerModal(dom.disclaimerModalContainer, () => {
      resolve();
    });

    requestAnimationFrame(() => {
      modal.show();
    });
  });
}

function restorePreferences() {
  const savedDifficulty = getDifficulty();
  if (savedDifficulty !== null) {
    controlsView.setDifficulty(savedDifficulty);
  }

  const savedThinkingTime = getThinkingTime();
  if (savedThinkingTime !== null) {
    controlsView.setThinkingTime(savedThinkingTime);
  }
}

async function main() {
  setupThemeToggleButton();
  await setupDisclaimerModal();
  restorePreferences();

  const savedGame = getGame();
  if (savedGame) {
    await restoreGame(savedGame);
  } else {
    dom.statusText.textContent = "Ready. Select settings and click 'New Game' to start.";
  }
}

main().catch(error => {
  console.error('Application initialization failed:', error);
  dom.statusText.textContent = "Failed to initialize application. Please refresh and try again.";
});
