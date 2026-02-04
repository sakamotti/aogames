const { canvas, ctx, width, height } = setupCanvas('gameCanvas');

let drops = [];

class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.alpha = 1;
        this.speed = 2;
    }
    update() {
        this.radius += this.speed;
        this.alpha -= 0.01;
    }
    draw() {
        ctx.strokeStyle = `rgba(173, 216, 230, ${this.alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

let audioCtx;
function initAudio() {
    audioCtx = SharedAudio.init();
}

function playDropSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function handleInput(e) {
    e.preventDefault();
    initAudio();
    const touches = e.changedTouches ? e.changedTouches : [e];
    for (let i = 0; i < touches.length; i++) {
        drops.push(new Ripple(touches[i].clientX, touches[i].clientY));
        playDropSound();
    }
}

// Random Rain
setInterval(() => {
    if (Math.random() < 0.3) {
        drops.push(new Ripple(Math.random() * canvas.width, Math.random() * canvas.height));
        // playDropSound(); // Maybe too noisy if auto
    }
}, 100);

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function loop() {
    ctx.fillStyle = 'rgba(0, 0, 50, 0.2)'; // Fade effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = drops.length - 1; i >= 0; i--) {
        drops[i].update();
        drops[i].draw();
        if (drops[i].alpha <= 0) drops.splice(i, 1);
    }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
