/**
 * Fish Simulator
 * Enhanced Blocky Pixel Simulation
 */

// --- Constants & Config ---
const CANVAS_WIDTH = 480; 
const CANVAS_HEIGHT = 300;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff7700', pattern: '#ffaa33', shadow: '#cc5500', size: 30, speed: 0.45, behavior: 'swimmer' },
    neon: { color: '#0022ff', pattern: '#00ffff', shadow: '#0011aa', size: 18, speed: 0.85, behavior: 'swimmer' },
    betta: { color: '#cc0022', pattern: '#ff3355', shadow: '#880011', size: 32, speed: 0.25, behavior: 'swimmer' },
    koi: { color: '#fcfcf0', pattern: '#ff4400', shadow: '#d0d0b0', size: 45, speed: 0.4, behavior: 'swimmer' },
    angelfish: { color: '#e0e0e0', pattern: '#a0a0a0', shadow: '#888888', size: 35, speed: 0.3, behavior: 'swimmer' },
    guppy: { color: '#ffcc00', pattern: '#ff8800', shadow: '#ccaa00', size: 22, speed: 0.7, behavior: 'swimmer' },
    cory: { color: '#8d7a65', pattern: '#5d4a35', shadow: '#4d3a25', size: 25, speed: 0.4, behavior: 'bottom' },
    shrimp: { color: 'rgba(200, 255, 200, 0.4)', pattern: '#ffffff', shadow: 'rgba(150, 200, 150, 0.2)', size: 15, speed: 0.6, behavior: 'bottom' },
    snail: { color: '#8b4513', pattern: '#5d2e0d', shadow: '#3d1e0d', size: 12, speed: 0.05, behavior: 'crawler' }
};

const PLANT_TYPES = {
    seaweed: { color: '#1e6b1e', height: 80, segments: 6 },
    fern: { color: '#228a44', height: 50, segments: 4 },
    grass: { color: '#3a9d23', height: 30, segments: 3 },
    kelp: { color: '#567d46', height: 120, segments: 8 }
};

