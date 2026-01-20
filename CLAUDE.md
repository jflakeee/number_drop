# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Number Drop (숫자병합) is a casual puzzle game where players drop numbered blocks that merge when matching (2+2→4, 4+4→8, etc.). The project has three implementations:

1. **Web Frontend** (`frontend/`) - Phaser 3 game with TypeScript/Vite, also wraps to mobile via Capacitor
2. **Flutter App** (`flutter_app/`) - Native mobile implementation using Flame engine
3. **Backend** (`backend/`) - Express.js API for leaderboards, users, and purchases

**Live Site:** https://jflakeee.github.io/number_drop/

## Common Commands

### Frontend (Web/Capacitor)
```bash
cd frontend
npm install
npm run dev          # Start dev server on port 3000
npm run build        # TypeScript compile + Vite production build
npm run deploy       # Build and deploy to GitHub Pages
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
flutter run -d chrome  # Run in web browser
flutter build apk --release    # Build Android APK
flutter build appbundle --release  # Build Android App Bundle (Play Store)
flutter build ios --release    # Build iOS
flutter test         # Run unit tests
```

**Requirements:** Flutter SDK ^3.10.4 (see pubspec.yaml for exact constraints)

### Docker (Full Stack)
```bash
docker-compose up              # Start all services (frontend, backend, postgres, redis, nginx)
docker-compose up -d           # Start in background
docker-compose down            # Stop all services
```

## Architecture

### Frontend Path Aliases (vite.config.ts)
- `@` → `src/` (root source directory)
- `@game` → `src/game/` (Phaser scenes, game objects)
- `@services` → `src/services/` (AudioService, StorageService, AdService, LeaderboardService, AchievementService, GameStateService, StatisticsService)
- `@store` → `src/store/` (Zustand stores: gameStore, settingsStore)
- `@ui` → `src/ui/` (React components for menus)

### Phaser Scene Flow
`BootScene` → `LandingScene` → `MenuScene` → `GameScene` ↔ `GameOverScene` / `LeaderboardScene` / `StatsScene` / `SettingsScene`

### Key Game Objects (frontend/src/game/objects/)
- `Grid.ts` - Block grid management, merge detection, gravity, hint display
- `Block.ts` - Individual number block rendering and animations
- `ScoreManager.ts` - Score tracking with combo multipliers

### Backend API Routes
- `/api/leaderboard` - Score submissions and rankings (includes rank-for-score endpoint)
- `/api/user` - User management
- `/api/purchase` - Ad removal purchases (trial/premium tiers)

### Database Schema (scripts/init.sql)
- `users` - Player profiles with best scores
- `game_sessions` - Individual game records
- `purchases` - In-app purchase records with expiration

## Ad Policy

The game follows a strict user-friendly ad policy (see `frontend/src/services/AdService.ts`):

**Allowed:**
- Fixed banner ads at top/bottom only
- Rewarded ads ONLY when user clicks ad button (e.g., "Get Points" button, item usage)
- Ad icon (📺) visible on buttons that trigger ads

**Prohibited:**
- Time-based automatic ads
- Interstitial/popup ads
- Ads on level up or stage clear
- Any ads that interrupt gameplay

**UI Layout Considerations:**
- Banner ads must not overlap with game grid or UI elements
- Top menu (score, pause, ranking, block preview, settings) displayed in single row
- Bottom item buttons positioned above banner ad zone
- Block preview positioned at top-right to avoid grid overlap

## Game Configuration

Game constants are in `frontend/src/game/config.ts`:
- Grid: 5 columns × 8 rows, 60px cells
- Starting numbers: [2, 4]
- Combo multiplier: 1.5x
- Animation timings: DROP_DURATION, MERGE_DURATION, SPAWN_DURATION
- Next block preview and next-next block preview displayed at top-right

Settings toggles (via settingsStore):
- `chainMerge` - Enable/disable chain reactions
- `showHint` - Show mergeable block hints
- `difficulty` - Easy/Normal/Hard (affects drop number range)
- `mergeMultiplier` - 4+ block merge multiplier (1x/2x/3x/4x, default: 2x)
- Sound effects - Multiple collision sound options (wood, glass, gem, metal, candy, drum, piano)
- Block collision animations - None, jelly squish, lightning flash

## Service Ports
- Frontend dev: 3000
- Backend: 4000
- PostgreSQL: 5432
- Redis: 6379
- Nginx (production): 80

## Testing

This project currently has no test configuration. When adding tests:
- Frontend: Consider Vitest for unit/integration tests
- Backend: Consider Jest or Vitest with supertest for API tests
- Flutter: Use `flutter test` (flutter_test package already configured)

## Important Implementation Notes

**Block Drop Physics:**
- Blocks start 2 cells above grid (120px) for dramatic drop animation
- Drop should start at clicked x-coordinate, not screen center
- Prevent mouse tracking during block drop animation
- Avoid mid-air floating blocks with proper collision detection
- Natural bounce animation on landing

**Block Merging:**
- Ensure blocks merge properly without overlapping or passing through
- Support chain reactions when chainMerge setting is enabled
- 4+ block merges get multiplier bonus (configurable via mergeMultiplier setting)
- Next drop number should be within range of max visible block / 8

## Key Implementation Locations

When modifying core game features, refer to these files:
- **Top menu layout:** `GameScene.ts` (~line 310-400)
- **Merge particle effects:** `Block.ts` (~line 359-420)
- **Score animations:** `ScoreManager.ts` (~line 42-80)
- **Combo flash effects:** `GameScene.ts` (~line 1002-1056)
- **Rank-up notifications:** `GameScene.ts` (~line 428-557)
- **Landing scene:** `LandingScene.ts`
