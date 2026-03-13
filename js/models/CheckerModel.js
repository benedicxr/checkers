import { GAME_CONFIG, GAME_RULES } from "../constants.js";
import { Checker } from "./Checker.js";
import { Board } from "./Board.js";
import { MoveEngine } from "./MoveEngine.js";

export class CheckerModel {
    #board;
    #turn;

    constructor() {
        this.#board = new Board();
        this.#initializeModel();
        this.#turn = GAME_CONFIG.WHITE_PLAYER;
    }

    #initializeModel() {
        const initialPieceRows = GAME_RULES.INITIAL_PIECE_ROWS;

        for (let row = 0; row < GAME_CONFIG.ROWS; row++) {
            for (let col = 0; col < GAME_CONFIG.COLS; col++) {
                if (!this.#board.isDarkCell(row, col)) continue;

                if (row < initialPieceRows) {
                    this.#board.setPiece(row, col, new Checker(GAME_CONFIG.BLACK_PLAYER));
                } else if (row >= GAME_CONFIG.ROWS - initialPieceRows) {
                    this.#board.setPiece(row, col, new Checker(GAME_CONFIG.WHITE_PLAYER));
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

    getValidMoves(row, col) {
        return MoveEngine.getValidMoves(this.#board, this.#turn, row, col);
    }

    movePiece(from, to, moveDetails) {
        this.#board.movePiece(from, to);

        if (moveDetails.type === 'jump') {
            this.#board.removePiece(moveDetails.target.r, moveDetails.target.c);
        }
        this.#turn = this.#turn === GAME_CONFIG.WHITE_PLAYER ? GAME_CONFIG.BLACK_PLAYER : GAME_CONFIG.WHITE_PLAYER;
    }

    get board() {
        return this.#board.toSnapshot();
    }

}
