const icons = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'];
let flippedCards = [];
let lockBoard = false;
let matchedPairs = 0;

function initGame() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    const cards = [...icons, ...icons];
    shuffle(cards);

    matchedPairs = 0;
    flippedCards = [];
    lockBoard = false;

    cards.forEach(icon => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.icon = icon;
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">❓</div>
                <div class="card-back">${icon}</div>
            </div>
        `;
        card.addEventListener('click', flipCard);
        // Better touch handling
        card.addEventListener('touchstart', (e) => {
            e.preventDefault();
            flipCard.call(card);
        }, {passive: false});

        gameBoard.appendChild(card);
    });
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function flipCard() {
    if (lockBoard) return;
    if (this.classList.contains('flipped')) return;

    this.classList.add('flipped');
    flippedCards.push(this);

    if (flippedCards.length === 2) {
        lockBoard = true;
        checkForMatch();
    }
}

function checkForMatch() {
    const [card1, card2] = flippedCards;
    const icon1 = card1.dataset.icon;
    const icon2 = card2.dataset.icon;

    if (icon1 === icon2) {
        flippedCards = [];
        lockBoard = false;
        matchedPairs++;
        if(matchedPairs === icons.length) {
            setTimeout(() => alert("やったね！クリア！"), 500);
        }
    } else {
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            flippedCards = [];
            lockBoard = false;
        }, 1000);
    }
}

initGame();
