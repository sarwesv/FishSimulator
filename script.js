/**
 * Fish Simulator
 * Pixel-Perfect 'Pixel Fishing' Simulation with Clipped Patterns
 */

// --- Dynamic Resolution ---
const PIXEL_SCALE = 4; 
let CANVAS_WIDTH = 480 / PIXEL_SCALE;
let CANVAS_HEIGHT = 300 / PIXEL_SCALE;
const FRICTION = 0.98;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    CANVAS_WIDTH = Math.max(100, Math.floor(window.innerWidth / PIXEL_SCALE));
    CANVAS_HEIGHT = Math.max(100, Math.floor(window.innerHeight / PIXEL_SCALE));
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx.imageSmoothingEnabled = false;
    
    GRAVEL_MAP.length = 0;
    for (let i = 0; i <= CANVAS_WIDTH; i++) {
        GRAVEL_MAP[i] = CANVAS_HEIGHT - 15 + Math.sin(i * 0.05) * 4;
    }
}
// Call resize immediately
resize();

const GRAVEL_MAP = [];
const FISH_TYPES = {
    goldfish: { c1: '#ff9900', c2: '#ffcc44', c3: '#cc5500', outline: '#331100', size: 14 },
    angelfish: { c1: '#ffffff', c2: '#ffdd88', c3: '#444444', outline: '#1a1a1a', size: 14 },
    koi: { c1: '#eeeeee', c2: '#ffffff', c3: '#ff4400', outline: '#222222', size: 16 },
    neon: { c1: '#0066ff', c2: '#00ffff', c3: '#ff0044', outline: '#000033', size: 12 },
    betta: { c1: '#cc0022', c2: '#ff3355', c3: '#660000', outline: '#220000', size: 15 },
    guppy: { c1: '#00ffcc', c2: '#ff66ff', c3: '#008866', outline: '#002211', size: 12 },
    pufferfish: { c1: '#ccaa88', c2: '#eeddcc', c3: '#886644', outline: '#443311', size: 12 },
    clownfish: { c1: '#ff6600', c2: '#ffffff', c3: '#000000', outline: '#221100', size: 12 },
    cory: { c1: '#a08860', c2: '#504030', c3: '#706040', outline: '#332211', size: 12, habitat: 'bottom' },
    shrimp: { c1: '#ff4444', c2: '#ffffff', c3: '#aa2222', outline: '#440000', size: 8, habitat: 'bottom' },
    snail: { c1: '#886644', c2: '#ccaa88', c3: '#553311', outline: '#221100', size: 10, habitat: 'bottom' }
};

