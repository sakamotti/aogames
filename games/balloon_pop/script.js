const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

let width, height;
let balloons = [];
let score = 0;
let lastTime = 0;
let spawnTimer = 0;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Balloon {
    constructor() {
        this.radius = 40 + Math.random() * 30;
        this.x = Math.random() * (width - this.radius * 2) + this.radius;
        this.y = height + this.radius;
        this.speed = 100 + Math.random() * 100; // pixels per second
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
        this.markedForDeletion = false;
    }

    update(dt) {
        this.y -= this.speed * dt;
        if (this.y + this.radius < 0) this.markedForDeletion = true;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Shine
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();

        // String
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.radius);
        ctx.quadraticCurveTo(this.x + 10, this.y + this.radius + 20, this.x, this.y + this.radius + 50);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function handleInput(e) {
    // Prevent default to stop zooming/scrolling on some devices
    if(e.type === 'touchstart') e.preventDefault();

    const touchX = e.type === 'touchstart' ? e.changedTouches[0].clientX : e.clientX;
    const touchY = e.type === 'touchstart' ? e.changedTouches[0].clientY : e.clientY;

    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        const dx = b.x - touchX;
        const dy = b.y - touchY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < b.radius + 20) { // +20 forgiveness
            b.markedForDeletion = true;
            score++;
            scoreElement.innerText = "点数: " + score;
            break;
        }
    }
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, {passive: false});

function animate(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (isNaN(dt)) dt = 0;

    ctx.clearRect(0, 0, width, height);

    spawnTimer += dt;
    if (spawnTimer > 0.8) {
        balloons.push(new Balloon());
        spawnTimer = 0;
    }

    balloons = balloons.filter(b => !b.markedForDeletion);
    balloons.forEach(b => {
        b.update(dt);
        b.draw();
    });

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
