import {GAME_CONFIG, GAME_RULES, CSS_CLASSES} from "../constants.js";

export class CheckerView {
    #boardElement;
    #onCellClick = null;

    constructor(elementId) {
        this.#boardElement = document.getElementById(elementId);
        this.#createStaticGrid();
        this.#attachListeners();
    }

    bindCellClick(handler) {
        this.#onCellClick = handler;
    }

    #attachListeners() {
        this.#boardElement.addEventListener('click', (event) => {
            if (!this.#onCellClick) return;

            const cell = event.target.closest(`.${CSS_CLASSES.CELL}`);
            if (!cell || !this.#boardElement.contains(cell)) return;

            const row = Number(cell.dataset.row);
            const col = Number(cell.dataset.col);
            if (Number.isNaN(row) || Number.isNaN(col)) return;

            this.#onCellClick(row, col);
        });
    }

    #createStaticGrid() {
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const cell = document.createElement('div');
                cell.classList.add(CSS_CLASSES.CELL);
                cell.dataset.row = r;
                cell.dataset.col = c;

                const isBlack = this.#isBlackCell(r, c);
                cell.classList.add(isBlack ? CSS_CLASSES.BLACK_CELL : CSS_CLASSES.WHITE_CELL);
                this.#boardElement.appendChild(cell);
            }
        }
    }

    render(boardModel) {
        boardModel.forEach((row, rowIndex) => {
            row.forEach((checker, colIndex) => {
                const cell = this.#boardElement.querySelector(`[data-row="${rowIndex}"][data-col="${colIndex}"]`);

                cell.replaceChildren();

                if (checker) {
                    const piece = this.#createPiece(checker);
                    cell.appendChild(piece);
                }
            });
        });
    }

    #isBlackCell(row, col) {
        return (row + col) % GAME_RULES.DARK_CELL_MOD === GAME_RULES.DARK_CELL_REMAINDER;
    }

    #createPiece(checker) {
        const piece = document.createElement("div");
        piece.classList.add(CSS_CLASSES.PIECE);
        piece.classList.add(
            checker.color === GAME_CONFIG.WHITE_PLAYER ? CSS_CLASSES.WHITE_PIECE : CSS_CLASSES.BLACK_PIECE
        );
        return piece;
    }

    highlightCell(row, col) {
        const allPieces = this.#boardElement.querySelectorAll(`.${CSS_CLASSES.PIECE}`);
        allPieces.forEach(p => p.classList.remove(CSS_CLASSES.SELECTED));

        if (row === null || col === null) return;

        const targetCell = this.#boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (targetCell) {
        const piece = targetCell.querySelector(`.${CSS_CLASSES.PIECE}`);
            if (piece) {
                piece.classList.add(CSS_CLASSES.SELECTED);
            }
        }
    }

    highlightMoves(moves) {
        this.#boardElement.querySelectorAll(`.${CSS_CLASSES.AVAILABLE_STEP}`)
        .forEach(el => el.classList.remove(CSS_CLASSES.AVAILABLE_STEP));

        moves.forEach(move => {
            const cell = this.#boardElement.querySelector(`[data-row="${move.r}"][data-col="${move.c}"]`);
            if (cell) {
                cell.classList.add(CSS_CLASSES.AVAILABLE_STEP);
            }
        });
    }
}
