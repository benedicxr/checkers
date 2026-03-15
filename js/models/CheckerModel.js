import { GAME_CONFIG, GAME_RULES } from "../constants.js";
import { Checker } from "./Checker.js";
import { Board } from "./Board.js";
import { MoveEngine } from "./MoveEngine.js";

export class CheckerModel {
    #board;
    #turn;
    #history;
    #nextId;

    constructor() {
        this.#board = new Board();
        this.#nextId = 1;
        this.#initializeModel();
        this.#turn = GAME_CONFIG.WHITE_PLAYER;
        this.#history = [];
    }

    #initializeModel() {
        const initialPieceRows = GAME_RULES.INITIAL_PIECE_ROWS;

        for (let row = 0; row < GAME_CONFIG.ROWS; row++) {
            for (let col = 0; col < GAME_CONFIG.COLS; col++) {
                if (!this.#board.isDarkCell(row, col)) continue;

                if (row < initialPieceRows) {
                    this.#board.setPiece(row, col, new Checker(GAME_CONFIG.BLACK_PLAYER, { id: this.#nextId++ }));
                } else if (row >= GAME_CONFIG.ROWS - initialPieceRows) {
                    this.#board.setPiece(row, col, new Checker(GAME_CONFIG.WHITE_PLAYER, { id: this.#nextId++ }));
                }
            }
        }
    }

    getPiece(row, col) {
        return this.#board.getPiece(row, col);
    }

    get turn() {
        return this.#turn;
    }

    playerHasCapture(player = this.#turn) {
        return MoveEngine.playerHasCapture(this.#board, player);
    }

    getCapturingPieces(player = this.#turn) {
        return MoveEngine.getCapturingPieces(this.#board, player);
    }

    getValidMoves(row, col, { mustCapture = false } = {}) {
        // If the player has at least one capture, only captures are legal.
        const capturesOnly = mustCapture || this.playerHasCapture(this.#turn);
        return MoveEngine.getValidMoves(this.#board, this.#turn, row, col, { capturesOnly });
    }

    getCaptures(row, col) {
        return MoveEngine.getCapturesForPiece(this.#board, this.#turn, row, col);
    }

    applyMove(from, to, moveDetails, { switchTurn = true } = {}) {
        const movedPiece = this.#board.movePiece(from, to);

        let captured = null;
        if (moveDetails.type === 'jump') {
            this.#board.removePiece(moveDetails.target.r, moveDetails.target.c);
            captured = { r: moveDetails.target.r, c: moveDetails.target.c };
        }

        const promoted = this.#maybePromote(to.r, movedPiece);

        if (switchTurn) this.endTurn();
        return { captured, promoted };
    }

    endTurn() {
        this.#turn = this.#turn === GAME_CONFIG.WHITE_PLAYER ? GAME_CONFIG.BLACK_PLAYER : GAME_CONFIG.WHITE_PLAYER;
    }

    pushHistory() {
        this.#history.push(this.#cloneState());
    }

    canUndo() {
        return this.#history.length > 0;
    }

    undo() {
        if (this.#history.length === 0) return false;
        const prev = this.#history.pop();
        this.#turn = prev.turn;
        this.#nextId = prev.nextId;
        this.#board = new Board();
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const cell = prev.board[r][c];
                if (!cell) continue;
                this.#board.setPiece(r, c, new Checker(cell.color, { id: cell.id, isKing: cell.isKing }));
            }
        }
        return true;
    }

    #cloneState() {
        return {
            turn: this.#turn,
            nextId: this.#nextId,
            board: this.#board.toSnapshot().map(row => row.map(cell => (cell ? { ...cell } : null))),
        };
    }

    #maybePromote(row, piece) {
        if (!piece || piece.isKing) return false;
        if (piece.color === GAME_CONFIG.WHITE_PLAYER && row === 0) {
            piece.isKing = true;
            return true;
        }
        if (piece.color === GAME_CONFIG.BLACK_PLAYER && row === GAME_CONFIG.ROWS - 1) {
            piece.isKing = true;
            return true;
        }
        return false;
    }

    get board() {
        return this.#board.toSnapshot();
    }

}