// --- Game State ---
let state = 'MENU';
let fishes = [];
let plants = [];
let foods = [];
let backgroundFishes = [];
let gravelDebris = 0;
let gravelColor = '#7a6b5c';
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
        this.segments = config.segments;
        this.offset = Math.random() * 10;
        this.color = config.color;
    }
    draw() {
        ctx.fillStyle = this.color;
        const segmentHeight = this.height / this.segments;
        for (let i = 0; i < this.segments; i++) {
            let sway = Math.sin(Date.now() * 0.002 + this.offset + i * 0.5) * (i * 4);
            ctx.fillRect(this.x + sway - 4, this.y - (i + 1) * segmentHeight, 8, segmentHeight + 1);
        }
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
        this.animTimer = Math.random() * 10;
        this.idleTimer = 0;
        this.boost = isBackground ? 0.8 : 1.0;
        
        // --- Unique Pattern Generation ---
        this.uniqueColor = this.config.color;
        this.uniquePattern = this.config.pattern;
        this.uniqueShadow = this.config.shadow;

        if (type === 'koi') {
            this.blotches = [];
            const count = 4 + Math.floor(Math.random() * 4);
            for(let i=0; i<count; i++) {
                this.blotches.push({ 
                    x: (Math.random()-0.5)*1.2, y: (Math.random()-0.5)*0.4, 
                    w: 0.15 + Math.random()*0.3, h: 0.1 + Math.random()*0.25,
                    c: Math.random() > 0.4 ? this.config.pattern : '#222222'
                });
            }
        }
    }

    update() {
        this.animTimer += 0.1;
        if (this.idleTimer > 0) {
            this.idleTimer--;
            this.vx *= 0.95; this.vy *= 0.95;
        } else {
            if (Math.abs(this.x - this.targetX) < 40 && (this.config.behavior === 'crawler' || Math.abs(this.y - this.targetY) < 40)) {
                if (Math.random() < 0.04) { this.idleTimer = 50 + Math.random() * 100; }
                else {
                    const isLong = Math.random() < 0.3;
                    if (isLong) {
                        this.targetX = this.x < CANVAS_WIDTH / 2 ? (CANVAS_WIDTH - 80) : 80;
                        if (this.config.behavior === 'swimmer') {
                            this.targetY = 60 + Math.random() * (CANVAS_HEIGHT - 120);
                        } else {
                            this.targetY = GRAVEL_MAP[Math.floor(this.targetX)] - 5;
                        }
                        this.boost = this.isBackground ? 1.2 : 1.8;
                    } else {
                        this.targetX = Math.max(50, Math.min(CANVAS_WIDTH - 50, this.x + (Math.random() - 0.5) * 160));
                        if (this.config.behavior === 'swimmer') {
                            this.targetY = Math.max(50, Math.min(CANVAS_HEIGHT - 50, this.y + (Math.random() - 0.5) * 120));
                        } else {
                            this.targetY = GRAVEL_MAP[Math.floor(this.targetX)] - 5;
                        }
                        this.boost = this.isBackground ? 0.7 : 1.0;
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

        // Keep bottom dwellers on floor
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
        }
    }

    draw() {
        const s = this.isBackground ? this.config.size * 0.6 : this.config.size;
        const tailSway = Math.sin(this.animTimer) * 6;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);
        if (this.isBackground) ctx.globalAlpha = 0.6;

        // --- ENHANCED PIXEL ART DETAILS ---
        
        // 1. Shadow Underbelly
        ctx.fillStyle = this.uniqueShadow;
        ctx.fillRect(-s*0.6, s*0.1, s*1.2, s*0.3);

        // 2. Main Body Base
        ctx.fillStyle = this.uniqueColor;

        if (this.type === 'koi') {
            ctx.fillRect(-s*0.8, -s*0.3, s*1.6, s*0.6);
            ctx.fillRect(s*0.7, -s*0.1, s*0.2, s*0.2);
            this.blotches.forEach(b => {
                ctx.fillStyle = b.c;
                ctx.fillRect(b.x*s, b.y*s, b.w*s, b.h*s);
            });
            ctx.fillStyle = this.uniqueColor;
            ctx.fillRect(-s*1.2, -s*0.4 + tailSway, s*0.4, s*0.8);
            ctx.fillRect(-s*0.9, -s*0.2 + tailSway, s*0.2, s*0.4);
        } 
        else if (this.type === 'goldfish') {
            ctx.fillRect(-s*0.6, -s*0.5, s*1.2, s*1.0);
            ctx.fillRect(s*0.5, -s*0.1, s*0.2, s*0.4);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*1.4, -s*0.7 + tailSway, s*0.8, s*1.4);
            ctx.fillStyle = this.uniqueColor;
            ctx.fillRect(-s*0.2, -s*0.8, s*0.4, s*0.3);
        } 
        else if (this.type === 'betta') {
            ctx.fillRect(-s*0.6, -s*0.2, s*1.2, s*0.4);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.4, -s*1.1 + tailSway/2, s*1.0, s*0.9);
            ctx.fillRect(-s*0.4, s*0.2 - tailSway/2, s*1.0, s*0.9);
            ctx.fillRect(-s*1.6, -s*0.8 + tailSway, s*1.0, s*1.6);
        } 
        else if (this.type === 'neon') {
            ctx.fillRect(-s*0.8, -s*0.2, s*1.6, s*0.4);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.8, -s*0.05, s*1.4, s*0.1);
            ctx.fillStyle = '#ff2222';
            ctx.fillRect(-s*1.2, -s*0.3 + tailSway/2, s*0.4, s*0.6);
        }
        else if (this.type === 'angelfish') {
            ctx.beginPath();
            ctx.moveTo(s*0.8, 0); ctx.lineTo(-s*0.4, -s*1.1); ctx.lineTo(-s*0.4, s*1.1);
            ctx.fill();
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.1, -s*0.9, s*0.15, s*1.8);
        }
        else if (this.type === 'guppy') {
            ctx.fillRect(-s*0.6, -s*0.2, s*1.0, s*0.4);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*1.5, -s*0.9 + tailSway, s*1.2, s*1.8);
        }
        else if (this.type === 'cory') {
            ctx.fillRect(-s*0.8, -s*0.4, s*1.6, s*0.8);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*1.0, -s*0.3 + tailSway/2, s*0.3, s*0.6);
            ctx.fillStyle = this.uniqueColor;
            ctx.fillRect(s*0.6, s*0.2, s*0.2, s*0.3);
        }
        else if (this.type === 'shrimp') {
            ctx.fillRect(-s*0.8, -s*0.2, s*1.6, s*0.4);
            ctx.fillRect(-s*1.0, s*0.2, s*0.2, s*0.3);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(s*0.6, 0); ctx.lineTo(s*1.2, -s*0.4); ctx.stroke();
        }
        else if (this.type === 'snail') {
            ctx.fillRect(-s*0.8, s*0.2, s*1.6, s*0.3);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.6, -s*0.6, s*1.2, s*1.0);
        }

        // 3. Eye
        if (this.type !== 'shrimp') {
            ctx.fillStyle = '#fff'; ctx.fillRect(s*0.4, -s*0.2, 5, 5);
            ctx.fillStyle = '#000'; ctx.fillRect(s*0.5, -s*0.15, 2, 2);
        }

        ctx.restore();
    }
}

