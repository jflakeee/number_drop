import Phaser from 'phaser';
import { GAME_CONFIG, AD_CONFIG } from '@game/config';
import { Grid } from '@game/objects/Grid';
import { Block } from '@game/objects/Block';
import { ScoreManager } from '@game/objects/ScoreManager';
import { leaderboardService } from '@services/LeaderboardService';
import { gameStateService } from '@services/GameStateService';
import { useSettingsStore } from '@store/settingsStore';
import { AdService } from '@services/AdService';
import { achievementService, type AchievementUnlock } from '@services/AchievementService';
import { statisticsService } from '@services/StatisticsService';

// Item types
type ItemType = 'bomb' | 'shuffle' | 'undo' | 'split' | 'pickup' | 'remove';

interface ItemButton {
  container: Phaser.GameObjects.Container;
  type: ItemType;
  cost: number;
  adBadge: Phaser.GameObjects.Text;  // Shows 📺 when ad will be triggered
}

// Auto-submit interval (1 minute)
const AUTO_SUBMIT_INTERVAL = 60000;

// Auto-save interval (30 seconds)
const AUTO_SAVE_INTERVAL = 30000;

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private currentBlock!: Block | null;
  private nextValue!: number;
  private nextNextValue!: number;
  private nextBlockPreview!: Block | null;
  private nextNextBlockPreview!: Block | null;
  private scoreManager!: ScoreManager;
  private isGameOver: boolean = false;
  private isProcessing: boolean = false;  // Lock to prevent input during merges
  private previewContainer!: Phaser.GameObjects.Container;
  private columnArrows!: Phaser.GameObjects.Text[];
  private hoveredColumn: number = -1;
  private gridX!: number;
  private gridY!: number;

  // Item system
  private coins: number = 500;
  private coinsText!: Phaser.GameObjects.Text;
  private itemButtons: ItemButton[] = [];
  private activeItem: ItemType | null = null;
  private itemPaidWithAd: boolean = false;  // Track if current item was paid with ad
  private itemModeText!: Phaser.GameObjects.Text | null;

  // Auto-submit system
  private autoSubmitTimer!: Phaser.Time.TimerEvent | null;
  private lastSubmittedScore: number = 0;

  // Auto-save system
  private autoSaveTimer!: Phaser.Time.TimerEvent | null;

  // Continue game flag
  private continueGame: boolean = false;

  // Global ranking display
  private rankContainer!: Phaser.GameObjects.Container;
  private rankText!: Phaser.GameObjects.Text;
  private currentRank: number = 0;
  private rankUpdateTimer!: Phaser.Time.TimerEvent | null;

  // Achievement system
  private achievementUnsubscribe: (() => void) | null = null;
  private currentMaxCombo: number = 0;

  // Undo system
  private undoState: {
    gridSnapshot: { col: number; row: number; value: number }[];
    score: number;
    nextValue: number;
    nextNextValue: number;
  } | null = null;
  private canUndo: boolean = false;

  // Pickup system
  private pickedUpBlock: Block | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { continueGame?: boolean }): void {
    this.continueGame = data?.continueGame ?? false;
    this.isGameOver = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const { COLORS, GRID_COLS, CELL_SIZE } = GAME_CONFIG;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.LIGHT);

    // Header
    this.createHeader();

    // Global ranking display
    this.createRankingDisplay();

    // Initialize grid position
    this.gridX = (width - GRID_COLS * CELL_SIZE) / 2;
    this.gridY = 150;
    this.grid = new Grid(this, this.gridX, this.gridY);

    // Initialize score manager (below header, centered)
    this.scoreManager = new ScoreManager(this, width / 2, 105);

    // Create column selection arrows
    this.createColumnArrows();

    // Create preview container for "NEXT" block
    this.createPreviewArea();

    // Create item UI at bottom
    this.createItemUI();

    // Load saved game or start new game
    if (this.continueGame && this.loadSavedGame()) {
      // Saved game loaded successfully
      this.showMessage('게임 이어하기!', '#4CAF50');
    } else {
      // Start new game
      this.nextValue = this.getRandomStartNumber();
      this.nextNextValue = this.getRandomStartNumber();
      this.spawnNewBlock();
    }

    // Input handling
    this.input.on('pointerdown', this.handleInput, this);
    this.input.on('pointermove', this.handlePointerMove, this);

    // Start auto-submit timer (every 1 minute)
    this.lastSubmittedScore = 0;
    this.autoSubmitTimer = this.time.addEvent({
      delay: AUTO_SUBMIT_INTERVAL,
      callback: this.autoSubmitScore,
      callbackScope: this,
      loop: true,
    });

    // Start auto-save timer (every 30 seconds)
    this.autoSaveTimer = this.time.addEvent({
      delay: AUTO_SAVE_INTERVAL,
      callback: this.saveGame,
      callbackScope: this,
      loop: true,
    });

    // Setup achievement listener
    this.achievementUnsubscribe = achievementService.onUnlock((unlock) => {
      this.showAchievementPopup(unlock);
    });

    // Start statistics session
    statisticsService.startSession();
    if (!this.continueGame) {
      statisticsService.recordGameStart();
    }

    // Check consecutive days achievement
    achievementService.checkConsecutiveDays(statisticsService.getConsecutiveDays());
    achievementService.checkGamesPlayed(statisticsService.getTotalGames());
  }

  private showAchievementPopup(unlock: AchievementUnlock): void {
    const { width, height } = this.cameras.main;
    const { achievement } = unlock;

    // Create achievement popup container
    const container = this.add.container(width / 2, height / 2 - 100);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x222831, 0.95);
    bg.fillRoundedRect(-120, -40, 240, 80, 12);
    bg.lineStyle(3, 0xFFD700, 1);
    bg.strokeRoundedRect(-120, -40, 240, 80, 12);
    container.add(bg);

    // Icon
    const icon = this.add.text(-90, 0, achievement.icon, {
      fontSize: '32px',
    });
    icon.setOrigin(0.5, 0.5);
    container.add(icon);

    // Title
    const title = this.add.text(-40, -12, '업적 달성!', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#FFD700',
    });
    title.setOrigin(0, 0.5);
    container.add(title);

    // Achievement name
    const name = this.add.text(-40, 8, achievement.name, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    name.setOrigin(0, 0.5);
    container.add(name);

    // Reward
    const reward = this.add.text(100, 0, `+${achievement.reward}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    reward.setOrigin(0.5, 0.5);
    container.add(reward);

    // Add reward to coins
    this.addCoins(achievement.reward);

    // Animation
    container.setScale(0);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Fade out
    this.tweens.add({
      targets: container,
      y: height / 2 - 150,
      alpha: 0,
      duration: 500,
      delay: 2500,
      ease: 'Quad.easeIn',
      onComplete: () => container.destroy(),
    });
  }

  private loadSavedGame(): boolean {
    const savedState = gameStateService.loadGame();
    if (!savedState || savedState.blocks.length === 0) {
      return false;
    }

    // Restore grid state
    this.grid.loadState(savedState.blocks);

    // Restore score
    this.scoreManager.setScore(savedState.score);

    // Restore coins
    this.coins = savedState.coins;
    if (this.coinsText) {
      this.coinsText.setText(this.coins.toString());
    }

    // Restore next values and spawn block
    this.nextValue = savedState.nextValue || this.getRandomStartNumber();
    this.nextNextValue = savedState.nextNextValue || this.getRandomStartNumber();
    this.spawnNewBlock();

    return true;
  }

  private saveGame(): void {
    if (this.isGameOver) return;

    const state = {
      blocks: this.grid.getState(),
      score: this.scoreManager.getScore(),
      bestScore: this.scoreManager.getBestScore(),
      coins: this.coins,
      nextValue: this.nextValue,
      nextNextValue: this.nextNextValue,
      savedAt: Date.now(),
    };

    gameStateService.saveGame(state);
  }

  private async autoSubmitScore(): Promise<void> {
    if (this.isGameOver) return;

    const currentScore = this.scoreManager.getScore();

    // Only submit if score has increased since last submission
    if (currentScore > this.lastSubmittedScore) {
      try {
        await leaderboardService.submitScore(currentScore);
        this.lastSubmittedScore = currentScore;
        console.log(`Auto-submitted score: ${currentScore}`);
      } catch (error) {
        // Silently fail - don't interrupt gameplay
        console.warn('Auto-submit failed:', error);
      }
    }
  }

  private createHeader(): void {
    const { width } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Header background - reduced height for single row
    this.add.rectangle(width / 2, 45, width, 90, COLORS.DARK);

    // Left section: Pause button
    const pauseBtn = this.add.text(20, 45, '⏸', {
      fontSize: '24px',
    });
    pauseBtn.setOrigin(0, 0.5);
    pauseBtn.setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this.pauseAndSave());

    // Left section: Coin display
    const coinIcon = this.add.text(55, 45, '💰', {
      fontSize: '18px',
    });
    coinIcon.setOrigin(0, 0.5);

    this.coinsText = this.add.text(80, 45, this.coins.toString(), {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    this.coinsText.setOrigin(0, 0.5);

    // Right section: Settings button
    const settingsBtn = this.add.text(width - 20, 45, '⚙', {
      fontSize: '24px',
    });
    settingsBtn.setOrigin(1, 0.5);
    settingsBtn.setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => {
      this.saveGame();
      this.scene.start('SettingsScene');
    });
  }

  private createRankingDisplay(): void {
    const { width } = this.cameras.main;

    // Container for ranking display (same row, right side before settings)
    this.rankContainer = this.add.container(width - 140, 45);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x222831, 0.8);
    bg.fillRoundedRect(-55, -15, 110, 30, 8);
    bg.lineStyle(1, 0x4ECDC4, 0.5);
    bg.strokeRoundedRect(-55, -15, 110, 30, 8);
    this.rankContainer.add(bg);

    // Globe icon
    const globeIcon = this.add.text(-45, 0, '🌍', {
      fontSize: '14px',
    });
    globeIcon.setOrigin(0.5, 0.5);
    this.rankContainer.add(globeIcon);

    // Rank text
    this.rankText = this.add.text(5, 0, '#------', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#4ECDC4',
      fontStyle: 'bold',
    });
    this.rankText.setOrigin(0.5, 0.5);
    this.rankContainer.add(this.rankText);

    // Make it interactive - clicking goes to leaderboard
    const hitArea = this.add.rectangle(0, 0, 110, 30, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });
    this.rankContainer.add(hitArea);

    // Start rank update timer (every 10 seconds)
    this.rankUpdateTimer = this.time.addEvent({
      delay: 10000,
      callback: this.updateGlobalRank,
      callbackScope: this,
      loop: true,
    });

    // Initial rank fetch
    this.updateGlobalRank();
  }

  private async updateGlobalRank(): Promise<void> {
    if (this.isGameOver) return;

    try {
      const currentScore = this.scoreManager.getScore();
      const rank = await leaderboardService.getRankForScore(currentScore);

      if (rank > 0) {
        const previousRank = this.currentRank;
        this.currentRank = rank;

        // Format rank with commas
        const formattedRank = `#${rank.toLocaleString()}`;
        this.rankText.setText(formattedRank);

        // Show rank up animation if improved
        if (previousRank > 0 && rank < previousRank) {
          this.showRankUpAnimation(previousRank - rank);
        }
      }
    } catch (error) {
      // Silently fail - don't interrupt gameplay
      console.warn('Failed to fetch rank:', error);
    }
  }

  private showRankUpAnimation(improvement: number): void {
    const { width, height } = this.cameras.main;

    // Create rank up notification
    const container = this.add.container(width / 2, height / 3);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x4ECDC4, 0.95);
    bg.fillRoundedRect(-70, -25, 140, 50, 10);
    container.add(bg);

    // Arrow up icon
    const arrow = this.add.text(-50, 0, '⬆', {
      fontSize: '20px',
    });
    arrow.setOrigin(0.5, 0.5);
    container.add(arrow);

    // Text
    const text = this.add.text(10, 0, `Rank Up! +${improvement}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    // Animation
    container.setScale(0);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Float up and fade out
    this.tweens.add({
      targets: container,
      y: height / 3 - 50,
      alpha: 0,
      duration: 500,
      delay: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => container.destroy(),
    });
  }

  private createColumnArrows(): void {
    const { GRID_COLS, CELL_SIZE } = GAME_CONFIG;
    this.columnArrows = [];

    for (let col = 0; col < GRID_COLS; col++) {
      const arrowX = this.gridX + col * CELL_SIZE + CELL_SIZE / 2;
      const arrowY = this.gridY - 15;

      const arrow = this.add.text(arrowX, arrowY, '▼', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#BBADA0',
      });
      arrow.setOrigin(0.5, 0.5);
      this.columnArrows.push(arrow);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    // Don't move block during drop animation or processing
    if (this.isGameOver || !this.currentBlock || this.isProcessing) return;

    const { GRID_COLS, CELL_SIZE } = GAME_CONFIG;

    // Calculate which column the pointer is over
    const col = Math.floor((pointer.x - this.gridX) / CELL_SIZE);

    // Update hovered column (only highlight arrows, don't move block)
    if (col >= 0 && col < GRID_COLS) {
      if (this.hoveredColumn !== col) {
        // Reset previous arrow
        if (this.hoveredColumn >= 0 && this.hoveredColumn < GRID_COLS) {
          this.columnArrows[this.hoveredColumn].setColor('#BBADA0');
          this.columnArrows[this.hoveredColumn].setScale(1);
        }

        // Highlight new arrow
        this.hoveredColumn = col;
        this.columnArrows[col].setColor('#F96D00');
        this.columnArrows[col].setScale(1.3);
      }
    } else {
      // Reset if outside grid
      if (this.hoveredColumn >= 0 && this.hoveredColumn < GRID_COLS) {
        this.columnArrows[this.hoveredColumn].setColor('#BBADA0');
        this.columnArrows[this.hoveredColumn].setScale(1);
        this.hoveredColumn = -1;
      }
    }
  }

  private createPreviewArea(): void {
    const { CELL_SIZE, COLORS } = GAME_CONFIG;
    const { width } = this.cameras.main;

    // Preview container positioned below score, centered horizontally
    const previewX = width / 2;
    const previewY = 120;

    this.previewContainer = this.add.container(previewX, previewY);

    // Calculate center offset for horizontal alignment
    const totalWidth = CELL_SIZE * 0.7 + 15 + CELL_SIZE * 0.5;
    const centerOffset = -totalWidth / 2;

    // Background for preview area (centered)
    const previewAreaBg = this.add.graphics();
    previewAreaBg.fillStyle(0x222831, 0.8);
    previewAreaBg.fillRoundedRect(centerOffset - 15, -25, totalWidth + 30, 50, 8);
    previewAreaBg.lineStyle(1, 0x4ECDC4, 0.3);
    previewAreaBg.strokeRoundedRect(centerOffset - 15, -25, totalWidth + 30, 50, 8);
    this.previewContainer.add(previewAreaBg);

    // "NEXT" label
    const nextLabel = this.add.text(centerOffset, -15, 'NEXT', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#4ECDC4',
      fontStyle: 'bold',
    });
    nextLabel.setOrigin(0, 0.5);
    this.previewContainer.add(nextLabel);

    // Preview background box for NEXT
    const previewBg = this.add.graphics();
    previewBg.fillStyle(COLORS.DARK, 0.3);
    previewBg.fillRoundedRect(centerOffset, -5, CELL_SIZE * 0.7, CELL_SIZE * 0.7, 6);
    this.previewContainer.add(previewBg);

    // "+1" label
    const nextNextLabel = this.add.text(centerOffset + CELL_SIZE * 0.7 + 15, -15, '+1', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#999999',
    });
    nextNextLabel.setOrigin(0, 0.5);
    this.previewContainer.add(nextNextLabel);

    // Preview background box for NEXT+1
    const previewBg2 = this.add.graphics();
    previewBg2.fillStyle(COLORS.DARK, 0.2);
    previewBg2.fillRoundedRect(centerOffset + CELL_SIZE * 0.7 + 15, -2, CELL_SIZE * 0.5, CELL_SIZE * 0.5, 4);
    this.previewContainer.add(previewBg2);
  }

  private createItemUI(): void {
    const { width, height } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Item bar background (taller for two rows)
    // Account for bottom banner ad space when ads are enabled
    const bannerOffset = AdService.isBannerAdsEnabled() ? AD_CONFIG.BANNER_HEIGHT : 0;
    const itemBarHeight = 120;
    const barY = height - itemBarHeight / 2 - bannerOffset - 10; // Extra 10px padding from banner
    this.add.rectangle(width / 2, barY, width, itemBarHeight, COLORS.DARK, 0.95);

    // Coins display removed - now in header (single row layout)

    // Item buttons configuration - two rows
    const itemsRow1: { type: ItemType; icon: string; label: string; cost: number }[] = [
      { type: 'undo', icon: '↩️', label: '되돌리기', cost: 50 },
      { type: 'bomb', icon: '💣', label: '폭탄', cost: 100 },
      { type: 'shuffle', icon: '🔀', label: '셔플', cost: 100 },
    ];

    const itemsRow2: { type: ItemType; icon: string; label: string; cost: number }[] = [
      { type: 'split', icon: '➗', label: '분할', cost: 150 },
      { type: 'pickup', icon: '🎯', label: '픽업', cost: 200 },
      { type: 'remove', icon: '🗑️', label: '제거', cost: 120 },
    ];

    // Create item buttons - Row 1
    const buttonWidth = 65;
    const buttonSpacing = 10;
    const totalWidth = itemsRow1.length * buttonWidth + (itemsRow1.length - 1) * buttonSpacing;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;

    itemsRow1.forEach((item, index) => {
      const x = startX + index * (buttonWidth + buttonSpacing);
      const button = this.createItemButton(x, barY - 15, item.type, item.icon, item.label, item.cost);
      this.itemButtons.push(button);
    });

    // Create item buttons - Row 2
    itemsRow2.forEach((item, index) => {
      const x = startX + index * (buttonWidth + buttonSpacing);
      const button = this.createItemButton(x, barY + 35, item.type, item.icon, item.label, item.cost);
      this.itemButtons.push(button);
    });

    // Item mode indicator (hidden by default)
    this.itemModeText = null;
  }

  private createItemButton(
    x: number,
    y: number,
    type: ItemType,
    icon: string,
    _label: string,
    cost: number
  ): ItemButton {
    const container = this.add.container(x, y);

    // Button background (smaller size)
    const bg = this.add.graphics();
    bg.fillStyle(0x393E46, 1);
    bg.fillRoundedRect(-30, -22, 60, 44, 6);
    bg.lineStyle(2, 0x555555, 1);
    bg.strokeRoundedRect(-30, -22, 60, 44, 6);
    container.add(bg);

    // Icon
    const iconText = this.add.text(0, -8, icon, {
      fontSize: '18px',
    });
    iconText.setOrigin(0.5, 0.5);
    container.add(iconText);

    // Cost
    const costText = cost > 0 ? `${cost}` : 'FREE';
    const costColor = cost > 0 ? '#FFD700' : '#4CAF50';
    const labelText = this.add.text(0, 10, costText, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: costColor,
      fontStyle: 'bold',
    });
    labelText.setOrigin(0.5, 0.5);
    container.add(labelText);

    // Ad badge (shows when coins insufficient - makes ad predictable per policy)
    const adBadge = this.add.text(22, -18, '📺', {
      fontSize: '12px',
    });
    adBadge.setOrigin(0.5, 0.5);
    adBadge.setVisible(cost > 0 && this.coins < cost);  // Show if can't afford
    container.add(adBadge);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, 60, 44, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x4a4a4a, 1);
      bg.fillRoundedRect(-30, -22, 60, 44, 6);
      bg.lineStyle(2, 0xF96D00, 1);
      bg.strokeRoundedRect(-30, -22, 60, 44, 6);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x393E46, 1);
      bg.fillRoundedRect(-30, -22, 60, 44, 6);
      bg.lineStyle(2, 0x555555, 1);
      bg.strokeRoundedRect(-30, -22, 60, 44, 6);
    });

    hitArea.on('pointerdown', () => {
      this.useItem(type, cost);
    });

    return { container, type, cost, adBadge };
  }

  // Update ad badges on all item buttons based on current coins
  private updateItemAdBadges(): void {
    for (const button of this.itemButtons) {
      const showBadge = button.cost > 0 && this.coins < button.cost;
      button.adBadge.setVisible(showBadge);
    }
  }

  private useItem(type: ItemType, cost: number): void {
    if (this.isGameOver) return;

    // Check if already in item mode (except for pickup placement)
    if (this.activeItem && type !== 'pickup') {
      this.cancelItemMode();
      return;
    }

    // Handle undo separately - check if available
    if (type === 'undo') {
      if (!this.canUndo || !this.undoState) {
        this.showMessage('되돌릴 수 없습니다!', '#E74C3C');
        return;
      }
    }

    // Check coins for paid items
    if (cost > 0 && this.coins < cost) {
      // Offer to watch ad instead
      this.useItemWithAd(type, cost);
      return;
    }

    this.itemPaidWithAd = false;  // Using coins

    if (type === 'bomb') {
      // Enter bomb selection mode
      this.activeItem = 'bomb';
      this.showItemModeIndicator('블록을 선택하세요 (폭탄)');
    } else if (type === 'shuffle') {
      // Use shuffle immediately
      if (cost > 0 && !this.itemPaidWithAd) {
        this.spendCoins(cost);
      }
      this.itemPaidWithAd = false;
      if (!this.grid.hasBlocks()) {
        this.showMessage('셔플할 블록이 없습니다!', '#E74C3C');
        return;
      }
      this.grid.shuffle(() => {
        this.showMessage('셔플 완료!', '#4CAF50');
        this.saveGame();
      });
    } else if (type === 'undo') {
      // Undo last move
      if (cost > 0 && !this.itemPaidWithAd) {
        this.spendCoins(cost);
      }
      this.performUndo();
    } else if (type === 'split') {
      // Enter split selection mode
      this.activeItem = 'split';
      this.showItemModeIndicator('분할할 블록 선택 (4 이상)');
    } else if (type === 'pickup') {
      if (this.pickedUpBlock) {
        // Already holding a block - enter placement mode
        this.activeItem = 'pickup';
        this.showItemModeIndicator('놓을 열을 선택하세요');
      } else {
        // Enter pickup selection mode
        this.activeItem = 'pickup';
        this.showItemModeIndicator('픽업할 블록 선택');
      }
    } else if (type === 'remove') {
      // Enter remove selection mode
      this.activeItem = 'remove';
      this.showItemModeIndicator('제거할 블록 선택');
    }
  }

  private performUndo(): void {
    if (!this.undoState) return;

    // Restore grid state
    this.grid.restoreStateSnapshot(this.undoState.gridSnapshot);

    // Restore score
    this.scoreManager.setScore(this.undoState.score);

    // Restore next values
    this.nextValue = this.undoState.nextValue;
    this.nextNextValue = this.undoState.nextNextValue;

    // Update preview
    this.showNextPreview();

    // Respawn current block
    if (this.currentBlock) {
      this.currentBlock.destroy();
    }
    this.spawnNewBlock();

    // Clear undo state
    this.undoState = null;
    this.canUndo = false;

    this.showMessage('되돌리기 완료!', '#4CAF50');
    this.saveGame();
  }

  private saveUndoState(): void {
    this.undoState = {
      gridSnapshot: this.grid.saveStateSnapshot(),
      score: this.scoreManager.getScore(),
      nextValue: this.nextValue,
      nextNextValue: this.nextNextValue,
    };
    this.canUndo = true;
  }

  private showItemModeIndicator(message: string): void {
    const { width } = this.cameras.main;

    if (this.itemModeText) {
      this.itemModeText.destroy();
    }

    this.itemModeText = this.add.text(width / 2, 230, message, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#F96D00',
      backgroundColor: '#222831',
      padding: { x: 10, y: 5 },
    });
    this.itemModeText.setOrigin(0.5, 0.5);

    // Pulse animation
    this.tweens.add({
      targets: this.itemModeText,
      alpha: 0.7,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private cancelItemMode(): void {
    this.activeItem = null;
    if (this.itemModeText) {
      this.itemModeText.destroy();
      this.itemModeText = null;
    }
    // If holding a picked up block, return it to original position or destroy
    if (this.pickedUpBlock) {
      this.pickedUpBlock.destroy();
      this.pickedUpBlock = null;
    }
  }

  private showMessage(text: string, color: string): void {
    const { width } = this.cameras.main;

    const message = this.add.text(width / 2, 260, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: color,
      fontStyle: 'bold',
    });
    message.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: message,
      y: 240,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => message.destroy(),
    });
  }

  private showComboPopup(comboCount: number): void {
    const { width, height } = this.cameras.main;

    // Create combo popup container
    const container = this.add.container(width / 2, height / 2 - 50);

    // Gold frame background
    const frameBg = this.add.graphics();
    frameBg.fillStyle(0x222831, 0.95);
    frameBg.fillRoundedRect(-80, -35, 160, 70, 12);

    // Gold border with glow effect
    frameBg.lineStyle(4, 0xFFD700, 1);
    frameBg.strokeRoundedRect(-80, -35, 160, 70, 12);

    // Inner glow
    frameBg.lineStyle(2, 0xFFF8DC, 0.5);
    frameBg.strokeRoundedRect(-76, -31, 152, 62, 10);
    container.add(frameBg);

    // Ribbon decoration at top
    const ribbon = this.add.graphics();
    ribbon.fillStyle(0xF96D00, 1);
    ribbon.fillTriangle(-90, -35, -70, -35, -80, -50);
    ribbon.fillTriangle(90, -35, 70, -35, 80, -50);
    container.add(ribbon);

    // Combo text with shadow
    const shadowText = this.add.text(2, 2, `${comboCount} 콤보!`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '28px',
      color: '#000000',
      fontStyle: 'bold',
    });
    shadowText.setOrigin(0.5, 0.5);
    shadowText.setAlpha(0.3);
    container.add(shadowText);

    // Main combo text
    const comboText = this.add.text(0, 0, `${comboCount} 콤보!`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    comboText.setOrigin(0.5, 0.5);
    container.add(comboText);

    // Star decorations
    const starPositions = [
      { x: -60, y: -25 },
      { x: 60, y: -25 },
      { x: -55, y: 20 },
      { x: 55, y: 20 },
    ];
    starPositions.forEach(pos => {
      const star = this.add.text(pos.x, pos.y, '✦', {
        fontSize: '14px',
        color: '#FFD700',
      });
      star.setOrigin(0.5, 0.5);
      container.add(star);

      // Twinkle animation for stars
      this.tweens.add({
        targets: star,
        alpha: { from: 1, to: 0.3 },
        scale: { from: 1, to: 0.6 },
        duration: 300,
        yoyo: true,
        repeat: 2,
      });
    });

    // Entrance animation
    container.setScale(0);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Pulse animation
    this.tweens.add({
      targets: container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 150,
      delay: 200,
      yoyo: true,
      repeat: 1,
    });

    // Fade out and destroy
    this.tweens.add({
      targets: container,
      y: height / 2 - 80,
      alpha: 0,
      scale: 0.8,
      duration: 400,
      delay: 800,
      ease: 'Quad.easeIn',
      onComplete: () => container.destroy(),
    });
  }

  private spendCoins(amount: number): void {
    this.coins -= amount;
    this.coinsText.setText(this.coins.toString());
    this.updateItemAdBadges();  // Update ad badges when coins change
  }

  private addCoins(amount: number): void {
    this.coins += amount;
    this.coinsText.setText(this.coins.toString());
    this.updateItemAdBadges();  // Update ad badges when coins change

    // Flash animation
    this.tweens.add({
      targets: this.coinsText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
    });
  }

  private useItemWithAd(type: ItemType, _cost: number): void {
    // Policy: Ads are predictable - user clicked button with 📺 badge
    // Check if ad is available
    if (!AdService.isRewardedAdAvailable()) {
      const remaining = AdService.getRewardCooldownRemaining();
      if (remaining > 0) {
        this.showMessage(`📺 ${remaining}초 후 광고 가능`, '#F96D00');
      } else {
        this.showMessage('코인이 부족합니다!', '#E74C3C');
      }
      return;
    }

    // Show ad, then use item (user explicitly chose to watch ad via 📺 badge)
    AdService.showRewarded({
      onLoading: () => {
        this.showMessage('📺 광고 로딩중...', '#F96D00');
      },
      onRewarded: () => {
        this.showMessage('광고 시청 완료!', '#4CAF50');
        this.itemPaidWithAd = true;
        
        // Now use the item (without coin cost)
        if (type === 'bomb') {
          this.activeItem = 'bomb';
          this.showItemModeIndicator('블록을 선택하세요 (터치 해제)');
        } else if (type === 'shuffle') {
          if (!this.grid.hasBlocks()) {
            this.showMessage('셔플할 블록이 없습니다!', '#E74C3C');
            this.itemPaidWithAd = false;
            return;
          }
          this.grid.shuffle(() => {
            this.showMessage('셔플 완료!', '#4CAF50');
            this.saveGame();
          });
          this.itemPaidWithAd = false;
        }
      },
      onFailed: (error: string) => {
        this.showMessage(error || '광고 실패', '#E74C3C');
      },
    });
  }

  private spawnNewBlock(): void {
    if (this.isGameOver) return;

    const { width } = this.cameras.main;
    const value = this.nextValue;

    // Shift values: next becomes current, nextNext becomes next
    this.nextValue = this.nextNextValue || this.getRandomStartNumber();
    this.nextNextValue = this.getRandomStartNumber();

    // Show next block previews
    this.showNextPreview();

    // Create current block at top center
    this.currentBlock = new Block(this, width / 2, 180, value);

    // Show hints if enabled
    this.updateHints();
  }

  private updateHints(): void {
    const settings = useSettingsStore.getState();
    if (settings.showHint) {
      this.grid.showHints();
    } else {
      this.grid.hideHints();
    }
  }

  private showNextPreview(): void {
    const { CELL_SIZE } = GAME_CONFIG;

    // Remove previous previews if exist
    if (this.nextBlockPreview) {
      this.nextBlockPreview.destroy();
      this.nextBlockPreview = null;
    }
    if (this.nextNextBlockPreview) {
      this.nextNextBlockPreview.destroy();
      this.nextNextBlockPreview = null;
    }

    // Preview position below score (matches createPreviewArea)
    const { width } = this.cameras.main;
    const previewBaseX = width / 2;
    const previewBaseY = 120;

    // Calculate center offset for horizontal alignment
    const totalWidth = CELL_SIZE * 0.7 + 15 + CELL_SIZE * 0.5;
    const centerOffset = -totalWidth / 2;

    // NEXT block preview (centered)
    const nextX = previewBaseX + centerOffset + CELL_SIZE * 0.35;
    const nextY = previewBaseY + CELL_SIZE * 0.35 - 5;
    this.nextBlockPreview = new Block(this, nextX, nextY, this.nextValue);
    this.nextBlockPreview.setScale(0.6);
    this.nextBlockPreview.setAlpha(0);
    this.tweens.add({
      targets: this.nextBlockPreview,
      alpha: 1,
      duration: 150,
      ease: 'Quad.easeOut',
    });

    // NEXT+1 block preview (centered)
    const nextNextX = previewBaseX + centerOffset + CELL_SIZE * 0.7 + 15 + CELL_SIZE * 0.25;
    const nextNextY = previewBaseY + CELL_SIZE * 0.25 - 2;
    this.nextNextBlockPreview = new Block(this, nextNextX, nextNextY, this.nextNextValue);
    this.nextNextBlockPreview.setScale(0.45);
    this.nextNextBlockPreview.setAlpha(0);
    this.tweens.add({
      targets: this.nextNextBlockPreview,
      alpha: 0.8,
      duration: 150,
      ease: 'Quad.easeOut',
    });
  }

  private getRandomStartNumber(): number {
    const { START_NUMBERS } = GAME_CONFIG;
    const settings = useSettingsStore.getState();

    // Difficulty affects the divisor for upper limit
    // Easy: 1/4 of max (more variety), Normal: 1/8 of max, Hard: 1/16 of max (less variety)
    const difficultyDivisor = {
      easy: 4,
      normal: 8,
      hard: 16,
    }[settings.difficulty] || 8;

    // If dynamic drop is disabled, always use default start numbers [2, 4]
    if (!settings.dynamicDrop) {
      // On hard mode, only drop 2s when dynamic drop is off
      if (settings.difficulty === 'hard') {
        return 2;
      }
      return START_NUMBERS[Math.floor(Math.random() * START_NUMBERS.length)];
    }

    // Get max block value from grid
    const maxValue = this.grid ? this.grid.getMaxBlockValue() : 0;

    // If grid is empty or max value is small, use default start numbers [2, 4]
    if (maxValue <= 4) {
      // On easy mode, allow 4s even at start
      if (settings.difficulty === 'easy') {
        return START_NUMBERS[Math.floor(Math.random() * START_NUMBERS.length)];
      }
      return 2;
    }

    // Calculate upper limit based on difficulty
    const upperLimit = Math.max(4, Math.floor(maxValue / difficultyDivisor));

    // Generate valid drop values (powers of 2 from 2 to upperLimit)
    const validValues: number[] = [];
    let value = 2;
    while (value <= upperLimit) {
      validValues.push(value);
      value *= 2;
    }

    // On easy mode, bias towards higher values
    if (settings.difficulty === 'easy' && validValues.length > 1) {
      // 50% chance to pick from upper half
      if (Math.random() > 0.5) {
        const upperHalf = validValues.slice(Math.floor(validValues.length / 2));
        return upperHalf[Math.floor(Math.random() * upperHalf.length)];
      }
    }

    // On hard mode, bias towards lower values
    if (settings.difficulty === 'hard' && validValues.length > 1) {
      // 70% chance to pick 2
      if (Math.random() < 0.7) {
        return 2;
      }
    }

    // Randomly select from valid values
    return validValues[Math.floor(Math.random() * validValues.length)];
  }

  private handleInput(pointer: Phaser.Input.Pointer): void {
    if (this.isGameOver || this.isProcessing) return;

    const { GRID_COLS, CELL_SIZE } = GAME_CONFIG;
    const gridPos = this.grid.getGridPosition(pointer.x, pointer.y);

    // Handle bomb item mode
    if (this.activeItem === 'bomb') {
      if (gridPos && this.grid.getBlockAt(gridPos.col, gridPos.row)) {
        if (!this.itemPaidWithAd) {
          this.spendCoins(100);
        }
        this.itemPaidWithAd = false;
        this.cancelItemMode();
        this.grid.removeBlock(gridPos.col, gridPos.row, () => {
          this.showMessage('블록 제거!', '#F96D00');
          this.saveGame();
        });
      }
      return;
    }

    // Handle split item mode
    if (this.activeItem === 'split') {
      if (gridPos && this.grid.canSplitBlock(gridPos.col, gridPos.row)) {
        if (!this.itemPaidWithAd) {
          this.spendCoins(150);
        }
        this.itemPaidWithAd = false;
        this.cancelItemMode();
        this.grid.splitBlock(gridPos.col, gridPos.row, () => {
          this.showMessage('블록 분할!', '#9B59B6');
          this.saveGame();
        });
      } else if (gridPos && this.grid.getBlockAt(gridPos.col, gridPos.row)) {
        this.showMessage('4 이상 블록만 분할 가능!', '#E74C3C');
      }
      return;
    }

    // Handle remove item mode
    if (this.activeItem === 'remove') {
      if (gridPos && this.grid.getBlockAt(gridPos.col, gridPos.row)) {
        if (!this.itemPaidWithAd) {
          this.spendCoins(120);
        }
        this.itemPaidWithAd = false;
        this.cancelItemMode();
        this.grid.deleteBlock(gridPos.col, gridPos.row, () => {
          this.showMessage('블록 제거!', '#E74C3C');
          this.saveGame();
        });
      }
      return;
    }

    // Handle pickup item mode
    if (this.activeItem === 'pickup') {
      if (this.pickedUpBlock) {
        // Already holding a block - place it
        const col = Math.floor((pointer.x - this.gridX) / CELL_SIZE);
        if (col >= 0 && col < GRID_COLS) {
          this.cancelItemMode();
          this.grid.placePickedBlock(this.pickedUpBlock, col, () => {
            this.pickedUpBlock = null;
            this.showMessage('블록 배치!', '#4CAF50');
            this.saveGame();
          });
        }
      } else {
        // Pick up a block
        if (gridPos && this.grid.getBlockAt(gridPos.col, gridPos.row)) {
          if (!this.itemPaidWithAd) {
            this.spendCoins(200);
          }
          this.itemPaidWithAd = false;
          const block = this.grid.pickupBlock(gridPos.col, gridPos.row);
          if (block) {
            this.pickedUpBlock = block;
            // Move block to follow pointer
            block.setPosition(pointer.x, pointer.y);
            this.showItemModeIndicator('놓을 열을 선택하세요');
          }
        }
      }
      return;
    }

    // Normal block drop
    if (!this.currentBlock) return;

    // Calculate column from pointer position
    const col = Math.floor((pointer.x - this.gridX) / CELL_SIZE);

    if (col >= 0 && col < GRID_COLS) {
      // Save undo state before drop
      this.saveUndoState();

      // Reset arrow before dropping
      this.resetColumnArrows();
      this.dropBlock(col);
    }
  }

  private resetColumnArrows(): void {
    const { GRID_COLS } = GAME_CONFIG;
    for (let i = 0; i < GRID_COLS; i++) {
      this.columnArrows[i].setColor('#BBADA0');
      this.columnArrows[i].setScale(1);
    }
    this.hoveredColumn = -1;
  }

  private dropBlock(col: number): void {
    if (!this.currentBlock || this.isProcessing) return;
    this.isProcessing = true;

    // Hide hints while dropping
    this.grid.hideHints();

    const row = this.grid.getLowestEmptyRow(col);

    if (row === -1) {
      // Column is full - game over
      this.isProcessing = false;
      this.gameOver();
      return;
    }

    // Get target position
    const targetPos = this.grid.getCellPosition(col, row);
    const { CELL_SIZE } = GAME_CONFIG;

    // Instantly move block to the correct column x position at the top of grid
    const startX = this.gridX + col * CELL_SIZE + CELL_SIZE / 2;
    const startY = this.gridY - CELL_SIZE / 2; // Just above the grid
    this.currentBlock.setPosition(startX, startY);

    // Animate vertical drop with natural gravity acceleration
    const dropBlock = this.currentBlock;
    this.tweens.add({
      targets: dropBlock,
      y: targetPos.y,
      duration: GAME_CONFIG.DROP_DURATION,
      ease: 'Quad.easeIn', // Accelerate like gravity
      onComplete: () => {
        if (dropBlock) {
          // Landing squash effect (compress vertically, expand horizontally)
          this.tweens.add({
            targets: dropBlock,
            scaleX: 1.15,
            scaleY: 0.85,
            duration: 50,
            ease: 'Quad.easeOut',
            onComplete: () => {
              // Recovery spring back to normal
              this.tweens.add({
                targets: dropBlock,
                scaleX: 1,
                scaleY: 1,
                duration: 80,
                ease: 'Back.easeOut',
                onComplete: () => {
                  this.grid.placeBlock(col, row, dropBlock);
                  this.currentBlock = null;

                  // Check for merges starting from dropped block position
                  this.checkMergesFromPosition(col, row, () => {
                    // Save game after each drop
                    this.saveGame();

                    // Clear processing lock
                    this.isProcessing = false;

                    // Check if game over
                    if (this.grid.isTopRowFilled()) {
                      this.gameOver();
                    } else {
                      this.spawnNewBlock();
                    }
                  });
                },
              });
            },
          });
        }
      },
    });
  }

  private checkMergesFromPosition(col: number, row: number, onComplete: () => void): void {
    let comboCount = 0;
    let currentCol = col;
    let currentRow = row;
    let trackedBlock: Block | null = null; // Track merged block by reference
    const settings = useSettingsStore.getState();
    const chainMergeEnabled = settings.chainMerge;

    const processMerge = () => {
      // If chain merge is disabled and we already did one merge, stop
      if (!chainMergeEnabled && comboCount >= 1) {
        this.grid.applyGravity(() => {
          onComplete();
        });
        return;
      }

      // If we have a tracked block, find its current position after gravity
      if (trackedBlock) {
        const pos = this.grid.findBlockPosition(trackedBlock);
        if (pos) {
          currentCol = pos.col;
          currentRow = pos.row;
        }
      }

      const merge = this.grid.findMergesFromPosition(currentCol, currentRow);

      if (!merge) {
        // No more merges from current position, check entire grid for chain reactions
        // Skip global merge check if chain merge is disabled
        if (!chainMergeEnabled) {
          onComplete();
          return;
        }

        const globalMerges = this.grid.findMerges();
        if (globalMerges.length === 0) {
          onComplete();
          return;
        }
        // Process global merge and continue
        const globalMerge = globalMerges[0];
        comboCount++;
        const globalNewValue = globalMerge.value * 2;
        const score = globalNewValue * (comboCount > 1 ? GAME_CONFIG.COMBO_MULTIPLIER : 1);
        this.scoreManager.addScore(Math.floor(score));

        // Track statistics and check achievements
        statisticsService.recordMerge(globalNewValue);
        achievementService.checkBlockValue(globalNewValue);
        achievementService.checkTotalMerges(statisticsService.getTotalMerges());

        // Track max combo for this game
        if (comboCount > this.currentMaxCombo) {
          this.currentMaxCombo = comboCount;
          statisticsService.recordCombo(comboCount);
          achievementService.checkCombo(comboCount);
        }

        // Check score achievements
        achievementService.checkScore(this.scoreManager.getScore());

        // Show combo popup for combos >= 2
        if (comboCount >= 2) {
          this.showComboPopup(comboCount);
        }

        this.grid.performMerge(globalMerge, (mergedBlock) => {
          trackedBlock = mergedBlock;
          this.grid.applyGravity(() => {
            // Position will be updated at start of next processMerge call
            processMerge();
          });
        });
        return;
      }

      comboCount++;
      const newValue = merge.value * 2;
      const score = newValue * (comboCount > 1 ? GAME_CONFIG.COMBO_MULTIPLIER : 1);
      this.scoreManager.addScore(Math.floor(score));

      // Track statistics and check achievements
      statisticsService.recordMerge(newValue);
      achievementService.checkBlockValue(newValue);
      achievementService.checkTotalMerges(statisticsService.getTotalMerges());

      // Track max combo for this game
      if (comboCount > this.currentMaxCombo) {
        this.currentMaxCombo = comboCount;
        statisticsService.recordCombo(comboCount);
        achievementService.checkCombo(comboCount);
      }

      // Check score achievements
      achievementService.checkScore(this.scoreManager.getScore());

      // Show combo popup for combos >= 2
      if (comboCount >= 2) {
        this.showComboPopup(comboCount);
      }

      this.grid.performMerge(merge, (mergedBlock) => {
        trackedBlock = mergedBlock;
        // Apply gravity and check again
        this.grid.applyGravity(() => {
          // Position will be updated at start of next processMerge call
          processMerge();
        });
      });
    };

    processMerge();
  }

  private pauseAndSave(): void {
    // Save game before going back to menu
    this.saveGame();

    // Clean up timers
    if (this.autoSubmitTimer) {
      this.autoSubmitTimer.destroy();
      this.autoSubmitTimer = null;
    }
    if (this.autoSaveTimer) {
      this.autoSaveTimer.destroy();
      this.autoSaveTimer = null;
    }
    if (this.rankUpdateTimer) {
      this.rankUpdateTimer.destroy();
      this.rankUpdateTimer = null;
    }

    // Clean up achievement listener
    if (this.achievementUnsubscribe) {
      this.achievementUnsubscribe();
      this.achievementUnsubscribe = null;
    }

    // End statistics session (but don't record game end since paused)
    statisticsService.endSession();

    // Return to menu
    this.scene.start('MenuScene');
  }

  private gameOver(): void {
    this.isGameOver = true;

    // Clean up auto-submit timer
    if (this.autoSubmitTimer) {
      this.autoSubmitTimer.destroy();
      this.autoSubmitTimer = null;
    }

    // Clean up auto-save timer
    if (this.autoSaveTimer) {
      this.autoSaveTimer.destroy();
      this.autoSaveTimer = null;
    }

    // Clean up rank update timer
    if (this.rankUpdateTimer) {
      this.rankUpdateTimer.destroy();
      this.rankUpdateTimer = null;
    }

    // Clean up achievement listener
    if (this.achievementUnsubscribe) {
      this.achievementUnsubscribe();
      this.achievementUnsubscribe = null;
    }

    // Record final game statistics
    const finalScore = this.scoreManager.getScore();
    statisticsService.recordGameEnd(finalScore);
    statisticsService.endSession();

    // Reset combo tracker
    this.currentMaxCombo = 0;

    // Clear saved game on game over
    gameStateService.clearSavedGame();

    this.scene.start('GameOverScene', {
      score: finalScore,
      bestScore: this.scoreManager.getBestScore(),
    });
  }
}
