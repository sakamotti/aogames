const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const instructionEl = document.getElementById('instruction');
const scoreEl = document.getElementById('score');

let width, height;
let shapes = [];
let targetShapeType = '';
let score = 0;
const shapeTypes = ['circle', 'square', 'triangle'];
const shapeNames = { 'circle': 'まる (🔴)', 'square': 'しかく (⬛)', 'triangle': 'さんかく (🔺)' };

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Shape {
    constructor(type) {
        this.type = type;
        this.size = 80 + Math.random() * 50;
        this.x = Math.random() * (width - this.size * 2) + this.size;
        this.y = Math.random() * (height - this.size * 2) + this.size;
        this.dx = (Math.random() - 0.5) * 150;
        this.dy = (Math.random() - 0.5) * 150;
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
        this.angle = 0;
        this.spin = (Math.random() - 0.5) * 2;
    }

    update(dt) {
        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.angle += this.spin * dt;

        if(this.x < this.size/2 || this.x > width - this.size/2) this.dx *= -1;
        if(this.y < this.size/2 || this.y > height - this.size/2) this.dy *= -1;

        // Clamp
        this.x = Math.max(this.size/2, Math.min(width - this.size/2, this.x));
        this.y = Math.max(this.size/2, Math.min(height - this.size/2, this.y));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.lineWidth = 5;
        ctx.strokeStyle = "white";

        ctx.beginPath();
        if (this.type === 'circle') {
            ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
        } else if (this.type === 'square') {
            ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
        } else if (this.type === 'triangle') {
            // Equilateral triangle logic approx
            ctx.moveTo(0, -this.size/2);
            ctx.lineTo(this.size/2, this.size/2);
            ctx.lineTo(-this.size/2, this.size/2);
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    isClicked(mx, my) {
        const dist = Math.sqrt((mx - this.x)**2 + (my - this.y)**2);
        return dist < this.size/2 + 20; // Forgiving hit box
    }
}

function startRound() {
    shapes = [];
    for(let i=0; i<6; i++) {
        shapes.push(new Shape(shapeTypes[Math.floor(Math.random() * shapeTypes.length)]));
    }
    targetShapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    // Ensure target exists
    if(!shapes.some(s => s.type === targetShapeType)) {
        shapes[0].type = targetShapeType;
    }

    instructionEl.textContent = `${shapeNames[targetShapeType]} をおして！`;
}

function handleInput(e) {
    if(e.type === 'touchstart') e.preventDefault();

    const x = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
    const y = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;

    for (let i = 0; i < shapes.length; i++) {
        if(shapes[i].isClicked(x, y)) {
            if(shapes[i].type === targetShapeType) {
                score++;
                scoreEl.textContent = "点数: " + score;
                startRound();
            } else {
                // Wrong
                shapes[i].dx *= 3; // Speed up like "No!"
                shapes[i].dy *= 3;
            }
            break;
        }
    }
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, {passive: false});

let lastTime = performance.now();
function animate(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if(isNaN(dt)) dt = 0.016;

    ctx.clearRect(0, 0, width, height);
    shapes.forEach(s => {
        s.update(dt);
        s.draw();
    });
    requestAnimationFrame(animate);
}
startRound();
requestAnimationFrame(animate);
