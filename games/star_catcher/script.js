const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;

canvas.width = width;
canvas.height = height;

// Game State
let stars = [];
let particles = [];
let score = 0;
let lastTime = 0;
let spawnTimer = 0;
const SPAWN_INTERVAL = 1000; // ms

// Audio Context
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playPopSound() {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    // Randomize pitch slightly
    osc.frequency.setValueAtTime(400 + Math.random() * 200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// Colors suitable for stars
const STAR_COLORS = ['#FFD700', '#FFFF00', '#FAFAD2', '#FFEC8B'];

class Star {
    constructor() {
        this.radius = 20 + Math.random() * 30; // 20-50px radius
        this.x = Math.random() * (width - this.radius * 2) + this.radius;
        this.y = height + this.radius;
        this.vx = (Math.random() - 0.5) * 1; // Drift left/right
        this.vy = -(1 + Math.random() * 2); // Float up
        this.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;

        // Remove if off screen (top)
        if (this.y < -this.radius) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        // Draw Star Shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.radius,
                       -Math.sin((18 + i * 72) * Math.PI / 180) * this.radius);
            ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.radius / 2),
                       -Math.sin((54 + i * 72) * Math.PI / 180) * (this.radius / 2));
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 5 + 2;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0; // Opacity
        this.decay = 0.02 + Math.random() * 0.03;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function handleInput(e) {
    e.preventDefault();
    initAudio(); // Ensure audio context starts

    const touches = e.changedTouches ? e.changedTouches : [e];

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const tx = touch.clientX;
        const ty = touch.clientY;

        for (let j = stars.length - 1; j >= 0; j--) {
            const star = stars[j];
            const dx = tx - star.x;
            const dy = ty - star.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Hit detection (radius * 1.5 to make it forgiving for kids)
            if (dist < star.radius * 1.5) {
                // Create particles
                for (let k = 0; k < 10; k++) {
                    particles.push(new Particle(star.x, star.y, star.color));
                }

                // Play sound
                playPopSound();

                // Remove star
                stars.splice(j, 1);
                score++;
                break; // One touch hits one star max (prevents double counting overlapping stars)
            }
        }
    }
}

// Event Listeners
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
});

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });


function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    spawnTimer += deltaTime;
    if (spawnTimer > SPAWN_INTERVAL) {
        stars.push(new Star());
        spawnTimer = 0;
    }

    // Clear Screen
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, width, height);

    // Update & Draw Stars
    for (let i = stars.length - 1; i >= 0; i--) {
        stars[i].update();
        stars[i].draw();
        if (stars[i].markedForDeletion) {
            stars.splice(i, 1);
        }
    }

    // Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Draw Score
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('Score: ' + score, 20, 50);

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
