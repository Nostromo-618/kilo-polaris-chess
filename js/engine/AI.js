/**
 * AI.js
 *
 * Chess engine search implementation with 5 difficulty levels.
 * - Pure JS, no external dependencies.
 * - Uses:
 *   - Legal move generation from Rules.js
 *   - Static evaluation from Evaluator.js
 *   - Minimax with alpha-beta pruning
 *   - MVV-LVA move ordering (Most Valuable Victim - Least Valuable Attacker)
 *   - Killer move heuristic for better move ordering
 *   - History heuristic for quiet move ordering
 *   - Transposition table to avoid redundant evaluations
 *   - Null move pruning for faster search
 *   - Late move reductions (LMR) for efficient deep search
 *   - Quiescence search for tactical accuracy
 *   - Slight randomness at all levels for variety
 *
 * Difficulty mapping (approx; depth is ply, not full moves):
 *   1: depth 1 (material + small noise, some randomness)
 *   2: depth 2
 *   3: depth 3
 *   4: depth 4 + quiescence + null move
 *   5: depth 5 + quiescence + null move + LMR (full optimizations)
 */

import { oppositeColor, cloneBoard } from "./Board.js";
import { generateLegalMoves, isInCheck } from "./Rules.js";
import { evaluate } from "./Evaluator.js";

/**
 * Piece values used for ordering / randomness bands.
 * Keep in sync with Evaluator.js values.
 */
const PIECE_VALUES = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 0,
};

/**
 * Internal representation wrapper for search.
 */
class SearchState {
  constructor(baseState) {
    // Validate incoming board data
    if (!baseState || !baseState.board) {
      throw new Error('SearchState: baseState.board is undefined');
    }

    // Ensure board is an array (could be object from JSON serialization)
    const boardArray = Array.isArray(baseState.board)
      ? baseState.board
      : Object.values(baseState.board);

    if (boardArray.length !== 64) {
      throw new Error(`SearchState: board has ${boardArray.length} elements, expected 64`);
    }

    // Minimal mutable copy suitable for search.
    this.board = boardArray.slice();
    this.activeColor = baseState.activeColor || 'white';
    this.castlingRights = baseState.castlingRights
      ? JSON.parse(JSON.stringify(baseState.castlingRights))
      : { white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } };
    this.enPassantTarget = baseState.enPassantTarget || null;
    this.halfmoveClock = baseState.halfmoveClock || 0;
    this.fullmoveNumber = baseState.fullmoveNumber || 1;

    // Mobility callback used by Evaluator.
    this.generateLegalMoveCount = (color) =>
      generateLegalMoves({
        board: this.board,
        activeColor: color,
        castlingRights: this.castlingRights,
        enPassantTarget: this.enPassantTarget,
      }).length;
  }

  clone() {
    const s = new SearchState(this);
    s.board = cloneBoard(this.board);
    s.activeColor = this.activeColor;
    s.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
    s.enPassantTarget = this.enPassantTarget;
    s.halfmoveClock = this.halfmoveClock;
    s.fullmoveNumber = this.fullmoveNumber;
    s.generateLegalMoveCount = this.generateLegalMoveCount;
    return s;
  }
}

/**
 * Apply a legal move on SearchState.
 * Lighter than full GameState.applyMove but consistent with rules.
 *
 * @param {SearchState} state
 * @param {import("./Move.js").Move} move
 * @param {"white"|"black"} mover
 */
