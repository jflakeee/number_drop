import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';

export class LandingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LandingScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.DARK);
    bg.fillRect(0, 0, width, height);

    // Title
    const title = this.add.text(width / 2, height * 0.3, '숫자병합', {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: '#F96D00',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // English subtitle
    const subtitle = this.add.text(width / 2, height * 0.38, 'Number Drop', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#EEEEEE',
    });
    subtitle.setOrigin(0.5);

    // Description
    const description = this.add.text(
      width / 2,
      height * 0.5,
      '같은 숫자를 합쳐서\n더 큰 숫자를 만드세요!',
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#CCCCCC',
        align: 'center',
      }
    );
    description.setOrigin(0.5);

    // Animated blocks showcase (floating blocks)
    this.createFloatingBlocks();

    // Start button
    const startButton = this.createStartButton();

    // Pulse animation for title
    this.tweens.add({
      targets: title,
      scale: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Fade in animation for start button
    startButton.setAlpha(0);
    this.tweens.add({
      targets: startButton,
      alpha: 1,
      duration: 800,
      delay: 500,
      ease: 'Power2',
    });

    // Tap anywhere to start (after a short delay)
    this.time.delayedCall(1000, () => {
      this.input.on('pointerdown', () => {
        this.startGame();
      });
    });
  }

  private createStartButton(): Phaser.GameObjects.Container {
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height * 0.75);

    // Button background
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0xF96D00, 1);
    buttonBg.fillRoundedRect(-100, -30, 200, 60, 10);
    container.add(buttonBg);

    // Button text
    const buttonText = this.add.text(0, 0, '시작하기', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);
    container.add(buttonText);

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(-100, -30, 200, 60);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => {
      this.startGame();
    });

    // Hover effect
    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.1,
        duration: 100,
      });
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 100,
      });
    });

    // Pulse animation
    this.tweens.add({
      targets: container,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return container;
  }

  private createFloatingBlocks(): void {
    const { width, height } = this.cameras.main;
    const blockValues = [2, 4, 8, 16, 32];
    const blockColors = {
      2: 0x90EE90,
      4: 0x4ECDC4,
      8: 0x45B7D1,
      16: 0x5D6BE8,
      32: 0xE8875D,
    };

    // Create floating blocks in background
    for (let i = 0; i < 8; i++) {
      const value = blockValues[i % blockValues.length];
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(height * 0.6, height * 0.9);
      const size = 40;

      const block = this.add.graphics();
      block.fillStyle(blockColors[value as keyof typeof blockColors], 0.3);
      block.fillRoundedRect(-size / 2, -size / 2, size, size, 8);

      const blockText = this.add.text(0, 0, value.toString(), {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      });
      blockText.setOrigin(0.5);
      blockText.setAlpha(0.3);

      const container = this.add.container(x, y);
      container.add([block, blockText]);
      container.setDepth(-1);

      // Floating animation
      this.tweens.add({
        targets: container,
        y: y - 30,
        duration: Phaser.Math.Between(2000, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1000),
      });

      // Rotation animation
      this.tweens.add({
        targets: container,
        angle: Phaser.Math.Between(-10, 10),
        duration: Phaser.Math.Between(1500, 2500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private startGame(): void {
    // Fade out effect
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }
}
