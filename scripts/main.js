"use strict";

class Checker {
    constructor(color) {
        this.color = color;
        this.isKing = false;
    }
}

class CheckerGame {
    static ROWS = 8;
    static COLS = 8;
    static WHITE_PLAYER = 1;
    static BLACK_PLAYER = 2;

    static CLASSES = {
        CELL: 'cell',
        BLACK_CELL: 'black-cell',
        WHITE_CELL: 'white-cell',
        PIECE: 'piece',
        WHITE_PIECE: 'white-piece',
        BLACK_PIECE: 'black-piece',
        SELECTED: 'selected'
    };

    #boardModel;
    #boardElement;
    #selectedPieceElement = null;

    constructor(elementId) {
        this.#boardElement = document.getElementById(elementId);
        this.#boardModel = this.#initializeModel();
        
        this.#renderBoard();
        this.#initGlobalEvents();
    }
    #initializeModel() {
        return [
            [2, 0, 2, 0, 2, 0, 2, 0],
            [0, 2, 0, 2, 0, 2, 0, 2],
            [2, 0, 2, 0, 2, 0, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0], 
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 1, 0, 1, 0, 1], 
            [1, 0, 1, 0, 1, 0, 1, 0], 
            [0, 1, 0, 1, 0, 1, 0, 1]
        ].map(row => row.map(cellValue => {
            return cellValue === 0 ? null : new Checker(cellValue);
        }));
    }

    #renderBoard() {
        this.#boardElement.innerHTML = '';

        for (let row = 0; row < CheckerGame.ROWS; row++) {
            for (let col = 0; col < CheckerGame.COLS; col++) {
                const cell = this.#createCell(row, col);
                const checker = this.#boardModel[row][col];

                if(checker) {
                    const piece = this.#createPiece(checker);
                    cell.appendChild(piece);
                }

                this.#boardElement.appendChild(cell);
            }
        }
    }

    #createCell(row, col) {
        const cell = document.createElement('div');
        cell.classList.add(CheckerGame.CLASSES.CELL);
        
        const isBlack = (row + col) % 2 !== 0;
        cell.classList.add(isBlack ? CheckerGame.CLASSES.BLACK_CELL : CheckerGame.CLASSES.WHITE_CELL);
        
        return cell;
    }

    #createPiece(checkerData) {
        const piece = document.createElement('div');
        piece.classList.add(CheckerGame.CLASSES.PIECE);
        
        const colorClass = checkerData.color === CheckerGame.WHITE_PLAYER 
            ? CheckerGame.CLASSES.WHITE_PIECE 
            : CheckerGame.CLASSES.BLACK_PIECE;
        
        piece.classList.add(colorClass);

        piece.addEventListener('click', (e) => {
            this.#handlePieceClick(piece);
            e.stopPropagation();
        });

        return piece;
    }

    #handlePieceClick(piece) {
        if(this.#selectedPieceElement === piece) {
            piece.classList.remove(CheckerGame.CLASSES.SELECTED);
            this.#selectedPieceElement = null;
        } else {
            if (this.#selectedPieceElement) {
                this.#selectedPieceElement.classList.remove(CheckerGame.CLASSES.SELECTED);
            }
            piece.classList.add(CheckerGame.CLASSES.SELECTED);
            this.#selectedPieceElement = piece;
        }
    }

    #initGlobalEvents() {
        this.#boardElement.addEventListener('click', () => {
            if (this.#selectedPieceElement) {
                this.#selectedPieceElement.classList.remove(CheckerGame.CLASSES.SELECTED);
                this.#selectedPieceElement = null;
            }
        });
    }
}

const game = new CheckerGame('board-game');