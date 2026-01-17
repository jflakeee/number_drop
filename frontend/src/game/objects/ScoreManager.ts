import Phaser from 'phaser';

const BEST_SCORE_KEY = 'numberdrop_best_score';

export class ScoreManager {
  private scene: Phaser.Scene;
  private score: number = 0;
  private bestScore: number = 0;
  private scoreText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Load best score from storage
    this.bestScore = this.loadBestScore();

    // Score display
    this.scoreText = scene.add.text(x, y, '0', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    this.scoreText.setOrigin(0.5, 0.5);

    // Best score display
    this.bestText = scene.add.text(x, y + 25, `BEST: ${this.bestScore.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#F96D00',
    });
    this.bestText.setOrigin(0.5, 0.5);
  }

  addScore(points: number): void {
    const oldScore = this.score;
    const newScore = this.score + points;
    this.score = newScore;

    // Count-up animation
    this.scene.tweens.addCounter({
      from: oldScore,
      to: newScore,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const value = Math.floor(tween.getValue() ?? 0);
        this.scoreText.setText(value.toLocaleString());
      },
    });

    // Check for new best
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore();

      // Count-up animation for best score
      this.scene.tweens.addCounter({
        from: oldScore,
        to: this.bestScore,
        duration: 400,
        ease: 'Quad.easeOut',
        onUpdate: (tween) => {
          const value = Math.floor(tween.getValue() ?? 0);
          this.bestText.setText(`BEST: ${value.toLocaleString()}`);
        },
      });
    }

    // Pulse animation
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  getScore(): number {
    return this.score;
  }

  setScore(score: number): void {
    this.score = score;
    this.scoreText.setText(this.score.toLocaleString());

    // Check for new best
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore();
      this.bestText.setText(`BEST: ${this.bestScore.toLocaleString()}`);
    }
  }

  getBestScore(): number {
    return this.bestScore;
  }

  private loadBestScore(): number {
    try {
      const saved = localStorage.getItem(BEST_SCORE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveBestScore(): void {
    try {
      localStorage.setItem(BEST_SCORE_KEY, this.bestScore.toString());
    } catch {
      // Storage not available
    }
  }
}
