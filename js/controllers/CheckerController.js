export class CheckerController {
    #model;
    #view;

    #selectedCoords = null;
    #availableMoves = [];

    #mustContinueCapture = false;

    #forcedCapturePieces = [];

    #gameOver = false;

    constructor(model, view) {
        this.#model = model;
        this.#view = view;
        this.#init();
    }

    #init() {
        this.#view.bindCellClick((r, c) => this.#handleCellClick(r, c));
        this.#view.bindUndoClick(() => this.#handleUndo());
        this.#renderAndSyncUI({ animate: false });
    }

    #handleCellClick(row, col) {
        if (this.#gameOver) return;

        const clickedMove = this.#availableMoves.find(m => m.r === row && m.c === col);
        if (clickedMove) {
            this.#applyMove(clickedMove, { r: row, c: col });
            return;
        }

        if (this.#mustContinueCapture) {
            return;
        }

        const piece = this.#model.getPiece(row, col);
        if (!piece || piece.color !== this.#model.turn) {
            this.#resetSelection();
            return;
        }

        const mustCapture = this.#model.playerHasCapture(this.#model.turn);
        if (mustCapture) {
            const canThisCapture = this.#forcedCapturePieces.some(p => p.r === row && p.c === col);
            if (!canThisCapture) {
                this.#resetSelection();
                return;
            }
        }

        this.#selectedCoords = { r: row, c: col };
        this.#availableMoves = this.#model.getValidMoves(row, col, { mustCapture });

        this.#view.highlightCell(row, col);
        this.#view.highlightMoves(this.#availableMoves);
    }

    #applyMove(move, to) {
        const from = this.#selectedCoords;
        if (!from) return;

        if (!this.#mustContinueCapture) {
            this.#model.pushHistory();
        }

        if (move.type === "move") {
            this.#model.applyMove(from, to, move, { switchTurn: true });
            this.#mustContinueCapture = false;
            this.#resetSelection();
            this.#renderAndSyncUI();
            return;
        }

        this.#model.applyMove(from, to, move, { switchTurn: false });
        this.#selectedCoords = { r: to.r, c: to.c };

        const nextCaptures = this.#model.getCaptures(to.r, to.c);
        if (nextCaptures.length > 0) {
            this.#mustContinueCapture = true;
            this.#availableMoves = nextCaptures;
            this.#renderAndSyncUI();
            this.#view.highlightCell(to.r, to.c);
            this.#view.highlightMoves(this.#availableMoves);
            this.#view.highlightCapturablePieces([{ r: to.r, c: to.c }]);
            return;
        }

        this.#model.endTurn();
        this.#mustContinueCapture = false;
        this.#resetSelection();
        this.#renderAndSyncUI();
    }

    #handleUndo() {
        if (!this.#model.undo()) return;
        this.#mustContinueCapture = false;
        this.#resetSelection();
        this.#renderAndSyncUI({ animate: false });
    }

    #renderAndSyncUI({ animate = true } = {}) {
        this.#view.render(this.#model.board, { animate });

        const winner = this.#model.getWinner();
        if (winner) {
            this.#gameOver = true;
            this.#mustContinueCapture = false;
            this.#resetSelection();
            this.#forcedCapturePieces = [];
            this.#view.highlightCapturablePieces([]);
            this.#view.setWinner(winner);
            this.#view.setUndoEnabled(this.#model.canUndo());
            return;
        }

        this.#gameOver = false;
        this.#view.setTurn(this.#model.turn);

        const mustCapture = this.#model.playerHasCapture(this.#model.turn);
        this.#forcedCapturePieces = mustCapture ? this.#model.getCapturingPieces(this.#model.turn) : [];
        this.#view.highlightCapturablePieces(mustCapture ? this.#forcedCapturePieces : []);

        this.#view.setUndoEnabled(this.#model.canUndo());
    }

    #resetSelection() {
        this.#selectedCoords = null;
        this.#availableMoves = [];
        this.#view.highlightCell(null, null);
        this.#view.highlightMoves([]);
    }
}
