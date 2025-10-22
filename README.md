# Classic Snake (HTML5)

## Overview
Classic Snake is a responsive, mobile-friendly implementation of the classic Snake game using HTML, CSS, and JavaScript. The game features smooth snake movement, multiple types of food with different point values, real-time score and high score persistence via localStorage, start/reset controls, touch-friendly on-screen buttons for mobile, and sound effects using the Web Audio API.

## Files
- index.html: Main HTML page. Contains the canvas, UI, buttons, and loads the game script and styles.
- styles.css: Responsive styles for the layout, canvas, overlay, and mobile controls.
- game.js: Complete game logic (movement, rendering, collision detection, scoring, sounds, localStorage).
- README.md: Project documentation and usage instructions.
- LICENSE: MIT License for this project.
- uid.txt: Unique identifier file provided with the project.

## Setup
This project is published on GitHub Pages and can be accessed at `https://[username].github.io/[repo-name]/`

To run locally:
1. Clone the repository to your machine.
2. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).
3. For GitHub Pages, push the repository to GitHub and enable Pages for the repository (usually from the repository Settings -> Pages). The `index.html` at the root will be served.

## Usage
1. Click the "Start" button to begin the game.
2. Use arrow keys or WASD to control the snake on desktop.
3. On mobile, use the on-screen arrow buttons.
4. Eat colored food to increase your score:
   - Red: 1 point
   - Green: 3 points
   - Blue: 5 points
   - Gold: 10 points
5. High score is saved automatically to localStorage and shown under "High Score".
6. Game over occurs when the snake hits a wall or itself. Use the "Reset" button to restart or the overlay buttons after a game over.
7. Sound effects play on food-eating and game over (Web Audio API). If sound doesn't play automatically on first load, interact with the page to allow audio context to start.

## License
MIT License - see LICENSE file for details.