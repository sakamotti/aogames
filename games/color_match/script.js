const colors = [
    { name: 'あか', code: '#ff3b30' },
    { name: 'あお', code: '#007aff' },
    { name: 'きいろ', code: '#ffcc00' },
    { name: 'みどり', code: '#4cd964' },
    { name: 'くろ', code: '#333333' },
    { name: 'ピンク', code: '#ff2d55' },
    { name: 'オレンジ', code: '#ff9500' },
    { name: 'むらさき', code: '#5856d6' }
];

const questionEl = document.getElementById('question-text');
const optionsEl = document.getElementById('options');
const scoreEl = document.getElementById('score');
let score = 0;
let currentTarget;
let isProcessing = false;

function newRound() {
    isProcessing = false;
    // Pick target
    currentTarget = colors[Math.floor(Math.random() * colors.length)];
    questionEl.textContent = currentTarget.name;
    questionEl.style.color = currentTarget.code;

    // Pick options (Target + 2 random)
    let options = [currentTarget];
    while(options.length < 3) {
        let c = colors[Math.floor(Math.random() * colors.length)];
        if(!options.includes(c)) options.push(c);
    }
    options.sort(() => Math.random() - 0.5);

    optionsEl.innerHTML = '';
    options.forEach(c => {
        const btn = document.createElement('div');
        btn.classList.add('color-btn');
        btn.style.backgroundColor = c.code;
        // Touch support
        btn.addEventListener('click', (e) => {
             e.preventDefault();
             check(c, btn);
        });
        optionsEl.appendChild(btn);
    });
}

function check(c, btn) {
    if(isProcessing) return;

    if(c === currentTarget) {
        isProcessing = true;
        score++;
        scoreEl.textContent = "点数: " + score;
        btn.style.transform = "scale(1.2)";
        setTimeout(newRound, 500);
    } else {
        btn.style.opacity = "0.2";
    }
}
newRound();
