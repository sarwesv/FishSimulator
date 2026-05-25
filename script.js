/**
 * Fish Simulator
 * Retro HTML5 Canvas Simulation
 */

// --- Constants & Config ---
// Increased resolution for better definition while keeping pixel style
const CANVAS_WIDTH = 240; 
const CANVAS_HEIGHT = 150;
const FRICTION = 0.98;

const FISH_TYPES = {
    goldfish: { color: '#ff9900', size: 14, speed: 0.5, turnRate: 0.02 },
    neon: { color: '#4444ff', size: 10, speed: 0.8, turnRate: 0.03 },
    betta: { color: '#cc0022', size: 18, speed: 0.3, turnRate: 0.015 },
    koi: { color: '#f5f5dc', size: 20, speed: 0.4, turnRate: 0.02 } 
};

// --- Game State ---
let state = 'MENU';
let fish = null;
let foods = [];
let bubbles = [];
let gravelDebris = 0;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// --- Entities ---

class Bubble {
    constructor(x, y, isBig = false) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = -Math.random() * 0.3 - 0.1;
        this.size = isBig ? (Math.random() * 3 + 2) : (Math.random() * 1.6 + 0.8);
        this.life = isBig ? 120 : 80;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.life--;
        this.vx += Math.sin(this.life * 0.1) * 0.02;
    }
    draw() {
        ctx.fillStyle = 'rgba(150, 200, 255, 0.2)';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
}

