/**
 * Fish Simulator
 * Retro HTML5 Canvas Simulation
 */

// --- Constants & Config ---
const CANVAS_WIDTH = 480; 
const CANVAS_HEIGHT = 300;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff9900', shadow: '#cc7700', highlight: '#ffbb33', size: 28, speed: 0.5, turnRate: 0.02 },
    neon: { color: '#4444ff', shadow: '#2222aa', highlight: '#8888ff', size: 20, speed: 0.8, turnRate: 0.03 },
    betta: { color: '#cc0022', shadow: '#880011', highlight: '#ff3355', size: 32, speed: 0.3, turnRate: 0.015 },
    koi: { color: '#f5f5dc', shadow: '#d2d2b4', highlight: '#ffffff', size: 40, speed: 0.4, turnRate: 0.02 } 
};

const PLANT_TYPES = {
    tall: { color: '#228822', height: 80, width: 10, segments: 8 },
    short: { color: '#22aa44', height: 40, width: 15, segments: 4 },
    fern: { color: '#44bb44', height: 60, width: 6, segments: 10 },
    red: { color: '#aa4444', height: 50, width: 8, segments: 6 }
};

// --- Game State ---
let state = 'MENU';
let fishes = [];
let plants = [];
let foods = [];
let bubbles = [];
let gravelDebris = 0;
let selectedFishTypes = new Set();

// Uneven Gravel Heightmap
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
        const config = PLANT_TYPES[type] || PLANT_TYPES.tall;
        this.x = x || Math.random() * CANVAS_WIDTH;
        this.y = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 12;
        this.height = config.height + (Math.random() - 0.5) * 20;
        this.width = config.width + (Math.random() - 0.5) * 4;
        this.segments = config.segments;
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
            let sway = Math.sin(Date.now() * 0.002 + this.offset + i * 0.5) * (i * 3);
            ctx.lineTo(this.x + sway, this.y - (i * (this.height / this.segments)));
        }
        ctx.stroke();
    }
}

class Bubble {
    constructor(x, y, isBig = false) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -Math.random() * 0.6 - 0.2;
        this.size = isBig ? (Math.random() * 6 + 4) : (Math.random() * 3.2 + 1.6);
        this.life = isBig ? 120 : 80;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.life--;
        this.vx += Math.sin(this.life * 0.1) * 0.04;
    }
    draw() {
        ctx.fillStyle = 'rgba(150, 200, 255, 0.2)';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
}

class Food {
    constructor(x, y) {
        this.x = x; this.y = y; this.vy = 0.6;
        this.settled = false; this.life = 400; 
    }
    update() {
        if (!this.settled) {
            this.y += this.vy;
            const floorY = GRAVEL_MAP[Math.floor(this.x)] || CANVAS_HEIGHT - 16;
            if (this.y >= floorY - 4) {
                this.y = floorY - 4; this.settled = true;
                gravelDebris = Math.min(100, gravelDebris + 2);
            }
        } else { this.life--; }
    }
    draw() {
        ctx.fillStyle = '#ccaa00';
        ctx.fillRect(this.x, this.y, 6, 6);
    }
}

class Fish {
    constructor(type) {
        this.type = type;
        this.config = FISH_TYPES[type];
        this.x = CANVAS_WIDTH / 2;
        this.y = CANVAS_HEIGHT / 2;
        this.vx = 0; this.vy = 0;
        this.targetX = this.x; this.targetY = this.y;
        this.flip = false;
        this.bubbleTimer = Math.random() * 200;
        this.animTimer = 0;
        this.idleTimer = 0;
        
        if (type === 'koi') {
            this.pattern = [];
            for(let i=0; i<8; i++) {
                this.pattern.push({
                    x: Math.random() * 30 - 15,
                    y: Math.random() * 10 - 5,
                    r: Math.random() * 6 + 3,
                    c: Math.random() > 0.4 ? '#ff4400' : '#222222'
                });
            }
        }
    }