function applyMoveSearch(state, move, mover) {
  const fromIndex = algebraicToIndexFast(move.from);
  const toIndex = algebraicToIndexFast(move.to);
  const movingPiece = state.board[fromIndex];
  const enemy = oppositeColor(mover);

  const isPawn = movingPiece && movingPiece[1] === "P";
  const isCapture = !!(move.captured || move.isEnPassant);

  // Halfmove clock
  if (isPawn || isCapture) {
    state.halfmoveClock = 0;
  } else {
    state.halfmoveClock += 1;
  }

  // Clear en passant
  state.enPassantTarget = null;

  state.board[fromIndex] = null;

  // En passant capture
  if (move.isEnPassant) {
    const dir = mover === "white" ? -1 : 1;
    const tf = toIndex % 8;
    const tr = Math.floor(toIndex / 8);
    const capIndex = (tr + dir) * 8 + tf;
    state.board[capIndex] = null;
  }

  // Castling: move rook
  if (move.isCastleKingSide || move.isCastleQueenSide) {
    const rank = mover === "white" ? 0 : 7;
    if (move.isCastleKingSide) {
      const rookFrom = rank * 8 + 7;
      const rookTo = rank * 8 + 5;
      state.board[rookTo] = state.board[rookFrom];
      state.board[rookFrom] = null;
    } else {
      const rookFrom = rank * 8 + 0;
      const rookTo = rank * 8 + 3;
      state.board[rookTo] = state.board[rookFrom];
      state.board[rookFrom] = null;
    }
  }

  // Promotion
  if (move.promotion) {
    const prefix = mover === "white" ? "w" : "b";
    state.board[toIndex] = `${prefix}${move.promotion}`;
  } else {
    state.board[toIndex] = movingPiece;
  }

  // En passant target for double pawn push
  if (isPawn) {
    const fromRank = Math.floor(fromIndex / 8);
    const toRank = Math.floor(toIndex / 8);
    if (Math.abs(toRank - fromRank) === 2) {
      const midRank = (fromRank + toRank) / 2;
      const file = toIndex % 8;
      const epIndex = midRank * 8 + file;
      state.enPassantTarget = indexToAlgebraicFast(epIndex);
    }
  }

  // Simplified castling rights update
  updateCastlingRightsSearch(state, move, fromIndex, toIndex, movingPiece);

  state.activeColor = enemy;
  if (mover === "black") {
    state.fullmoveNumber += 1;
  }
}

function updateCastlingRightsSearch(
  state,
  move,
  fromIndex,
  toIndex,
  movingPiece
) {
  const cr = state.castlingRights;
  const fromSq = indexToAlgebraicFast(fromIndex);
  const toSq = indexToAlgebraicFast(toIndex);

  if (movingPiece === "wK") {
    cr.white.kingSide = false;
    cr.white.queenSide = false;
  } else if (movingPiece === "bK") {
    cr.black.kingSide = false;
    cr.black.queenSide = false;
  }

  // Rook moves / captures
  if (fromSq === "h1" || toSq === "h1") cr.white.kingSide = false;
  if (fromSq === "a1" || toSq === "a1") cr.white.queenSide = false;
  if (fromSq === "h8" || toSq === "h8") cr.black.kingSide = false;
  if (fromSq === "a8" || toSq === "a8") cr.black.queenSide = false;
}

/* === Fast algebraic helpers (engine internal use) === */

function algebraicToIndexFast(sq) {
  const file = sq.charCodeAt(0) - 97; // 'a'
  const rank = sq.charCodeAt(1) - 49; // '1'
  return rank * 8 + file;
}

function indexToAlgebraicFast(index) {
  const file = String.fromCharCode(97 + (index % 8));
  const rank = String.fromCharCode(49 + Math.floor(index / 8));
  return file + rank;
}

/* === AI core === */

/** Transposition table flag types */
const TT_EXACT = 0;
const TT_LOWER = 1; // Beta cutoff (fail-high)
const TT_UPPER = 2; // Alpha cutoff (fail-low)

/** Maximum transposition table entries */
const TT_MAX_SIZE = 100000;

/** Null move reduction depth */
const NULL_MOVE_REDUCTION = 3;

/** Minimum pieces (non-pawns) before disabling null move pruning */
const ENDGAME_PIECE_THRESHOLD = 7;

