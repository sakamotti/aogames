const problemEl = document.getElementById('problem');
const choicesEl = document.getElementById('choices');
const scoreEl = document.getElementById('score');
let score = 0;
let correctAnswer;
let isProcessing = false;

function generateProblem() {
    isProcessing = false;
    // Difficulty progression? Keep it simple for now (Sum up to 20)
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    correctAnswer = a + b;
    problemEl.textContent = `${a} + ${b} = ?`;

    generateChoices();
}

function generateChoices() {
    let choices = [correctAnswer];
    while(choices.length < 3) {
        let wrong = correctAnswer + Math.floor(Math.random() * 7) - 3; // range -3 to +3
        if(wrong !== correctAnswer && wrong > 0 && !choices.includes(wrong)) {
            choices.push(wrong);
        }
    }
    // Shuffle
    choices.sort(() => Math.random() - 0.5);

    choicesEl.innerHTML = '';
    choices.forEach(c => {
        const btn = document.createElement('button');
        btn.classList.add('choice');
        btn.textContent = c;
        // Handle both touch and click, prevent double firing
        btn.addEventListener('click', (e) => {
             e.preventDefault();
             checkAnswer(c, btn);
        });
        choicesEl.appendChild(btn);
    });
}

function checkAnswer(ans, btn) {
    if(isProcessing) return;

    if(ans === correctAnswer) {
        isProcessing = true;
        btn.classList.add('correct');
        score++;
        scoreEl.textContent = "点数: " + score;
        // Play sound?
        setTimeout(generateProblem, 600);
    } else {
        btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 500);
    }
}

generateProblem();
