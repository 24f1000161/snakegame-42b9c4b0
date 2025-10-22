# Classic Snake Game

## Overview
A responsive, mobile-friendly classic Snake game built with HTML, CSS, and vanilla JavaScript. The game features smooth movement, different colored foods that award different point values, sound effects, a persistent high score (stored in localStorage), and controls for both keyboard and touch devices.

## Files
- index.html: Main HTML file that initializes the page, includes meta viewport, and references styles and scripts.
- styles.css: Responsive styling for the game layout and components, including mobile-friendly controls.
- game.js: Complete game logic (movement, collision detection, food spawning, scoring, sound, touch controls).
- README.md: Project documentation (this file).
- LICENSE: MIT license for the project.
- uid.txt: Identifier file included with the project (provided attachment).

## Setup
This project is published on GitHub Pages and can be accessed at `https://[username].github.io/[repo-name]/`

To run locally:
1. Clone the repository or download the files.
2. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari).
3. Click "Start" to begin playing. Use arrow keys or on-screen controls to move the snake.

## Usage
- Start: Click the "Start" button. The button will show "Running" while the game is in progress.
- Controls:
  - Desktop: Arrow keys or WASD.
  - Mobile: Use the on-screen directional buttons or swipe on the canvas.
- Objective: Eat food to grow the snake and increase your score. Different colored food items provide different point values:
  - Red: 1 point
  - Yellow: 3 points
  - Blue: 5 points
- Game Over: The game ends if the snake hits the wall or itself. Use the "Reset" button to restart the game.
- High Score: The highest score is saved in your browser's localStorage and displayed on the screen.

## Deployment to GitHub Pages
1. Create a GitHub repository and push all project files to the repository.
2. In the GitHub repository, go to Settings → Pages.
3. Under "Build and deployment", choose the branch (commonly main) and root folder (/).
4. Save. GitHub will publish the site at `https://[username].github.io/[repo-name]/`.
5. Ensure `index.html` is at the repository root so GitHub Pages can serve it.

## License
MIT License - see LICENSE file for details.