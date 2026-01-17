import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';

// Benchmark-matched block colors (Drop Merge 2048 style)
const BLOCK_COLORS: Record<number, { main: number; light: number; dark: number }> = {
  2: { main: 0x90EE90, light: 0xB8F4B8, dark: 0x6FCF6F },      // 연두색 (Light Green)
  4: { main: 0x4ECDC4, light: 0x7EDDD6, dark: 0x3BABA4 },      // 초록색 (Teal)
  8: { main: 0x45B7D1, light: 0x75CFDF, dark: 0x339AAF },      // 청록색 (Cyan)
  16: { main: 0x5D6BE8, light: 0x8D97F0, dark: 0x4554C9 },     // 파란색 (Blue)
  32: { main: 0xE8875D, light: 0xF0A888, dark: 0xC96B45 },     // 주황색 (Orange)
  64: { main: 0xE85D8C, light: 0xF088A8, dark: 0xC9456E },     // 분홍색 (Pink)
  128: { main: 0x7BA3A8, light: 0x9FBFC3, dark: 0x5F8589 },    // 청회색 (Gray-Teal)
  256: { main: 0xE85DA8, light: 0xF088C3, dark: 0xC94589 },    // 분홍색 (Magenta)
  512: { main: 0x5DE87B, light: 0x88F09D, dark: 0x45C95F },    // 초록색 (Green)
  1024: { main: 0x888888, light: 0xAAAAAA, dark: 0x666666 },   // 회색 (Gray)
  2048: { main: 0xFF8C00, light: 0xFFAA44, dark: 0xCC7000 },   // 주황색 특수 (Orange Special)
  4096: { main: 0x9B59B6, light: 0xB882CC, dark: 0x7D4792 },   // 보라색 특수 (Purple Special)
};

export class Block extends Phaser.GameObjects.Container {
  private value: number;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private blockGraphics: Phaser.GameObjects.Graphics;
  private highlightGraphics: Phaser.GameObjects.Graphics;
  private borderGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private crownText: Phaser.GameObjects.Text | null = null;
  private sparkleParticles: Phaser.GameObjects.Graphics[] = [];
  private glowTween: Phaser.Tweens.Tween | null = null;
  private sparkleTween: Phaser.Tweens.Tween | null = null;
  private label: Phaser.GameObjects.Text;
  private labelShadow: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    super(scene, x, y);

    this.value = value;
    const { CELL_SIZE } = GAME_CONFIG;
    const size = CELL_SIZE - 6;
    const radius = 8;

    // Create graphics layers
    this.glowGraphics = scene.add.graphics();
    this.shadowGraphics = scene.add.graphics();
    this.blockGraphics = scene.add.graphics();
    this.highlightGraphics = scene.add.graphics();
    this.borderGraphics = scene.add.graphics();

    // Draw all layers
    this.drawBlock(size, radius);

    // Add graphics to container (glow behind everything)
    this.add(this.glowGraphics);
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

    // Add special effects for 2048/4096 blocks
    if (this.isSpecialBlock()) {
      this.addCrownIcon();
      this.addSparkleEffect();
      this.startGlowAnimation();
    }

