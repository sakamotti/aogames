const { canvas, ctx, width, height } = setupCanvas('gameCanvas');

let fruits = [];
let score = 0;
let lastTime = 0;
let spawnTimer = 0;

// Simple fruit colors
const FRUITS = [
    { color: '#FF0000', name: 'Apple' }, // Red
    { color: '#FFA500', name: 'Orange' }, // Orange
    { color: '#FFFF00', name: 'Banana' }, // Yellow
    { color: '#800080', name: 'Grape' }   // Purple
];

function spawnFruit() {
    const type = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const radius = 30;
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    fruits.push({
        x, y: -radius,
        radius,
        color: type.color,
        vy: 2 + Math.random() * 3
    });
}

let audioCtx;
function initAudio() {
    audioCtx = SharedAudio.init();
}

function playCatchSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function handleInput(e) {
    e.preventDefault();
    initAudio();
    const touches = e.changedTouches ? e.changedTouches : [e];

    for (let i = 0; i < touches.length; i++) {
        const tx = touches[i].clientX;
        const ty = touches[i].clientY;

        for (let j = fruits.length - 1; j >= 0; j--) {
            const f = fruits[j];
            const dx = tx - f.x;
            const dy = ty - f.y;
            if (dx*dx + dy*dy < (f.radius + 20) * (f.radius + 20)) { // Forgiving hit box
                fruits.splice(j, 1);
                score++;
                playCatchSound();
                break;
            }
        }
    }
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    spawnTimer += dt;
    if (spawnTimer > 1000) {
        spawnFruit();
        spawnTimer = 0;
    }

    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        f.y += f.vy;

        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
        // Leaf
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(f.x, f.y - f.radius, 10, 0, Math.PI);
        ctx.fill();

        if (f.y > canvas.height + f.radius) {
            fruits.splice(i, 1); // Missed
        }
    }

    ctx.fillStyle = 'white';
    ctx.font = '30px sans-serif';
    ctx.fillText('Score: ' + score, 20, 50);

    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
