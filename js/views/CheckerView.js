import { GAME_CONFIG, GAME_RULES, CSS_CLASSES } from "../constants.js";

export class CheckerView {
    #boardElement;
    #turnElement;
    #undoButton;
    #newGameButton;
    #overlayElement;
    #onCellClick = null;
    #dragFrom = null;
    #dropHoverCell = null;

    constructor(boardElementId, { turnElementId = null, undoButtonId = null, newGameButtonId = null } = {}) {
        this.#boardElement = document.getElementById(boardElementId);
        this.#turnElement = turnElementId ? document.getElementById(turnElementId) : null;
        this.#undoButton = undoButtonId ? document.getElementById(undoButtonId) : null;
        this.#newGameButton = newGameButtonId ? document.getElementById(newGameButtonId) : null;

        this.#createStaticGrid();
        this.#ensureOverlay();
        this.#attachListeners();
        this.#attachDndListeners();
    }

    bindCellClick(handler) {
        this.#onCellClick = handler;
    }

    bindUndoClick(handler) {
        if (!this.#undoButton) return;
        this.#undoButton.addEventListener("click", handler);
    }

    bindNewGameClick(handler) {
        if (!this.#newGameButton) return;
        this.#newGameButton.addEventListener("click", handler);
    }

    setUndoEnabled(enabled) {
        if (!this.#undoButton) return;
        this.#undoButton.disabled = !enabled;
    }

    setNewGameEnabled(enabled) {
        if (!this.#newGameButton) return;
        this.#newGameButton.disabled = !enabled;
    }

    setTurn(turn) {
        if (!this.#turnElement) return;
        this.#turnElement.classList.remove("winner");
        this.#turnElement.textContent = turn === GAME_CONFIG.WHITE_PLAYER ? "Turn: White" : "Turn: Black";
    }

    setWinner(winner) {
        if (!this.#turnElement) return;
        this.#turnElement.classList.add("winner");
        this.#turnElement.textContent = winner === GAME_CONFIG.WHITE_PLAYER ? "Winner: White" : "Winner: Black";
    }

    #attachListeners() {
        this.#boardElement.addEventListener("click", (event) => {
            if (!this.#onCellClick) return;

            const cell = event.target.closest(`.${CSS_CLASSES.CELL}`);
            if (!cell || !this.#boardElement.contains(cell)) return;

            const row = Number(cell.dataset.row);
            const col = Number(cell.dataset.col);
            if (Number.isNaN(row) || Number.isNaN(col)) return;

            this.#onCellClick(row, col);
        });
    }

    #attachDndListeners() {
        this.#boardElement.addEventListener("dragstart", (event) => {
            if (!this.#onCellClick) return;

            const piece = event.target.closest(`.${CSS_CLASSES.PIECE}`);
            if (!piece || !this.#boardElement.contains(piece)) return;

            const cell = piece.closest(`.${CSS_CLASSES.CELL}`);
            if (!cell) return;

            const r = Number(cell.dataset.row);
            const c = Number(cell.dataset.col);
            if(!Number.isInteger(r) || !Number.isInteger(c)) return;

            this.#dragFrom = {r, c};

            this.#onCellClick(r, c);

            event.dataTransfer?.setData("text/plain", `${r}, ${c}`);
            if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";

        });

        this.#boardElement.addEventListener("dragover", (event) => {
            const cell = event.target.closest(`.${CSS_CLASSES.CELL}`);
            if (!cell || !this.#boardElement.contains(cell)) return;

            const isValidDrop = cell.classList.contains(CSS_CLASSES.AVAILABLE_STEP);
            if (!isValidDrop) {
                this.#setDropHover(null);
                return;
            }

            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            this.#setDropHover(cell);
        });

        this.#boardElement.addEventListener("dragleave", (event) => {
            const cell = event.target.closest(`.${CSS_CLASSES.CELL}`);
            if (cell && cell === this.#dropHoverCell) this.#setDropHover(null);
        });

        this.#boardElement.addEventListener("drop", (event) => {
            if (!this.#onCellClick) return;
            const cell = event.target.closest(`.${CSS_CLASSES.CELL}`);
            if (!cell || !this.#boardElement.contains(cell)) return;

            const isValidDrop = cell.classList.contains(CSS_CLASSES.AVAILABLE_STEP);
            if (!isValidDrop) return;

            event.preventDefault();

            const r = Number(cell.dataset.row);
            const c = Number(cell.dataset.col);
            if(!Number.isInteger(r) || !Number.isInteger(c)) return;

            this.#onCellClick(r, c);
            this.#dragFrom = null;
            this.#setDropHover(null);
        });

        this.#boardElement.addEventListener("dragend", (event) => {
            this.#dragFrom = null;
            this.#setDropHover(null);
        });
    }

