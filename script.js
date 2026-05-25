/**
 * Fish Simulator
 * Authentic 8-Bit Retro Sprite Simulation
 */

// --- Constants & Config ---
const CANVAS_WIDTH = 320; // Slightly lower for 8-bit feel
const CANVAS_HEIGHT = 200;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff9900', pattern: '#ffffff', size: 16, speed: 0.4 },
    neon: { color: '#0000ff', pattern: '#00ffff', size: 12, speed: 0.8 },
    betta: { color: '#ff0044', pattern: '#aa0022', size: 18, speed: 0.2 },
    koi: { color: '#eeeeee', pattern: '#ff4400', size: 24, speed: 0.35 },
    angelfish: { color: '#dddddd', pattern: '#444444', size: 20, speed: 0.3 },
    guppy: { color: '#00ffcc', pattern: '#ff00ff', size: 14, speed: 0.6 },
    cory: { color: '#887755', pattern: '#443322', size: 16, speed: 0.3, habitat: 'bottom' },
    shrimp: { color: '#ff3333', pattern: '#ffffff', size: 10, speed: 0.4, habitat: 'bottom' },
    snail: { color: '#996633', pattern: '#663300', size: 12, speed: 0.1, habitat: 'bottom' }
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
    GRAVEL_MAP[i] = CANVAS_HEIGHT - 15 + Math.sin(i * 0.05) * 4;
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// --- Entities ---

class Plant {
    constructor(type, x) {
        this.type = type;
        this.x = x;
        this.y = GRAVEL_MAP[Math.floor(x)] || CANVAS_HEIGHT - 10;
        this.height = 30 + Math.random() * 30;
        this.offset = Math.random() * 10;
    }
    draw() {
        ctx.fillStyle = '#228822';
        const segments = 4;
        const sh = this.height / segments;
        for (let i = 0; i < segments; i++) {
            let sway = Math.sin(Date.now() * 0.002 + this.offset + i * 0.8) * 6;
            ctx.fillRect(this.x + sway - 3, this.y - (i + 1) * sh, 6, sh + 1);
        }
    }
}

class Food {
    constructor(x, y) {
        this.x = x; this.y = y; this.vy = 1.0;
        this.settled = false; this.life = 300; 
    }
    update() {
        if (!this.settled) {
            this.y += this.vy;
            const floorY = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 10;
            if (this.y >= floorY - 3) { this.y = floorY - 3; this.settled = true; gravelDebris = Math.min(50, gravelDebris + 2); }
        } else { this.life--; }
    }
    draw() { ctx.fillStyle = '#ffff00'; ctx.fillRect(this.x - 2, this.y - 2, 4, 4); }
}

class Fish {
    constructor(type) {
        this.type = type;
        this.config = FISH_TYPES[type];
        this.x = 40 + Math.random() * (CANVAS_WIDTH - 80);
        this.y = this.config.habitat === 'bottom' ? CANVAS_HEIGHT - 20 : 40 + Math.random() * (CANVAS_HEIGHT - 80);
        this.vx = 0; this.vy = 0;
        this.targetX = this.x; this.targetY = this.y;
        this.flip = false;
        this.animTimer = Math.random() * 10;
        this.idleTimer = 0;
        
        if (type === 'koi') {
            this.spots = [];
            for(let i=0; i<3; i++) this.spots.push({x: (Math.random()-0.5)*1.2, y: (Math.random()-0.5)*0.4});
        }
    }

