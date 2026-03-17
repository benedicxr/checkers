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
        this.reset();
    }

    reset() {
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

    countPieces(player) {
        let count = 0;
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const p = this.#board.getPiece(r, c);
                if (p && p.color === player) count++;
            }
        }
        return count;
    }

    playerHasAnyMove(player) {
        if (MoveEngine.playerHasCapture(this.#board, player)) return true;

        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const p = this.#board.getPiece(r, c);
                if (!p || p.color !== player) continue;
                if (MoveEngine.getQuietMovesForPiece(this.#board, player, r, c).length > 0) return true;
            }
        }
        return false;
    }

    getWinner() {
        const whiteCount = this.countPieces(GAME_CONFIG.WHITE_PLAYER);
        const blackCount = this.countPieces(GAME_CONFIG.BLACK_PLAYER);

        if (whiteCount === 0 && blackCount === 0) return null;
        if (whiteCount === 0) return GAME_CONFIG.BLACK_PLAYER;
        if (blackCount === 0) return GAME_CONFIG.WHITE_PLAYER;

        if (!this.playerHasAnyMove(this.#turn)) {
            return this.#turn === GAME_CONFIG.WHITE_PLAYER ? GAME_CONFIG.BLACK_PLAYER : GAME_CONFIG.WHITE_PLAYER;
        }

        return null;
    }

    playerHasCapture(player = this.#turn) {
        return MoveEngine.playerHasCapture(this.#board, player);
    }

    getCapturingPieces(player = this.#turn) {
        return MoveEngine.getCapturingPieces(this.#board, player);
    }

    getValidMoves(row, col, { mustCapture = false } = {}) {
        const capturesOnly = mustCapture || this.playerHasCapture(this.#turn);
        return MoveEngine.getValidMoves(this.#board, this.#turn, row, col, { capturesOnly });
    }

    getCaptures(row, col) {
        return MoveEngine.getCapturesForPiece(this.#board, this.#turn, row, col);
    }

    applyMove(from, to, moveDetails, { switchTurn = true } = {}) {
        const movedPiece = this.#board.movePiece(from, to);

        if (moveDetails.type === 'jump') {
            this.#board.removePiece(moveDetails.target.r, moveDetails.target.c);
        }

        this.#maybePromote(to.r, movedPiece);

        if (switchTurn) this.endTurn();
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
        if (piece.color === GAME_CONFIG.WHITE_PLAYER && row === 0) return piece.promote();
        if (piece.color === GAME_CONFIG.BLACK_PLAYER && row === GAME_CONFIG.ROWS - 1) return piece.promote();
        return false;
    }

    get board() {
        return this.#board.toSnapshot();
    }

}
