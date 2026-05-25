/**
 * Fish Simulator
 * Enhanced Blocky Pixel Simulation
 */

// --- Constants & Config ---
const CANVAS_WIDTH = 480; 
const CANVAS_HEIGHT = 300;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff7700', pattern: '#ffaa33', shadow: '#cc5500', size: 30, speed: 0.45 },
    neon: { color: '#0022ff', pattern: '#00ffff', shadow: '#0011aa', size: 18, speed: 0.85 },
    betta: { color: '#cc0022', pattern: '#ff3355', shadow: '#880011', size: 32, speed: 0.25 },
    koi: { color: '#fcfcf0', pattern: '#ff4400', shadow: '#d0d0b0', size: 45, speed: 0.4 } 
};

// --- Game State ---
let state = 'MENU';
let fishes = [];
let plants = [];
let foods = [];
let gravelDebris = 0;
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
    constructor(x) {
        this.x = x;
        this.y = GRAVEL_MAP[Math.floor(x)] || CANVAS_HEIGHT - 12;
        this.height = 40 + Math.random() * 60;
        this.segments = 5;
        this.offset = Math.random() * 10;
        this.color = Math.random() > 0.5 ? '#1e6b1e' : '#228a44';
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
    constructor(type) {
        this.type = type;
        this.config = FISH_TYPES[type];
        this.x = 60 + Math.random() * (CANVAS_WIDTH - 120);
        this.y = 60 + Math.random() * (CANVAS_HEIGHT - 120);
        this.vx = 0; this.vy = 0;
        this.targetX = this.x; this.targetY = this.y;
        this.flip = false;
        this.animTimer = Math.random() * 10;
        this.idleTimer = 0;
        this.boost = 1.0;
        
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
            if (Math.abs(this.x - this.targetX) < 40 && Math.abs(this.y - this.targetY) < 40) {
                if (Math.random() < 0.04) { this.idleTimer = 50 + Math.random() * 100; }
                else {
                    const isLong = Math.random() < 0.3;
                    if (isLong) {
                        this.targetX = this.x < CANVAS_WIDTH / 2 ? (CANVAS_WIDTH - 80) : 80;
                        this.targetY = 60 + Math.random() * (CANVAS_HEIGHT - 120);
                        this.boost = 1.8;
                    } else {
                        this.targetX = Math.max(50, Math.min(CANVAS_WIDTH - 50, this.x + (Math.random() - 0.5) * 160));
                        this.targetY = Math.max(50, Math.min(CANVAS_HEIGHT - 50, this.y + (Math.random() - 0.5) * 120));
                        this.boost = 1.0;
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
        if (this.vx > 0.1) this.flip = false;
        if (this.vx < -0.1) this.flip = true;

        foods.forEach((f, i) => {
            if (Math.abs(f.x - this.x) < this.config.size && Math.abs(f.y - this.y) < this.config.size/2) foods.splice(i, 1);
        });
    }

    draw() {
        const s = this.config.size;
        const tailSway = Math.sin(this.animTimer) * 6;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);

        // --- ENHANCED PIXEL ART DETAILS ---
        
        // 1. Shadow Underbelly (Adds depth)
        ctx.fillStyle = this.uniqueShadow;
        ctx.fillRect(-s*0.6, s*0.1, s*1.2, s*0.3);

        // 2. Main Body Base
        ctx.fillStyle = this.uniqueColor;

        if (this.type === 'koi') {
            ctx.fillRect(-s*0.8, -s*0.3, s*1.6, s*0.6); // Torpedo
            ctx.fillRect(s*0.7, -s*0.1, s*0.2, s*0.2); // Snout
            this.blotches.forEach(b => {
                ctx.fillStyle = b.c;
                ctx.fillRect(b.x*s, b.y*s, b.w*s, b.h*s);
            });
            ctx.fillStyle = this.uniqueColor;
            ctx.fillRect(-s*1.2, -s*0.4 + tailSway, s*0.4, s*0.8); // Tail
            ctx.fillRect(-s*0.9, -s*0.2 + tailSway, s*0.2, s*0.4); // Tail base
        } 
        else if (this.type === 'goldfish') {
            ctx.fillRect(-s*0.6, -s*0.5, s*1.2, s*1.0); // Chunky Body
            ctx.fillRect(s*0.5, -s*0.1, s*0.2, s*0.4); // Face
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*1.4, -s*0.7 + tailSway, s*0.8, s*1.4); // Huge Wavy Tail
            ctx.fillStyle = this.uniqueColor;
            ctx.fillRect(-s*0.2, -s*0.8, s*0.4, s*0.3); // Dorsal
        } 
        else if (this.type === 'betta') {
            ctx.fillRect(-s*0.6, -s*0.2, s*1.2, s*0.4); // Body
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.4, -s*1.1 + tailSway/2, s*1.0, s*0.9); // Top Veil
            ctx.fillRect(-s*0.4, s*0.2 - tailSway/2, s*1.0, s*0.9);  // Bottom Veil
            ctx.fillRect(-s*1.6, -s*0.8 + tailSway, s*1.0, s*1.6);   // Grand Tail
        } 
        else if (this.type === 'neon') {
            ctx.fillRect(-s*0.8, -s*0.2, s*1.6, s*0.4); // Body
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.8, -s*0.05, s*1.4, s*0.1); // Glowing Stripe
            ctx.fillStyle = '#ff2222';
            ctx.fillRect(-s*1.2, -s*0.3 + tailSway/2, s*0.4, s*0.6); // Red Tail
        }

        // 3. Eye & Face Details
        ctx.fillStyle = '#fff'; ctx.fillRect(s*0.4, -s*0.2, 5, 5); // Eye White
        ctx.fillStyle = '#000'; ctx.fillRect(s*0.5, -s*0.15, 2, 2); // Pupil
        
        // 4. Fins (Small details)
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(s*0.1, s*0.2, s*0.3, s*0.15); // Pectoral Highlight

        ctx.restore();
    }
}

// --- Main Loop ---

function update() {
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
    ctx.fillStyle = '#7a6b5c';
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
    
    if (gravelDebris > 0) {
        ctx.fillStyle = `rgba(50, 40, 0, ${gravelDebris/100})`;
        for(let i=0; i<gravelDebris; i++) {
            ctx.fillRect(Math.floor(((Math.sin(i * 13) + 1) / 2) * CANVAS_WIDTH), CANVAS_HEIGHT - 25 + Math.cos(i * 7) * 4, 8, 8);
        }
    }

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
    else if (t.id === 'add-plant-btn') plants.push(new Plant(Math.random() * CANVAS_WIDTH));
    else if (t.id === 'reset-btn') resetGame();
    else if (t.classList.contains('add-fish-option')) {
        fishes.push(new Fish(t.getAttribute('data-fish')));
        document.getElementById('add-fish-overlay').classList.add('hidden');
    } 
    else if (t.id === 'close-add-fish') document.getElementById('add-fish-overlay').classList.add('hidden');

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
}

window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('click', handleStart);

requestAnimationFrame(update);