export class AI {
  constructor() {
    // Tunable randomness factor per level (reduced for stronger play)
    this.randomness = {
      1: 0.35,
      2: 0.20,
      3: 0.10,
      4: 0.05,
      5: 0.03,
    };

    // Increased depths now that we have optimizations
    this.depthForLevel = {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
    };

    // Killer moves: 2 slots per depth level (up to depth 20)
    this.killerMoves = [];
    for (let i = 0; i < 20; i++) {
      this.killerMoves.push([null, null]);
    }

    // History heuristic table: [fromSquare][toSquare] -> score
    // Tracks which quiet moves cause cutoffs
    this.historyTable = [];
    for (let i = 0; i < 64; i++) {
      this.historyTable.push(new Array(64).fill(0));
    }

    // Transposition table: cleared at start of each search
    this.transpositionTable = new Map();
  }

  /**
   * Clear search-specific data before a new search
   */
  clearSearchData() {
    // Clear killer moves
    for (let i = 0; i < this.killerMoves.length; i++) {
      this.killerMoves[i][0] = null;
      this.killerMoves[i][1] = null;
    }
    // Decay history table (halve all values) instead of clearing
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        this.historyTable[i][j] = Math.floor(this.historyTable[i][j] / 2);
      }
    }
    // Clear transposition table if it's getting too large
    if (this.transpositionTable.size > TT_MAX_SIZE) {
      this.transpositionTable.clear();
    }
  }

  /**
   * Update history table on beta cutoff
   */
  updateHistory(move, depth) {
    if (move.captured) return; // Only for quiet moves
    const fromIdx = algebraicToIndexFast(move.from);
    const toIdx = algebraicToIndexFast(move.to);
    // Bonus increases with depth squared (deeper cutoffs more valuable)
    this.historyTable[fromIdx][toIdx] += depth * depth;
    // Cap to prevent overflow
    if (this.historyTable[fromIdx][toIdx] > 10000) {
      this.historyTable[fromIdx][toIdx] = 10000;
    }
  }

  /**
   * Get history score for a move
   */
  getHistoryScore(move) {
    const fromIdx = algebraicToIndexFast(move.from);
    const toIdx = algebraicToIndexFast(move.to);
    return this.historyTable[fromIdx][toIdx];
  }

  /**
   * Count non-pawn pieces on the board (for endgame detection)
   */
  countPieces(board) {
    let count = 0;
    for (let i = 0; i < 64; i++) {
      const piece = board[i];
      if (piece && piece[1] !== 'P') {
        count++;
      }
    }
    return count;
  }

  /**
   * Store a killer move at the given depth
   */
  storeKillerMove(move, depth) {
    // Guard against negative depth or out-of-bounds access
    if (depth < 0 || depth >= this.killerMoves.length) return;
    // Don't store captures as killers (they're already ordered first)
    if (move.captured) return;

    const slot = this.killerMoves[depth];
    // Defensive: ensure slot exists
    if (!slot) return;
    // Don't store duplicate
    if (slot[0] && slot[0].from === move.from && slot[0].to === move.to) return;
    // Shift and store
    slot[1] = slot[0];
    slot[0] = { from: move.from, to: move.to };
  }

  /**
   * Check if a move matches a killer move at the given depth
   */
  isKillerMove(move, depth) {
    // Guard against negative depth or out-of-bounds access
    if (depth < 0 || depth >= this.killerMoves.length) return false;
    const slot = this.killerMoves[depth];
    // Defensive: ensure slot exists
    if (!slot) return false;
    return (slot[0] && slot[0].from === move.from && slot[0].to === move.to) ||
      (slot[1] && slot[1].from === move.from && slot[1].to === move.to);
  }

  /**
   * Generate a hash key for the transposition table
   */
  hashPosition(state) {
    // Simple string-based hash (not Zobrist, but functional)
    return state.board.join(',') + '|' + state.activeColor + '|' +
      (state.enPassantTarget || '-');
  }

  /**
   * Probe the transposition table
   */
  probeTable(key, depth, alpha, beta) {
    const entry = this.transpositionTable.get(key);
    if (!entry || entry.depth < depth) return null;

    if (entry.flag === TT_EXACT) {
      return entry.score;
    } else if (entry.flag === TT_LOWER && entry.score >= beta) {
      return entry.score;
    } else if (entry.flag === TT_UPPER && entry.score <= alpha) {
      return entry.score;
    }
    return null;
  }

  /**
   * Store an entry in the transposition table
   */
  storeTable(key, depth, score, flag, bestMove) {
    // Replace if deeper or same depth
    const existing = this.transpositionTable.get(key);
    if (!existing || existing.depth <= depth) {
      this.transpositionTable.set(key, { depth, score, flag, bestMove });
    }
  }

  /**
   * Top-level API used by Game.
   *
   * @param {import("./GameState.js").GameState} gameState
   * @param {Object} options
   * @param {number} options.level 1..5
   * @param {"white"|"black"} options.forColor
   * @returns {Promise<import("./Move.js").Move|null>}
   */
  async findBestMove(gameState, { level, forColor, timeout = 10000 }) {
    const clampedLevel = Math.max(1, Math.min(5, Number(level) || 1));
    const depth = this.depthForLevel[clampedLevel];

    const baseState = new SearchState(gameState);
    const legalMoves = generateLegalMoves(baseState);
    if (legalMoves.length === 0) return null;

    // Level 1: lightweight, semi-random play.
    if (clampedLevel === 1) {
      return this.pickLevel1Move(baseState, legalMoves, forColor);
    }

    // Progressive deepening with time limits for higher levels to prevent UI freezing
    if (clampedLevel >= 2) { // Enable progressive deepening for all levels > 1 to respect timeout
      return this.progressiveDeepeningSearch(baseState, legalMoves, depth, forColor, clampedLevel, timeout);
    }

    // Synchronous search wrapped in Promise for async API.
    return new Promise((resolve) => {
      const move = this.searchRoot(baseState, legalMoves, depth, forColor, {
        level: clampedLevel,
      });
      resolve(move);
    });
  }

  pickLevel1Move(state, moves, color) {
    const scored = moves.map((m) => {
      const next = state.clone();
      applyMoveSearch(next, m, state.activeColor);
      const score = evaluate(next, color);
      return { move: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const keepCount = Math.max(1, Math.floor(scored.length * 0.4));
    const top = scored.slice(0, keepCount);
    return top[Math.floor(Math.random() * top.length)].move;
  }

  /**
   * Root search with alpha-beta, move ordering, and level-aware randomness.
   */
  searchRoot(state, legalMoves, depth, color, { level, timeout, startTime }) {
    const isMaximizing = state.activeColor === color;

    // MVV-LVA move ordering with killer moves and history heuristic
    const ordered = legalMoves.slice().sort((a, b) => {
      let aScore = 0;
      let bScore = 0;

      // MVV-LVA for captures: victim * 10 - attacker
      if (a.captured) {
        aScore = pieceValueApprox(a.captured) * 10 - pieceValueApprox(a.piece) + 10000;
      } else if (this.isKillerMove(a, depth)) {
        aScore = 9000; // Killer move bonus (below captures)
      } else {
        aScore = this.getHistoryScore(a); // History heuristic for quiet moves
      }
      if (a.promotion) aScore += pieceValueApprox(a.promotion) * 10;

      if (b.captured) {
        bScore = pieceValueApprox(b.captured) * 10 - pieceValueApprox(b.piece) + 10000;
      } else if (this.isKillerMove(b, depth)) {
        bScore = 9000;
      } else {
        bScore = this.getHistoryScore(b);
      }
      if (b.promotion) bScore += pieceValueApprox(b.promotion) * 10;

      return bScore - aScore;
    });

    // Defensive check - should not happen if legalMoves was validated
    if (ordered.length === 0) {
      return null;
    }

    let bestMove = ordered[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of ordered) {
      // Check timeout before processing each move
      if (timeout && startTime && Date.now() - startTime >= timeout) {
        break;
      }

      const next = state.clone();
      applyMoveSearch(next, move, state.activeColor);
      const score = this.minimax(
        next,
        depth - 1,
        alpha,
        beta,
        color,
        !isMaximizing,
        level,
        timeout,
        startTime
      );

      // Check if timeout was exceeded (indicated by null return)
      if (score === null) {
        break;
      }

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        if (score > alpha) alpha = score;
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        if (score < beta) beta = score;
      }

      if (beta <= alpha) break;
    }

    // Slight randomness: pick among moves near best score.
    // Skip if timeout was exceeded to avoid wasting time
    if (!(timeout && startTime && Date.now() - startTime >= timeout)) {
      const jitter = this.randomness[level] || 0;
      if (jitter > 0 && ordered.length > 1) {
        const candidates = [];
        for (const move of ordered) {
          // Check timeout during candidate evaluation
          if (timeout && startTime && Date.now() - startTime >= timeout) {
            break;
          }
          const next = state.clone();
          applyMoveSearch(next, move, state.activeColor);
          const score = evaluate(next, color);
          const delta = Math.abs(score - bestScore);
          if (delta <= PIECE_VALUES.P * jitter * 2) {
            candidates.push(move);
          }
        }
        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    }

    return bestMove;
  }

  /**
   * Minimax with alpha-beta, null move pruning, LMR, and quiescence.
   */
  minimax(state, depth, alpha, beta, rootColor, isMaximizing, level, timeout, startTime, allowNullMove = true) {
    // Check timeout at the start of each recursive call
    if (timeout && startTime && Date.now() - startTime >= timeout) {
      return null; // Signal timeout
    }

    const originalAlpha = alpha;

    // Transposition table lookup (only at level 3+)
    const ttKey = level >= 3 ? this.hashPosition(state) : null;
    if (ttKey) {
      const ttScore = this.probeTable(ttKey, depth, alpha, beta);
      if (ttScore !== null) {
        return ttScore;
      }
    }

    // Check if in check (needed for null move and LMR decisions)
    const inCheck = isInCheck(state);

    const legalMoves = generateLegalMoves(state);

    // Termination: depth exhausted or no moves (checkmate/stalemate)
    // Use <= 0 because LMR and null move pruning can push depth negative
    if (depth <= 0 || legalMoves.length === 0) {
      let baseScore = evaluate(state, rootColor);

      // Checkmate / stalemate approximation
      if (legalMoves.length === 0) {
        if (inCheck) {
          baseScore =
            state.activeColor === rootColor ? -100000 : 100000;
        } else {
          baseScore = 0;
        }
      }

      // Quiescence on higher levels
      if (depth <= 0 && level >= 4) {
        const qScore = this.quiescence(state, alpha, beta, rootColor, baseScore, timeout, startTime);
        if (qScore === null) {
          return baseScore;
        }
        return qScore;
      }

      return baseScore;
    }

    // === NULL MOVE PRUNING ===
    // Skip if: in check, low depth, endgame, or already did null move
    if (allowNullMove && !inCheck && depth >= 3 && level >= 4) {
      const pieceCount = this.countPieces(state.board);
      if (pieceCount >= ENDGAME_PIECE_THRESHOLD) {
        // Make null move (pass turn)
        const nullState = state.clone();
        nullState.activeColor = oppositeColor(nullState.activeColor);
        nullState.enPassantTarget = null; // Clear en passant after null move

        // Search with reduced depth and narrow window
        const nullScore = this.minimax(
          nullState,
          depth - 1 - NULL_MOVE_REDUCTION,
          isMaximizing ? -beta : alpha,
          isMaximizing ? -beta + 1 : alpha + 1,
          rootColor,
          !isMaximizing,
          level,
          timeout,
          startTime,
          false // Don't allow consecutive null moves
        );

        if (nullScore !== null) {
          // If null move causes beta cutoff, prune
          if (isMaximizing && nullScore >= beta) {
            return beta;
          }
          if (!isMaximizing && nullScore <= alpha) {
            return alpha;
          }
        }
      }
    }

    // MVV-LVA move ordering with killer moves and history heuristic
    const ordered = legalMoves.slice().sort((a, b) => {
      let aScore = 0;
      let bScore = 0;

      // MVV-LVA for captures (highest priority)
      if (a.captured) {
        aScore = pieceValueApprox(a.captured) * 10 - pieceValueApprox(a.piece) + 10000;
      } else if (this.isKillerMove(a, depth)) {
        aScore = 9000; // Killer move bonus
      } else {
        aScore = this.getHistoryScore(a); // History heuristic
      }
      if (a.promotion) aScore += pieceValueApprox(a.promotion) * 10;

      if (b.captured) {
        bScore = pieceValueApprox(b.captured) * 10 - pieceValueApprox(b.piece) + 10000;
      } else if (this.isKillerMove(b, depth)) {
        bScore = 9000;
      } else {
        bScore = this.getHistoryScore(b);
      }
      if (b.promotion) bScore += pieceValueApprox(b.promotion) * 10;

      return bScore - aScore;
    });

    // Defensive check - should have been caught in depth=0 check above
    if (ordered.length === 0) {
      return isMaximizing ? -Infinity : Infinity;
    }

    let bestMove = ordered[0];

    if (isMaximizing) {
      let value = -Infinity;
      for (let i = 0; i < ordered.length; i++) {
        // Check timeout periodically
        if (timeout && startTime && i % 10 === 0 && Date.now() - startTime >= timeout) {
          return null;
        }

        const move = ordered[i];
        const next = state.clone();
        applyMoveSearch(next, move, state.activeColor);

        // === LATE MOVE REDUCTIONS (LMR) ===
        // Reduce depth for late quiet moves at higher levels
        let reduction = 0;
        if (level >= 5 && depth >= 3 && i >= 4 && !move.captured && !move.promotion && !inCheck) {
          reduction = 1;
          if (i >= 8) reduction = 2; // More aggressive reduction for very late moves
        }

        let child = this.minimax(
          next,
          depth - 1 - reduction,
          alpha,
          beta,
          rootColor,
          false,
          level,
          timeout,
          startTime,
          true
        );

        // Re-search at full depth if reduced search looks promising
        if (child !== null && reduction > 0 && child > alpha) {
          child = this.minimax(
            next,
            depth - 1,
            alpha,
            beta,
            rootColor,
            false,
            level,
            timeout,
            startTime,
            true
          );
        }

        if (child === null) {
          return null;
        }

        if (child > value) {
          value = child;
          bestMove = move;
        }
        if (value > alpha) alpha = value;
        if (alpha >= beta) {
          // Beta cutoff - update killer and history
          this.storeKillerMove(move, depth);
          this.updateHistory(move, depth);
          break;
        }
      }

      // Store in transposition table
      if (ttKey) {
        let flag = TT_EXACT;
        if (value <= originalAlpha) flag = TT_UPPER;
        else if (value >= beta) flag = TT_LOWER;
        this.storeTable(ttKey, depth, value, flag, bestMove);
      }

      return value;
    }

    // Minimizing player
    let value = Infinity;
    for (let i = 0; i < ordered.length; i++) {
      if (timeout && startTime && i % 10 === 0 && Date.now() - startTime >= timeout) {
        return null;
      }

      const move = ordered[i];
      const next = state.clone();
      applyMoveSearch(next, move, state.activeColor);

      // LMR for minimizing player
      let reduction = 0;
      if (level >= 5 && depth >= 3 && i >= 4 && !move.captured && !move.promotion && !inCheck) {
        reduction = 1;
        if (i >= 8) reduction = 2;
      }

      let child = this.minimax(
        next,
        depth - 1 - reduction,
        alpha,
        beta,
        rootColor,
        true,
        level,
        timeout,
        startTime,
        true
      );

      // Re-search at full depth if reduced search looks promising
      if (child !== null && reduction > 0 && child < beta) {
        child = this.minimax(
          next,
          depth - 1,
          alpha,
          beta,
          rootColor,
          true,
          level,
          timeout,
          startTime,
          true
        );
      }

      if (child === null) {
        return null;
      }

      if (child < value) {
        value = child;
        bestMove = move;
      }
      if (value < beta) beta = value;
      if (alpha >= beta) {
        this.storeKillerMove(move, depth);
        this.updateHistory(move, depth);
        break;
      }
    }

    // Store in transposition table
    if (ttKey) {
      let flag = TT_EXACT;
      if (value <= originalAlpha) flag = TT_UPPER;
      else if (value >= beta) flag = TT_LOWER;
      this.storeTable(ttKey, depth, value, flag, bestMove);
    }

    return value;
  }

  /**
   * Simple quiescence search: follow capture sequences.
   */
  quiescence(state, alpha, beta, rootColor, standPat, timeout, startTime) {
    // Check timeout at the start of quiescence search
    if (timeout && startTime && Date.now() - startTime >= timeout) {
      return null; // Signal timeout
    }

    let value = standPat;
    if (value > alpha) {
      alpha = value;
      if (alpha >= beta) return alpha;
    }

    const allMoves = generateLegalMoves(state);
    const captureMoves = allMoves.filter((m) => m.captured);

    const limited = captureMoves.slice(0, 16);

    for (let i = 0; i < limited.length; i++) {
      // Check timeout periodically during quiescence
      if (timeout && startTime && i % 5 === 0 && Date.now() - startTime >= timeout) {
        return value; // Return current best value if timeout
      }

      const move = limited[i];
      const next = state.clone();
      applyMoveSearch(next, move, state.activeColor);
      const score = -this.quiescence(
        next,
        -beta,
        -alpha,
        rootColor,
        evaluate(next, rootColor),
        timeout,
        startTime
      );

      // Check if recursive quiescence timed out
      if (score === null) {
        return value; // Return current best value
      }

      if (score > value) value = score;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }
    return value;
  }

  /**
   * Progressive deepening search with time limits to prevent UI freezing.
   * Uses iterative deepening starting from lower depths and increasing
   * as time allows, yielding control to UI between iterations.
   */
  async progressiveDeepeningSearch(state, legalMoves, maxDepth, color, level, timeout = 10000) {
    const startTime = Date.now();
    let bestMove = legalMoves[0]; // Fallback move
    let currentDepth = 1;

    // Clear search-specific data for fresh search
    this.clearSearchData();

    // Start with depth 1 and progressively increase
    while (currentDepth <= maxDepth) {
      // Check time budget before starting new depth
      if (Date.now() - startTime >= timeout) {
        break;
      }

      // Use setTimeout to yield control back to the UI/Worker loop
      await new Promise(resolve => setTimeout(resolve, 0));

      // Pass timeout and startTime to searchRoot so it can check during search
      const move = this.searchRoot(state, legalMoves, currentDepth, color, {
        level: level,
        timeout: timeout,
        startTime: startTime,
      });

      if (move) {
        bestMove = move;
      }

      // Check timeout again after search completes
      if (Date.now() - startTime >= timeout) {
        break;
      }

      currentDepth++;
    }

    return bestMove;
  }

}

/* === Utility: approximate piece value === */

function pieceValueApprox(piece) {
  if (!piece) return 0;
  const code = String(piece);
  const type = code[code.length - 1];
  return PIECE_VALUES[type] || 0;
}

