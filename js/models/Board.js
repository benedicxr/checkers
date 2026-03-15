import { GAME_CONFIG, GAME_RULES } from "../constants.js";

export class Board {
    #grid;

    constructor() {
        this.#grid = Array.from({ length: GAME_CONFIG.ROWS }, () =>
            Array.from({ length: GAME_CONFIG.COLS }, () => null)
        );
    }

    isInside(row, col) {
        return row >= 0 && row < GAME_CONFIG.ROWS && col >= 0 && col < GAME_CONFIG.COLS;
    }

    isDarkCell(row, col) {
        return (row + col) % GAME_RULES.DARK_CELL_MOD === GAME_RULES.DARK_CELL_REMAINDER;
    }

    getPiece(row, col) {
        if (!this.isInside(row, col)) return null;
        return this.#grid[row][col];
    }

    setPiece(row, col, piece) {
        if (!this.isInside(row, col)) return;
        this.#grid[row][col] = piece;
    }

    removePiece(row, col) {
        if (!this.isInside(row, col)) return null;
        const existing = this.#grid[row][col];
        this.#grid[row][col] = null;
        return existing;
    }

    movePiece(from, to) {
        const piece = this.getPiece(from.r, from.c);
        this.setPiece(to.r, to.c, piece);
        this.setPiece(from.r, from.c, null);
        return piece;
    }

    toSnapshot() {
        const snapshot = this.#grid.map(row =>
            Object.freeze(
                row.map(cell => {
                    if (!cell) return null;
                    return Object.freeze({ id: cell.id, color: cell.color, isKing: cell.isKing });
                })
            )
        );
        return Object.freeze(snapshot);
    }
}

