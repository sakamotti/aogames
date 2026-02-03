const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const msgEl = document.getElementById('message');

let width, height;
let player = { x: 0, y: 0, w: 60, h: 60, color: '#3498db' };
let obstacles = [];
let score = 0;
let lastTime = 0;
let spawnTimer = 0;
let gameSpeed = 300;
let isGameOver = false;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    player.y = height - 100;
    player.x = width / 2;
}
window.addEventListener('resize', resize);
resize();

function resetGame() {
    obstacles = [];
    score = 0;
    gameSpeed = 300;
    isGameOver = false;
    msgEl.style.display = 'none';
    scoreEl.innerText = "点数: " + score;
    lastTime = performance.now();
    requestAnimationFrame(animate);
}

function handleInput(e) {
    if(isGameOver) {
        if(e.type === 'touchstart' || e.type === 'mousedown') resetGame();
        return;
    }
    e.preventDefault();
    let clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
    player.x = clientX;
}

canvas.addEventListener('mousemove', handleInput);
canvas.addEventListener('touchmove', handleInput, {passive: false});
canvas.addEventListener('touchstart', handleInput, {passive: false});
canvas.addEventListener('mousedown', handleInput);

function animate(timestamp) {
    if(isGameOver) return;

    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (isNaN(dt)) dt = 0.016;

    ctx.clearRect(0, 0, width, height);

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x - player.w/2, player.y, player.w, player.h);
    // Face
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x - 15, player.y + 10, 10, 10);
    ctx.fillRect(player.x + 5, player.y + 10, 10, 10);

    // Obstacles
    spawnTimer += dt;
    if (spawnTimer > 1.0 - (score * 0.01)) { // Get faster
        if(spawnTimer > 0.3) { // Cap max spawn rate
             let size = 40 + Math.random() * 40;
            obstacles.push({
                x: Math.random() * width,
                y: -size,
                size: size,
                speed: gameSpeed + Math.random() * 200,
                color: '#e74c3c'
            });
            spawnTimer = 0;
            gameSpeed += 2;
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        o.y += o.speed * dt;

        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x, o.y + o.size/2, o.size/2, 0, Math.PI * 2);
        ctx.fill();

        // Simple AABB Collision for ease
        // Player Box: [player.x - w/2, player.y] to [player.x + w/2, player.y + h]
        // Obstacle Box: [o.x - size/2, o.y] to [o.x + size/2, o.y + size]

        if (
            o.x - o.size/2 < player.x + player.w/2 - 10 && // -10 for leeway
            o.x + o.size/2 > player.x - player.w/2 + 10 &&
            o.y + o.size > player.y + 10 &&
            o.y < player.y + player.h
        ) {
            isGameOver = true;
            msgEl.style.display = 'block';
        }

        if (o.y > height + o.size) {
            obstacles.splice(i, 1);
            score++;
            scoreEl.innerText = "点数: " + score;
        }
    }

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
