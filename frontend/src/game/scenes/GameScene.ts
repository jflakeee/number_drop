import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';
import { Grid } from '@game/objects/Grid';
import { Block } from '@game/objects/Block';
import { ScoreManager } from '@game/objects/ScoreManager';
import { leaderboardService } from '@services/LeaderboardService';
import { gameStateService } from '@services/GameStateService';
import { useSettingsStore } from '@store/settingsStore';
import { AdService } from '@services/AdService';

// Item types
type ItemType = 'bomb' | 'shuffle' | 'undo';

interface ItemButton {
  container: Phaser.GameObjects.Container;
  type: ItemType;
  cost: number;
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
  private itemModeText!: Phaser.GameObjects.Text | null;

  // Auto-submit system
  private autoSubmitTimer!: Phaser.Time.TimerEvent | null;
  private lastSubmittedScore: number = 0;

  // Auto-save system
  private autoSaveTimer!: Phaser.Time.TimerEvent | null;

  // Continue game flag
  private continueGame: boolean = false;

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

    // Initialize grid position
    this.gridX = (width - GRID_COLS * CELL_SIZE) / 2;
    this.gridY = 150;
    this.grid = new Grid(this, this.gridX, this.gridY);

    // Initialize score manager
    this.scoreManager = new ScoreManager(this, width / 2, 80);

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

    // Header background
    this.add.rectangle(width / 2, 60, width, 120, COLORS.DARK);

