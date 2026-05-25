/**
 * Fish Simulator
 * Strict 'Pixel Fishing' Style 8-Bit Simulation
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
    goldfish: { color: '#ff9900', secondary: '#ffffff', size: 10, speed: 0.4 },
    neon: { color: '#0000ff', secondary: '#00ffff', size: 10, speed: 0.8 },
    betta: { color: '#ff0044', secondary: '#aa0022', size: 12, speed: 0.2 },
    koi: { color: '#eeeeee', secondary: '#ff4400', size: 14, speed: 0.35 },
    angelfish: { color: '#dddddd', secondary: '#444444', size: 12, speed: 0.3 },
    guppy: { color: '#00ffcc', secondary: '#ff00ff', size: 10, speed: 0.6 },
    cory: { color: '#887755', secondary: '#443322', size: 10, speed: 0.3, habitat: 'bottom' },
    shrimp: { color: '#ff3333', secondary: '#ffffff', size: 8, speed: 0.4, habitat: 'bottom' },
    snail: { color: '#996633', secondary: '#663300', size: 10, speed: 0.1, habitat: 'bottom' }
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
        this.config = FISH_TYPES[type];
        this.x = 20 + Math.random() * (CANVAS_WIDTH - 40);
        this.y = this.config.habitat === 'bottom' ? CANVAS_HEIGHT - 15 : 20 + Math.random() * (CANVAS_HEIGHT - 40);
        this.vx = 0; this.vy = 0;
        this.targetX = this.x; this.targetY = this.y;
        this.flip = false;
        this.animTimer = Math.random() * 10;
        this.idleTimer = 0;
        
        if (type === 'koi') {
            this.spots = [];
            for(let i=0; i<4; i++) this.spots.push({x: Math.random(), y: Math.random()});
        }
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
                    this.targetX = Math.max(20, Math.min(CANVAS_WIDTH - 20, this.x + (Math.random() - 0.5) * 80));
                    this.targetY = this.config.habitat === 'bottom' ? GRAVEL_MAP[Math.floor(this.targetX)] - 4 : Math.max(20, Math.min(CANVAS_HEIGHT - 30, this.y + (Math.random() - 0.5) * 60));
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
            if (this.y < floorY - 8) this.vy += 0.1;
            if (this.y > floorY - 2) { this.y = floorY - 2; this.vy = 0; }
        }

        if (this.vx > 0.05) this.flip = false;
        if (this.vx < -0.05) this.flip = true;

        foods.forEach((f, i) => {
            if (Math.abs(f.x - this.x) < 8 && Math.abs(f.y - this.y) < 4) foods.splice(i, 1);
        });
    }

    draw() {
        ctx.save();
        ctx.translate(Math.floor(this.x), Math.floor(this.y));
        if (this.flip) ctx.scale(-1, 1);

        // Helper to draw a precise 'dot' pixel
        const dot = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(x, y, w, h);
        };

        const c = this.config.color;
        const s = this.config.secondary;
        const sway = Math.floor(Math.sin(this.animTimer * 1.5) * 2);

        // --- 'PIXEL FISHING' STYLE RE-IMPLEMENTATION ---
        
        if (this.type === 'goldfish') {
            // Chunky 8x5 body
            dot(-4, -2, 8, 5, c);
            dot(-3, -3, 6, 1, c); // Top curve
            dot(-3, 3, 6, 1, c);  // Bottom curve
            // Tail
            dot(-6, -3 + sway, 2, 6, s);
            // Eye
            dot(2, -1, 2, 2, '#000');
        } 
        else if (this.type === 'koi') {
            // Long torpedo 12x4 body
            dot(-6, -2, 12, 4, c);
            dot(-5, -3, 10, 1, c);
            dot(-5, 2, 10, 1, c);
            // Patterns
            this.spots.forEach(sp => dot(Math.floor(sp.x*10 - 5), Math.floor(sp.y*3 - 2), 2, 2, s));
            // Tail
            dot(-8, -2 + sway, 2, 4, c);
            // Eye
            dot(4, -1, 1, 1, '#000');
        }
        else if (this.type === 'betta') {
            // Slender body with massive square fins
            dot(-3, -1, 6, 2, c);
            // Dorsal (Top)
            dot(-2, -6 + sway/2, 5, 5, s);
            // Anal (Bottom)
            dot(-2, 1 - sway/2, 5, 5, s);
            // Tail
            dot(-8, -4 + sway, 5, 8, s);
            // Eye
            dot(1, -1, 1, 1, '#000');
        }
        else if (this.type === 'neon') {
            // Skinny 9x2 body
            dot(-5, -1, 10, 2, c);
            dot(-5, -1, 8, 1, s); // Glowing stripe
            // Tail
            dot(-7, -2 + sway/2, 2, 4, '#ff0000');
            // Eye
            dot(3, -1, 1, 1, '#000');
        }
        else if (this.type === 'angelfish') {
            // Diamond 8x12 body
            dot(-1, -6, 2, 12, c);
            dot(-3, -3, 6, 6, c);
            dot(-2, -4, 4, 8, c);
            dot(0, -5, 1, 10, s); // Vertical stripe
            // Tail
            dot(-5, -1 + sway/2, 3, 2, c);
            // Eye
            dot(0, -2, 1, 1, '#000');
        }
        else if (this.type === 'guppy') {
            dot(-2, -1, 4, 2, c);
            dot(-6, -4 + sway, 4, 8, s); // Huge fan tail
            dot(1, -1, 1, 1, '#000');
        }
        else if (this.type === 'cory') {
            dot(-3, -2, 6, 4, c);
            dot(-4, -1, 8, 2, c);
            dot(-5, -1 + sway/2, 2, 2, s); // Tail
            dot(1, 0, 1, 1, '#000');
        }
        else if (this.type === 'shrimp') {
            dot(-4, 0, 8, 1, c);
            dot(3, 0, 2, 1, c);
            dot(-2, 1, 1, 1, '#fff'); // Legs
            dot(1, 1, 1, 1, '#fff');
        }
        else if (this.type === 'snail') {
            dot(-3, -2, 6, 4, c); // Shell
            dot(-4, -1, 8, 2, c);
            dot(-4, 2, 8, 1, '#ccaa88'); // Foot
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
