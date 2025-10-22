# Enhanced Snake Game

## Overview
This revision upgrades the Snake game with multiple new features and visual improvements. What's new in this revision:
- Difficulty levels (easy, medium, hard) that change snake speed
- Pause and resume functionality with "P" keyboard shortcut
- Countdown timer (3...2...1) before the game starts
- Mobile-friendly touch controls (on-screen buttons and swipe gestures)
- Random obstacles that cause game over on collision
- Leaderboard (top 5) with player names saved to localStorage
- Dark/light mode toggle with saved preference
- Background music implemented via WebAudio with toggle and volume control
- Improved visuals, animations, and responsive layout using Bootstrap 5
- Bug fixes: prevented instant reverse-movement, improved input buffering, added robust localStorage parsing and error handling

This project is suitable for hosting on GitHub Pages.

## Files
- index.html — Main entry page (root). Includes UI, canvas, controls, and links to assets.
- assets/css/styles.css — Styles and theme variables (dark/light) and responsive layout rules.
- assets/js/app.js — Main game logic, input handling, countdown, obstacles, music (WebAudio), leaderboard management, and UI interactions.
- README.md — This file (project overview, setup, usage).
- LICENSE — MIT License (kept unchanged).

## Setup
This project is hosted on GitHub Pages at `https://[username].github.io/[repo-name]/`
To run locally:
1. Clone the repository.
2. Serve the folder (e.g., using Live Server in VS Code or a simple static server).
3. Open index.html in a modern browser (Chrome, Firefox, Edge, Safari).

All asset paths are relative and suitable for GitHub Pages hosting at username.github.io/repo-name/.

## Usage
- Start: Click "Start" or press Space to begin. A 3-second countdown will run before gameplay.
- Difficulty: Choose Easy / Medium / Hard — affects snake speed and obstacle count.
- Controls: Use Arrow keys or swipe on the canvas or on-screen touch buttons (mobile).
- Pause: Click "Pause" or press "P" to pause/resume.
- Obstacles: Avoid gray blocks; hitting one causes game over.
- Scoring: Collect apples to get points (10 per apple).
- Leaderboard: On game over, enter your name to save to the top-5 leaderboard (stored in localStorage). Use "Clear Leaderboard" to reset.
- Dark/Light Mode: Toggle using the switch in the navbar; preference is saved.
- Music: Toggle background music using the "Music" button and control volume with the slider.

Accessibility & Error Handling:
- The canvas receives focus on click to support keyboard controls.
- localStorage parsing is safeguarded; corrupted data falls back gracefully.
- The app attempts to recover from runtime errors by resetting to a safe state.

## License
MIT License - see LICENSE file for details.