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
    koi: { color: '#fcfcf0', pattern: '#ff4400', shadow: '#d0d0b0', size: 45, speed: 0.4 },
    angelfish: { color: '#e0e0e0', pattern: '#444444', shadow: '#aaaaaa', size: 35, speed: 0.35 },
    guppy: { color: '#00ffcc', pattern: '#ff66ff', shadow: '#008866', size: 22, speed: 0.7 },
    cory: { color: '#a08860', pattern: '#504030', shadow: '#706040', size: 24, speed: 0.3, habitat: 'bottom' },
    shrimp: { color: '#ff4444', pattern: '#ffffff', shadow: '#aa2222', size: 15, speed: 0.4, habitat: 'bottom' },
    snail: { color: '#886644', pattern: '#ccaa88', shadow: '#553311', size: 20, speed: 0.1, habitat: 'bottom' }
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
        this.type = type;
        const config = PLANT_TYPES[type] || PLANT_TYPES.seaweed;
        this.x = x;
        this.y = GRAVEL_MAP[Math.floor(x)] || CANVAS_HEIGHT - 12;
        this.height = config.height * (0.8 + Math.random() * 0.4);
        this.width = config.width;
        this.segments = config.segments;
        this.offset = Math.random() * 10;
        this.color = config.color;
    }
    draw() {
        ctx.fillStyle = this.color;
        const segmentHeight = this.height / this.segments;
        for (let i = 0; i < this.segments; i++) {
            let sway = Math.sin(Date.now() * 0.002 + this.offset + i * 0.5) * (i * 3);
            ctx.fillRect(this.x + sway - this.width/2, this.y - (i + 1) * segmentHeight, this.width, segmentHeight + 1);
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
        this.y = this.config.habitat === 'bottom' ? CANVAS_HEIGHT - 30 : 60 + Math.random() * (CANVAS_HEIGHT - 140);
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
            for(let i=0; i<5; i++) {
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
                        this.targetY = this.config.habitat === 'bottom' ? 
                            GRAVEL_MAP[Math.floor(this.targetX)] - 10 :
                            60 + Math.random() * (CANVAS_HEIGHT - 120);
                        this.boost = 1.8;
                    } else {
                        this.targetX = Math.max(50, Math.min(CANVAS_WIDTH - 50, this.x + (Math.random() - 0.5) * 160));
                        this.targetY = this.config.habitat === 'bottom' ? 
                            GRAVEL_MAP[Math.floor(this.targetX)] - 10 :
                            Math.max(50, Math.min(CANVAS_HEIGHT - 80, this.y + (Math.random() - 0.5) * 120));
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
        
        // Habitat constraints
        if (this.config.habitat === 'bottom') {
            const floorY = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 15;
            if (this.y < floorY - 20) this.vy += 0.05;
            if (this.y > floorY - 5) { this.y = floorY - 5; this.vy = 0; }
        }

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

        // --- Shadow ---
        ctx.fillStyle = this.uniqueShadow;
        ctx.fillRect(-s*0.5, s*0.1, s*1.0, s*0.2);

        // --- Body ---
        ctx.fillStyle = this.uniqueColor;

        if (this.type === 'koi') {
            ctx.fillRect(-s*0.8, -s*0.3, s*1.6, s*0.6);
            this.blotches.forEach(b => { ctx.fillStyle = b.c; ctx.fillRect(b.x*s, b.y*s, b.w*s, b.h*s); });
            ctx.fillStyle = this.uniqueColor;
            ctx.fillRect(-s*1.2, -s*0.4 + tailSway, s*0.4, s*0.8);
        } 
        else if (this.type === 'goldfish') {
            ctx.fillRect(-s*0.6, -s*0.5, s*1.2, s*1.0);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*1.3, -s*0.7 + tailSway, s*0.7, s*1.4);
        } 
        else if (this.type === 'betta') {
            ctx.fillRect(-s*0.5, -s*0.2, s*1.0, s*0.4);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.4, -s*1.2 + tailSway/2, s*1.0, s*1.0);
            ctx.fillRect(-s*0.4, s*0.2 - tailSway/2, s*1.0, s*1.0);
            ctx.fillRect(-s*1.6, -s*0.8 + tailSway, s*1.2, s*1.6);
        } 
        else if (this.type === 'angelfish') {
            ctx.fillRect(-s*0.3, -s*0.8, s*0.6, s*1.6); // Tall body
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.1, -s*0.6, s*0.2, s*1.2); // Vertical stripe
            ctx.fillRect(-s*0.8, -s*0.1 + tailSway/3, s*0.5, s*0.2); // Tail
        }
        else if (this.type === 'guppy') {
            ctx.fillRect(-s*0.6, -s*0.2, s*1.0, s*0.4);
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*1.4, -s*0.8 + tailSway, s*1.0, s*1.6); // Huge fan tail
        }
        else if (this.type === 'cory') {
            ctx.fillRect(-s*0.7, -s*0.4, s*1.4, s*0.7); // Chunkier bottom fish
            ctx.fillStyle = this.uniquePattern;
            ctx.fillRect(-s*0.4, -s*0.2, s*0.3, s*0.3); // Spot
        }
        else if (this.type === 'shrimp') {
            ctx.fillRect(-s*0.8, -s*0.2, s*1.6, s*0.4);
            ctx.fillStyle = '#fff';
            ctx.fillRect(s*0.2, s*0.2, 2, 6); // Tiny legs
            ctx.fillRect(-s*0.2, s*0.2, 2, 6);
        }
        else if (this.type === 'snail') {
            ctx.fillStyle = '#aa8866';
            ctx.fillRect(-s*0.8, 0, s*1.6, s*0.4); // Foot
            ctx.fillStyle = this.uniqueColor;
            ctx.fillRect(-s*0.6, -s*0.8, s*1.2, s*0.8); // Shell
        }
        else {
            ctx.fillRect(-s*0.8, -s*0.2, s*1.6, s*0.4); // Default
        }

        // Eye
        if (this.type !== 'snail') {
            ctx.fillStyle = '#fff'; ctx.fillRect(s*0.4, -s*0.2, 5, 5);
            ctx.fillStyle = '#000'; ctx.fillRect(s*0.5, -s*0.15, 2, 2);
        }

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
    ctx.fillStyle = gravelColor; ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT);
    for (let i = 0; i <= CANVAS_WIDTH; i++) ctx.lineTo(i, GRAVEL_MAP[i]);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.fill();
    
    if (gravelDebris > 0) {
        ctx.fillStyle = `rgba(50, 40, 0, ${gravelDebris/100})`;
        for(let i=0; i<gravelDebris; i++) {
            let dx = Math.floor(((Math.sin(i * 13) + 1) / 2) * CANVAS_WIDTH);
            let dy = GRAVEL_MAP[dx] + Math.cos(i * 7) * 4;
            ctx.fillRect(dx, dy, 8, 8);
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
    else if (t.id === 'add-plant-btn') document.getElementById('add-plant-overlay').classList.remove('hidden');
    else if (t.id === 'gravel-btn') document.getElementById('gravel-overlay').classList.remove('hidden');
    else if (t.id === 'reset-btn') resetGame();
    
    // Overlays
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

    if (t.tagName === 'BUTTON' && e.cancelable) e.preventDefault();
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
requestAnimationFrame(update);
