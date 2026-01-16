/**
 * ai.worker.js
 *
 * Web Worker for chess AI computation.
 * Runs AI search off the main thread to prevent UI blocking.
 *
 * Messages received:
 *   { type: 'search', state: {...}, level: 1-5, forColor: 'white'|'black', timeout: ms }
 *
 * Messages sent:
 *   { type: 'result', move: Move|null }
 *   { type: 'error', message: string }
 */

import { AI } from "./engine/AI.js";

// Single AI instance to preserve transposition table between searches
const ai = new AI();

/**
 * Handle incoming messages from main thread
 */
self.onmessage = async function (event) {
  const { type, state, level, forColor, timeout } = event.data;

  if (type !== "search") {
    self.postMessage({ type: "error", message: `Unknown message type: ${type}` });
    return;
  }

  try {
    // Create a minimal state object compatible with AI.findBestMove
    const searchState = {
      board: state.board,
      activeColor: state.activeColor,
      castlingRights: state.castlingRights,
      enPassantTarget: state.enPassantTarget,
      halfmoveClock: state.halfmoveClock,
      fullmoveNumber: state.fullmoveNumber,
    };

    // Run the search
    const move = await ai.findBestMove(searchState, {
      level: level,
      forColor: forColor,
      timeout: timeout || 10000,
    });

    // Send result back to main thread
    self.postMessage({ type: "result", move: move });
  } catch (error) {
    self.postMessage({ type: "error", message: error.message || "AI search failed" });
  }
};

// Signal that worker is ready
self.postMessage({ type: "ready" });