const PLANT_TYPES = {
    seaweed: { color: '#1e6b1e', height: 40 },
    fern: { color: '#228a44', height: 25 },
    grass: { color: '#3a9d23', height: 15 },
    kelp: { color: '#567d46', height: 60 }
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
        const config = PLANT_TYPES[type] || PLANT_TYPES.seaweed;
        this.x = x;
        this.y = GRAVEL_MAP[Math.floor(x)] || CANVAS_HEIGHT - 10;
        this.height = config.height * (0.8 + Math.random() * 0.4);
        this.offset = Math.random() * 10;
        this.color = config.color;
    }
    draw() {
        ctx.fillStyle = this.color;
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
        // Spawn centered in the tank using latest dimensions
        this.x = CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 40;
        this.y = CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 40;
        if (this.config.habitat === 'bottom') this.y = CANVAS_HEIGHT - 15;
        this.vx = 0; this.vy = 0;
        this.targetX = this.x; this.targetY = this.y;
        this.flip = false;
        this.animTimer = Math.random() * 10;
        this.idleTimer = 0;
        
        if (type === 'koi') {
            this.spots = [];
            for(let i=0; i<4; i++) this.spots.push({x: (Math.random()-0.5)*1.2, y: (Math.random()-0.5)*0.4, w: 2 + Math.random()*2, h: 2 + Math.random()*2});
        }
    }

    update() {
        this.animTimer += 0.15;

        // Boundary Safety Check (use latest dimensions)
        if (this.x < -20 || this.x > CANVAS_WIDTH + 20 || this.y < -20 || this.y > CANVAS_HEIGHT + 20) {
            this.x = CANVAS_WIDTH / 2;
            this.y = CANVAS_HEIGHT / 2;
            this.targetX = this.x;
            this.targetY = this.y;
        }

        if (this.idleTimer > 0) {
            this.idleTimer--;
            this.vx *= 0.94; this.vy *= 0.94;
        } else {
            if (Math.abs(this.x - this.targetX) < 15 && Math.abs(this.y - this.targetY) < 15) {
                if (Math.random() < 0.05) { this.idleTimer = 40 + Math.random() * 80; }
                else {
                    this.targetX = Math.max(20, Math.min(CANVAS_WIDTH - 20, this.x + (Math.random() - 0.5) * 100));
                    this.targetY = this.config.habitat === 'bottom' ? GRAVEL_MAP[Math.floor(this.targetX)] - 4 : Math.max(20, Math.min(CANVAS_HEIGHT - 30, this.y + (Math.random() - 0.5) * 60));
                }
            }
            let dx = this.targetX - this.x; let dy = this.targetY - this.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (d > 1) {
                this.vx += (dx / d) * this.config.speed * 0.02;
                this.vy += (dy / d) * this.config.speed * 0.02;
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

        const dot = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
        };

        const config = this.config;
        const sway = Math.floor(Math.sin(this.animTimer * 1.5) * 1);

        // --- SPRITE RENDERING WITH CLIPPING PROTECTION ---
        
        const drawBodyShape = (outlineOnly = false) => {
            const color = outlineOnly ? config.outline : config.c1;
            if (this.type === 'goldfish') {
                dot(-4, -2, 8, 5, color);
                dot(-3, -3, 6, 7, color);
            } else if (this.type === 'koi' || this.type === 'neon') {
                dot(-6, -2, 12, 4, color);
                dot(-5, -3, 10, 6, color);
            } else if (this.type === 'betta') {
                dot(-4, -1, 8, 2, color);
            } else if (this.type === 'angelfish') {
                dot(-3, -3, 6, 6, color);
                dot(-2, -4, 4, 8, color);
                dot(-1, -5, 2, 10, color);
            } else if (this.type === 'pufferfish' || this.type === 'snail') {
                dot(-3, -3, 6, 6, color);
                dot(-4, -2, 8, 4, color);
            } else if (this.type === 'clownfish') {
                dot(-4, -2, 8, 4, color);
                dot(-3, -3, 6, 6, color);
            } else if (this.type === 'guppy' || this.type === 'cory') {
                dot(-3, -2, 6, 4, color);
                dot(-4, -1, 8, 2, color);
            } else {
                dot(-4, -2, 8, 4, color);
            }
        };

        // 1. Draw Outline (Slightly larger)
        ctx.save();
        ctx.translate(-1, -1);
        drawBodyShape(true);
        ctx.translate(2, 0);
        drawBodyShape(true);
        ctx.translate(-1, 2);
        drawBodyShape(true);
        ctx.translate(0, -2);
        drawBodyShape(true);
        ctx.restore();

        // 2. Draw Base Body & Setup Clipping for Patterns
        ctx.save();
        // Create clipping path from body shape pixels
        // (Simplified for pixel art: draw patterns, then body pixels over them with composite, OR just draw body then patterns)
        drawBodyShape();

        // 3. Draw Patterns (Clipped logically by species drawing order)
        if (this.type === 'goldfish') {
            dot(-3, -3, 6, 1, config.c2); // Highlight
            dot(-3, 2, 6, 1, config.c3);  // Shadow
            dot(-6, -3+sway, 3, 7, config.outline); // Tail outline
            dot(-6,-2+sway, 2, 5, config.c1);       // Tail fill
        } 
        else if (this.type === 'koi') {
            this.spots.forEach(sp => dot(Math.floor(sp.x*10 - 5), Math.floor(sp.y*4 - 2), sp.w, sp.h, config.c3));
            dot(-8, -2+sway, 2, 4, config.outline);
            dot(-8, -1+sway, 1, 2, config.c1);
        }
        else if (this.type === 'betta') {
            dot(-2, -6 + sway/2, 5, 5, config.c2); // Fins
            dot(-2, 1 - sway/2, 5, 5, config.c2);
            dot(-8, -4 + sway, 5, 8, config.c2);
        }
        else if (this.type === 'neon') {
            dot(-5, -1, 8, 1, config.c2); // Stripe
            dot(-7, -2 + sway/2, 2, 4, '#ff0000'); // Tail
        }
        else if (this.type === 'clownfish') {
            dot(-2,-2,2,4,config.c2); // White bands
            dot(2,-2,2,4,config.c2);
            dot(-6,-2+sway,2,4,config.outline);
        }
        else if (this.type === 'pufferfish') {
            dot(-2,-1,1,1,config.c3); // Spots
            dot(0,1,1,1,config.c3);
            dot(-2,2,1,1,config.c3);
        }
        else if (this.type === 'snail') {
            dot(-4, 2, 8, 1, '#ccaa88'); // Foot
        }
        else if (this.type === 'shrimp') {
            dot(-2, 1, 1, 1, '#fff'); // Legs
            dot(1, 1, 1, 1, '#fff');
            dot(4, 0, 2, 1, config.c1);
        }

        // 4. Eye
        if (this.type !== 'snail') {
            dot(this.type === 'angelfish' ? 0 : 3, -1, 2, 2, '#000');
        }

        ctx.restore();
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
    document.getElementById('add-plant-overlay').classList.add('hidden');
    document.getElementById('gravel-overlay').classList.add('hidden');
}

window.addEventListener('resize', resize);
window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('click', handleStart);

resize(); 
requestAnimationFrame(update);
