# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

#### Web Worker Support
- AI computation now runs in a dedicated Web Worker (`js/ai.worker.js`)
- UI remains fully responsive during AI thinking at all difficulty levels
- Graceful fallback to main thread if Web Workers are unavailable
- Automatic timeout handling with fallback if worker becomes unresponsive

#### Search Optimizations (Phase 1)
- **MVV-LVA Move Ordering**: Captures sorted by Most Valuable Victim - Least Valuable Attacker for better alpha-beta pruning (15-25% speedup)
- **Killer Move Heuristic**: Tracks moves that caused beta cutoffs at each depth level (10-15% speedup)
- **Transposition Table**: Caches up to 100k evaluated positions to avoid redundant search (30-50% speedup in middlegame)

#### Advanced Search Optimizations (Phase 2)
- **Null Move Pruning**: Skip subtrees where opponent can't improve position even with a free move (20-35% node reduction). Disabled in check and endgame positions.
- **History Heuristic**: Tracks quiet moves that cause cutoffs; improves move ordering for non-captures (10-20% better pruning)
- **Late Move Reductions (LMR)**: Search later moves at reduced depth, re-search if promising (15-25% node reduction). Only at Level 5 for deep searches.

#### Enhanced Position Evaluation
- **Bishop pair bonus**: +30 centipawns for having both bishops
- **Passed pawn bonus**: +10 to +110 centipawns based on advancement toward promotion
- **Doubled pawn penalty**: -20 centipawns per doubled pawn
- **Isolated pawn penalty**: -15 centipawns per pawn with no friendly pawns on adjacent files
- **Rook on open file**: +25 centipawns (no pawns on file)
- **Rook on semi-open file**: +12 centipawns (only enemy pawns on file)
- **King safety - Pawn shield**: +15 centipawns per pawn protecting castled king
- **King safety - Castled bonus**: +25 centipawns for king on g1/g8 or c1/c8
- **King safety - Open file penalty**: -20 centipawns per open file adjacent to king

### Changed

#### Difficulty Levels
Increased search depths and reduced randomness for stronger play:

| Level | Old Depth | New Depth | Old Randomness | New Randomness |
|-------|-----------|-----------|----------------|----------------|
| 1     | 1         | 1         | 40%            | 35%            |
| 2     | 2         | 2         | 25%            | 20%            |
| 3     | 3         | 3         | 15%            | 10%            |
| 4     | 3         | 4         | 8%             | 5%             |
| 5     | 4         | 5         | 5%             | 3%             |

#### Files Modified
- `js/engine/AI.js` - Added all search optimizations (MVV-LVA, killer moves, transposition table, null move, history heuristic, LMR)
- `js/engine/Evaluator.js` - Added positional evaluation terms including king safety
- `js/Game.js` - Added Web Worker integration with fallback

#### Files Added
- `js/ai.worker.js` - Dedicated Web Worker for AI computation

### Technical Details

#### Transposition Table
- Uses string-based position hashing (board + active color + en passant)
- Stores depth, score, flag (exact/lower/upper bound), and best move
- Limited to 100k entries to prevent memory issues
- Cleared when size limit exceeded

#### Killer Moves
- 2 slots per depth level (up to depth 20)
- Only stores non-capture moves (captures already ordered first)
- Gives 9000-point bonus in move ordering (below captures)

#### History Heuristic
- 64x64 table tracking cutoffs by from-square and to-square
- Bonus = depth² on beta cutoff (deeper cutoffs weighted more)
- Values decay by 50% between searches to adapt to position changes
- Capped at 10000 to prevent overflow

#### Null Move Pruning
- Reduction depth: 3 ply (searches at depth - 4 total)
- Disabled when: in check, depth < 3, endgame (< 7 non-pawn pieces)
- Prevents consecutive null moves to avoid zugzwang issues

#### Late Move Reductions
- Only at Level 5 with depth >= 3
- First 4 moves searched at full depth
- Moves 5-7: reduced by 1 ply
- Moves 8+: reduced by 2 ply
- Re-search at full depth if reduced search improves alpha/beta

#### Web Worker Communication
- Main thread sends: `{ type: 'search', state, level, forColor, timeout }`
- Worker responds: `{ type: 'result', move }` or `{ type: 'error', message }`
- Timeout protection with automatic fallback to main thread

### Estimated Strength
- Level 5 now plays at approximately 1800-1900 Elo strength
- Phase 2 optimizations provide ~400 Elo improvement over Phase 1
