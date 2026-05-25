/**
 * Fish Simulator
 * Retro HTML5 Canvas Simulation
 */

// --- Constants & Config ---
const CANVAS_WIDTH = 120;
const CANVAS_HEIGHT = 75;
const GRAVITY = 0.05;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff9900', size: 6, speed: 0.5 },
    neon: { color: '#00ffff', size: 4, speed: 0.8 },
    betta: { color: '#ff0055', size: 8, speed: 0.3 },
    koi: { color: '#f5f5dc', size: 9, speed: 0.4 } // Cream color body
};

// --- Game State ---
let state = 'MENU';
let selectedFishType = null;
let fish = null;
let foods = [];
let bubbles = [];
let gravelDebris = 0; // 0 to 100

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// --- Entities ---

class Bubble {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.1;
        this.vy = -Math.random() * 0.2 - 0.1;
        this.size = Math.random() * 0.8 + 0.4;
        this.life = 80;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.fillStyle = 'rgba(150, 200, 255, 0.15)'; // Very subtle blue
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = 0.15;
        this.settled = false;
        this.life = 400; 
    }

    update() {
        if (!this.settled) {
            this.y += this.vy;
            if (this.y >= CANVAS_HEIGHT - 4) {
                this.y = CANVAS_HEIGHT - 4;
                this.settled = true;
                gravelDebris = Math.min(100, gravelDebris + 2);
            }
        } else {
            this.life--;
        }
    }

    draw() {
        ctx.fillStyle = '#ccaa00';
        ctx.fillRect(this.x, this.y, 1.5, 1.5);
    }
}

class Fish {
    constructor(type) {
        this.type = type;
        this.config = FISH_TYPES[type];
        this.x = CANVAS_WIDTH / 2;
        this.y = CANVAS_HEIGHT / 2;
        this.vx = 0;
        this.vy = 0;
        this.targetX = this.x;
        this.targetY = this.y;
        this.flip = false;
        this.bubbleTimer = 0;
        
        if (type === 'koi') {
            this.pattern = [];
            for(let i=0; i<5; i++) {
                this.pattern.push({
                    x: Math.random() * 6 - 3,
                    y: Math.random() * 2 - 1,
                    r: Math.random() * 2 + 0.5,
                    c: Math.random() > 0.5 ? '#ff4400' : '#000000'
                });
            }
        }
    }

    update() {
        if (Math.abs(this.x - this.targetX) < 5 && Math.abs(this.y - this.targetY) < 5) {
            this.targetX = 15 + Math.random() * (CANVAS_WIDTH - 30);
            this.targetY = 15 + Math.random() * (CANVAS_HEIGHT - 30);
        }

        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 1) {
            this.vx += (dx / dist) * this.config.speed * 0.04;
            this.vy += (dy / dist) * this.config.speed * 0.04;
        }

        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.x += this.vx;
        this.y += this.vy;

        if (this.vx > 0.01) this.flip = false;
        if (this.vx < -0.01) this.flip = true;

        foods.forEach((f, index) => {
            let fdx = f.x - this.x;
            let fdy = f.y - this.y;
            let fdist = Math.sqrt(fdx * fdx + fdy * fdy);
            if (fdist < this.config.size) {
                foods.splice(index, 1);
            }
        });

        this.bubbleTimer++;
        if (this.bubbleTimer > 200 + Math.random() * 300) {
            bubbles.push(new Bubble(this.x + (this.flip ? -3 : 3), this.y));
            this.bubbleTimer = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);
        const size = this.config.size;
        ctx.fillStyle = this.config.color;
        
        ctx.beginPath();
        if (this.type === 'betta') {
            ctx.ellipse(0, 0, size, size/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#aa0033';
            ctx.beginPath();
            ctx.moveTo(-size/2, -size/4);
            ctx.quadraticCurveTo(-size, -size/2, -size*1.2, 0);
            ctx.quadraticCurveTo(-size, size/2, -size/2, size/4);
            ctx.fill();
        } else if (this.type === 'koi') {
            ctx.ellipse(0, 0, size, size/3, 0, 0, Math.PI * 2);
            ctx.fill();
            this.pattern.forEach(p => {
                ctx.fillStyle = p.c;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
        } else {
            ctx.ellipse(0, 0, size, size/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-size + 1, 0);
            ctx.lineTo(-size - 2, -size/2);
            ctx.lineTo(-size - 2, size/2);
            ctx.closePath();
            ctx.fill();
        }

        // Eye (Single pixel for ultra-retro)
        ctx.fillStyle = '#000';
        ctx.fillRect(size/2, -0.5, 1, 1);
        ctx.restore();
    }
}

// --- Main Loop ---

function update() {
    if (state === 'PLAYING') {
        fish.update();
        foods.forEach((f, i) => { f.update(); if (f.life <= 0) foods.splice(i, 1); });
        bubbles.forEach((b, i) => { b.update(); if (b.life <= 0) bubbles.splice(i, 1); });
    }
    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    let blue = 255 - (gravelDebris * 1.2);
    let green = 200 - (gravelDebris * 0.4);
    ctx.fillStyle = `rgb(0, ${green}, ${blue})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#887766';
    ctx.fillRect(0, CANVAS_HEIGHT - 6, CANVAS_WIDTH, 6);
    
    if (gravelDebris > 0) {
        ctx.fillStyle = `rgba(50, 40, 0, ${gravelDebris/100})`;
        for(let i=0; i<gravelDebris; i++) {
            // Fix debris distribution logic
            let dx = ((Math.sin(i * 13) + 1) / 2) * CANVAS_WIDTH;
            ctx.fillRect(dx, CANVAS_HEIGHT - 8 + Math.cos(i * 7) * 2, 1.5, 1.5);
        }
    }

    if (state === 'PLAYING') {
        bubbles.forEach(b => b.draw());
        foods.forEach(f => f.draw());
        fish.draw();
    }
}

// --- Input Handling ---

function handleStart(e) {
    if (e.target.classList.contains('menu-btn')) {
        startGame(e.target.getAttribute('data-fish'));
    } else if (e.target.id === 'feed-btn') {
        foods.push(new Food(10 + Math.random() * (CANVAS_WIDTH - 20), 0));
    } else if (e.target.id === 'clean-btn') {
        gravelDebris = 0;
        foods = foods.filter(f => !f.settled);
    } else if (e.target.id === 'reset-btn') {
        resetGame();
    }
    if (e.cancelable) e.preventDefault();
}

function startGame(type) {
    fish = new Fish(type);
    state = 'PLAYING';
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

function resetGame() {
    state = 'MENU';
    fish = null; foods = []; bubbles = []; gravelDebris = 0;
    document.getElementById('menu-overlay').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
}

window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('mousedown', handleStart);
requestAnimationFrame(update);
