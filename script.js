/**
 * Fish Simulator
 * Retro HTML5 Canvas Simulation
 */

// --- Constants & Config ---
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 125;
const GRAVITY = 0.05;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff9900', size: 10, speed: 0.5 },
    neon: { color: '#00ffff', size: 6, speed: 0.8 },
    betta: { color: '#ff0055', size: 12, speed: 0.3 },
    koi: { color: '#ffffff', size: 14, speed: 0.4 } // Procedural pattern handled in draw
};

// --- Game State ---
let state = 'MENU';
let selectedFishType = null;
let fish = null;
let foods = [];
let bubbles = [];
let gravelDebris = 0; // 0 to 100
let lastTime = 0;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// --- Entities ---

class Bubble {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = -Math.random() * 0.5 - 0.2;
        this.size = Math.random() * 2 + 1;
        this.life = 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.stroke();
    }
}

class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = 0.2;
        this.settled = false;
        this.life = 500; // How long it stays on the bottom before becoming debris
    }

    update() {
        if (!this.settled) {
            this.y += this.vy;
            if (this.y >= CANVAS_HEIGHT - 5) {
                this.y = CANVAS_HEIGHT - 5;
                this.settled = true;
                gravelDebris = Math.min(100, gravelDebris + 2);
            }
        } else {
            this.life--;
        }
    }

    draw() {
        ctx.fillStyle = '#ccaa00';
        ctx.fillRect(this.x, this.y, 2, 2);
    }
}

class Fish {
    constructor(type) {
        this.type = type;
        this.config = FISH_TYPES[type];
        this.x = CANVAS_WIDTH / 2;
        this.y = CANVAS_HEIGHT / 2;
        this.vx = 0;
        this.vy = 0;
        this.targetX = this.x;
        this.targetY = this.y;
        this.flip = false;
        this.bubbleTimer = 0;
        
        // Koi procedural pattern
        if (type === 'koi') {
            this.pattern = [];
            for(let i=0; i<5; i++) {
                this.pattern.push({
                    x: Math.random() * 10 - 5,
                    y: Math.random() * 4 - 2,
                    r: Math.random() * 3 + 1,
                    c: Math.random() > 0.5 ? '#ff4400' : '#000000'
                });
            }
        }
    }

    update() {
        // AI: Choose new target occasionally
        if (Math.abs(this.x - this.targetX) < 5 && Math.abs(this.y - this.targetY) < 5) {
            this.targetX = 20 + Math.random() * (CANVAS_WIDTH - 40);
            this.targetY = 20 + Math.random() * (CANVAS_HEIGHT - 40);
        }

        // Move towards target
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 1) {
            this.vx += (dx / dist) * this.config.speed * 0.05;
            this.vy += (dy / dist) * this.config.speed * 0.05;
        }

        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.x += this.vx;
        this.y += this.vy;

        // Facing direction
        if (this.vx > 0.01) this.flip = false;
        if (this.vx < -0.01) this.flip = true;

        // Interaction: Eat food
        foods.forEach((f, index) => {
            let fdx = f.x - this.x;
            let fdy = f.y - this.y;
            let fdist = Math.sqrt(fdx * fdx + fdy * fdy);
            if (fdist < this.config.size) {
                foods.splice(index, 1);
                // Fish "invincible" - eating just for fun/interaction
            }
        });

        // Bubble blowing
        this.bubbleTimer++;
        if (this.bubbleTimer > 100 + Math.random() * 200) {
            bubbles.push(new Bubble(this.x + (this.flip ? -5 : 5), this.y));
            this.bubbleTimer = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);

        const size = this.config.size;
        
        // Draw body
        ctx.fillStyle = this.config.color;
        
        if (this.type === 'betta') {
            // Fancy fins for Betta
            ctx.beginPath();
            ctx.ellipse(0, 0, size, size/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#aa0033';
            ctx.beginPath();
            ctx.moveTo(-size/2, -size/2);
            ctx.quadraticCurveTo(-size, -size, -size*1.5, 0);
            ctx.quadraticCurveTo(-size, size, -size/2, size/2);
            ctx.fill();
        } else if (this.type === 'koi') {
            // Long body for Koi
            ctx.beginPath();
            ctx.ellipse(0, 0, size, size/3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Pattern
            this.pattern.forEach(p => {
                ctx.fillStyle = p.c;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
        } else {
            // Standard fish shape
            ctx.beginPath();
            ctx.ellipse(0, 0, size, size/2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.moveTo(-size + 2, 0);
            ctx.lineTo(-size - 4, -size/2);
            ctx.lineTo(-size - 4, size/2);
            ctx.closePath();
            ctx.fill();
        }

        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(size/2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(size/2 + 0.5, -1.5, 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// --- Main Loop ---

function update(time) {
    if (state === 'PLAYING') {
        fish.update();
        
        foods.forEach((f, i) => {
            f.update();
            if (f.life <= 0) foods.splice(i, 1);
        });

        bubbles.forEach((b, i) => {
            b.update();
            if (b.life <= 0) bubbles.splice(i, 1);
        });
    }
    
    draw();
    requestAnimationFrame(update);
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background (Tank)
    // Water color shifts based on debris
    let blue = 255 - (gravelDebris * 1.5);
    let green = 200 - (gravelDebris * 0.5);
    ctx.fillStyle = `rgb(0, ${green}, ${blue})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Gravel
    ctx.fillStyle = '#887766';
    ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
    
    // Debris visual
    if (gravelDebris > 0) {
        ctx.fillStyle = `rgba(50, 40, 0, ${gravelDebris/100})`;
        for(let i=0; i<gravelDebris; i++) {
            ctx.fillRect(Math.sin(i) * CANVAS_WIDTH, CANVAS_HEIGHT - 12 + Math.cos(i)*2, 2, 2);
        }
    }

    if (state === 'PLAYING') {
        bubbles.forEach(b => b.draw());
        foods.forEach(f => f.draw());
        fish.draw();

        // Sunlight rays (aesthetic)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(40, 0); ctx.lineTo(60, 0); ctx.lineTo(40, 125); ctx.lineTo(20, 125); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(120, 0); ctx.lineTo(150, 0); ctx.lineTo(130, 125); ctx.lineTo(100, 125); ctx.fill();
    }
}

// --- Input Handling ---

function handleStart(e) {
    if (e.target.classList.contains('menu-btn')) {
        const type = e.target.getAttribute('data-fish');
        startGame(type);
    } else if (e.target.id === 'feed-btn') {
        foods.push(new Food(20 + Math.random() * (CANVAS_WIDTH - 40), 0));
    } else if (e.target.id === 'clean-btn') {
        gravelDebris = 0;
        foods = foods.filter(f => !f.settled);
    } else if (e.target.id === 'reset-btn') {
        resetGame();
    }
    
    // Prevent mobile zoom/scroll
    if (e.cancelable) e.preventDefault();
}

function startGame(type) {
    selectedFishType = type;
    fish = new Fish(type);
    state = 'PLAYING';
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

function resetGame() {
    state = 'MENU';
    fish = null;
    foods = [];
    bubbles = [];
    gravelDebris = 0;
    document.getElementById('menu-overlay').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
}

// Mobile-first event listeners
window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('mousedown', handleStart);

// Start the loop
requestAnimationFrame(update);
