import { GAME_CONFIG, GAME_RULES } from "../constants.js";

export class Checker {
    constructor(color) {
        this.color = color;
        this.isKing = false;
    }
}

export class CheckerModel {
    #board;
    #turn;

    constructor() {
        this.#board = this.#initializeModel();
        this.#turn = GAME_CONFIG.WHITE_PLAYER;
    }

    #initializeModel() {
        const rows = GAME_CONFIG.ROWS;
        const cols = GAME_CONFIG.COLS;
        const initialPieceRows = GAME_RULES.INITIAL_PIECE_ROWS;

        return Array.from({ length: rows }, (_, row) => {
            return Array.from({ length: cols }, (_, col) => {
                const isDarkCell = (row + col) % GAME_RULES.DARK_CELL_MOD === GAME_RULES.DARK_CELL_REMAINDER;
                if (!isDarkCell) return null;

                if (row < initialPieceRows) {
                    return new Checker(GAME_CONFIG.BLACK_PLAYER);
                }
                if (row >= rows - initialPieceRows) {
                    return new Checker(GAME_CONFIG.WHITE_PLAYER);
                }
                return null;
            });
        });
    }

    getPiece(row, col) {
        if (row < 0 || row >= GAME_CONFIG.ROWS || col < 0 || col >= GAME_CONFIG.COLS) {
            return null;
        }
        return this.#board[row][col];
    }

    get turn() {
        return this.#turn;
    }

    getValidMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece || piece.color !== this.#turn) return [];

        const moves = [];
        const direction = piece.color === GAME_CONFIG.WHITE_PLAYER
            ? GAME_RULES.WHITE_DIRECTION
            : GAME_RULES.BLACK_DIRECTION;

        GAME_RULES.SIDES.forEach(side => {
            const nextR = row + (direction * GAME_RULES.MOVE_STEP);
            const nextC = col + side;

            if (this.#isInside(nextR, nextC) && !this.getPiece(nextR, nextC)) {
                moves.push({r: nextR, c: nextC, type: 'move'});
            }

            const jumpR = row + (direction * GAME_RULES.JUMP_STEP);
            const jumpC = col + (side * GAME_RULES.JUMP_STEP);
            if (this.#isInside(jumpR, jumpC) && !this.getPiece(jumpR, jumpC)) {
                const middlePiece = this.getPiece(nextR, nextC);
                if (middlePiece && middlePiece.color !== piece.color) {
                    moves.push({r: jumpR, c: jumpC, type: 'jump', target: {r: nextR, c: nextC}});
                }
            }
        });
        return moves;
    }

    movePiece(from, to, moveDetails) {
        const piece = this.#board[from.r][from.c];
        this.#board[to.r][to.c] = piece;
        this.#board[from.r][from.c] = null;

        if (moveDetails.type === 'jump') {
            this.#board[moveDetails.target.r][moveDetails.target.c] = null;
        }
        this.#turn = this.#turn === GAME_CONFIG.WHITE_PLAYER ? GAME_CONFIG.BLACK_PLAYER : GAME_CONFIG.WHITE_PLAYER;
    }
    #isInside(r, c) {
        return r >= 0 && r < GAME_CONFIG.ROWS && c >= 0 && c < GAME_CONFIG.COLS;
    }

    get board() {
        return this.#board;
    }

}
