const { canvas, ctx, width: initialWidth, height: initialHeight } = setupCanvas('gameCanvas');
let width = initialWidth;
let height = initialHeight;

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
});

let particles = [];
let audioCtx;

function initAudio() {
    audioCtx = SharedAudio.init();
}

function playExplosionSound() {
    if (!audioCtx) return;

    // Noise buffer for explosion
    const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 sec
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1000;
    noiseFilter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noise.start();
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.005;
        this.gravity = 0.05;
    }

    update() {
        this.vx *= 0.95; // Drag
        this.vy *= 0.95;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createFirework(x, y) {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle(x, y, color));
    }
    playExplosionSound();
}

function handleInput(e) {
    e.preventDefault();
    initAudio();
    const touches = e.changedTouches ? e.changedTouches : [e];
    for (let i = 0; i < touches.length; i++) {
        createFirework(touches[i].clientX, touches[i].clientY);
    }
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function loop() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Trails
    ctx.fillRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
