import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';
import { useSettingsStore } from '@store/settingsStore';
import { gameStateService } from '@services/GameStateService';

export class MenuScene extends Phaser.Scene {
  private soundButtonText!: Phaser.GameObjects.Text;
  private soundButton!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.DARK);

    // Title
    const title = this.add.text(width / 2, height * 0.3, 'NUMBER\nDROP', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
    });
    title.setOrigin(0.5, 0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * 0.42, '숫자병합 게임', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#F96D00',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Start button
    this.createButton(width / 2, height * 0.55, '게임 시작', () => {
      this.scene.start('GameScene');
    });

    // Continue button (only show if saved game exists)
    if (gameStateService.hasSavedGame()) {
      this.createButton(width / 2, height * 0.65, '이어하기', () => {
        this.scene.start('GameScene', { continueGame: true });
      });
    }

    // Ranking button
    this.createButton(width / 2, height * 0.75, '🏆 랭킹', () => {
      this.scene.start('LeaderboardScene');
    });

    // Settings button
    this.createSmallButton(width * 0.3, height * 0.88, '설정', () => {
      this.scene.start('SettingsScene');
    });

    // Sound toggle button
    this.createSoundButton(width * 0.7, height * 0.88);
  }

  private createSoundButton(x: number, y: number): void {
    const settings = useSettingsStore.getState();
    const isEnabled = settings.soundEnabled;

    this.soundButton = this.add.rectangle(x, y, 80, 40, isEnabled ? 0xF96D00 : 0x393E46, 1);
    this.soundButton.setInteractive({ useHandCursor: true });

    this.soundButtonText = this.add.text(x, y, isEnabled ? '🔊 ON' : '🔇 OFF', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFFFFF',
    });
    this.soundButtonText.setOrigin(0.5, 0.5);

    this.soundButton.on('pointerdown', () => {
      useSettingsStore.getState().toggleSound();
      const newState = useSettingsStore.getState().soundEnabled;
      this.soundButtonText.setText(newState ? '🔊 ON' : '🔇 OFF');
      this.soundButton.setFillStyle(newState ? 0xF96D00 : 0x393E46);
    });
  }

  private createButton(x: number, y: number, text: string, callback: () => void): void {
    const button = this.add.rectangle(x, y, 200, 50, 0xF96D00, 1);
    button.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5, 0.5);

    button.on('pointerover', () => {
      button.setFillStyle(0xFF8533);
    });

    button.on('pointerout', () => {
      button.setFillStyle(0xF96D00);
    });

    button.on('pointerdown', callback);
  }

  private createSmallButton(x: number, y: number, text: string, callback: () => void): void {
    const button = this.add.rectangle(x, y, 80, 40, 0x393E46, 1);
    button.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFFFFF',
    });
    buttonText.setOrigin(0.5, 0.5);

    button.on('pointerdown', callback);
  }
}
