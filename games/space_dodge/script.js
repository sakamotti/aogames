const { canvas, ctx, width, height } = setupCanvas('gameCanvas');

let player = { x: 100, y: height/2, radius: 20 };
let rocks = [];
let score = 0;
let gameOver = false;
let frameCount = 0;

function spawnRock() {
    const r = 30 + Math.random() * 30;
    rocks.push({
        x: canvas.width + r,
        y: Math.random() * canvas.height,
        radius: r,
        speed: 3 + Math.random() * 3
    });
}

function resetGame() {
    rocks = [];
    score = 0;
    gameOver = false;
    player.x = 100;
    player.y = canvas.height / 2;
}

function handleInput(e) {
    e.preventDefault();
    if (gameOver) {
        resetGame();
        return;
    }
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    player.x = touch.clientX;
    player.y = touch.clientY;
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) handleInput(e);
});
canvas.addEventListener('touchstart', handleInput, { passive: false });
canvas.addEventListener('touchmove', handleInput, { passive: false });

function loop() {
    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '40px sans-serif';
        ctx.fillText('Game Over! Tap to restart', canvas.width/2 - 200, canvas.height/2);
        requestAnimationFrame(loop);
        return;
    }

    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Player
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Rocks
    if (frameCount % 60 === 0) spawnRock();
    frameCount++;

    for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i];
        r.x -= r.speed;

        // Draw Rock
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.fill();

        // Collision
        const dx = r.x - player.x;
        const dy = r.y - player.y;
        if (dx*dx + dy*dy < (r.radius + player.radius) * (r.radius + player.radius)) {
            gameOver = true;
        }

        if (r.x < -r.radius) {
            rocks.splice(i, 1);
            score++;
        }
    }

    ctx.fillStyle = 'white';
    ctx.font = '30px sans-serif';
    ctx.fillText('Score: ' + score, 20, 50);

    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
