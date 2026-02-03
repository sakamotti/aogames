let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'o'; // Player is O
let gameActive = true;
const statusDisplay = document.getElementById('status');
const cells = document.querySelectorAll('.cell');

const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
});

function handleCellClick(clickedCellEvent) {
    const clickedCell = clickedCellEvent.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (board[clickedCellIndex] !== '' || !gameActive || currentPlayer === 'x') {
        return;
    }

    handleCellPlayed(clickedCell, clickedCellIndex);
    handleResultValidation();

    if (gameActive) {
        currentPlayer = 'x';
        statusDisplay.innerHTML = "あいてのばん (❌)";
        setTimeout(computerPlay, 700);
    }
}

function handleCellPlayed(clickedCell, clickedCellIndex) {
    board[clickedCellIndex] = currentPlayer;
    clickedCell.innerHTML = currentPlayer === 'o' ? '⭕' : '❌';
    clickedCell.classList.add(currentPlayer);
}

function handleResultValidation() {
    let roundWon = false;
    for(let i=0; i<winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        let a = board[winCondition[0]];
        let b = board[winCondition[1]];
        let c = board[winCondition[2]];
        if (a === '' || b === '' || c === '') {
            continue;
        }
        if (a === b && b === c) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        statusDisplay.innerHTML = currentPlayer === 'o' ? "あなたの勝ち！🎉" : "あいての勝ち...😭";
        gameActive = false;
        return;
    }

    let roundDraw = !board.includes("");
    if (roundDraw) {
        statusDisplay.innerHTML = "ひきわけ！";
        gameActive = false;
        return;
    }
}

function computerPlay() {
    if (!gameActive) return;

    // Simple AI: 1. Win 2. Block 3. Random
    let move = -1;

    // 1. Win
    move = findBestMove('x');

    // 2. Block
    if(move === -1) move = findBestMove('o');

    // 3. Random
    if(move === -1) {
        let available = [];
        board.forEach((cell, index) => {
            if(cell === '') available.push(index);
        });
        if(available.length > 0) {
            move = available[Math.floor(Math.random() * available.length)];
        }
    }

    if(move !== -1) {
        let cell = document.querySelector(`.cell[data-index='${move}']`);
        handleCellPlayed(cell, move);
        handleResultValidation();
        if(gameActive) {
            currentPlayer = 'o';
            statusDisplay.innerHTML = "あなたのばん (⭕)";
        }
    }
}

function findBestMove(player) {
    for(let i=0; i<winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        let vals = [board[a], board[b], board[c]];
        if(vals.filter(v => v === player).length === 2 && vals.includes('')) {
            if(board[a] === '') return a;
            if(board[b] === '') return b;
            if(board[c] === '') return c;
        }
    }
    return -1;
}

function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = 'o';
    statusDisplay.innerHTML = "あなたのばん (⭕)";
    document.querySelectorAll('.cell').forEach(cell => {
        cell.innerHTML = "";
        cell.classList.remove('x');
        cell.classList.remove('o');
    });
}
