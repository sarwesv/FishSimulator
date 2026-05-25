/**
 * Fish Simulator
 * High-Fidelity Retro HTML5 Canvas Simulation
 */

// --- Constants & Config ---
const CANVAS_WIDTH = 480; 
const CANVAS_HEIGHT = 300;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff7700', shadow: '#bb4400', highlight: '#ffaa33', size: 30, speed: 0.45, behavior: 'swimmer' },
    neon: { color: '#0022ff', shadow: '#000088', highlight: '#4444ff', size: 18, speed: 0.85, behavior: 'swimmer' },
    betta: { color: '#cc0022', shadow: '#660000', highlight: '#ff4444', size: 32, speed: 0.25, behavior: 'swimmer' },
    koi: { color: '#fcfcf0', shadow: '#d0d0b0', highlight: '#ffffff', size: 45, speed: 0.4, behavior: 'swimmer' },
    angelfish: { color: '#e0e0e0', shadow: '#888888', highlight: '#ffffff', size: 40, speed: 0.35, behavior: 'swimmer' },
    guppy: { color: '#00ffcc', shadow: '#008866', highlight: '#66ffff', size: 22, speed: 0.7, behavior: 'swimmer' },
    cory: { color: '#8d7a65', shadow: '#5d4a35', highlight: '#ad9a85', size: 25, speed: 0.4, behavior: 'bottom' },
    shrimp: { color: 'rgba(200, 255, 200, 0.4)', shadow: 'rgba(150, 200, 150, 0.2)', highlight: '#ffffff', size: 15, speed: 0.6, behavior: 'bottom' },
    snail: { color: '#8b4513', shadow: '#5d2e0d', highlight: '#a0522d', size: 12, speed: 0.05, behavior: 'crawler' }
};

const PLANT_TYPES = {
    seaweed: { color: '#1e6b1e', height: 80, width: 8, segments: 8, sway: 5 },
    fern: { color: '#228a44', height: 50, width: 12, segments: 5, sway: 2 },
    grass: { color: '#3a9d23', height: 30, width: 4, segments: 3, sway: 8 },
    kelp: { color: '#567d46', height: 120, width: 10, segments: 12, sway: 3 }
};

// --- Game State ---
let state = 'MENU';
let fishes = [];
let plants = [];
let foods = [];
let bubbles = [];
let backgroundFishes = [];
let gravelDebris = 0;
let gravelColor = '#887766';
let selectedFishTypes = new Set();

const GRAVEL_MAP = [];
for (let i = 0; i <= CANVAS_WIDTH; i++) {
    GRAVEL_MAP[i] = CANVAS_HEIGHT - 20 + Math.sin(i * 0.05) * 5 + Math.cos(i * 0.1) * 3;
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// --- Entities ---

class Plant {
    constructor(type, x) {
        this.type = type || 'seaweed';
        const config = PLANT_TYPES[this.type] || PLANT_TYPES.seaweed;
        this.x = x || Math.random() * CANVAS_WIDTH;
        this.y = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 12;
        this.height = config.height * (0.8 + Math.random() * 0.4);
        this.width = config.width * (0.8 + Math.random() * 0.4);
        this.segments = config.segments;
        this.swayAmount = config.sway;
        this.offset = Math.random() * Math.PI * 2;
        this.color = config.color;
    }
    draw() {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 1; i <= this.segments; i++) {
            let sway = Math.sin(Date.now() * 0.0015 + this.offset + i * 0.4) * (i * this.swayAmount);
            ctx.lineTo(this.x + sway, this.y - (i * (this.height / this.segments)));
        }
        ctx.stroke();
    }
}

class Bubble {
    constructor(x, y, isBig = false) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -Math.random() * 0.6 - 0.2;
        this.size = isBig ? (Math.random() * 6 + 4) : (Math.random() * 2 + 1);
        this.life = isBig ? 150 : 100;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.life--;
        this.vx += Math.sin(this.life * 0.08) * 0.06;
    }
    draw() {
        ctx.fillStyle = 'rgba(200, 230, 255, 0.25)';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1; ctx.stroke();
    }
}

class Food {
    constructor(x, y) {
        this.x = x; this.y = y; this.vy = 0.8;
        this.settled = false; this.life = 400; 
    }
    update() {
        if (!this.settled) {
            this.y += this.vy;
            const floorY = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 16;
            if (this.y >= floorY - 4) { this.y = floorY - 4; this.settled = true; gravelDebris = Math.min(100, gravelDebris + 2); }
        } else { this.life--; }
    }
    draw() { ctx.fillStyle = '#ccaa00'; ctx.fillRect(this.x - 3, this.y - 3, 6, 6); }
}