    scene.add.existing(this);
  }

  private isSpecialBlock(): boolean {
    return this.value >= 2048;
  }

  private addCrownIcon(): void {
    const { CELL_SIZE } = GAME_CONFIG;
    const size = CELL_SIZE - 6;

    // Crown emoji above the number
    this.crownText = this.scene.add.text(0, -size / 4 - 2, '👑', {
      fontSize: '14px',
    });
    this.crownText.setOrigin(0.5, 0.5);
    this.add(this.crownText);

    // Adjust label position down slightly to make room for crown
    this.label.setY(6);
    this.labelShadow.setY(7);
  }

  private addSparkleEffect(): void {
    const { CELL_SIZE } = GAME_CONFIG;
    const size = CELL_SIZE - 6;
    const colors = BLOCK_COLORS[this.value] || BLOCK_COLORS[2048];

    // Create sparkle particles at corners
    const sparklePositions = [
      { x: -size / 2 + 8, y: -size / 2 + 8 },
      { x: size / 2 - 8, y: -size / 2 + 8 },
      { x: -size / 2 + 8, y: size / 2 - 8 },
      { x: size / 2 - 8, y: size / 2 - 8 },
    ];

    sparklePositions.forEach(pos => {
      const sparkle = this.scene.add.graphics();
      sparkle.fillStyle(0xFFFFFF, 0.8);
      sparkle.fillCircle(pos.x, pos.y, 3);
      sparkle.fillStyle(colors.light, 0.6);
      sparkle.fillCircle(pos.x, pos.y, 2);
      this.sparkleParticles.push(sparkle);
      this.add(sparkle);
    });

    // Animate sparkles
    this.sparkleTween = this.scene.tweens.add({
      targets: this.sparkleParticles,
      alpha: { from: 1, to: 0.3 },
      scale: { from: 1, to: 0.5 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startGlowAnimation(): void {
    const colors = BLOCK_COLORS[this.value] || BLOCK_COLORS[2048];
    const { CELL_SIZE } = GAME_CONFIG;
    const size = CELL_SIZE - 6;

    // Draw initial glow
    this.drawGlow(size, colors.light, 0.3);

    // Pulse animation for glow
    this.glowTween = this.scene.tweens.add({
      targets: this.glowGraphics,
      alpha: { from: 0.3, to: 0.7 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawGlow(size: number, color: number, alpha: number): void {
    this.glowGraphics.clear();
    const glowSize = size + 12;
    const halfGlow = glowSize / 2;

    // Outer glow
    this.glowGraphics.fillStyle(color, alpha * 0.3);
    this.glowGraphics.fillRoundedRect(-halfGlow, -halfGlow, glowSize, glowSize, 12);

    // Middle glow
    const midSize = size + 6;
    const halfMid = midSize / 2;
    this.glowGraphics.fillStyle(color, alpha * 0.5);
    this.glowGraphics.fillRoundedRect(-halfMid, -halfMid, midSize, midSize, 10);
  }

  private removeSpecialEffects(): void {
    // Stop and remove glow
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    this.glowGraphics.clear();

    // Stop and remove sparkles
    if (this.sparkleTween) {
      this.sparkleTween.stop();
      this.sparkleTween = null;
    }
    this.sparkleParticles.forEach(sparkle => sparkle.destroy());
    this.sparkleParticles = [];

    // Remove crown
    if (this.crownText) {
      this.crownText.destroy();
      this.crownText = null;
    }

    // Reset label position
    this.label.setY(0);
    this.labelShadow.setY(1);
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
    const wasSpecial = this.isSpecialBlock();
    this.value = value;
    const isNowSpecial = this.isSpecialBlock();

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

    // Handle special effects transition
    if (!wasSpecial && isNowSpecial) {
      // Became special - add effects
      this.addCrownIcon();
      this.addSparkleEffect();
      this.startGlowAnimation();
      this.playSpecialBlockAnimation();
    } else if (wasSpecial && !isNowSpecial) {
      // No longer special - remove effects
      this.removeSpecialEffects();
    }
  }

  private playSpecialBlockAnimation(): void {
    // Celebration animation when reaching 2048/4096
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 200,
      yoyo: true,
      repeat: 1,
      ease: 'Bounce.easeOut',
    });

    // Flash effect
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFFFFFF, 0.8);
    flash.fillCircle(0, 0, 40);
    this.add(flash);
    this.sendToBack(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
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

    // Create merge particles
    this.createMergeParticles();

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

  private createMergeParticles(): void {
    const colors = BLOCK_COLORS[this.value] || { main: 0xCDC1B4, light: 0xD8CFC4, dark: 0xBBADA0 };
    const { CELL_SIZE } = GAME_CONFIG;
    const size = CELL_SIZE - 6;

    // Create particles around the block
    const particleCount = 12;
    const particles: Phaser.GameObjects.Graphics[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const startRadius = size / 3;
      const startX = Math.cos(angle) * startRadius;
      const startY = Math.sin(angle) * startRadius;

      // Create particle
      const particle = this.scene.add.graphics();
      particle.fillStyle(colors.light, 1);
      particle.fillCircle(0, 0, 4);
      particle.fillStyle(0xFFFFFF, 0.8);
      particle.fillCircle(0, 0, 2);

      // Position particle
      particle.setPosition(this.x + startX, this.y + startY);
      particles.push(particle);

      // Animate particle outward and fade
      const endRadius = size * 1.5;
      const endX = Math.cos(angle) * endRadius;
      const endY = Math.sin(angle) * endRadius;

      this.scene.tweens.add({
        targets: particle,
        x: this.x + endX,
        y: this.y + endY,
        alpha: 0,
        scale: 0.3,
        duration: GAME_CONFIG.MERGE_DURATION,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }

    // Add a burst effect in the center
    const burstParticle = this.scene.add.graphics();
    burstParticle.fillStyle(0xFFFFFF, 0.8);
    burstParticle.fillCircle(0, 0, size / 2);
    burstParticle.setPosition(this.x, this.y);

    this.scene.tweens.add({
      targets: burstParticle,
      alpha: 0,
      scale: 2.5,
      duration: GAME_CONFIG.MERGE_DURATION / 2,
      ease: 'Quad.easeOut',
      onComplete: () => {
        burstParticle.destroy();
      },
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

  // Hint highlighting methods
  private hintTween: Phaser.Tweens.Tween | null = null;
  private hintGraphics: Phaser.GameObjects.Graphics | null = null;

  showHint(): void {
    if (this.hintGraphics) return; // Already showing hint

    const { CELL_SIZE } = GAME_CONFIG;
    const size = CELL_SIZE - 6;

    // Create hint glow effect
    this.hintGraphics = this.scene.add.graphics();
    this.hintGraphics.lineStyle(4, 0xFFD700, 1);
    this.hintGraphics.strokeRoundedRect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4, 10);
    this.add(this.hintGraphics);
    this.sendToBack(this.hintGraphics);

    // Pulsing animation
    this.hintTween = this.scene.tweens.add({
      targets: this.hintGraphics,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  hideHint(): void {
    if (this.hintTween) {
      this.hintTween.stop();
      this.hintTween = null;
    }
    if (this.hintGraphics) {
      this.hintGraphics.destroy();
      this.hintGraphics = null;
    }
  }
}
