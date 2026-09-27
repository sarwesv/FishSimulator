# 🐠 FishSimulator

A retro-style, pixel-art virtual fish simulation game optimized for mobile web and built with a modern multi-file architecture.

## 🌟 Overview

FishSimulator is a relaxing, interactive aquarium experience designed with a "lo-fi" aesthetic. It features a low internal resolution (200x125) stretched to fit modern displays while maintaining sharp, blocky, nearest-neighbor scaling for that authentic arcade feel.

### ✨ Key Features

- **Relaxing Care System:** Your fish is completely **invincible**. There are no "game over" states or health depletions. Enjoy a stress-free environment where the goal is simply to interact and care for your pet.
- **Multiple Fish & Plant Species:** Choose specific varieties to customize your tank:
  - **Fish:** Goldfish, Neon Tetra, Betta, Koi.
  - **Plants:** Tall Seaweed, Short Bush, Water Fern, Red Algae.
- **Customizable Gravel:** Change the tank's floor color (Natural, Blue, Pink, or White) to match your style.
- **Interactive Environment:**
  - **Selection Menus:** "ADD FISH", "ADD PLANT", and "GRAVEL" now provide menus for full customization.
  - **Physics-based Feeding:** Drop food flakes and watch your fish enjoy them.
  - **Dynamic Water Quality:** Tank debris accumulates over time, subtly tinting the water.
  - **Autonomous Bubble Blowing:** Fish occasionally blow clusters of bubbles that float to the surface.
  - **Gravel Cleaning:** Restore water clarity with the click of a button.
- **Retro Aesthetic:** Uses the `VT323` Google Pixel Font and enforced pixelated rendering (`image-rendering: pixelated`).

## 📱 Mobile Optimization

Specifically engineered for iPad and iOS touch screens:
- **Zero Tap Delay:** Utilizes `touchstart` hooks for instant responsiveness.
- **Gesture Control:** Prevents double-tap zoom and scrolling behaviors via `e.preventDefault()`.
- **Responsive Design:** Automatically scales to fit mobile viewports (`max-width: 90vw`).

## 🛠️ Technical Structure

The project is organized into three core files for clean separation of concerns:

- `index.html`: Manages the structural layout and UI overlays.
- `style.css`: Handles the visual design, retro typography, and responsive scaling.
- `script.js`: Contains the simulation engine, autonomous AI, and physics logic.

## 🚀 Getting Started (run on web at https://sarwesv.github.io/FishSimulator/)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sarwesv/FishSimulator.git
   ```
2. **Open the project:**
   Simply open `index.html` in any modern web browser.

## 🎨 Controls

- **Select Fish:** Choose your companion from the start menu.
- **Feed:** Tap the "FEED" button to drop food into the tank.
- **Clean:** Tap the "CLEAN" button to clear debris and refresh the water.
- **Reset:** Go back to the selection screen to choose a new fish.

## 🛠️ Development

To make it easier to see changes instantly while working on the code, I've added an auto-refresh development script.

### 🔄 Live Auto-Refresh
Run this command in your terminal while in the project folder:
```bash
npm run dev
```
This will:
1. Start a local web server.
2. Open the simulator in your browser.
3. **Automatically refresh the page** every time you save a change to `index.html`, `style.css`, or `script.js`.

### 🚀 Quick Deployment
To push your changes to GitHub and sync the live website (`gh-pages`) in one go:
```bash
npm run sync
```

---
*Created with ❤️ for retro game enthusiasts.*
