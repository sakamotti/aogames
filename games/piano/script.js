const { canvas, ctx, width, height } = setupCanvas('gameCanvas');

// C Major scale frequencies
const NOTES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
const COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#FFFFFF'];
const KEYS = 8;
let activeKeys = new Array(KEYS).fill(false);

let audioCtx;

function initAudio() {
    audioCtx = SharedAudio.init();
}

function playTone(index) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(NOTES[index], audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function draw() {
    const keyWidth = canvas.width / KEYS;

    for (let i = 0; i < KEYS; i++) {
        ctx.fillStyle = COLORS[i];
        if (activeKeys[i]) {
            // Highlight
            ctx.filter = 'brightness(150%)';
        } else {
            ctx.filter = 'brightness(100%)';
        }

        ctx.fillRect(i * keyWidth, 0, keyWidth, canvas.height);

        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(i * keyWidth, 0, keyWidth, canvas.height);
        ctx.filter = 'none';
    }
}

function handleInput(e) {
    e.preventDefault();
    initAudio();

    const touches = e.changedTouches ? e.changedTouches : [e];
    const keyWidth = canvas.width / KEYS;

    // Reset actives for simple logic (better for multitouch hold is complex, simpler is tap)
    // Actually, let's just flash on touch start

    if (e.type === 'touchstart' || e.type === 'mousedown') {
        for (let i = 0; i < touches.length; i++) {
            const tx = touches[i].clientX;
            const keyIndex = Math.floor(tx / keyWidth);
            if (keyIndex >= 0 && keyIndex < KEYS) {
                playTone(keyIndex);
                activeKeys[keyIndex] = true;
                setTimeout(() => { activeKeys[keyIndex] = false; draw(); }, 200);
            }
        }
    }
    draw();
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

draw();
// Redraw on resize
window.addEventListener('resize', draw);
