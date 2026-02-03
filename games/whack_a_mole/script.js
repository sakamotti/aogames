const gameContainer = document.getElementById('game-container');
const scoreElement = document.getElementById('score');
let score = 0;
let lastMole;

// Create holes
for(let i=0; i<9; i++) {
    const hole = document.createElement('div');
    hole.classList.add('hole');
    const mole = document.createElement('div');
    mole.classList.add('mole');

    mole.addEventListener('mousedown', bonk);
    mole.addEventListener('touchstart', (e) => {
        e.preventDefault();
        bonk(e);
    }, {passive: false});

    hole.appendChild(mole);
    gameContainer.appendChild(hole);
}

const moles = document.querySelectorAll('.mole');

function randomTime(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function randomMole(moles) {
    const idx = Math.floor(Math.random() * moles.length);
    const mole = moles[idx];
    if (mole === lastMole) return randomMole(moles);
    lastMole = mole;
    return mole;
}

function peep() {
    const time = randomTime(600, 1200);
    const mole = randomMole(moles);
    mole.classList.add('up');

    setTimeout(() => {
        mole.classList.remove('up');
        // Loop
        requestAnimationFrame(() => {
            // small random delay before next peep
            setTimeout(peep, randomTime(100, 500));
        });
    }, time);
}

function bonk(e) {
    if(!e.isTrusted) return;
    if(!this.classList.contains('up')) return;

    score++;
    this.classList.remove('up');
    scoreElement.textContent = "点数: " + score;
}

// Start game immediately
setTimeout(peep, 1000);
