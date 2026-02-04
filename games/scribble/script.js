const { canvas, ctx, width: initialWidth, height: initialHeight } = setupCanvas('gameCanvas');

// Map touch IDs to colors/previous positions
let ongoingTouches = {};
const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#FFA500'];

// Background check
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, initialWidth, initialHeight);

document.getElementById('clear-btn').addEventListener('click', () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

function getColor(id) {
    return colors[id % colors.length];
}

function handleStart(e) {
    e.preventDefault();
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        ongoingTouches[touch.identifier] = {
            x: touch.clientX,
            y: touch.clientY,
            color: getColor(touch.identifier)
        };

        // Draw dot
        ctx.beginPath();
        ctx.fillStyle = ongoingTouches[touch.identifier].color;
        ctx.arc(touch.clientX, touch.clientY, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function handleMove(e) {
    e.preventDefault();
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const prev = ongoingTouches[touch.identifier];

        if (prev) {
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(touch.clientX, touch.clientY);
            ctx.lineWidth = 10;
            ctx.strokeStyle = prev.color;
            ctx.lineCap = 'round';
            ctx.stroke();

            ongoingTouches[touch.identifier].x = touch.clientX;
            ongoingTouches[touch.identifier].y = touch.clientY;
        }
    }
}

function handleEnd(e) {
    e.preventDefault();
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        delete ongoingTouches[touches[i].identifier];
    }
}

canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });
canvas.addEventListener('touchcancel', handleEnd, { passive: false });

// Mouse support for testing
let isMouseDown = false;
canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    const fakeTouch = { identifier: 0, clientX: e.clientX, clientY: e.clientY };
    handleStart({ preventDefault: () => {}, changedTouches: [fakeTouch] });
});
canvas.addEventListener('mousemove', (e) => {
    if (isMouseDown) {
        const fakeTouch = { identifier: 0, clientX: e.clientX, clientY: e.clientY };
        handleMove({ preventDefault: () => {}, changedTouches: [fakeTouch] });
    }
});
canvas.addEventListener('mouseup', (e) => {
    isMouseDown = false;
    handleEnd({ preventDefault: () => {}, changedTouches: [{ identifier: 0 }] });
});
