const { canvas, ctx, width, height } = setupCanvas('gameCanvas');

let ball = {
    x: width / 2,
    y: height / 2,
    vx: 5,
    vy: 2,
    radius: 30,
    color: 'orange'
};
const GRAVITY = 0.5;
const FRICTION = 0.99;
const BOUNCE = 0.8;

let audioCtx;
function initAudio() {
    audioCtx = SharedAudio.init();
}

function playBounceSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
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

    // Tap to impart force
    for (let i = 0; i < touches.length; i++) {
        const tx = touches[i].clientX;
        const ty = touches[i].clientY;

        // Push ball away from touch
        const dx = ball.x - tx;
        const dy = ball.y - ty;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 100) { // Influence radius
            const force = (100 - dist) / 5;
            ball.vx += (dx / dist) * force;
            ball.vy += (dy / dist) * force;
        }
    }
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function loop() {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Physics
    ball.vy += GRAVITY;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collisions
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx *= -BOUNCE;
        playBounceSound();
    } else if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx *= -BOUNCE;
        playBounceSound();
    }

    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.vy *= -BOUNCE;
        if (Math.abs(ball.vy) > 1) playBounceSound();
    } else if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -BOUNCE;
        playBounceSound();
    }

    // Draw Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'white';
    ctx.stroke();

    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
