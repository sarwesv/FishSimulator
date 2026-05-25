/**
 * Fish Simulator
 * High-Quality 16-Bit Blocky Sprite Simulation
 */

// --- Constants & Config ---
const CANVAS_WIDTH = 480; 
const CANVAS_HEIGHT = 300;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff7700', pattern: '#ffaa33', shadow: '#cc5500', size: 24, speed: 0.45 },
    neon: { color: '#0022ff', pattern: '#00ffff', shadow: '#0011aa', size: 16, speed: 0.85 },
    betta: { color: '#cc0022', pattern: '#ff3355', shadow: '#880011', size: 26, speed: 0.25 },
    koi: { color: '#fcfcf0', pattern: '#ff4400', shadow: '#d0d0b0', size: 36, speed: 0.4 },
    angelfish: { color: '#e0e0e0', pattern: '#444444', shadow: '#aaaaaa', size: 30, speed: 0.35 },
    guppy: { color: '#00ffcc', pattern: '#ff66ff', shadow: '#008866', size: 18, speed: 0.7 },
    cory: { color: '#a08860', pattern: '#504030', shadow: '#706040', size: 22, speed: 0.3, habitat: 'bottom' },
    shrimp: { color: '#ff4444', pattern: '#ffffff', shadow: '#aa2222', size: 14, speed: 0.4, habitat: 'bottom' },
    snail: { color: '#886644', pattern: '#ccaa88', shadow: '#553311', size: 20, speed: 0.1, habitat: 'bottom' }
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
        this.x = x;
        this.y = GRAVEL_MAP[Math.floor(x)] || CANVAS_HEIGHT - 12;
        this.height = 40 + Math.random() * 60;
        this.offset = Math.random() * 10;
        this.color = Math.random() > 0.5 ? '#1e6b1e' : '#228a44';
    }
    draw() {
        ctx.fillStyle = this.color;
        const segments = 5;
        const segmentHeight = this.height / segments;
        for (let i = 0; i < segments; i++) {
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
            for(let i=0; i<4; i++) {
                this.blotches.push({ 
                    x: (Math.random()-0.5)*1.2, y: (Math.random()-0.5)*0.4, 
                    w: 0.2 + Math.random()*0.3, h: 0.15 + Math.random()*0.2
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
        
        if (this.config.habitat === 'bottom') {
            const floorY = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 15;
            if (this.y < floorY - 15) this.vy += 0.05;
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
        const px = s / 8; // Local pixel unit
        const sway = Math.sin(this.animTimer) * px * 2;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);

        // Helper to draw a "pixel block"
        const dot = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(x * px, y * px, w * px, h * px);
        };

        const c = this.uniqueColor;
        const p = this.uniquePattern;
        const sh = this.uniqueShadow;

        if (this.type === 'goldfish') {
            // Body
            dot(-4, -4, 8, 8, c);
            dot(-2, 4, 4, 1, sh); // Belly shadow
            dot(0, -5, 4, 1, p);  // Dorsal base
            // Face
            dot(4, -2, 2, 4, c);
            dot(6, 0, 1, 2, c);
            // Tail
            dot(-6, -5 + sway/px, 2, 10, p);
            dot(-8, -6 + sway/px, 2, 12, p);
            // Eye
            dot(3, -2, 2, 2, '#fff');
            dot(4, -2, 1, 1, '#000');
        } 
        else if (this.type === 'koi') {
            // Body
            dot(-8, -2, 16, 4, c);
            dot(-6, 2, 12, 1, sh);
            // Patterns
            this.blotches.forEach(b => {
                dot(b.x*8, b.y*8, b.w*8, b.h*8, b.c);
            });
            // Head
            dot(8, -1, 2, 2, c);
            // Tail
            dot(-10, -3 + sway/px, 2, 6, c);
            dot(-12, -4 + sway/px, 2, 8, c);
            // Eye
            dot(7, -1, 1, 1, '#000');
        }
        else if (this.type === 'betta') {
            // Body
            dot(-4, -1, 8, 2, c);
            // Huge Fins
            dot(-2, -6 + sway/px*0.5, 4, 5, p); // Top
            dot(-2, 1 - sway/px*0.5, 4, 5, p);  // Bottom
            dot(-10, -5 + sway/px, 6, 10, p);   // Tail
            // Eye
            dot(3, -1, 1, 1, '#000');
        }
        else if (this.type === 'neon') {
            dot(-6, -1, 12, 2, c);
            dot(-6, 0, 10, 1, p); // Glowing line
            dot(-1, 1, 5, 1, '#ff3333'); // Red belly
            // Tail
            dot(-8, -2 + sway/px*0.5, 2, 4, '#ff3333');
            // Eye
            dot(5, -1, 1, 1, '#000');
        }
        else if (this.type === 'angelfish') {
            dot(-2, -6, 4, 12, c); // Tall body
            dot(-3, -3, 6, 6, c);  // Middle
            dot(0, -4, 1, 8, p);   // Stripe
            // Tail
            dot(-5, -1 + sway/px*0.3, 3, 2, c);
            // Eye
            dot(1, -2, 1, 1, '#000');
        }
        else if (this.type === 'guppy') {
            dot(-2, -1, 6, 2, c);
            dot(-8, -4 + sway/px, 6, 8, p); // Huge fan tail
            dot(3, -1, 1, 1, '#000');
        }
        else if (this.type === 'cory') {
            dot(-4, -2, 8, 4, c);
            dot(0, -3, 4, 1, sh);
            dot(-6, -1 + sway/px*0.5, 2, 2, p); // Tail
            dot(3, 0, 1, 1, '#000');
        }
        else if (this.type === 'shrimp') {
            dot(-4, 0, 8, 2, c);
            dot(-2, 2, 1, 2, '#fff'); // Legs
            dot(1, 2, 1, 2, '#fff');
            dot(4, 0, 2, 1, c); // Head
        }
        else if (this.type === 'snail') {
            dot(-5, 2, 10, 2, '#ccaa88'); // Foot
            dot(-4, -2, 8, 4, c); // Shell
            dot(4, 1, 2, 1, '#ccaa88'); // Head
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
    ctx.fillStyle = gravelColor;
    ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT);
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
