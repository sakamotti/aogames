const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let painting = false;
let color = 'black';
let lineWidth = 8;

function resize() {
    // Store current content
    let tempCanvas;
    if (canvas.width > 0 && canvas.height > 0) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (tempCanvas) {
        ctx.drawImage(tempCanvas, 0, 0);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}
window.addEventListener('resize', resize);
resize();

function startPosition(e) {
    painting = true;
    draw(e);
}

function endPosition() {
    painting = false;
    ctx.beginPath();
}

function draw(e) {
    if (!painting) return;
    e.preventDefault();

    const x = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
    const y = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;

    ctx.lineWidth = color === 'white' ? 40 : lineWidth;
    ctx.strokeStyle = color;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('touchstart', startPosition, {passive: false});

canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('touchend', endPosition);
canvas.addEventListener('mouseleave', endPosition);

canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchmove', draw, {passive: false});

function setColor(c, btn) {
    color = c;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
