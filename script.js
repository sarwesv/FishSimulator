/**
 * Fish Simulator
 * High-Quality Pixel-Perfect 'Pixel Fishing' Simulation
 */

// --- Dynamic Resolution ---
const PIXEL_SCALE = 4; 
let CANVAS_WIDTH = Math.floor(window.innerWidth / PIXEL_SCALE);
let CANVAS_HEIGHT = Math.floor(window.innerHeight / PIXEL_SCALE);
const FRICTION = 0.98;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    CANVAS_WIDTH = Math.floor(window.innerWidth / PIXEL_SCALE);
    CANVAS_HEIGHT = Math.floor(window.innerHeight / PIXEL_SCALE);
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx.imageSmoothingEnabled = false;
    
    GRAVEL_MAP.length = 0;
    for (let i = 0; i <= CANVAS_WIDTH; i++) {
        GRAVEL_MAP[i] = CANVAS_HEIGHT - 15 + Math.sin(i * 0.05) * 4;
    }
}

const GRAVEL_MAP = [];
const FISH_TYPES = {
    goldfish: { c1: '#ff9900', c2: '#ffcc44', c3: '#cc5500', outline: '#331100', size: 14 },
    angelfish: { c1: '#ffffff', c2: '#ffdd88', c3: '#444444', outline: '#1a1a1a', size: 14 },
    koi: { c1: '#eeeeee', c2: '#ffffff', c3: '#ff4400', outline: '#222222', size: 16 },
    neon: { c1: '#0066ff', c2: '#00ffff', c3: '#ff0044', outline: '#000033', size: 12 },
    betta: { c1: '#cc0022', c2: '#ff3355', c3: '#660000', outline: '#220000', size: 15 },
    guppy: { c1: '#00ffcc', c2: '#ff66ff', c3: '#008866', outline: '#002211', size: 12 },
    pufferfish: { c1: '#ccaa88', c2: '#eeddcc', c3: '#886644', outline: '#443311', size: 12 },
    clownfish: { c1: '#ff6600', c2: '#ffffff', c3: '#000000', outline: '#221100', size: 12 }
};

// --- Game State ---
let state = 'MENU';
let fishes = [];
let plants = [];
let foods = [];
let gravelDebris = 0;
let gravelColor = '#887766';
let selectedFishTypes = new Set();

// --- Entities ---

class Plant {
    constructor(type, x) {
        this.type = type;
        this.x = x;
        this.y = GRAVEL_MAP[Math.floor(x)] || CANVAS_HEIGHT - 10;
        this.height = 20 + Math.random() * 20;
        this.offset = Math.random() * 10;
    }
    draw() {
        ctx.fillStyle = '#1e7b1e';
        const segments = 4;
        const sh = this.height / segments;
        for (let i = 0; i < segments; i++) {
            let sway = Math.sin(Date.now() * 0.002 + this.offset + i * 0.8) * 4;
            ctx.fillRect(Math.floor(this.x + sway - 2), Math.floor(this.y - (i + 1) * sh), 4, Math.floor(sh + 1));
        }
    }
}

class Food {
    constructor(x, y) {
        this.x = x; this.y = y; this.vy = 0.8;
        this.settled = false; this.life = 300; 
    }
    update() {
        if (!this.settled) {
            this.y += this.vy;
            const floorY = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 10;
            if (this.y >= floorY - 2) { this.y = floorY - 2; this.settled = true; gravelDebris = Math.min(50, gravelDebris + 2); }
        } else { this.life--; }
    }
    draw() { ctx.fillStyle = '#ffff00'; ctx.fillRect(Math.floor(this.x - 1), Math.floor(this.y - 1), 2, 2); }
}

