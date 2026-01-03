import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';
import { leaderboardService } from '@services/LeaderboardService';

interface GameOverData {
  score: number;
  bestScore: number;
}

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private bestScore: number = 0;
  private serverRank: number | null = null;
  private rankText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData): void {
    this.score = data.score || 0;
    this.bestScore = data.bestScore || 0;
    this.serverRank = null;
  }

  async create(): Promise<void> {
    const { width, height } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Submit score to server
    this.submitScoreToServer();

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.DARK);

    // Game Over title
    const title = this.add.text(width / 2, height * 0.25, 'GAME OVER', {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Score box
    const boxY = height * 0.45;
    this.add.rectangle(width / 2, boxY, 250, 150, 0x393E46, 1);

    // Score
    this.add.text(width / 2, boxY - 40, 'SCORE', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#999999',
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, boxY - 10, this.score.toLocaleString(), {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#F96D00',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // Best score
    this.add.text(width / 2, boxY + 30, 'BEST', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#999999',
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, boxY + 55, this.bestScore.toLocaleString(), {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);

    // New best indicator
    if (this.score >= this.bestScore && this.score > 0) {
      this.add.text(width / 2, boxY + 85, 'NEW BEST!', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#F96D00',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
    }

    // Revival button (with ad)
    this.createButton(width / 2, height * 0.65, '📺 부활하기', () => {
      // TODO: Show rewarded ad and revive
    }, true);

    // Retry button
    this.createButton(width / 2, height * 0.73, '다시하기', () => {
      this.scene.start('GameScene');
    });

    // Menu button
    this.createButton(width / 2, height * 0.81, '메인으로', () => {
      this.scene.start('MenuScene');
    });
  }

  private createButton(x: number, y: number, text: string, callback: () => void, isAd: boolean = false): void {
    const button = this.add.rectangle(x, y, 200, 45, isAd ? 0xF96D00 : 0x393E46, 1);
    button.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: isAd ? 'bold' : 'normal',
    });
    buttonText.setOrigin(0.5, 0.5);

    button.on('pointerdown', callback);
  }

  private async submitScoreToServer(): Promise<void> {
    if (this.score <= 0) return;

    try {
      const result = await leaderboardService.submitScore(this.score);
      if (result) {
        this.serverRank = result.rank;
        this.showRank();
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }

  private showRank(): void {
    if (this.serverRank === null) return;

    const { width, height } = this.cameras.main;

    // Remove existing rank text if any
    if (this.rankText) {
      this.rankText.destroy();
    }

    // Show server rank
    this.rankText = this.add.text(width / 2, height * 0.55, `🌍 전체 순위: ${this.serverRank}위`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#4CAF50',
      fontStyle: 'bold',
    });
    this.rankText.setOrigin(0.5, 0.5);

    // Animate
    this.rankText.setAlpha(0);
    this.tweens.add({
      targets: this.rankText,
      alpha: 1,
      y: height * 0.54,
      duration: 300,
      ease: 'Quad.easeOut',
    });
  }
}
