import { GAME_CONFIG } from "../constants.js";

export class CheckerController {
    #model;
    #view;
    #selectedCoords = null;
    #availableMoves = [];
    #turnIndicator;

    constructor(model, view) {
        this.#model = model;
        this.#view = view;
        this.#init();
    }

    #init() {
        this.#turnIndicator = document.getElementById("turn-indicator");
        this.#view.bindCellClick((r, c) => this.#handleCellClick(r, c));
        this.#view.render(this.#model.board);
        this.#updateTurnIndicator();
    }

    #updateTurnIndicator() {
        if (!this.#turnIndicator) return;
        const label = this.#model.turn === GAME_CONFIG.WHITE_PLAYER ? "Хід: білих" : "Хід: чорних";
        this.#turnIndicator.textContent = label;
    }

    #handleCellClick(row, col) {
        const piece = this.#model.getPiece(row, col);
        const clickedMove = this.#availableMoves.find(m => m.r === row && m.c === col);

        if (clickedMove) {
            this.#model.movePiece(this.#selectedCoords, {r: row, c: col}, clickedMove);
            this.#resetSelection();
            this.#view.render(this.#model.board);
            this.#updateTurnIndicator();
            return;
        }

        if ( piece && piece.color == this.#model.turn) {
            this.#selectedCoords = {r: row, c: col};
            this.#availableMoves = this.#model.getValidMoves(row, col);

            this.#view.highlightCell(row, col);
            this.#view.highlightMoves(this.#availableMoves);
        } else {
            this.#resetSelection();
        }
    }
    #resetSelection() {
        this.#selectedCoords = null;
        this.#availableMoves = [];
        this.#view.highlightCell(null, null);
        this.#view.highlightMoves([]);
    }
}