class Fish {
    constructor(type) {
        this.type = type;
        this.config = FISH_TYPES[type] || FISH_TYPES.goldfish;
        this.x = 40 + Math.random() * (CANVAS_WIDTH - 80);
        this.y = 40 + Math.random() * (CANVAS_HEIGHT - 80);
        if (this.type === 'pufferfish' || this.type === 'cory') this.y = CANVAS_HEIGHT - 20;
        this.vx = 0; this.vy = 0;
        this.targetX = this.x; this.targetY = this.y;
        this.flip = false;
        this.animTimer = Math.random() * 10;
        this.idleTimer = 0;
        this.mouthTimer = 0;
    }

    update() {
        this.animTimer += 0.15;
        if (this.idleTimer > 0) {
            this.idleTimer--;
            this.vx *= 0.94; this.vy *= 0.94;
        } else {
            if (Math.abs(this.x - this.targetX) < 15 && Math.abs(this.y - this.targetY) < 15) {
                if (Math.random() < 0.05) { this.idleTimer = 40 + Math.random() * 80; }
                else {
                    this.targetX = Math.max(20, Math.min(CANVAS_WIDTH - 20, this.x + (Math.random() - 0.5) * 100));
                    this.targetY = Math.max(20, Math.min(CANVAS_HEIGHT - 30, this.y + (Math.random() - 0.5) * 60));
                }
            }
            let dx = this.targetX - this.x; let dy = this.targetY - this.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (d > 1) {
                this.vx += (dx / d) * 0.01;
                this.vy += (dy / d) * 0.01;
            }
        }
        this.vx *= FRICTION; this.vy *= FRICTION;
        this.x += this.vx; this.y += this.vy;
        if (this.vx > 0.05) this.flip = false;
        if (this.vx < -0.05) this.flip = true;

        if (this.mouthTimer > 0) this.mouthTimer--;
        foods.forEach((f, i) => {
            if (Math.abs(f.x - this.x) < 15 && Math.abs(f.y - this.y) < 10) this.mouthTimer = 20;
            if (Math.abs(f.x - this.x) < 10 && Math.abs(f.y - this.y) < 6) {
                foods.splice(i, 1);
                this.mouthTimer = 30;
            }
        });
    }

    draw() {
        ctx.save();
        ctx.translate(Math.floor(this.x), Math.floor(this.y));
        if (this.flip) ctx.scale(-1, 1);

        const dot = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(x, y, w, h);
        };

        const config = this.config;
        const sway = Math.floor(Math.sin(this.animTimer * 1.5) * 1);

        // --- PIXEL-PERFECT SPRITE DEFINITIONS ---
        
        if (this.type === 'goldfish') {
            // Outline
            dot(-5,-3,10,7,config.outline);
            dot(-7,-4,4,9,config.outline);
            // Body
            dot(-4,-2,8,5,config.c1);
            dot(-3,-3,6,1,config.c2); // Highlight
            dot(-3,2,6,1,config.c3); // Shadow
            // Tail (Double layered)
            dot(-6,-3+sway,3,7,config.outline);
            dot(-6,-2+sway,2,5,config.c1);
            // Eye
            dot(2,-1,2,2,config.outline);
            dot(3,-1,1,1,'#fff');
        } 
        else if (this.type === 'angelfish') {
            // Outline
            dot(-3,-6,6,12,config.outline);
            dot(-4,-4,8,8,config.outline);
            // Body
            dot(-2,-5,4,10,config.c1);
            dot(-3,-3,6,6,config.c1);
            // Stripes
            dot(0,-5,1,10,config.c3);
            dot(2,-3,1,6,config.c3);
            // Fins
            dot(-1,-7,2,1,config.c2);
            dot(-1,6,2,1,config.c2);
            // Eye
            dot(2,-2,2,2,config.outline);
        }
        else if (this.type === 'clownfish') {
            // Outline
            dot(-5,-3,10,6,config.outline);
            // Body
            dot(-4,-2,8,4,config.c1);
            // White Bands
            dot(-2,-2,2,4,config.c2);
            dot(2,-2,2,4,config.c2);
            // Tail
            dot(-6,-2+sway,2,4,config.outline);
            dot(-6,-1+sway,1,2,config.c1);
            // Eye
            dot(3,-1,1,1,config.outline);
        }
        else if (this.type === 'pufferfish') {
            // Outline (Round)
            dot(-4,-4,8,8,config.outline);
            dot(-5,-3,10,6,config.outline);
            // Body
            dot(-3,-3,6,6,config.c1);
            dot(-4,-2,8,4,config.c1);
            // Spots
            dot(-2,-1,1,1,config.c3);
            dot(0,1,1,1,config.c3);
            dot(-2,2,1,1,config.c3);
            // Eye
            dot(2,-2,2,2,config.outline);
            dot(3,-2,1,1,'#fff');
        }
        else if (this.type === 'koi') {
            // Outline
            dot(-7,-2,14,4,config.outline);
            dot(-6,-3,12,6,config.outline);
            // Body
            dot(-6,-2,12,4,config.c1);
            // Blotches
            dot(-4,-2,3,2,config.c3);
            dot(1,0,3,2,config.c3);
            // Tail
            dot(-8,-2+sway,2,4,config.outline);
            // Eye
            dot(4,-1,1,1,config.outline);
        }
        else {
            // Default Fish style for others
            dot(-4,-2,8,4,config.c1);
            dot(-6,-2+sway,2,4,config.outline);
            dot(2,-1,1,1,config.outline);
        }