    // Pause button
    const pauseBtn = this.add.text(30, 40, '⏸', {
      fontSize: '28px',
    });
    pauseBtn.setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this.pauseAndSave());

    // Settings button
    const settingsBtn = this.add.text(width - 50, 40, '⚙', {
      fontSize: '28px',
    });
    settingsBtn.setInteractive({ useHandCursor: true });
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
    if (this.isGameOver || !this.currentBlock) return;

    const { GRID_COLS, CELL_SIZE } = GAME_CONFIG;

    // Calculate which column the pointer is over
    const col = Math.floor((pointer.x - this.gridX) / CELL_SIZE);

    // Update hovered column
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

        // Move current block to hover position
        const targetX = this.gridX + col * CELL_SIZE + CELL_SIZE / 2;
        this.tweens.add({
          targets: this.currentBlock,
          x: targetX,
          duration: 80,
          ease: 'Quad.easeOut',
        });
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
    const { width } = this.cameras.main;
    const { CELL_SIZE, COLORS } = GAME_CONFIG;

    // Preview container positioned to the right of current block
    const previewX = width / 2 + CELL_SIZE + 20;
    const previewY = 180;

    this.previewContainer = this.add.container(previewX, previewY);

    // "NEXT" label
    const nextLabel = this.add.text(0, -35, 'NEXT', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#776E65',
      fontStyle: 'bold',
    });
    nextLabel.setOrigin(0.5, 0.5);
    this.previewContainer.add(nextLabel);

    // Preview background box for NEXT
    const previewBg = this.add.rectangle(0, 0, CELL_SIZE * 0.7, CELL_SIZE * 0.7, COLORS.DARK, 0.1);
    previewBg.setStrokeStyle(2, 0xBBADA0);
    this.previewContainer.add(previewBg);

    // "+1" label for next-next preview
    const nextNextLabel = this.add.text(0, CELL_SIZE * 0.7 + 15, '+1', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#999999',
    });
    nextNextLabel.setOrigin(0.5, 0.5);
    this.previewContainer.add(nextNextLabel);

    // Preview background box for NEXT+1 (smaller)
    const previewBg2 = this.add.rectangle(0, CELL_SIZE * 0.7 + 45, CELL_SIZE * 0.5, CELL_SIZE * 0.5, COLORS.DARK, 0.1);
    previewBg2.setStrokeStyle(1, 0x999999);
    this.previewContainer.add(previewBg2);
  }

  private createItemUI(): void {
    const { width, height } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Item bar background
    const barY = height - 70;
    this.add.rectangle(width / 2, barY, width, 100, COLORS.DARK, 0.95);

    // Coins display
    this.add.text(20, barY - 30, '?��', { fontSize: '20px' });
    this.coinsText = this.add.text(50, barY - 30, this.coins.toString(), {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    });

    // Item buttons configuration
    const items: { type: ItemType; icon: string; label: string; cost: number }[] = [
      { type: 'bomb', icon: '💣', label: '폭탄', cost: 100 },
      { type: 'shuffle', icon: '🔀', label: '셔플', cost: 100 },
      { type: 'undo', icon: '🎬', label: '광고', cost: 0 },
    ];

    // Create item buttons
    const buttonWidth = 80;
    const buttonSpacing = 20;
    const totalWidth = items.length * buttonWidth + (items.length - 1) * buttonSpacing;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;

    items.forEach((item, index) => {
      const x = startX + index * (buttonWidth + buttonSpacing);
      const button = this.createItemButton(x, barY + 5, item.type, item.icon, item.label, item.cost);
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
    label: string,
    cost: number
  ): ItemButton {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(0x393E46, 1);
    bg.fillRoundedRect(-35, -30, 70, 60, 8);
    bg.lineStyle(2, 0x555555, 1);
    bg.strokeRoundedRect(-35, -30, 70, 60, 8);
    container.add(bg);

    // Icon
    const iconText = this.add.text(0, -12, icon, {
      fontSize: '24px',
    });
    iconText.setOrigin(0.5, 0.5);
    container.add(iconText);

    // Cost or label
    const costText = cost > 0 ? `${cost}` : label;
    const costColor = cost > 0 ? '#FFD700' : '#4CAF50';
    const labelText = this.add.text(0, 15, costText, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: costColor,
      fontStyle: 'bold',
    });
    labelText.setOrigin(0.5, 0.5);
    container.add(labelText);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, 70, 60, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x4a4a4a, 1);
      bg.fillRoundedRect(-35, -30, 70, 60, 8);
      bg.lineStyle(2, 0xF96D00, 1);
      bg.strokeRoundedRect(-35, -30, 70, 60, 8);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x393E46, 1);
      bg.fillRoundedRect(-35, -30, 70, 60, 8);
      bg.lineStyle(2, 0x555555, 1);
      bg.strokeRoundedRect(-35, -30, 70, 60, 8);
    });

    hitArea.on('pointerdown', () => {
      this.useItem(type, cost);
    });

    return { container, type, cost };
  }

  private useItem(type: ItemType, cost: number): void {
    if (this.isGameOver) return;

    // Check if already in item mode
    if (this.activeItem) {
      this.cancelItemMode();
      return;
    }

    // Check coins for paid items
    if (cost > 0 && this.coins < cost) {
      this.showMessage('코인이 부족합니다!', '#E74C3C');
      return;
    }

    if (type === 'bomb') {
      // Enter bomb selection mode
      this.activeItem = 'bomb';
      this.showItemModeIndicator('블록???�택?�세??(?�� ??��)');
    } else if (type === 'shuffle') {
      // Use shuffle immediately
      if (cost > 0) this.spendCoins(cost);
      if (!this.grid.hasBlocks()) {
        this.showMessage('셔플할 블록이 없습니다!', '#E74C3C');
        return;
      }
      this.grid.shuffle(() => {
        this.showMessage('셔플 완료!', '#4CAF50');
        this.saveGame(); // Save after shuffle
      });
    } else if (type === 'undo') {
      // Watch ad for coins
      this.watchAdForCoins();
    }
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

  private spendCoins(amount: number): void {
    this.coins -= amount;
    this.coinsText.setText(this.coins.toString());
  }

  private addCoins(amount: number): void {
    this.coins += amount;
    this.coinsText.setText(this.coins.toString());

    // Flash animation
    this.tweens.add({
      targets: this.coinsText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
    });
  }

  private watchAdForCoins(): void {
    if (!AdService.isRewardedAdAvailable()) {
      const remaining = AdService.getRewardCooldownRemaining();
      if (remaining > 0) {
        this.showMessage(`${remaining}초 후 가능`, '#F96D00');
      }
      return;
    }

    AdService.showRewarded({
      onLoading: () => {
        this.showMessage('광고 로딩중...', '#F96D00');
      },
      onRewarded: () => {
        const reward = AdService.getRewardAmount();
        this.addCoins(reward);
        this.showMessage(`+${reward} 코인!`, '#4CAF50');
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
  }

  private showNextPreview(): void {
    const { width } = this.cameras.main;
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

    // Create preview blocks at the preview area position
    const previewX = width / 2 + CELL_SIZE + 20;
    const previewY = 180;

    // NEXT block preview
    this.nextBlockPreview = new Block(this, previewX, previewY, this.nextValue);
    this.nextBlockPreview.setScale(0.6);
    this.nextBlockPreview.setAlpha(0);
    this.tweens.add({
      targets: this.nextBlockPreview,
      alpha: 1,
      duration: 150,
      ease: 'Quad.easeOut',
    });

    // NEXT+1 block preview (smaller, below)
    const nextNextY = previewY + CELL_SIZE * 0.7 + 45;
    this.nextNextBlockPreview = new Block(this, previewX, nextNextY, this.nextNextValue);
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

    // If dynamic drop is disabled, always use default start numbers [2, 4]
    if (!settings.dynamicDrop) {
      return START_NUMBERS[Math.floor(Math.random() * START_NUMBERS.length)];
    }

    // Get all unique block values from grid
    const gridValues = this.grid ? this.grid.getUniqueValues() : [];

    // If grid is empty, use default start numbers [2, 4]
    if (gridValues.length === 0) {
      return START_NUMBERS[Math.floor(Math.random() * START_NUMBERS.length)];
    }

    // Use all visible block values as possible drop values
    // This makes gameplay more dynamic as higher numbers can drop
    return gridValues[Math.floor(Math.random() * gridValues.length)];
  }

  private handleInput(pointer: Phaser.Input.Pointer): void {
    if (this.isGameOver || this.isProcessing) return;

    // Handle bomb item mode
    if (this.activeItem === 'bomb') {
      const gridPos = this.grid.getGridPosition(pointer.x, pointer.y);
      if (gridPos && this.grid.getBlockAt(gridPos.col, gridPos.row)) {
        // Found a block to remove
        this.spendCoins(100);
        this.cancelItemMode();
        this.grid.removeBlock(gridPos.col, gridPos.row, () => {
          this.showMessage('블록 제거!', '#F96D00');
          this.saveGame(); // Save after bomb use
        });
      }
      return;
    }

    // Normal block drop
    if (!this.currentBlock) return;

    const { GRID_COLS, CELL_SIZE } = GAME_CONFIG;

    // Calculate column from pointer position
    const col = Math.floor((pointer.x - this.gridX) / CELL_SIZE);

    if (col >= 0 && col < GRID_COLS) {
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

    const row = this.grid.getLowestEmptyRow(col);

    if (row === -1) {
      // Column is full - game over
      this.isProcessing = false;
      this.gameOver();
      return;
    }

    // Animate block drop
    const targetPos = this.grid.getCellPosition(col, row);

    this.tweens.add({
      targets: this.currentBlock,
      x: targetPos.x,
      y: targetPos.y,
      duration: GAME_CONFIG.DROP_DURATION,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        if (this.currentBlock) {
          this.grid.placeBlock(col, row, this.currentBlock);
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
        }
      },
    });
  }

  private checkMergesFromPosition(col: number, row: number, onComplete: () => void): void {
    let comboCount = 0;
    let currentCol = col;
    let currentRow = row;

    const processMerge = () => {
      const merge = this.grid.findMergesFromPosition(currentCol, currentRow);

      if (!merge) {
        // No more merges from current position, check entire grid for chain reactions
        const globalMerges = this.grid.findMerges();
        if (globalMerges.length === 0) {
          onComplete();
          return;
        }
        // Process global merge and continue
        const globalMerge = globalMerges[0];
        comboCount++;
        const score = globalMerge.value * 2 * (comboCount > 1 ? GAME_CONFIG.COMBO_MULTIPLIER : 1);
        this.scoreManager.addScore(Math.floor(score));

        this.grid.performMerge(globalMerge, () => {
          this.grid.applyGravity(() => {
            // Update position after gravity
            currentCol = globalMerge.col;
            currentRow = this.grid.getBlockRow(globalMerge.col, globalMerge.value * 2);
            processMerge();
          });
        });
        return;
      }

      comboCount++;
      const score = merge.value * 2 * (comboCount > 1 ? GAME_CONFIG.COMBO_MULTIPLIER : 1);
      this.scoreManager.addScore(Math.floor(score));

      this.grid.performMerge(merge, () => {
        // Apply gravity and check again from the same position
        this.grid.applyGravity(() => {
          // After gravity, the merged block may have moved down
          currentRow = this.grid.getBlockRow(currentCol, merge.value * 2);
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

    // Clear saved game on game over
    gameStateService.clearSavedGame();

    this.scene.start('GameOverScene', {
      score: this.scoreManager.getScore(),
      bestScore: this.scoreManager.getBestScore(),
    });
  }
}
