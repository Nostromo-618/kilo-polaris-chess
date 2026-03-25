/**
 * Controls.js
 *
 * Handles:
 * - Color selection (white / black / random)
 * - Difficulty selection (1-5)
 * - Thinking time
 * - New game button
 * - Undo button
 *
 * Provides getters for current settings and notifies when a new game or undo is requested.
 */

export class Controls {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.colorChoiceContainer
   * @param {HTMLSelectElement} options.difficultySelect
   * @param {HTMLButtonElement} options.newGameButton
   * @param {HTMLInputElement} [options.thinkingTimeInput]
   * @param {HTMLButtonElement} [options.undoButton]
   * @param {() => void} options.onNewGameRequested
   * @param {() => void} [options.onUndoRequested]
   */
  constructor({
    colorChoiceContainer,
    difficultySelect,
    newGameButton,
    thinkingTimeInput,
    undoButton,
    onNewGameRequested,
    onUndoRequested,
  }) {
    this.colorChoiceContainer = colorChoiceContainer;
    this.difficultySelect = difficultySelect;
    this.newGameButton = newGameButton;
    this.thinkingTimeInput = thinkingTimeInput || null;
    this.undoButton = undoButton || null;
    this.onNewGameRequested = onNewGameRequested || (() => { });
    this.onUndoRequested = onUndoRequested || (() => { });

    this.selectedColor = "white";

    this.handleColorClick = this.handleColorClick.bind(this);
    this.handleNewGameClick = this.handleNewGameClick.bind(this);
    this.handleUndoClick = this.handleUndoClick.bind(this);

    this.init();
  }

  init() {
    if (this.colorChoiceContainer) {
      this.colorChoiceContainer.addEventListener("click", this.handleColorClick);
      const active = this.colorChoiceContainer.querySelector('button[data-color="white"]');
      if (active) active.classList.add("vd-is-active");
    }

    if (this.newGameButton) {
      this.newGameButton.addEventListener("click", this.handleNewGameClick);
    }

    if (this.undoButton) {
      this.undoButton.addEventListener("click", this.handleUndoClick);
    }
  }

  handleColorClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const color = target.getAttribute("data-color");
    if (!color || !["white", "black", "random"].includes(color)) return;

    this.selectedColor = color;

    const buttons = this.colorChoiceContainer.querySelectorAll("button");
    buttons.forEach((btn) => btn.classList.remove("vd-is-active"));
    target.classList.add("vd-is-active");
  }

  handleNewGameClick() {
    this.onNewGameRequested();
  }

  handleUndoClick() {
    this.onUndoRequested();
  }

  getSelectedColor() {
    return this.selectedColor || "random";
  }

  getDifficulty() {
    if (!this.difficultySelect) return 3;
    const val = Number(this.difficultySelect.value || 3);
    if (Number.isNaN(val) || val < 1 || val > 5) return 3;
    return val;
  }

  setDifficulty(level) {
    const clamped = Math.max(1, Math.min(5, Number(level) || 3));
    if (this.difficultySelect) {
      this.difficultySelect.value = String(clamped);
    }
  }

  setSelectedColor(color) {
    if (!this.colorChoiceContainer) return;
    if (!['white', 'black', 'random'].includes(color)) return;
    this.selectedColor = color;
    const buttons = this.colorChoiceContainer.querySelectorAll('button');
    buttons.forEach((btn) => {
      if (btn.getAttribute('data-color') === color) {
        btn.classList.add('vd-is-active');
      } else {
        btn.classList.remove('vd-is-active');
      }
    });
  }

  /**
   * Get configured thinking time in milliseconds.
   * @returns {number}
   */
  getThinkingTime() {
    if (!this.thinkingTimeInput) return 10000;
    const val = Number(this.thinkingTimeInput.value || 10);
    return Math.max(1000, Math.min(60000, val * 1000));
  }

  /**
   * Set thinking time input value.
   * @param {number} seconds
   */
  setThinkingTime(seconds) {
    if (this.thinkingTimeInput) {
      this.thinkingTimeInput.value = String(Math.max(1, Math.min(60, seconds)));
    }
  }

  /**
   * Set undo button enabled/disabled state.
   * @param {boolean} enabled
   */
  setUndoEnabled(enabled) {
    if (this.undoButton) {
      this.undoButton.disabled = !enabled;
    }
  }
}
