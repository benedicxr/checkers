import { GAME_CONFIG, GAME_RULES } from "../constants.js";

export class MoveEngine {
    static getValidMoves(board, turn, row, col, { capturesOnly = false } = {}) {
        const piece = board.getPiece(row, col);
        if (!piece || piece.color !== turn) return [];

        const captures = this.getCapturesForPiece(board, turn, row, col);
        if (capturesOnly) return captures;

        const quietMoves = this.getQuietMovesForPiece(board, turn, row, col);
        return [...captures, ...quietMoves];
    }

    static getCapturesForPiece(board, turn, row, col) {
        const piece = board.getPiece(row, col);
        if (!piece || piece.color !== turn) return [];

        if (piece.isKing && GAME_RULES.FLYING_KINGS) {
            return this.#getFlyingKingCaptures(board, piece, row, col);
        }

        const directions = this.#getCaptureDirections(piece);
        return this.#getShortCaptures(board, piece, row, col, directions);
    }

    static getQuietMovesForPiece(board, turn, row, col) {
        const piece = board.getPiece(row, col);
        if (!piece || piece.color !== turn) return [];

        if (piece.isKing && GAME_RULES.FLYING_KINGS) {
            return this.#getFlyingKingMoves(board, row, col);
        }

        const directions = piece.isKing
            ? [GAME_RULES.WHITE_DIRECTION, GAME_RULES.BLACK_DIRECTION]
            : [piece.color === GAME_CONFIG.WHITE_PLAYER ? GAME_RULES.WHITE_DIRECTION : GAME_RULES.BLACK_DIRECTION];

        const moves = [];
        for (const dir of directions) {
            for (const side of GAME_RULES.SIDES) {
                const nextR = row + (dir * GAME_RULES.MOVE_STEP);
                const nextC = col + side;
                if (board.isInside(nextR, nextC) && !board.getPiece(nextR, nextC)) {
                    moves.push({ r: nextR, c: nextC, type: "move" });
                }
            }
        }
        return moves;
    }

    static playerHasCapture(board, player) {
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const p = board.getPiece(r, c);
                if (!p || p.color !== player) continue;
                if (this.getCapturesForPiece(board, player, r, c).length > 0) return true;
            }
        }
        return false;
    }

    static getCapturingPieces(board, player) {
        const coords = [];
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const p = board.getPiece(r, c);
                if (!p || p.color !== player) continue;
                if (this.getCapturesForPiece(board, player, r, c).length > 0) coords.push({ r, c });
            }
        }
        return coords;
    }

    static #getCaptureDirections(piece) {
        if (piece.isKing) return [GAME_RULES.WHITE_DIRECTION, GAME_RULES.BLACK_DIRECTION];
        if (GAME_RULES.MEN_CAN_CAPTURE_BACKWARDS) return [GAME_RULES.WHITE_DIRECTION, GAME_RULES.BLACK_DIRECTION];
        return [piece.color === GAME_CONFIG.WHITE_PLAYER ? GAME_RULES.WHITE_DIRECTION : GAME_RULES.BLACK_DIRECTION];
    }

    static #getShortCaptures(board, piece, row, col, directions) {
        const captures = [];
        for (const dir of directions) {
            for (const side of GAME_RULES.SIDES) {
                const midR = row + (dir * GAME_RULES.MOVE_STEP);
                const midC = col + side;
                const landR = row + (dir * GAME_RULES.JUMP_STEP);
                const landC = col + (side * GAME_RULES.JUMP_STEP);

                if (!board.isInside(landR, landC)) continue;
                if (board.getPiece(landR, landC)) continue;

                const middlePiece = board.getPiece(midR, midC);
                if (middlePiece && middlePiece.color !== piece.color) {
                    captures.push({ r: landR, c: landC, type: "jump", target: { r: midR, c: midC } });
                }
            }
        }
        return captures;
    }

    static #getFlyingKingMoves(board, row, col) {
        const moves = [];
        const deltas = [
            { dr: -1, dc: -1 },
            { dr: -1, dc: 1 },
            { dr: 1, dc: -1 },
            { dr: 1, dc: 1 },
        ];

        for (const { dr, dc } of deltas) {
            let r = row + dr;
            let c = col + dc;
            while (board.isInside(r, c) && !board.getPiece(r, c)) {
                moves.push({ r, c, type: "move" });
                r += dr;
                c += dc;
            }
        }
        return moves;
    }

    static #getFlyingKingCaptures(board, piece, row, col) {
        const captures = [];
        const deltas = [
            { dr: -1, dc: -1 },
            { dr: -1, dc: 1 },
            { dr: 1, dc: -1 },
            { dr: 1, dc: 1 },
        ];

        for (const { dr, dc } of deltas) {
            let r = row + dr;
            let c = col + dc;

            while (board.isInside(r, c) && !board.getPiece(r, c)) {
                r += dr;
                c += dc;
            }

            if (!board.isInside(r, c)) continue;
            const target = board.getPiece(r, c);
            if (!target || target.color === piece.color) continue;


            let landR = r + dr;
            let landC = c + dc;
            while (board.isInside(landR, landC) && !board.getPiece(landR, landC)) {
                captures.push({ r: landR, c: landC, type: "jump", target: { r, c } });
                landR += dr;
                landC += dc;
            }
        }

        return captures;
    }
}

