// Shared Logic

// 1. Inject Rotate Message if not present
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('rotate-message')) {
        const msg = document.createElement('div');
        msg.id = 'rotate-message';
        msg.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-1 2h1c2.48 0 4.86.95 6.48 2.52zM4 6.55c0 1.94 1.18 3.63 2.91 4.26V2H4v4.55zm13.12 1.98C15.93 6.94 14.07 6 12 6c-3.18 0-6.17 2.16-7.14 5.25C4.7 11.2 4.36 11.13 4 11.13c-2.76 0-5 2.24-5 5s2.24 5 5 5c2.31 0 4.24-1.58 4.82-3.73C10.05 19.33 11 20 12 20c4.41 0 8-3.59 8-8 0-1.29-.31-2.5-.88-3.57zM4 19.13c-1.65 0-3-1.35-3-3s1.35-3 3-3c.27 0 .53.03.78.08C4.28 14.15 4 15.05 4 16c0 1.22.42 2.34 1.12 3.23-.35-.06-.72-.1-1.12-.1zm8.56-9.69c.87.5 1.44 1.44 1.44 2.5 0 1.58-1.23 2.87-2.78 2.98l1.34-1.34-1.41-1.41L7.75 14.5l2.4 2.4 1.41-1.41-1.36-1.36C12.36 13.97 14 12.08 14 9.94c0-.42-.08-.82-.22-1.2l-1.22.7z"/></svg>
            <div>画面を横にしてください<br>(Please rotate device)</div>
        `;
        document.body.appendChild(msg);
    }

    // 2. Inject Back Button
    if (!document.getElementById('back-button')) {
        const btn = document.createElement('a');
        btn.id = 'back-button';
        btn.innerHTML = '🏠'; // Home icon
        // Determine path to root. Assuming structure games/GAME_NAME/index.html -> ../../
        btn.href = '../../index.html';
        document.body.appendChild(btn);
    }
});

// 3. Audio Context Helper
const SharedAudio = {
    ctx: null,
    init: function() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }
};

// Global resize helper for canvas
function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return { canvas: null, ctx: null, width: 0, height: 0 };

    const ctx = canvas.getContext('2d');

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });

    return { canvas, ctx, width, height };
}
