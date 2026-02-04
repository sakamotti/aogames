const { canvas, ctx, width, height } = setupCanvas('gameCanvas');

// Grid config
const BUBBLE_SIZE = 40;
let bubbles = [];

function initBubbles() {
    bubbles = [];
    const cols = Math.floor(canvas.width / BUBBLE_SIZE);
    const rows = Math.floor(canvas.height / BUBBLE_SIZE);

    // Center the grid
    const offsetX = (canvas.width - cols * BUBBLE_SIZE) / 2;
    const offsetY = (canvas.height - rows * BUBBLE_SIZE) / 2;

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            bubbles.push({
                x: offsetX + i * BUBBLE_SIZE + BUBBLE_SIZE/2,
                y: offsetY + j * BUBBLE_SIZE + BUBBLE_SIZE/2,
                popped: false,
                popTime: 0
            });
        }
    }
}

let audioCtx;
function initAudio() {
    audioCtx = SharedAudio.init();
}

function playPopSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, BUBBLE_SIZE/2 - 2, 0, Math.PI * 2);
        if (b.popped) {
            ctx.fillStyle = '#333';
            ctx.fill();
        } else {
            ctx.fillStyle = '#add8e6';
            ctx.fill();
            // Shine
            ctx.beginPath();
            ctx.arc(b.x - 5, b.y - 5, BUBBLE_SIZE/6, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        }
    }
}

function handleInput(e) {
    e.preventDefault();
    initAudio();

    const touches = e.changedTouches ? e.changedTouches : [e];
    for (let i = 0; i < touches.length; i++) {
        const tx = touches[i].clientX;
        const ty = touches[i].clientY;

        for (const b of bubbles) {
            if (!b.popped) {
                const dx = tx - b.x;
                const dy = ty - b.y;
                if (dx*dx + dy*dy < (BUBBLE_SIZE/2)*(BUBBLE_SIZE/2)) {
                    b.popped = true;
                    b.popTime = Date.now();
                    playPopSound();
                }
            } else {
                // Unpop after 2 seconds? Or maybe just manual unpop logic?
                // Let's make them re-inflate if touched again? No, satisfying to pop all.
                // Re-inflate random ones?
            }
        }
    }
    draw();
}

// Re-inflate loop
function loop() {
    const now = Date.now();
    let changed = false;
    for (const b of bubbles) {
        if (b.popped && now - b.popTime > 3000) { // 3 seconds regen
            b.popped = false;
            changed = true;
        }
    }
    if (changed) draw();
    requestAnimationFrame(loop);
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });
canvas.addEventListener('mousemove', (e) => {
    if(e.buttons === 1) handleInput(e);
});
canvas.addEventListener('touchmove', handleInput, { passive: false });

window.addEventListener('resize', () => {
    setupCanvas('gameCanvas'); // This helper might need to update width/height vars
    initBubbles();
    draw();
});

initBubbles();
draw();
loop();
