import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';
import { useSettingsStore } from '@store/settingsStore';

export class SettingsScene extends Phaser.Scene {
  private toggleButtons: Map<string, { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }> = new Map();

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.DARK);

    // Header
    this.add.rectangle(width / 2, 50, width, 100, 0xF96D00);

    // Title
    this.add.text(width / 2, 50, '⚙️ 설정', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '32px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);

    // Back button
    const backBtn = this.add.text(30, 50, '←', {
      fontSize: '32px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Settings content
    const startY = 140;
    const rowHeight = 70;
    let currentY = startY;

    // Section: Audio
    this.createSectionHeader(width / 2, currentY, '사운드');
    currentY += 50;

    this.createToggleRow(width, currentY, '효과음', 'soundEnabled');
    currentY += rowHeight;

    this.createToggleRow(width, currentY, '배경음악', 'musicEnabled');
    currentY += rowHeight;

    // Section: Gameplay
    currentY += 20;
    this.createSectionHeader(width / 2, currentY, '게임플레이');
    currentY += 50;

    this.createToggleRow(width, currentY, '연쇄 병합', 'chainMerge');
    currentY += rowHeight;

    this.createToggleRow(width, currentY, '힌트 표시', 'showHint');
    currentY += rowHeight;

    this.createToggleRow(width, currentY, '동적 드롭', 'dynamicDrop');
    currentY += rowHeight;

    this.createToggleRow(width, currentY, '진동', 'vibrationEnabled');
    currentY += rowHeight;

    // Section: Difficulty
    currentY += 20;
    this.createSectionHeader(width / 2, currentY, '난이도');
    currentY += 50;

    this.createDifficultySelector(width / 2, currentY);
    currentY += rowHeight;

    // Reset button
    currentY += 30;
    this.createResetButton(width / 2, currentY);
  }

  private createSectionHeader(x: number, y: number, text: string): void {
    this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#F96D00',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // Divider line
    const { width } = this.cameras.main;
    this.add.rectangle(width / 2, y + 20, width - 40, 1, 0x444444);
  }

  private createToggleRow(screenWidth: number, y: number, label: string, settingKey: string): void {
    const settings = useSettingsStore.getState();
    const isEnabled = settings[settingKey as keyof typeof settings] as boolean;

    // Label
    this.add.text(40, y, label, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);

    // Toggle button
    const toggleWidth = 70;
    const toggleHeight = 34;
    const toggleX = screenWidth - 60;

    const bg = this.add.rectangle(
      toggleX,
      y,
      toggleWidth,
      toggleHeight,
      isEnabled ? 0xF96D00 : 0x444444,
      1
    ).setStrokeStyle(2, isEnabled ? 0xF96D00 : 0x666666);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(toggleX, y, isEnabled ? 'ON' : 'OFF', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.toggleButtons.set(settingKey, { bg, text });

    bg.on('pointerdown', () => {
      this.toggleSetting(settingKey);
    });
  }

  private toggleSetting(settingKey: string): void {
    const store = useSettingsStore.getState();

    switch (settingKey) {
      case 'soundEnabled':
        store.toggleSound();
        break;
      case 'musicEnabled':
        store.toggleMusic();
        break;
      case 'chainMerge':
        store.toggleChainMerge();
        break;
      case 'showHint':
        store.toggleHint();
        break;
      case 'dynamicDrop':
        store.toggleDynamicDrop();
        break;
      case 'vibrationEnabled':
        store.toggleVibration();
        break;
    }

    // Update visual
    const newState = useSettingsStore.getState();
    const isEnabled = newState[settingKey as keyof typeof newState] as boolean;
    const button = this.toggleButtons.get(settingKey);

    if (button) {
      button.bg.setFillStyle(isEnabled ? 0xF96D00 : 0x444444);
      button.bg.setStrokeStyle(2, isEnabled ? 0xF96D00 : 0x666666);
      button.text.setText(isEnabled ? 'ON' : 'OFF');
    }
  }

  private createDifficultySelector(x: number, y: number): void {
    const settings = useSettingsStore.getState();
    const difficulties: Array<{ key: 'easy' | 'normal' | 'hard'; label: string }> = [
      { key: 'easy', label: '쉬움' },
      { key: 'normal', label: '보통' },
      { key: 'hard', label: '어려움' },
    ];

    const buttonWidth = 90;
    const spacing = 10;
    const totalWidth = difficulties.length * buttonWidth + (difficulties.length - 1) * spacing;
    let startX = x - totalWidth / 2 + buttonWidth / 2;

    const buttons: Map<string, { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }> = new Map();

    difficulties.forEach((diff) => {
      const isSelected = settings.difficulty === diff.key;

      const bg = this.add.rectangle(
        startX,
        y,
        buttonWidth,
        40,
        isSelected ? 0xF96D00 : 0x393E46,
        1
      );
      bg.setInteractive({ useHandCursor: true });

      const text = this.add.text(startX, y, diff.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: isSelected ? 'bold' : 'normal',
      }).setOrigin(0.5, 0.5);

      buttons.set(diff.key, { bg, text });

      bg.on('pointerdown', () => {
        useSettingsStore.getState().setDifficulty(diff.key);

        // Update all difficulty buttons
        buttons.forEach((btn, key) => {
          const selected = key === diff.key;
          btn.bg.setFillStyle(selected ? 0xF96D00 : 0x393E46);
          btn.text.setFontStyle(selected ? 'bold' : 'normal');
        });
      });

      startX += buttonWidth + spacing;
    });
  }

  private createResetButton(x: number, y: number): void {
    const button = this.add.rectangle(x, y, 200, 45, 0xE74C3C, 1);
    button.setInteractive({ useHandCursor: true });

    this.add.text(x, y, '설정 초기화', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);

    button.on('pointerover', () => button.setFillStyle(0xC0392B));
    button.on('pointerout', () => button.setFillStyle(0xE74C3C));

    button.on('pointerdown', () => {
      // Reset to defaults
      const store = useSettingsStore.getState();
      if (!store.soundEnabled) store.toggleSound();
      if (!store.musicEnabled) store.toggleMusic();
      if (!store.chainMerge) store.toggleChainMerge();
      if (store.showHint) store.toggleHint();
      if (!store.dynamicDrop) store.toggleDynamicDrop();
      if (!store.vibrationEnabled) store.toggleVibration();
      store.setDifficulty('normal');

      // Refresh scene
      this.scene.restart();
    });
  }
}
