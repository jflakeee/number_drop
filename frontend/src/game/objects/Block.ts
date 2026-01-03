import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';

// Enhanced block colors matching benchmark game
const BLOCK_COLORS: Record<number, { main: number; light: number; dark: number }> = {
  2: { main: 0xFFE082, light: 0xFFECB3, dark: 0xFFCA28 },      // Yellow
  4: { main: 0xFFD54F, light: 0xFFE082, dark: 0xFFB300 },      // Gold Yellow
  8: { main: 0x81C784, light: 0xA5D6A7, dark: 0x4CAF50 },      // Green
  16: { main: 0xE57373, light: 0xEF9A9A, dark: 0xD32F2F },     // Red
  32: { main: 0xF06292, light: 0xF48FB1, dark: 0xC2185B },     // Pink/Magenta
  64: { main: 0xFFB74D, light: 0xFFCC80, dark: 0xF57C00 },     // Orange
  128: { main: 0xBA68C8, light: 0xCE93D8, dark: 0x8E24AA },    // Purple
  256: { main: 0x64B5F6, light: 0x90CAF9, dark: 0x1976D2 },    // Blue
  512: { main: 0x4FC3F7, light: 0x81D4FA, dark: 0x0288D1 },    // Light Blue
  1024: { main: 0x4DB6AC, light: 0x80CBC4, dark: 0x00897B },   // Teal
  2048: { main: 0xFFD700, light: 0xFFE44D, dark: 0xFFA000 },   // Gold
};

export class Block extends Phaser.GameObjects.Container {
  private value: number;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private blockGraphics: Phaser.GameObjects.Graphics;
  private highlightGraphics: Phaser.GameObjects.Graphics;
  private borderGraphics: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private labelShadow: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    super(scene, x, y);

    this.value = value;
    const { CELL_SIZE } = GAME_CONFIG;
    const size = CELL_SIZE - 6;
    const radius = 8;

    // Create graphics layers
    this.shadowGraphics = scene.add.graphics();
    this.blockGraphics = scene.add.graphics();
    this.highlightGraphics = scene.add.graphics();
    this.borderGraphics = scene.add.graphics();

    // Draw all layers
    this.drawBlock(size, radius);

    // Add graphics to container
    this.add(this.shadowGraphics);
    this.add(this.blockGraphics);
    this.add(this.highlightGraphics);
    this.add(this.borderGraphics);

    // Label shadow for depth effect
    const fontSize = this.getFontSize(value);
    this.labelShadow = scene.add.text(1, 1, value.toString(), {
      fontFamily: 'Arial Black, Arial',
      fontSize: `${fontSize}px`,
      color: '#00000033',
      fontStyle: 'bold',
    });
    this.labelShadow.setOrigin(0.5, 0.5);
    this.add(this.labelShadow);

    // Main label
    const textColor = this.getTextColor(value);
    this.label = scene.add.text(0, 0, value.toString(), {
      fontFamily: 'Arial Black, Arial',
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: 'bold',
    });
    this.label.setOrigin(0.5, 0.5);
    this.add(this.label);

    scene.add.existing(this);
  }

  private drawBlock(size: number, radius: number): void {
    const colors = BLOCK_COLORS[this.value] || { main: 0xCDC1B4, light: 0xD8CFC4, dark: 0xBBADA0 };
    const halfSize = size / 2;

    // Clear previous graphics
    this.shadowGraphics.clear();
    this.blockGraphics.clear();
    this.highlightGraphics.clear();
    this.borderGraphics.clear();

    // 1. Shadow layer (offset down-right)
    this.shadowGraphics.fillStyle(0x000000, 0.2);
    this.shadowGraphics.fillRoundedRect(-halfSize + 3, -halfSize + 3, size, size, radius);

    // 2. Main block with gradient effect (darker at bottom)
    this.blockGraphics.fillStyle(colors.main, 1);
    this.blockGraphics.fillRoundedRect(-halfSize, -halfSize, size, size, radius);

    // 3. Dark bottom edge for 3D effect
    this.blockGraphics.fillStyle(colors.dark, 1);
    this.blockGraphics.fillRoundedRect(-halfSize, -halfSize + size * 0.7, size, size * 0.3, { tl: 0, tr: 0, bl: radius, br: radius });

    // 4. Highlight on top for 3D effect
    this.highlightGraphics.fillStyle(colors.light, 0.6);
    this.highlightGraphics.fillRoundedRect(-halfSize + 4, -halfSize + 4, size - 8, size * 0.35, { tl: radius - 2, tr: radius - 2, bl: 0, br: 0 });

    // 5. Border - Gold for high value blocks (512+)
    if (this.value >= 512) {
      // Gold glowing border for high-value blocks
      this.borderGraphics.lineStyle(4, 0xFFD700, 1);
      this.borderGraphics.strokeRoundedRect(-halfSize, -halfSize, size, size, radius);

      // Inner glow
      this.borderGraphics.lineStyle(2, 0xFFF8DC, 0.5);
      this.borderGraphics.strokeRoundedRect(-halfSize + 2, -halfSize + 2, size - 4, size - 4, radius - 1);
    } else {
      // Normal subtle border
      this.borderGraphics.lineStyle(2, colors.dark, 0.5);
      this.borderGraphics.strokeRoundedRect(-halfSize, -halfSize, size, size, radius);
    }
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: number): void {
    this.value = value;
    const { CELL_SIZE } = GAME_CONFIG;
    const size = CELL_SIZE - 6;
    const radius = 8;

    // Redraw block with new colors
    this.drawBlock(size, radius);

    // Update label
    const fontSize = this.getFontSize(value);
    const textColor = this.getTextColor(value);

    this.label.setText(value.toString());
    this.label.setFontSize(fontSize);
    this.label.setColor(textColor);

    this.labelShadow.setText(value.toString());
    this.labelShadow.setFontSize(fontSize);
  }

  private getFontSize(value: number): number {
    if (value < 100) return 26;
    if (value < 1000) return 20;
    return 16;
  }

  private getTextColor(value: number): string {
    // Light text for darker blocks, dark text for lighter blocks
    if (value <= 4) return '#5D4E37';
    return '#FFFFFF';
  }

  playMergeAnimation(onComplete?: () => void): void {
    // Flash effect
    this.highlightGraphics.setAlpha(1);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: GAME_CONFIG.MERGE_DURATION / 2,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.highlightGraphics.setAlpha(1);
        if (onComplete) onComplete();
      },
    });

    // Highlight flash
    this.scene.tweens.add({
      targets: this.highlightGraphics,
      alpha: 0.3,
      duration: GAME_CONFIG.MERGE_DURATION / 2,
      yoyo: true,
    });
  }

  playSpawnAnimation(): void {
    this.setScale(0);
    this.setAlpha(0);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: GAME_CONFIG.SPAWN_DURATION,
      ease: 'Back.easeOut',
    });
  }
}