    update() {
        this.animTimer += 0.08;
        
        if (this.idleTimer > 0) {
            this.idleTimer--;
            this.vx *= 0.95;
            this.vy *= 0.95;
        } else {
            if (Math.abs(this.x - this.targetX) < 40 && Math.abs(this.y - this.targetY) < 40) {
                if (Math.random() < 0.02) {
                    this.idleTimer = 60 + Math.random() * 120;
                } else {
                    const isLongDistance = Math.random() < 0.3;
                    if (isLongDistance) {
                        this.targetX = this.x < CANVAS_WIDTH / 2 ? 
                            (CANVAS_WIDTH - 120) - Math.random() * 80 : 
                            80 + Math.random() * 80;
                        this.targetY = 80 + Math.random() * (CANVAS_HEIGHT - 160);
                        this.currentSpeedBoost = 1.5;
                    } else {
                        this.targetX = Math.max(60, Math.min(CANVAS_WIDTH - 60, this.x + (Math.random() - 0.5) * 160));
                        this.targetY = Math.max(60, Math.min(CANVAS_HEIGHT - 60, this.y + (Math.random() - 0.5) * 120));
                        this.currentSpeedBoost = 1.0;
                    }
                }
            }

            let dx = this.targetX - this.x;
            let dy = this.targetY - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 1) {
                this.vx += (dx / dist) * this.config.speed * this.config.turnRate * (this.currentSpeedBoost || 1.0);
                this.vy += (dy / dist) * this.config.speed * this.config.turnRate * (this.currentSpeedBoost || 1.0);
            }
        }

        this.vx *= FRICTION; this.vy *= FRICTION;
        this.x += this.vx; this.y += this.vy;
        if (this.vx > 0.2) this.flip = false;
        if (this.vx < -0.2) this.flip = true;

        foods.forEach((f, index) => {
            let fdx = f.x - this.x; let fdy = f.y - this.y;
            if (Math.sqrt(fdx * fdx + fdy * fdy) < this.config.size) foods.splice(index, 1);
        });

        this.bubbleTimer--;
        if (this.bubbleTimer <= 0) {
            const count = Math.floor(Math.random() * 2) + 1;
            for(let i=0; i<count; i++) {
                setTimeout(() => {
                    bubbles.push(new Bubble(this.x + (this.flip ? -12 : 12), this.y - 4, true));
                }, i * 300);
            }
            this.bubbleTimer = 300 + Math.random() * 800;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);
        
        const s = this.config.size;
        const speedFactor = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 1.5;
        const tailWobble = Math.sin(this.animTimer) * (4 + speedFactor);
        
        ctx.fillStyle = this.config.color;

        if (this.type === 'goldfish') {
            // Body (Egg shaped)
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.75, 0, 0, Math.PI*2); ctx.fill();
            // Shadow & Highlight
            ctx.fillStyle = this.config.shadow;
            ctx.beginPath(); ctx.ellipse(0, s*0.2, s*0.8, s*0.4, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = this.config.highlight;
            ctx.beginPath(); ctx.ellipse(0, -s*0.2, s*0.6, s*0.2, 0, 0, Math.PI*2); ctx.fill();
            
            // Fins
            ctx.fillStyle = this.config.color;
            // Dorsal
            ctx.beginPath(); ctx.moveTo(-s*0.2, -s*0.6); ctx.quadraticCurveTo(-s*0.8, -s*1.2, -s, -s*0.4); ctx.fill();
            // Pectoral
            ctx.beginPath(); ctx.ellipse(s*0.2, s*0.3, s*0.4, s*0.2, 0.5, 0, Math.PI*2); ctx.fill();
            
            // Tail (Flowing double tail look)
            ctx.beginPath();
            ctx.moveTo(-s+6, 0);
            ctx.bezierCurveTo(-s-12, -s*1.2 + tailWobble, -s-28, -s*0.8, -s-20, 0);
            ctx.bezierCurveTo(-s-28, s*0.8 - tailWobble, -s-12, s*1.2, -s+6, 0);
            ctx.fill();
        } 
        else if (this.type === 'neon') {
            // Body (Sleek)
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.3, 0, 0, Math.PI*2); ctx.fill();
            // Shadow
            ctx.fillStyle = this.config.shadow;
            ctx.beginPath(); ctx.ellipse(0, s*0.15, s, s*0.1, 0, 0, Math.PI*2); ctx.fill();
            
