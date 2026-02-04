const { canvas, ctx, width, height } = setupCanvas('gameCanvas');

// Game Logic
let moles = [];
let score = 0;
let lastTime = 0;
let spawnTimer = 0;

function spawnMole() {
    const radius = 40;
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const y = Math.random() * (canvas.height - radius * 2) + radius;
    moles.push({ x, y, radius, time: 0, maxTime: 2000 });
}

let audioCtx;
function initAudio() {
    audioCtx = SharedAudio.init();
}

function playHitSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
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

        for (let j = moles.length - 1; j >= 0; j--) {
            const m = moles[j];
            const dx = tx - m.x;
            const dy = ty - m.y;
            if (dx*dx + dy*dy < m.radius * m.radius) {
                moles.splice(j, 1);
                score++;
                playHitSound();
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

    // Spawn
    spawnTimer += dt;
    if (spawnTimer > 1000 - Math.min(score * 10, 800)) { // Faster as score goes up
        spawnMole();
        spawnTimer = 0;
    }

    // Update
    for (let i = moles.length - 1; i >= 0; i--) {
        moles[i].time += dt;
        if (moles[i].time > moles[i].maxTime) {
            moles.splice(i, 1);
        }
    }

    // Draw
    ctx.fillStyle = '#228B22'; // Grass
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const m of moles) {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#8B4513';
        ctx.fill();
        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(m.x - 10, m.y - 10, 5, 0, Math.PI * 2);
        ctx.arc(m.x + 10, m.y - 10, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = 'white';
    ctx.font = '30px sans-serif';
    ctx.fillText('Score: ' + score, 20, 50);

    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
