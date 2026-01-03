# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Number Drop (숫자병합) is a casual puzzle game where players drop numbered blocks that merge when matching (2+2→4, 4+4→8, etc.). The project has two parallel implementations:

1. **Web Frontend** (`frontend/`) - Phaser 3 game with TypeScript/Vite, also wraps to mobile via Capacitor
2. **Flutter App** (`flutter_app/`) - Native mobile implementation using Flame engine
3. **Backend** (`backend/`) - Express.js API for leaderboards, users, and purchases

## Common Commands

### Frontend (Web/Capacitor)
```bash
cd frontend
npm install
npm run dev          # Start dev server on port 3000
npm run build        # TypeScript compile + Vite production build
npm run lint         # ESLint
npm run capacitor:android  # Sync and open Android project
npm run capacitor:ios      # Sync and open iOS project
```

### Backend
```bash
cd backend
npm install
npm run dev          # Start with ts-node-dev (hot reload)
npm run build        # Compile TypeScript
npm start            # Run compiled JS
npm run lint         # ESLint
```

### Flutter App
```bash
cd flutter_app
flutter pub get
flutter run          # Run on connected device/emulator
flutter build apk    # Build Android APK
flutter build ios    # Build iOS
```

### Docker (Full Stack)
```bash
docker-compose up              # Start all services (frontend, backend, postgres, redis, nginx)
docker-compose up -d           # Start in background
docker-compose down            # Stop all services
```

## Architecture

### Frontend Path Aliases (vite.config.ts)
- `@game` → `src/game/` (Phaser scenes, game objects)
- `@services` → `src/services/` (AudioService, StorageService, AdService, LeaderboardService)
- `@store` → `src/store/` (Zustand stores: gameStore, settingsStore)
- `@ui` → `src/ui/` (React components for menus)

### Phaser Scene Flow
`BootScene` → `MenuScene` → `GameScene` ↔ `GameOverScene` / `LeaderboardScene`

### Key Game Objects (frontend/src/game/objects/)
- `Grid.ts` - Block grid management, merge detection, gravity
- `Block.ts` - Individual number block rendering and animations
- `ScoreManager.ts` - Score tracking with combo multipliers

### Backend API Routes
- `/api/leaderboard` - Score submissions and rankings
- `/api/user` - User management
- `/api/purchase` - Ad removal purchases (trial/premium tiers)

### Database Schema (scripts/init.sql)
- `users` - Player profiles with best scores
- `game_sessions` - Individual game records
- `purchases` - In-app purchase records with expiration

## Game Configuration

Game constants are in `frontend/src/game/config.ts`:
- Grid: 5 columns × 8 rows, 60px cells
- Starting numbers: [2, 4]
- Combo multiplier: 1.5x
- Animation timings: DROP_DURATION, MERGE_DURATION, SPAWN_DURATION

## Service Ports
- Frontend dev: 3000
- Backend: 4000
- PostgreSQL: 5432
- Redis: 6379
- Nginx (production): 80