// --- Main Loop ---

function initBackground() {
    backgroundFishes = [
        new Fish('neon', true),
        new Fish('goldfish', true),
        new Fish('neon', true)
    ];
}

function update() {
    backgroundFishes.forEach(f => f.update());
    if (state === 'PLAYING') {
        fishes.forEach(f => f.update());
        foods.forEach((f, i) => { f.update(); if (f.life <= 0) foods.splice(i, 1); });
    }
    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    let b = 255 - (gravelDebris * 1.2); let g = 200 - (gravelDebris * 0.4);
    ctx.fillStyle = `rgb(0, ${g}, ${b})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Gravel
    ctx.fillStyle = gravelColor;
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
    
    if (gravelDebris > 0) {
        ctx.fillStyle = `rgba(50, 40, 0, ${gravelDebris/100})`;
        for(let i=0; i<gravelDebris; i++) {
            ctx.fillRect(Math.floor(((Math.sin(i * 13) + 1) / 2) * CANVAS_WIDTH), CANVAS_HEIGHT - 25 + Math.cos(i * 7) * 4, 8, 8);
        }
    }

    backgroundFishes.forEach(f => f.draw());

    if (state === 'PLAYING') {
        plants.forEach(p => p.draw());
        foods.forEach(f => f.draw());
        fishes.forEach(f => f.draw());
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; ctx.fillRect(0, 0, CANVAS_WIDTH, 20);
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
    
    // Selection Handlers
    else if (t.classList.contains('add-fish-option')) {
        fishes.push(new Fish(t.getAttribute('data-fish')));
        document.getElementById('add-fish-overlay').classList.add('hidden');
    } 
    else if (t.id === 'close-add-fish') document.getElementById('add-fish-overlay').classList.add('hidden');
    
    else if (t.classList.contains('add-plant-option')) {
        plants.push(new Plant(t.getAttribute('data-plant'), Math.random() * CANVAS_WIDTH));
        document.getElementById('add-plant-overlay').classList.add('hidden');
    }
    else if (t.id === 'close-add-plant') document.getElementById('add-plant-overlay').classList.add('hidden');

    else if (t.classList.contains('gravel-option')) {
        gravelColor = t.getAttribute('data-color');
        document.getElementById('gravel-overlay').classList.add('hidden');
    }
    else if (t.id === 'close-gravel') document.getElementById('gravel-overlay').classList.add('hidden');

    if (t.tagName === 'BUTTON') {
        if (e.cancelable) e.preventDefault();
    }
}

function startGame() {
    selectedFishTypes.forEach(type => fishes.push(new Fish(type)));
    state = 'PLAYING';
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

function resetGame() {
    state = 'MENU'; fishes = []; plants = []; foods = []; gravelDebris = 0; selectedFishTypes.clear();
    document.querySelectorAll('.selection-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('add-fish-overlay').classList.add('hidden');
    document.getElementById('add-plant-overlay').classList.add('hidden');
    document.getElementById('gravel-overlay').classList.add('hidden');
}

window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('click', handleStart);

initBackground();
requestAnimationFrame(update);