class Fish {
    constructor(type, isBackground = false) {
        this.type = type;
        this.config = FISH_TYPES[type];
        this.isBackground = isBackground;
        this.x = isBackground ? Math.random() * CANVAS_WIDTH : 60 + Math.random() * (CANVAS_WIDTH - 120);
        this.y = this.config.behavior === 'swimmer' ? 60 + Math.random() * (CANVAS_HEIGHT - 120) : CANVAS_HEIGHT - 25;
        this.vx = 0; this.vy = 0;
        this.targetX = this.x; this.targetY = this.y;
        this.flip = false;
        this.bubbleTimer = Math.random() * 200;
        this.animTimer = Math.random() * 10;
        this.idleTimer = 0;
        this.boost = isBackground ? 0.6 : 1.0;
        
        if (type === 'koi') {
            const s = this.config.size;
            this.blotches = [];
            for(let i=0; i<6; i++) {
                this.blotches.push({
                    x: (Math.random()-0.5)*1.4, y: (Math.random()-0.5)*0.4, 
                    rx: Math.random() * 0.4 + 0.2, ry: Math.random() * 0.2 + 0.1,
                    rot: Math.random() * Math.PI,
                    c: Math.random() > 0.4 ? '#ff4400' : '#222222'
                });
            }
        }
    }

    update() {
        this.animTimer += 0.08;
        if (this.idleTimer > 0) {
            this.idleTimer--;
            this.vx *= 0.95; this.vy *= 0.95;
        } else {
            if (Math.abs(this.x - this.targetX) < 40 && (this.config.behavior === 'crawler' || Math.abs(this.y - this.targetY) < 40)) {
                if (Math.random() < 0.04) { this.idleTimer = 50 + Math.random() * 100; }
                else {
                    const isLong = Math.random() < 0.35;
                    if (isLong) {
                        this.targetX = this.x < CANVAS_WIDTH / 2 ? (CANVAS_WIDTH - 100) : 100;
                        if (this.config.behavior === 'swimmer') {
                            this.targetY = 60 + Math.random() * (CANVAS_HEIGHT - 120);
                        } else {
                            this.targetY = GRAVEL_MAP[Math.floor(this.targetX)] - 5;
                        }
                        this.boost = this.isBackground ? 1.0 : 1.8;
                    } else {
                        this.targetX = Math.max(50, Math.min(CANVAS_WIDTH - 50, this.x + (Math.random() - 0.5) * 180));
                        if (this.config.behavior === 'swimmer') {
                            this.targetY = Math.max(50, Math.min(CANVAS_HEIGHT - 50, this.y + (Math.random() - 0.5) * 120));
                        } else {
                            this.targetY = GRAVEL_MAP[Math.floor(this.targetX)] - 5;
                        }
                        this.boost = this.isBackground ? 0.5 : 1.0;
                    }
                }
            }
            let dx = this.targetX - this.x; let dy = this.targetY - this.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (d > 1) {
                this.vx += (dx / d) * this.config.speed * 0.02 * this.boost;
                this.vy += (dy / d) * this.config.speed * 0.02 * this.boost;
            }
        }
        this.vx *= FRICTION; this.vy *= FRICTION;
        this.x += this.vx; this.y += this.vy;

        if (this.config.behavior !== 'swimmer') {
            const floorY = GRAVEL_MAP[Math.floor(this.x)] - 5;
            if (this.y > floorY) this.y = floorY;
            if (this.config.behavior === 'crawler') this.vy = 0;
        }

        if (this.vx > 0.1) this.flip = false;
        if (this.vx < -0.1) this.flip = true;

        if (!this.isBackground) {
            foods.forEach((f, i) => {
                if (Math.abs(f.x - this.x) < this.config.size && Math.abs(f.y - this.y) < this.config.size/2) foods.splice(i, 1);
            });
            this.bubbleTimer--;
            if (this.bubbleTimer <= 0) {
                bubbles.push(new Bubble(this.x + (this.flip ? -12 : 12), this.y - 4, true));
                this.bubbleTimer = 200 + Math.random() * 800;
            }
        }
    }