            // Neon Stripe (Cyan Glow)
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(-s*0.6, -2, s*1.2, 4);
            // Lower Body Red
            ctx.fillStyle = '#ff2222';
            ctx.beginPath(); ctx.ellipse(-s*0.2, s*0.1, s*0.6, s*0.15, 0, 0, Math.PI*2); ctx.fill();
            
            // Tail
            ctx.fillStyle = '#ff3333';
            ctx.beginPath(); ctx.moveTo(-s+2, 0); ctx.lineTo(-s-12, -s*0.6 + tailWobble/2); ctx.lineTo(-s-12, s*0.6 - tailWobble/2); ctx.fill();
            // Tiny Fins
            ctx.beginPath(); ctx.moveTo(0, -s*0.3); ctx.lineTo(-s*0.4, -s*0.6); ctx.lineTo(-s*0.2, -s*0.3); ctx.fill();
        }
        else if (this.type === 'betta') {
            // Body (Tapered)
            ctx.beginPath();
            ctx.moveTo(s*0.6, 0);
            ctx.quadraticCurveTo(0, -s*0.4, -s*0.8, 0);
            ctx.quadraticCurveTo(0, s*0.4, s*0.6, 0);
            ctx.fill();
            
            // Flowing Drapery Fins
            ctx.fillStyle = this.config.shadow;
            // Dorsal
            ctx.beginPath(); ctx.moveTo(0, -s*0.2); ctx.bezierCurveTo(-s, -s*2 + tailWobble, -s*2, -s, -s*0.8, -s*0.2); ctx.fill();
            // Anal
            ctx.beginPath(); ctx.moveTo(0, s*0.2); ctx.bezierCurveTo(-s, s*2 - tailWobble, -s*2, s, -s*0.8, s*0.2); ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.moveTo(-s*0.8, 0);
            ctx.bezierCurveTo(-s*3, -s*1.5 + tailWobble, -s*3, s*1.5 - tailWobble, -s*0.8, 0);
            ctx.fill();
            
            // Pectoral (Side)
            ctx.fillStyle = this.config.highlight;
            ctx.beginPath(); ctx.ellipse(s*0.2, 0, s*0.5, s*0.2, 0.2, 0, Math.PI*2); ctx.fill();
        }
        else if (this.type === 'koi') {
            // Body (Longer Torpedo)
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.35, 0, 0, Math.PI*2); ctx.fill();
            // Shadow & Highlight
            ctx.fillStyle = this.config.shadow;
            ctx.beginPath(); ctx.ellipse(0, s*0.15, s, s*0.15, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = this.config.highlight;
            ctx.beginPath(); ctx.ellipse(0, -s*0.15, s*0.6, s*0.1, 0, 0, Math.PI*2); ctx.fill();

            // Pattern Spots
            this.pattern.forEach(p => {
                ctx.fillStyle = p.c;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
            });
            
            // Fins
            ctx.fillStyle = this.config.color;
            // Pectoral Fins (Wide)
            ctx.beginPath(); ctx.ellipse(s*0.2, s*0.3, s*0.5, s*0.2, 0.4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(s*0.2, -s*0.3, s*0.5, s*0.2, -0.4, 0, Math.PI*2); ctx.fill();
            // Tail
            ctx.beginPath(); ctx.moveTo(-s+6, 0); ctx.lineTo(-s-14, -s*0.7 + tailWobble); ctx.lineTo(-s-14, s*0.7 - tailWobble); ctx.fill();
            
            // Barbels (Whiskers)
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(s-4, 2); ctx.quadraticCurveTo(s+8, 8, s+4, 12); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(s-4, -2); ctx.quadraticCurveTo(s+8, -8, s+4, -12); ctx.stroke();
        }

        // Eye Detail
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s*0.6, -2, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(s*0.65, -2, 2.5, 0, Math.PI*2); ctx.fill();
        
        // Gill Plate
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s*0.3, 0, s*0.3, -Math.PI/2, Math.PI/2); ctx.stroke();

        ctx.restore();
    }
}

