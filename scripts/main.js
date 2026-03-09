const boardModel = [
    [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 2, 0, 2, 0, 2, 0, 2],
    [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0], 
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 1], 
    [1, 0, 1, 0, 1, 0, 1, 0], 
    [0, 1, 0, 1, 0, 1, 0, 1]
];

const boardElement = document.getElementById('board-game');
let selectedPieceElement = null;

function renderBoard() {
    boardElement.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            const isBlack = (row + col) % 2 !== 0;
            cell.classList.add(isBlack ? 'black-cell' : 'white-cell');

            const pieceValue = boardModel[row][col];
            if (pieceValue !== 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece');
                piece.classList.add(pieceValue === 1 ? 'white-piece' : 'black-piece');

            piece.addEventListener('click', (e) => {
                if (selectedPieceElement === piece) {
                    piece.classList.remove('selected'); 
                    selectedPieceElement = null;        
                } else {
                    if (selectedPieceElement) {
                        selectedPieceElement.classList.remove('selected');
                    }
                    
                    piece.classList.add('selected');
                    selectedPieceElement = piece;
                }
                e.stopPropagation();
            });
                
                cell.appendChild(piece);
            }
            boardElement.appendChild(cell);
        }
    }
}

renderBoard();

boardElement.addEventListener('click', () => {
    if(selectedPieceElement) {
        selectedPieceElement.classList.remove('selected');
        selectedPieceElement = null;
    }
})
