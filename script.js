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
// Call resize on load and resize
window.addEventListener('resize', resize);

window.addEventListener('DOMContentLoaded', () => {
    resize();
    requestAnimationFrame(update);
});

const GRAVEL_MAP = [];
const FISH_TYPES = {
    goldfish: { c1: '#ff9500', c2: '#ffffff', c3: '#cc4400', outline: '#000000', size: 16, speed: 0.45 },
    angelfish: { c1: '#e0e0e0', c2: '#ffff00', c3: '#111111', outline: '#000000', size: 18, speed: 0.35 },
    discus: { c1: '#ff66aa', c2: '#00ffff', c3: '#440066', outline: '#000000', size: 18, speed: 0.25 },
    koi: { c1: '#ffffff', c2: '#ffcc00', c3: '#cc0000', outline: '#000000', size: 20, speed: 0.3 },
    neon: { c1: '#00ccff', c2: '#ffffff', c3: '#ff0000', outline: '#000000', size: 12, speed: 0.9 },
    danio: { c1: '#eeeeee', c2: '#4444ff', c3: '#ffffff', outline: '#000000', size: 12, speed: 1.2 },
    betta: { c1: '#660088', c2: '#ff0044', c3: '#220033', outline: '#000000', size: 16, speed: 0.2 },
    guppy: { c1: '#999999', c2: '#00ffcc', c3: '#ff66ff', outline: '#000000', size: 14, speed: 0.6 },
    molly: { c1: '#222222', c2: '#ffffff', c3: '#ffcc00', outline: '#000000', size: 15, speed: 0.5 },
    pufferfish: { c1: '#ccaa77', c2: '#eeddcc', c3: '#553311', outline: '#000000', size: 15, speed: 0.25 },
    clownfish: { c1: '#ff6600', c2: '#ffffff', c3: '#000000', outline: '#000000', size: 14, speed: 0.55 },
    bluetang: { c1: '#0044ff', c2: '#ffff00', c3: '#000000', outline: '#000000', size: 16, speed: 0.6 },
    yellowtang: { c1: '#ffff00', c2: '#ffffff', c3: '#44aaff', outline: '#000000', size: 16, speed: 0.5 },
    oscar: { c1: '#443322', c2: '#ff6600', c3: '#221100', outline: '#000000', size: 22, speed: 0.3 },
    platy: { c1: '#ff4400', c2: '#ffcc00', c3: '#000000', outline: '#000000', size: 14, speed: 0.5 },
    coralshrimp: { c1: '#ffffff', c2: '#ff0000', c3: '#ffffff', outline: '#000000', size: 12, speed: 0.35, habitat: 'bottom' },
    cory: { c1: '#887766', c2: '#554433', c3: '#332211', outline: '#000000', size: 15, speed: 0.3, habitat: 'bottom' },
    shrimp: { c1: '#ff4444', c2: '#ffffff', c3: '#aa2222', outline: '#000000', size: 10, speed: 0.4, habitat: 'bottom' },
    snail: { c1: '#886644', c2: '#ccaa88', c3: '#553311', outline: '#000000', size: 12, speed: 0.1, habitat: 'bottom' }
};