class Food {
    constructor(x, y) {
        this.x = x; this.y = y; this.vy = 0.3;
        this.settled = false; this.life = 400; 
    }
    update() {
        if (!this.settled) {
            this.y += this.vy;
            if (this.y >= CANVAS_HEIGHT - 8) {
                this.y = CANVAS_HEIGHT - 8; this.settled = true;
                gravelDebris = Math.min(100, gravelDebris + 2);
            }
        } else { this.life--; }
    }
    draw() {
        ctx.fillStyle = '#ccaa00';
        ctx.fillRect(this.x, this.y, 3, 3);
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
            for(let i=0; i<6; i++) {
                this.pattern.push({
                    x: Math.random() * 16 - 8,
                    y: Math.random() * 6 - 3,
                    r: Math.random() * 4 + 2,
                    c: Math.random() > 0.5 ? '#ff4400' : '#000000'
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
            if (Math.abs(this.x - this.targetX) < 20 && Math.abs(this.y - this.targetY) < 20) {
                if (Math.random() < 0.02) {
                    this.idleTimer = 60 + Math.random() * 120;
                } else {
                    const isLongDistance = Math.random() < 0.3;
                    if (isLongDistance) {
                        this.targetX = this.x < CANVAS_WIDTH / 2 ? 
                            (CANVAS_WIDTH - 60) - Math.random() * 40 : 
                            40 + Math.random() * 40;
                        this.targetY = 40 + Math.random() * (CANVAS_HEIGHT - 80);
                        this.currentSpeedBoost = 1.5;
                    } else {
                        this.targetX = Math.max(30, Math.min(CANVAS_WIDTH - 30, this.x + (Math.random() - 0.5) * 80));
                        this.targetY = Math.max(30, Math.min(CANVAS_HEIGHT - 30, this.y + (Math.random() - 0.5) * 60));
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
        if (this.vx > 0.1) this.flip = false;
        if (this.vx < -0.1) this.flip = true;

        foods.forEach((f, index) => {
            let fdx = f.x - this.x; let fdy = f.y - this.y;
            if (Math.sqrt(fdx * fdx + fdy * fdy) < this.config.size) foods.splice(index, 1);
        });

        this.bubbleTimer--;
        if (this.bubbleTimer <= 0) {
            const count = Math.floor(Math.random() * 3) + 1;
            for(let i=0; i<count; i++) {
                setTimeout(() => {
                    bubbles.push(new Bubble(this.x + (this.flip ? -6 : 6), this.y - 2, true));
                }, i * 300);
            }
            this.bubbleTimer = 300 + Math.random() * 600;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);
        
        const s = this.config.size;
        const speedFactor = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 2;
        const tailWobble = Math.sin(this.animTimer) * (2 + speedFactor);
        
        ctx.fillStyle = this.config.color;

        if (this.type === 'goldfish') {
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.6, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-s+4, 0);
            ctx.quadraticCurveTo(-s-8, -s*0.8 + tailWobble, -s-12, -s*0.4);
            ctx.lineTo(-s-12, s*0.4);
            ctx.quadraticCurveTo(-s-8, s*0.8 - tailWobble, -s+4, 0);
            ctx.fill();
            ctx.beginPath(); ctx.moveTo(-s*0.2, -s*0.5); ctx.lineTo(-s*0.6, -s*0.8); ctx.lineTo(-s, -s*0.4); ctx.fill();
        } 
        else if (this.type === 'neon') {
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.35, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(-s*0.5, -2, s, 3);
            ctx.fillStyle = '#ff3333';
            ctx.beginPath(); ctx.moveTo(-s+2, 0); ctx.lineTo(-s-6, -s*0.4 + tailWobble/2); ctx.lineTo(-s-6, s*0.4 - tailWobble/2); ctx.fill();
        }
        else if (this.type === 'betta') {
            ctx.beginPath(); ctx.ellipse(0, 0, s*0.7, s*0.3, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#990011';
            ctx.beginPath();
            ctx.moveTo(-s*0.5, 0);
            ctx.bezierCurveTo(-s*1.5, -s*1.2 + tailWobble, -s*2.5, -s*0.5, -s*2.5, 0);
            ctx.bezierCurveTo(-s*2.5, s*0.5, -s*1.5, s*1.2 - tailWobble, -s*0.5, 0);
            ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, -s*0.2); ctx.quadraticCurveTo(-s*0.5, -s*1.2, -s, -s*0.5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, s*0.2); ctx.quadraticCurveTo(-s*0.5, s*1.2, -s, s*0.5); ctx.fill();
        }
        else if (this.type === 'koi') {
            ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.35, 0, 0, Math.PI*2); ctx.fill();
            this.pattern.forEach(p => {
                ctx.fillStyle = p.c;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
            });
            ctx.fillStyle = this.config.color;
            ctx.beginPath(); ctx.moveTo(-s+4, 0); ctx.lineTo(-s-8, -s*0.5 + tailWobble); ctx.lineTo(-s-8, s*0.5 - tailWobble); ctx.fill();
            ctx.strokeStyle = this.config.color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(s-2, 2); ctx.lineTo(s+4, 6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(s-2, -2); ctx.lineTo(s+4, -6); ctx.stroke();
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(s*0.5, -2, 2, 2);
        ctx.restore();
    }
}

// --- Main Loop ---

function update() {
    if (state === 'PLAYING') {
        fish.update();
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
    
    // Gravel - Increased height and ensuring it reaches the very bottom
    ctx.fillStyle = '#887766';
    ctx.fillRect(0, CANVAS_HEIGHT - 12, CANVAS_WIDTH, 12);
    
    if (gravelDebris > 0) {
        ctx.fillStyle = `rgba(50, 40, 0, ${gravelDebris/100})`;
        for(let i=0; i<gravelDebris; i++) {
            let dx = ((Math.sin(i * 13) + 1) / 2) * CANVAS_WIDTH;
            ctx.fillRect(dx, CANVAS_HEIGHT - 15 + Math.cos(i * 7) * 4, 3, 3);
        }
    }

    if (state === 'PLAYING') {
        bubbles.forEach(b => b.draw());
        foods.forEach(f => f.draw());
        fish.draw();
    }
}

// --- Input Handling ---

function handleStart(e) {
    if (e.target.classList.contains('menu-btn')) {
        startGame(e.target.getAttribute('data-fish'));
    } else if (e.target.id === 'feed-btn') {
        foods.push(new Food(20 + Math.random() * (CANVAS_WIDTH - 40), 0));
    } else if (e.target.id === 'clean-btn') {
        gravelDebris = 0;
        foods = foods.filter(f => !f.settled);
    } else if (e.target.id === 'reset-btn') {
        resetGame();
    }
    if (e.cancelable) e.preventDefault();
}

function startGame(type) {
    fish = new Fish(type);
    state = 'PLAYING';
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

function resetGame() {
    state = 'MENU';
    fish = null; foods = []; bubbles = []; gravelDebris = 0;
    document.getElementById('menu-overlay').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
}

window.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('mousedown', handleStart);
requestAnimationFrame(update);
