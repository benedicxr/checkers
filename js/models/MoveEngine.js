import { GAME_CONFIG, GAME_RULES } from "../constants.js";

export class MoveEngine {
    static getValidMoves(board, turn, row, col) {
        const piece = board.getPiece(row, col);
        if (!piece || piece.color !== turn) return [];

        const moves = [];
        const direction = piece.color === GAME_CONFIG.WHITE_PLAYER
            ? GAME_RULES.WHITE_DIRECTION
            : GAME_RULES.BLACK_DIRECTION;

        for (const side of GAME_RULES.SIDES) {
            const nextR = row + (direction * GAME_RULES.MOVE_STEP);
            const nextC = col + side;

            if (board.isInside(nextR, nextC) && !board.getPiece(nextR, nextC)) {
                moves.push({ r: nextR, c: nextC, type: "move" });
            }

            const jumpR = row + (direction * GAME_RULES.JUMP_STEP);
            const jumpC = col + (side * GAME_RULES.JUMP_STEP);
            if (board.isInside(jumpR, jumpC) && !board.getPiece(jumpR, jumpC)) {
                const middlePiece = board.getPiece(nextR, nextC);
                if (middlePiece && middlePiece.color !== piece.color) {
                    moves.push({ r: jumpR, c: jumpC, type: "jump", target: { r: nextR, c: nextC } });
                }
            }
        }

        return moves;
    }
}