    update() {
        this.animTimer += 0.15;
        if (this.idleTimer > 0) {
            this.idleTimer--;
            this.vx *= 0.94; this.vy *= 0.94;
        } else {
            if (Math.abs(this.x - this.targetX) < 20 && Math.abs(this.y - this.targetY) < 20) {
                if (Math.random() < 0.05) { this.idleTimer = 40 + Math.random() * 80; }
                else {
                    this.targetX = Math.max(30, Math.min(CANVAS_WIDTH - 30, this.x + (Math.random() - 0.5) * 120));
                    this.targetY = this.config.habitat === 'bottom' ? GRAVEL_MAP[Math.floor(this.targetX)] - 5 : Math.max(30, Math.min(CANVAS_HEIGHT - 50, this.y + (Math.random() - 0.5) * 80));
                }
            }
            let dx = this.targetX - this.x; let dy = this.targetY - this.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (d > 1) {
                this.vx += (dx / d) * this.config.speed * 0.03;
                this.vy += (dy / d) * this.config.speed * 0.03;
            }
        }
        this.vx *= FRICTION; this.vy *= FRICTION;
        this.x += this.vx; this.y += this.vy;
        
        if (this.config.habitat === 'bottom') {
            const floorY = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 10;
            if (this.y < floorY - 10) this.vy += 0.1;
            if (this.y > floorY - 3) { this.y = floorY - 3; this.vy = 0; }
        }

        if (this.vx > 0.1) this.flip = false;
        if (this.vx < -0.1) this.flip = true;

        foods.forEach((f, i) => {
            if (Math.abs(f.x - this.x) < this.config.size && Math.abs(f.y - this.y) < this.config.size/2) foods.splice(i, 1);
        });
    }

    draw() {
        const s = this.config.size;
        const p = s / 8; // 8-bit pixel unit
        const sway = Math.floor(Math.sin(this.animTimer * 1.5) * 2) * p;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);

        const dot = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(Math.floor(x * p), Math.floor(y * p), Math.floor(w * p), Math.floor(h * p));
        };

        const c = this.config.color;
        const pt = this.config.pattern;

        if (this.type === 'goldfish') {
            dot(-4, -3, 8, 6, c); // Body
            dot(-6, -4 + sway/p, 3, 8, pt); // Tail
            dot(4, -1, 2, 3, c); // Nose
        } 
        else if (this.type === 'koi') {
            dot(-8, -2, 16, 4, c); // Body
            this.spots.forEach(s => dot(s.x*8, s.y*8, 3, 2, pt)); // Spots
            dot(-11, -3 + sway/p, 3, 6, c); // Tail
        }
        else if (this.type === 'betta') {
            dot(-3, -1, 6, 2, c); // Body
            dot(-2, -6 + sway/p*0.5, 4, 5, pt); // Fins
            dot(-2, 1 - sway/p*0.5, 4, 5, pt);
            dot(-9, -4 + sway/p, 6, 8, pt); // Tail
        }
        else if (this.type === 'neon') {
            dot(-6, -1, 12, 2, c); // Body
            dot(-6, 0, 10, 1, pt); // Stripe
            dot(-8, -2 + sway/p*0.5, 2, 4, '#ff0000'); // Tail
        }
        else if (this.type === 'angelfish') {
            dot(-1, -6, 2, 12, c); // Body
            dot(-3, -3, 6, 6, c);
            dot(0, -4, 1, 8, pt); // Stripe
            dot(-6, -1, 4, 2, c); // Tail
        }
        else if (this.type === 'guppy') {
            dot(-2, -1, 5, 2, c);
            dot(-7, -4 + sway/p, 5, 8, pt); // Fan tail
        }
        else if (this.type === 'cory') {
            dot(-4, -2, 8, 4, c);
            dot(-7, -1 + sway/p*0.5, 3, 2, pt);
        }
        else if (this.type === 'shrimp') {
            dot(-4, 0, 8, 2, c);
            dot(4, 0, 2, 1, c);
            dot(-2, 2, 1, 2, '#fff'); // Legs
            dot(2, 2, 1, 2, '#fff');
        }
        else if (this.type === 'snail') {
            dot(-5, 1, 10, 2, '#ccaa88'); // Foot
            dot(-4, -3, 8, 4, c); // Shell
        }

        // 8-bit Eye
        if (this.type !== 'snail') {
            dot(this.type === 'angelfish' ? 0 : 4, -2, 2, 2, '#000');
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
    
    // Gravel
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

// --- Input ---

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
    fishes = []; // Ensure array is empty
    if (selectedFishTypes.size > 0) {
        selectedFishTypes.forEach(type => {
            fishes.push(new Fish(type));
        });
    }
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

window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('click', handleStart);
requestAnimationFrame(update);