// --- Main Loop ---

function update() {
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
    let blue = 255 - (gravelDebris * 1.2);
    let green = 200 - (gravelDebris * 0.4);
    ctx.fillStyle = `rgb(0, ${green}, ${blue})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Gravel - Uneven
    ctx.fillStyle = '#887766';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    for (let i = 0; i <= CANVAS_WIDTH; i++) {
        ctx.lineTo(i, GRAVEL_MAP[i]);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fill();
    
    if (gravelDebris > 0) {
        ctx.fillStyle = `rgba(50, 40, 0, ${gravelDebris/100})`;
        for(let i=0; i<gravelDebris; i++) {
            let dx = Math.floor(((Math.sin(i * 13) + 1) / 2) * CANVAS_WIDTH);
            let dy = GRAVEL_MAP[dx] + Math.cos(i * 7) * 4;
            ctx.fillRect(dx, dy, 6, 6);
        }
    }

    if (state === 'PLAYING') {
        plants.forEach(p => p.draw());
        bubbles.forEach(b => b.draw());
        foods.forEach(f => f.draw());
        fishes.forEach(f => f.draw());
    }
}

// --- Input Handling ---

function handleStart(e) {
    const target = e.target;
    
    // Initial Selection
    if (target.classList.contains('selection-btn')) {
        const type = target.getAttribute('data-fish');
        if (selectedFishTypes.has(type)) {
            selectedFishTypes.delete(type);
            target.classList.remove('selected');
        } else {
            selectedFishTypes.add(type);
            target.classList.add('selected');
        }
        
        const startBtn = document.getElementById('start-btn');
        if (selectedFishTypes.size > 0) {
            startBtn.classList.remove('hidden');
        } else {
            startBtn.classList.add('hidden');
        }
    } 
    else if (target.id === 'start-btn') {
        startGame();
    }
    
    // Mid-game UI
    else if (target.id === 'feed-btn') {
        foods.push(new Food(40 + Math.random() * (CANVAS_WIDTH - 80), 0));
    } else if (target.id === 'clean-btn') {
        gravelDebris = 0;
        foods = foods.filter(f => !f.settled);
    } else if (target.id === 'add-fish-btn') {
        document.getElementById('add-fish-overlay').classList.remove('hidden');
    } else if (target.id === 'add-plant-btn') {
        document.getElementById('add-plant-overlay').classList.remove('hidden');
    } else if (target.id === 'reset-btn') {
        resetGame();
    }
    
    // Add Fish Overlay
    else if (target.classList.contains('add-fish-option')) {
        fishes.push(new Fish(target.getAttribute('data-fish')));
        document.getElementById('add-fish-overlay').classList.add('hidden');
    } else if (target.id === 'close-add-fish') {
        document.getElementById('add-fish-overlay').classList.add('hidden');
    }

    // Add Plant Overlay
    else if (target.classList.contains('add-plant-option')) {
        plants.push(new Plant(target.getAttribute('data-plant'), Math.random() * CANVAS_WIDTH));
        document.getElementById('add-plant-overlay').classList.add('hidden');
    } else if (target.id === 'close-add-plant') {
        document.getElementById('add-plant-overlay').classList.add('hidden');
    }

    if (e.cancelable && target.tagName === 'BUTTON') e.preventDefault();
}

function startGame() {
    selectedFishTypes.forEach(type => {
        fishes.push(new Fish(type));
    });
    state = 'PLAYING';
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

function resetGame() {
    state = 'MENU';
    fishes = []; plants = []; foods = []; bubbles = []; gravelDebris = 0;
    selectedFishTypes.clear();
    
    // Reset UI
    document.querySelectorAll('.selection-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('add-fish-overlay').classList.add('hidden');
    document.getElementById('add-plant-overlay').classList.add('hidden');
}

window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('mousedown', handleStart);
requestAnimationFrame(update);
