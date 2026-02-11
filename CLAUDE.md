# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D rugby goal kicking game built with Three.js and Vite. Players kick a rugby ball through goalposts across 10 rounds with increasing difficulty and dynamic wind conditions.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

No test framework or linter is configured.

## Architecture

**Single-file application**: All game logic lives in `main.js` (~1120 lines) with clear section comments. `index.html` defines the UI overlay structure. `style.css` handles HUD styling.

### Game State Machine

States flow linearly per round: `intro_field` → `intro_try` → `intro_kick` → `intro_position` → `aiming` → `charging` → `kicked`

- **intro_\*** states are timer-based camera transitions (1.5–2.5s each)
- **aiming**: user controls aim angle (LEFT/RIGHT arrows) and camera tilt (UP/DOWN arrows)
- **charging**: SPACE held charges power bar, release kicks
- **kicked**: physics simulation runs until ball lands, then `checkResult()` validates goal

### Physics

Custom projectile motion (no physics library):
- Parabolic trajectory with gravity and wind as constant acceleration
- Goal validation solves quadratic equation for ball position at goalpost z-plane
- Success requires: between uprights (|x| < 2.8m) AND above crossbar (y > 3m)

### Difficulty Progression

`difficulty = (currentRound - 1) / 9` scales from 0 to 1:
- Try position: 10–30m from center (wider kicks)
- Kick distance: 15–35m from goal line
- Wind speed: 0–8 m/s

### Camera System

Smooth lerp-based interpolation between positions. During flight, camera tracks the ball. Each game state has its own camera target logic in `updateCamera()`.

### 3D Scene Construction

All geometry is procedural (no external models/textures):
- Stadium with multi-tier seating and canvas-rendered crowd textures
- Corner flags with real-time wind-driven vertex deformation
- Crosshair/aim target projected to goalpost plane using trajectory estimation

### Key Functions

- `setupRound()`: initializes round difficulty, positions, wind, camera
- `animate()`: main requestAnimationFrame loop, drives state machine
- `updateBallPhysics(dt)`: projectile motion with wind
- `checkResult()`: goal/miss validation at goalpost plane
- `updateAimTarget()`: projects aim to crosshair position
- `updateCamera(dt)`: state-dependent camera interpolation

## Dependencies

- **three** (v0.170.0): 3D rendering — single import at top of main.js
- **vite** (v6.0.0): dev server and bundler