const PLANT_TYPES = {
    seaweed: { color: '#1e6b1e', height: 40 },
    fern: { color: '#228a44', height: 25 },
    grass: { color: '#3a9d23', height: 15 },
    kelp: { color: '#567d46', height: 60 },
    anemone: { color: '#ff66aa', height: 20 },
    sword: { color: '#44cc44', height: 35 },
    moss: { color: '#115511', height: 12 },
    hairgrass: { color: '#88dd88', height: 18 },
    floater: { color: '#ff4444', height: 8, habitat: 'floating' }
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
        this.y = (config.habitat === 'floating') ? 10 : (GRAVEL_MAP[Math.floor(x)] || CANVAS_HEIGHT - 10);
        this.height = config.height * (0.8 + Math.random() * 0.4);
        this.offset = Math.random() * 10;
        this.color = config.color;
    }
    draw() {
        ctx.save();
        if (this.type === 'anemone') {
            ctx.translate(Math.floor(this.x), Math.floor(this.y));
            // Fleshy Base
            ctx.fillStyle = '#aa4477';
            ctx.fillRect(-5, -3, 10, 3);
            // Tentacles as Lines
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 10; i++) {
                const angle = (i / 9) * Math.PI - Math.PI; 
                const sway = Math.sin(Date.now() * 0.002 + this.offset + i) * 3;
                const dist = 7 + sway;
                ctx.beginPath();
                ctx.moveTo(0, -2);
                ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist - 2);
                ctx.stroke();
            }
        } else if (this.type === 'sword') {
            ctx.fillStyle = this.color;
            for (let i = -1; i <= 1; i++) {
                const sway = Math.sin(Date.now() * 0.001 + this.offset + i) * 3;
                ctx.beginPath();
                ctx.moveTo(this.x + i * 4, this.y);
                ctx.quadraticCurveTo(this.x + i * 8 + sway, this.y - this.height * 0.5, this.x + i * 2 + sway, this.y - this.height);
                ctx.lineTo(this.x + i * 2 + sway + 4, this.y - this.height);
                ctx.fill();
            }
        } else if (this.type === 'moss') {
            ctx.fillStyle = this.color;
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(this.x - 6 + i * 3, this.y - 4 + Math.sin(i) * 2, 4, 4);
            }
        } else if (this.type === 'hairgrass') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const ox = (i - 3) * 2;
                ctx.beginPath();
                ctx.moveTo(this.x + ox, this.y);
                ctx.lineTo(this.x + ox + Math.sin(Date.now() * 0.003 + i) * 2, this.y - this.height);
                ctx.stroke();
            }
        } else if (this.type === 'floater') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - 4, this.y - 2, 8, 3); // Leaf
            ctx.fillStyle = '#88dd88';
            ctx.fillRect(this.x - 2, this.y - 3, 4, 1);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath(); ctx.moveTo(this.x, this.y + 1); ctx.lineTo(this.x, this.y + 6); ctx.stroke(); // Root
        } else {
            ctx.fillStyle = this.color;
            const segments = 4;
            const sh = this.height / segments;
            for (let i = 0; i < segments; i++) {
                let sway = Math.sin(Date.now() * 0.002 + this.offset + i * 0.8) * 4;
                ctx.fillRect(Math.floor(this.x + sway - 2), Math.floor(this.y - (i + 1) * sh), 4, Math.floor(sh + 1));
            }
        }
        ctx.restore();
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
        
        // --- Instance Specific Colors (Koi Diversity) ---
        this.baseColor = this.config.c1;
        
        // Spawn centered in the tank using latest dimensions
        this.x = CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 40;
        this.y = CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 40;
        if (this.config.habitat === 'bottom') this.y = CANVAS_HEIGHT - 15;
        this.vx = 0; this.vy = 0;
        this.targetX = this.x; this.targetY = this.y;
        this.flip = false;
        this.animTimer = Math.random() * 10;
        this.idleTimer = 0;
        this.mouthTimer = 0;
        
        if (type === 'koi') {
            // Randomize Koi base from a pool of authentic colors
            const basePool = ['#ffffff', '#ffffff', '#ffcc00', '#222222', '#ff9500'];
            this.baseColor = basePool[Math.floor(Math.random() * basePool.length)];
            
            this.spots = [];
            const spotPool = ['#cc0000', '#111111', '#ffffff', '#ff6600'];
            for(let i=0; i<6; i++) {
                this.spots.push({
                    x: (Math.random() - 0.5) * 1.2,
                    y: (Math.random() - 0.5) * 0.5,
                    w: 2 + Math.floor(Math.random() * 5),
                    h: 2 + Math.floor(Math.random() * 4),
                    c: spotPool[Math.floor(Math.random() * spotPool.length)]
                });
            }
        }
    }

    update() {
        this.animTimer += 0.15;
        if (this.mouthTimer > 0) this.mouthTimer--;

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
                    if (this.config.habitat === 'bottom') {
                        const tx = Math.floor(this.targetX);
                        this.targetY = (GRAVEL_MAP[tx] || (CANVAS_HEIGHT - 15)) - 4;
                    } else {
                        this.targetY = Math.max(20, Math.min(CANVAS_HEIGHT - 30, this.y + (Math.random() - 0.5) * 60));
                    }
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
        
        // Final NaN Protection
        if (isNaN(this.vx)) this.vx = 0;
        if (isNaN(this.vy)) this.vy = 0;
        
        this.x += this.vx; this.y += this.vy;
        
        if (this.config.habitat === 'bottom') {
            const ix = Math.floor(this.x);
            const floorY = (GRAVEL_MAP[ix] || (CANVAS_HEIGHT - 10));
            if (this.y < floorY - 8) this.vy += 0.1;
            if (this.y > floorY - 2) { this.y = floorY - 2; this.vy = 0; }
        }

        if (this.vx > 0.05) this.flip = false;
        if (this.vx < -0.05) this.flip = true;

        foods.forEach((f, i) => {
            if (Math.abs(f.x - this.x) < this.config.size/2 && Math.abs(f.y - this.y) < this.config.size/4) {
                foods.splice(i, 1);
                this.mouthTimer = 30;
            }
        });
    }

    draw() {
        ctx.save();
        ctx.translate(Math.floor(this.x), Math.floor(this.y));
        if (this.flip) ctx.scale(-1, 1);

        const config = this.config;
        const p = config.size / 8; // Pixel scale factor
        const sway = Math.floor(Math.sin(this.animTimer * 1.5) * 1) * p;

        const dot = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(Math.floor(x * p), Math.floor(y * p), Math.floor(w * p), Math.floor(h * p));
        };

        // --- SPECIES-SPECIFIC BIOLOGICAL DRAWING ---
        
        if (this.type === 'yellowtang') {
            // Chunky body with thick outlines (Matching Reference)
            dot(-4, -4, 9, 9, config.outline);
            dot(-3, -3, 7, 7, config.c1);
            // Face region
            dot(2, -2, 2, 4, config.c2); // White face
            // Fins (Blue as in reference)
            dot(-2, -5, 4, 1, config.c3); // Dorsal
            dot(-2, 4, 4, 1, config.c3);  // Anal
            dot(-7, -2 + sway/p, 3, 5, config.c3); // Tail
            // Eye
            dot(3, -2, 1, 1, '#000');
        }
        else if (this.type === 'bluetang') {
            dot(-6, -4, 12, 9, config.outline);
            dot(-5, -3, 10, 7, config.c1);
            dot(-3, -2, 6, 4, config.c3); // Black "palette" pattern
            dot(4, 0, 2, 2, config.c2);   // Yellow tail spot
            dot(-8, -2 + sway/p, 3, 5, config.c2); // Yellow Tail
            dot(4, -2, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'discus') {
            dot(-4, -6, 9, 13, config.outline);
            dot(-3, -5, 7, 11, config.c1);
            dot(-1, -4, 2, 9, config.c2); // Bright vertical pattern
            dot(1, -3, 1, 7, config.c3);
            dot(-7, -2 + sway/p, 3, 5, config.outline);
            dot(3, -2, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'danio') {
            dot(-6, -2, 13, 5, config.outline);
            dot(-5, -1, 11, 3, config.c1);
            dot(-5, -1, 11, 1, config.c2); // Blue Stripe
            dot(-5, 1, 11, 1, config.c2);  // Blue Stripe
            dot(-8, -2 + sway/p, 3, 5, config.outline);
            dot(5, -1, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'oscar') {
            dot(-7, -5, 15, 11, config.outline);
            dot(-6, -4, 13, 9, config.c1);
            dot(-2, -3, 4, 6, config.c2); // Orange blotch
            dot(-8, -1, 2, 2, config.c2); // Eye spot on tail
            dot(-10, -3 + sway/p, 4, 7, config.outline);
            dot(5, -2, 2, 2, '#000'); // Eye
        }
        else if (this.type === 'molly') {
            dot(-5, -3, 10, 7, config.outline);
            dot(-4, -2, 8, 5, config.c1);
            dot(-1, -6, 5, 4, config.outline); // Sailfin
            dot(0, -5, 3, 2, config.c2);
            dot(-8, -3 + sway/p, 4, 7, config.outline);
            dot(4, -1, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'clownfish') {
            dot(-5, -3, 10, 7, config.outline);
            dot(-4, -2, 8, 5, config.c1);
            dot(-2, -3, 2, 7, config.outline); dot(-1, -2, 1, 5, config.c2); // Bands
            dot(1, -3, 2, 7, config.outline); dot(2, -2, 1, 5, config.c2);
            dot(-7, -2 + sway/p, 3, 5, config.outline);
            dot(-6, -1 + sway/p, 2, 3, config.c1);
            dot(4, -1, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'angelfish') {
            dot(-2, -6, 5, 13, config.outline);
            dot(-4, -4, 9, 9, config.outline);
            dot(-1, -5, 3, 11, config.c1);
            dot(-3, -3, 7, 7, config.c1);
            dot(0, -5, 1, 11, config.c3); // Stripes
            dot(2, -3, 1, 7, config.c3);
            dot(0, 6, 1, 4, config.c2);   // Ventral
            dot(-6, -2 + sway/p, 3, 5, config.outline);
            dot(3, -2, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'platy') {
            dot(-5, -4, 10, 9, config.outline);
            dot(-4, -3, 8, 7, config.c1);
            dot(-8, -3 + sway/p, 4, 7, config.c3); // Wagtail
            dot(-2, -6, 3, 3, config.c3);
            dot(3, -2, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'coralshrimp') {
            dot(-5, -2, 10, 4, config.outline);
            dot(-4, -1, 2, 2, config.c2); dot(-2, -1, 2, 2, config.c1); dot(0, -1, 2, 2, config.c2);
            dot(4, -3, 1, 4, '#fff'); // Antennae
            dot(1, 2, 3, 1, config.c2); dot(-2, 2, 3, 1, config.c2); // Claws
            dot(4, -2, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'pufferfish') {
            dot(-6, -4, 11, 9, config.outline);
            dot(-5, -3, 9, 7, config.c1);
            dot(-5, 1, 9, 3, config.c2); // Belly
            dot(-3, -2, 2, 2, config.c3); dot(0, -1, 2, 2, config.c3); // Spots
            dot(-1, -6, 2, 2, 'rgba(255,255,255,0.4)');
            dot(-1, 5, 2, 2, 'rgba(255,255,255,0.4)');
            dot(-8, -1, 3, 3, config.outline);
            dot(2, -2, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'neon') {
            dot(-6, -2, 13, 5, config.outline);
            dot(-5, -1, 11, 3, config.c2);
            dot(-5, -1, 11, 1, config.c1); // Blue
            dot(-3, 0, 7, 2, config.c3);   // Red
            dot(-8, -2 + sway/p, 3, 5, config.c3);
            dot(5, -1, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'betta') {
            dot(-5, -2, 10, 4, config.outline);
            dot(-4, -1, 8, 2, config.c1);
            ctx.globalAlpha = 0.8;
            dot(-4, -8 + sway/p, 7, 7, config.c2); // Fins
            dot(-4, 2 - sway/p, 7, 8, config.c2);
            dot(-12, -6 + sway/p*2, 9, 13, config.c2);
            ctx.globalAlpha = 1.0;
            dot(3, -1, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'goldfish') {
            dot(-6, -4, 11, 9, config.outline);
            dot(-5, -3, 9, 7, config.c1);
            dot(-3, -5, 5, 2, config.outline); // Hump
            dot(-9, -6 + sway/p, 5, 13, config.outline); // Tail
            dot(-8, -5 + sway/p, 3, 11, config.c3);
            dot(4, -2, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'koi') {
            dot(-8, -3, 16, 7, config.outline);
            dot(-7, -2, 14, 5, this.baseColor);
            ctx.save();
            ctx.beginPath(); ctx.rect(Math.floor(-7*p), Math.floor(-2*p), Math.floor(14*p), Math.floor(5*p)); ctx.clip();
            this.spots.forEach(sp => dot(sp.x*12, sp.y*5, sp.w, sp.h, sp.c));
            ctx.restore();
            dot(7, 1, 2, 2, config.outline); // Barbels
            dot(-11, -3 + sway/p, 4, 7, config.outline);
            dot(6, -1, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'guppy') {
            dot(-3, -2, 7, 4, config.outline);
            dot(-2, -1, 5, 2, config.c1);
            dot(-11, -5 + sway/p, 9, 11, config.outline); // Tail
            dot(-10, -4 + sway/p, 7, 9, config.c2);
            dot(2, -1, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'cory') {
            dot(-6, -3, 12, 6, config.outline);
            dot(-5, -2, 10, 4, config.c1);
            dot(4, 2, 2, 2, config.outline); // Barbels
            dot(-9, -2 + sway/p, 4, 5, config.outline);
            dot(3, -1, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'shrimp') {
            dot(-5, -2, 10, 4, config.outline);
            dot(-4, -1, 8, 2, 'rgba(255,255,255,0.7)');
            dot(4, -3, 5, 1, '#fff'); // Antennae
            dot(-2, 2, 1, 2, config.outline); dot(1, 2, 1, 2, config.outline);
            dot(3, -2, 1, 1, '#000'); // Eye
        }
        else if (this.type === 'snail') {
            dot(-4, -5, 8, 8, config.outline);
            dot(-3, -4, 6, 6, config.c1);
            dot(-2, -3, 4, 4, config.c3); // Spiral
            dot(-6, 2, 12, 3, config.outline);
            dot(-5, 3, 10, 1, config.c2);
            dot(3, 0, 1, 2, config.outline); dot(5, 0, 1, 2, config.outline); // Stalks
            dot(3, -1, 1, 1, '#000'); dot(5, -1, 1, 1, '#000'); // Eyes
        }

        // --- Common Features ---
        if (this.mouthTimer > 0 && this.type !== 'snail') {
            dot(3, 0, 2, 2, config.outline);
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
    // Background Water (Fully opaque)
    let b = Math.floor(255 - (gravelDebris * 1.5)); 
    let g = Math.floor(180 - (gravelDebris * 0.5));
    ctx.fillStyle = `rgb(0, ${g}, ${b})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Gravel (Pixel-aligned vertical bars to prevent fading)
    ctx.fillStyle = gravelColor;
    for (let i = 0; i < CANVAS_WIDTH; i++) {
        const floorY = Math.floor(GRAVEL_MAP[i]);
        ctx.fillRect(i, floorY, 1, CANVAS_HEIGHT - floorY);
    }
    
    if (state === 'PLAYING') {
        plants.forEach(p => p.draw());
        foods.forEach(f => f.draw());
        fishes.forEach(f => f.draw());
    }
}

// --- Input Handling ---

function handleStart(e) {
    const t = e.target;
    // Prevent double triggering from touch+click
    if (e.type === 'touchstart') e.preventDefault();

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
// Using pointerdown for universal, single-trigger support
window.addEventListener('pointerdown', handleStart);