        if (this.mouthTimer > 0) {
            let mx = 4, my = 1;
            if (this.type === 'angelfish') { mx = 3; my = 2; }
            if (this.type === 'koi') { mx = 7; my = 0; }
            if (this.type === 'betta') { mx = 3; my = 1; }
            if (this.type === 'pufferfish') { mx = 4; my = 1; }
            dot(mx, my, 2, 2, config.outline);
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
    let b = 255 - (gravelDebris * 1.5); let g = 180 - (gravelDebris * 0.5);
    ctx.fillStyle = `rgb(0, ${g}, ${b})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = gravelColor;
    ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT);
    for (let i = 0; i <= CANVAS_WIDTH; i++) ctx.lineTo(i, GRAVEL_MAP[i]);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.fill();
    
    if (state === 'PLAYING') {
        plants.forEach(p => p.draw());
        foods.forEach(f => f.draw());
        fishes.forEach(f => f.draw());
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
    else if (t.id === 'feed-btn') foods.push(new Food(20 + Math.random() * (CANVAS_WIDTH - 40), 0));
    else if (t.id === 'clean-btn') { gravelDebris = 0; foods = foods.filter(f => !f.settled); }
    else if (t.id === 'add-fish-btn') document.getElementById('add-fish-overlay').classList.remove('hidden');
    else if (t.id === 'add-plant-btn') plants.push(new Plant('seaweed', Math.random() * CANVAS_WIDTH));
    else if (t.id === 'gravel-btn') document.getElementById('gravel-overlay').classList.remove('hidden');
    else if (t.id === 'reset-btn') resetGame();
    
    else if (t.classList.contains('add-fish-option')) {
        fishes.push(new Fish(t.getAttribute('data-fish')));
        document.getElementById('add-fish-overlay').classList.add('hidden');
    } 
    else if (t.id === 'close-add-fish') document.getElementById('add-fish-overlay').classList.add('hidden');
    else if (t.classList.contains('gravel-option')) {
        gravelColor = t.getAttribute('data-color');
        document.getElementById('gravel-overlay').classList.add('hidden');
    }
    else if (t.id === 'close-gravel') document.getElementById('gravel-overlay').classList.add('hidden');

    if (t.tagName === 'BUTTON' && e.cancelable) e.preventDefault();
}

function startGame() {
    fishes = [];
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
    document.getElementById('gravel-overlay').classList.add('hidden');
}

window.addEventListener('resize', resize);
window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('click', handleStart);

resize(); 
requestAnimationFrame(update);