    #setDropHover(cellEl) {
        if (this.#dropHoverCell === cellEl) return;
        if (this.#dropHoverCell) this.#dropHoverCell.classList.remove("drop-target");
        this.#dropHoverCell = cellEl;
        if (this.#dropHoverCell) this.#dropHoverCell.classList.add("drop-target");
    }

    #createStaticGrid() {
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const cell = document.createElement("div");
                cell.classList.add(CSS_CLASSES.CELL);
                cell.dataset.row = r;
                cell.dataset.col = c;

                const isBlack = this.#isBlackCell(r, c);
                cell.classList.add(isBlack ? CSS_CLASSES.BLACK_CELL : CSS_CLASSES.WHITE_CELL);
                this.#boardElement.appendChild(cell);
            }
        }
    }

    #ensureOverlay() {
        this.#overlayElement = document.createElement("div");
        this.#overlayElement.className = "overlay";
        this.#boardElement.appendChild(this.#overlayElement);
    }

    render(boardModel, { animate = true } = {}) {
        const oldPieces = [...this.#boardElement.querySelectorAll(`.${CSS_CLASSES.PIECE}[data-id]`)];
        const oldRects = new Map(oldPieces.map(p => [p.dataset.id, p.getBoundingClientRect()]));

        boardModel.forEach((row, rowIndex) => {
            row.forEach((checker, colIndex) => {
                const cell = this.#boardElement.querySelector(`[data-row="${rowIndex}"][data-col="${colIndex}"]`);
                if (!cell) return;

                cell.replaceChildren();

                if (checker) {
                    const piece = this.#createPiece(checker);
                    cell.appendChild(piece);
                }
            });
        });

        if (!animate) return;

        const boardRect = this.#boardElement.getBoundingClientRect();
        const newPieces = [...this.#boardElement.querySelectorAll(`.${CSS_CLASSES.PIECE}[data-id]`)];
        const newRects = new Map(newPieces.map(p => [p.dataset.id, p.getBoundingClientRect()]));

        this.#overlayElement.replaceChildren();
        oldRects.forEach((rect, id) => {
            if (newRects.has(id)) return;

            const oldEl = oldPieces.find(p => p.dataset.id === id);
            const ghost = document.createElement("div");
            ghost.className = oldEl ? oldEl.className : CSS_CLASSES.PIECE;
            ghost.classList.add("ghost");
            ghost.style.left = `${rect.left - boardRect.left}px`;
            ghost.style.top = `${rect.top - boardRect.top}px`;
            ghost.style.width = `${rect.width}px`;
            ghost.style.height = `${rect.height}px`;
            this.#overlayElement.appendChild(ghost);

            requestAnimationFrame(() => ghost.classList.add("ghost-out"));
        });

        newPieces.forEach(pieceEl => {
            const id = pieceEl.dataset.id;
            const oldRect = oldRects.get(id);
            if (!oldRect) {
                pieceEl.classList.add("spawn");
                requestAnimationFrame(() => pieceEl.classList.remove("spawn"));
                return;
            }

            const newRect = newRects.get(id);
            const dx = oldRect.left - newRect.left;
            const dy = oldRect.top - newRect.top;
            if (dx === 0 && dy === 0) return;

            pieceEl.style.transition = "transform 0s";
            pieceEl.style.transform = `translate(${dx}px, ${dy}px)`;
            pieceEl.getBoundingClientRect();
            requestAnimationFrame(() => {
                pieceEl.style.transition = "";
                pieceEl.style.transform = "";
            });
        });
    }

    #isBlackCell(row, col) {
        return (row + col) % GAME_RULES.DARK_CELL_MOD === GAME_RULES.DARK_CELL_REMAINDER;
    }

    #createPiece(checker) {
        const piece = document.createElement("div");
        piece.classList.add(CSS_CLASSES.PIECE);
        piece.classList.add(checker.color === GAME_CONFIG.WHITE_PLAYER ? CSS_CLASSES.WHITE_PIECE : CSS_CLASSES.BLACK_PIECE);
        if (checker.isKing) piece.classList.add(CSS_CLASSES.KING);
        if (checker.id != null) piece.dataset.id = String(checker.id);
        piece.draggable = true;
        return piece;
    }

    highlightCell(row, col) {
        const allPieces = this.#boardElement.querySelectorAll(`.${CSS_CLASSES.PIECE}`);
        allPieces.forEach(p => p.classList.remove(CSS_CLASSES.SELECTED));

        if (row === null || col === null) return;

        const targetCell = this.#boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const piece = targetCell?.querySelector(`.${CSS_CLASSES.PIECE}`);
        if (piece) piece.classList.add(CSS_CLASSES.SELECTED);
    }

    highlightMoves(moves) {
        this.#boardElement.querySelectorAll(`.${CSS_CLASSES.AVAILABLE_STEP}`)
            .forEach(el => el.classList.remove(CSS_CLASSES.AVAILABLE_STEP, CSS_CLASSES.AVAILABLE_MOVE, CSS_CLASSES.AVAILABLE_CAPTURE));

        moves.forEach(move => {
            const cell = this.#boardElement.querySelector(`[data-row="${move.r}"][data-col="${move.c}"]`);
            if (!cell) return;
            cell.classList.add(CSS_CLASSES.AVAILABLE_STEP);
            cell.classList.add(move.type === "jump" ? CSS_CLASSES.AVAILABLE_CAPTURE : CSS_CLASSES.AVAILABLE_MOVE);
        });
    }

    highlightCapturablePieces(coordsList) {
        this.#boardElement.querySelectorAll(`.${CSS_CLASSES.PIECE}.${CSS_CLASSES.CAPTURABLE}`)
            .forEach(el => el.classList.remove(CSS_CLASSES.CAPTURABLE));

        coordsList.forEach(({ r, c }) => {
            const cell = this.#boardElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            const piece = cell?.querySelector(`.${CSS_CLASSES.PIECE}`);
            if (piece) piece.classList.add(CSS_CLASSES.CAPTURABLE);
        });
    }
}