    draw() {
        const s = this.isBackground ? this.config.size * 0.6 : this.config.size;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const tw = Math.sin(this.animTimer) * (3 + speed * 4);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);
        if (this.isBackground) ctx.globalAlpha = 0.5;

        ctx.fillStyle = this.config.color;

        if (this.type === 'koi') {
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.4, 0, 0, Math.PI*2); ctx.fill();
            this.blotches?.forEach(p => {
                ctx.save(); ctx.translate(p.x * s, p.y * s); ctx.rotate(p.rot);
                ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.rx * s, p.ry * s, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            });
            ctx.fillStyle = this.config.color;
            ctx.beginPath(); ctx.moveTo(-s+8, 0); ctx.lineTo(-s-16, -s*0.6 + tw); ctx.lineTo(-s-16, s*0.6 - tw); ctx.fill();
            ctx.beginPath(); ctx.ellipse(s*0.2, s*0.3, s*0.5, s*0.2, 0.4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(s*0.2, -s*0.3, s*0.5, s*0.2, -0.4, 0, Math.PI*2); ctx.fill();
        } 
        else if (this.type === 'goldfish') {
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.65, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-s+8, 0); ctx.bezierCurveTo(-s-10, -s*1.2 + tw, -s-20, -s*0.5, -s-15, 0);
            ctx.bezierCurveTo(-s-20, s*0.5, -s-10, s*1.2 - tw, -s+8, 0); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-s*0.4, -s*0.4); ctx.quadraticCurveTo(-s*0.6, -s*0.9, -s, -s*0.4); ctx.fill();
        } 
        else if (this.type === 'betta') {
            ctx.beginPath(); ctx.ellipse(0, 0, s*0.8, s*0.35, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = this.config.shadow;
            ctx.beginPath(); ctx.moveTo(-s*0.5, 0); ctx.bezierCurveTo(-s*1.5, -s*1.8 + tw, -s*3.5, -s*1.0, -s*3.2, 0);
            ctx.bezierCurveTo(-s*3.5, s*1.0, -s*1.5, s*1.8 - tw, -s*0.5, 0); ctx.fill();
        } 
        else if (this.type === 'neon') {
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.35, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#00ffff'; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
            ctx.fillRect(-s*0.8, -2, s*1.4, 3); ctx.shadowBlur = 0;
            ctx.fillStyle = '#ff3333'; ctx.beginPath(); ctx.moveTo(-s, 0);
            ctx.lineTo(-s*1.5, -s*0.5 + tw/2); ctx.lineTo(-s*1.5, s*0.5 - tw/2); ctx.fill();
        }
        else if (this.type === 'angelfish') {
            ctx.beginPath(); ctx.moveTo(s*0.8, 0); ctx.lineTo(-s*0.4, -s*1.1); ctx.lineTo(-s*0.4, s*1.1); ctx.fill();
            ctx.fillStyle = this.config.shadow; ctx.fillRect(-s*0.1, -s*0.9, s*0.15, s*1.8);
        }
        else if (this.type === 'guppy') {
            ctx.fillRect(-s*0.6, -s*0.2, s*1.0, s*0.4);
            ctx.fillStyle = this.config.shadow; ctx.fillRect(-s*1.5, -s*0.9 + tw, s*1.2, s*1.8);
        }
        else if (this.type === 'cory') {
            ctx.fillRect(-s*0.8, -s*0.4, s*1.6, s*0.8);
            ctx.fillStyle = this.config.shadow; ctx.fillRect(-s*1.0, -s*0.3 + tw/2, s*0.3, s*0.6);
        }
        else if (this.type === 'shrimp') {
            ctx.fillRect(-s*0.8, -s*0.2, s*1.6, s*0.4);
            ctx.fillRect(-s*1.0, s*0.2, s*0.2, s*0.3);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(s*0.6, 0); ctx.lineTo(s*1.2, -s*0.4); ctx.stroke();
        }
        else if (this.type === 'snail') {
            ctx.fillRect(-s*0.8, s*0.2, s*1.6, s*0.3);
            ctx.fillStyle = this.config.shadow; ctx.fillRect(-s*0.6, -s*0.6, s*1.2, s*1.0);
        }

        if (this.type !== 'shrimp') {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s*0.6, -s*0.1, 2.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(s*0.65, -s*0.1, 1.2, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
}

// --- Main Loop ---

function initBackground() {
    backgroundFishes = [
        new Fish('neon', true),
        new Fish('goldfish', true),
        new Fish('guppy', true),
        new Fish('neon', true)
    ];
}

function update() {
    backgroundFishes.forEach(f => f.update());
    if (state === 'PLAYING') {
        fishes.forEach(f => f.update());
        foods.forEach((f, i) => { f.update(); if (f.life <= 0) foods.splice(i, 1); });
        bubbles.forEach((b, i) => { b.update(); if (b.life <= 0) bubbles.splice(i, 1); });
    }
    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    let b = 255 - (gravelDebris * 1.2); let g = 200 - (gravelDebris * 0.4);
    ctx.fillStyle = `rgb(0, ${g}, ${b})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = gravelColor; ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT);
    for (let i = 0; i <= CANVAS_WIDTH; i++) ctx.lineTo(i, GRAVEL_MAP[i]);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.fill();
    
    if (gravelDebris > 0) {
        ctx.fillStyle = `rgba(50, 40, 0, ${gravelDebris/100})`;
        for(let i=0; i<gravelDebris; i++) {
            let dx = Math.floor(((Math.sin(i * 13) + 1) / 2) * CANVAS_WIDTH);
            let dy = GRAVEL_MAP[dx] + Math.cos(i * 7) * 4;
            ctx.fillRect(dx, dy, 5, 5);
        }
    }

    backgroundFishes.forEach(f => f.draw());

    if (state === 'PLAYING') {
        plants.forEach(p => p.draw());
        bubbles.forEach(b => b.draw());
        foods.forEach(f => f.draw());
        fishes.forEach(f => f.draw());
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'; ctx.fillRect(0, 0, CANVAS_WIDTH, 20);
    }
}

// --- Input Handling ---

function handleStart(e) {
    const t = e.target;
    if (t.classList.contains('selection-btn')) {
        const type = t.getAttribute('data-fish');
        if (selectedFishTypes.has(type)) { selectedFishTypes.delete(type); t.classList.remove('selected'); }
        else { selectedFishTypes.add(type); t.classList.add('selected'); }
        document.getElementById('start-btn').classList.toggle('hidden', selectedFishTypes.size === 0);
    } 
    else if (t.id === 'start-btn') startGame();
    else if (t.id === 'feed-btn') foods.push(new Food(40 + Math.random() * (CANVAS_WIDTH - 80), 0));
    else if (t.id === 'clean-btn') { gravelDebris = 0; foods = foods.filter(f => !f.settled); }
    else if (t.id === 'add-fish-btn') document.getElementById('add-fish-overlay').classList.remove('hidden');
    else if (t.id === 'add-plant-btn') document.getElementById('add-plant-overlay').classList.remove('hidden');
    else if (t.id === 'gravel-btn') document.getElementById('gravel-overlay').classList.remove('hidden');
    else if (t.id === 'reset-btn') resetGame();
    
    else if (t.classList.contains('add-fish-option')) {
        fishes.push(new Fish(t.getAttribute('data-fish')));
        document.getElementById('add-fish-overlay').classList.add('hidden');
    } 
    else if (t.id === 'close-add-fish') document.getElementById('add-fish-overlay').classList.add('hidden');
    
    else if (t.classList.contains('add-plant-option')) {
        plants.push(new Plant(t.getAttribute('data-plant'), 20 + Math.random() * (CANVAS_WIDTH - 40)));
        document.getElementById('add-plant-overlay').classList.add('hidden');
    }
    else if (t.id === 'close-add-plant') document.getElementById('add-plant-overlay').classList.add('hidden');

    else if (t.classList.contains('gravel-option')) {
        gravelColor = t.getAttribute('data-color');
        document.getElementById('gravel-overlay').classList.add('hidden');
    }
    else if (t.id === 'close-gravel') document.getElementById('gravel-overlay').classList.add('hidden');

    if (e.cancelable && t.tagName === 'BUTTON') e.preventDefault();
}

function startGame() {
    selectedFishTypes.forEach(type => fishes.push(new Fish(type)));
    state = 'PLAYING';
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

function resetGame() {
    state = 'MENU'; fishes = []; plants = []; foods = []; bubbles = []; gravelDebris = 0; selectedFishTypes.clear();
    document.querySelectorAll('.selection-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('add-fish-overlay').classList.add('hidden');
    document.getElementById('add-plant-overlay').classList.add('hidden');
    document.getElementById('gravel-overlay').classList.add('hidden');
}

window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('mousedown', handleStart);

initBackground();
requestAnimationFrame(update);
