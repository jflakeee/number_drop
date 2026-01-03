import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';
import { leaderboardService, LeaderboardEntry } from '@services/LeaderboardService';

// Auto-refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

export class LeaderboardScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;
  private entries: LeaderboardEntry[] = [];
  private myRank: number | null = null;
  private autoRefreshTimer!: Phaser.Time.TimerEvent | null;
  private leaderboardContainer!: Phaser.GameObjects.Container;
  private countdownText!: Phaser.GameObjects.Text;
  private lastRefreshTime: number = 0;

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  async create(): Promise<void> {
    const { width, height } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.DARK);

    // Header
    this.add.rectangle(width / 2, 50, width, 100, 0xF96D00);

    // Title
    this.add.text(width / 2, 50, '🏆 랭킹', {
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
    backBtn.on('pointerdown', () => this.cleanupAndExit());

    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2, '로딩 중...', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);

    // Create container for leaderboard content (for easy refresh)
    this.leaderboardContainer = this.add.container(0, 0);

    // Auto-refresh countdown display
    this.countdownText = this.add.text(width - 20, 105, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(1, 0);

    // Load data
    await this.loadLeaderboard();

    // Start auto-refresh timer
    this.startAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.lastRefreshTime = Date.now();

    // Auto-refresh every 30 seconds
    this.autoRefreshTimer = this.time.addEvent({
      delay: AUTO_REFRESH_INTERVAL,
      callback: this.refreshLeaderboard,
      callbackScope: this,
      loop: true,
    });

    // Update countdown every second
    this.time.addEvent({
      delay: 1000,
      callback: this.updateCountdown,
      callbackScope: this,
      loop: true,
    });
  }

  private updateCountdown(): void {
    const elapsed = Date.now() - this.lastRefreshTime;
    const remaining = Math.max(0, Math.ceil((AUTO_REFRESH_INTERVAL - elapsed) / 1000));
    this.countdownText.setText(`🔄 ${remaining}초`);
  }

  private async refreshLeaderboard(): Promise<void> {
    this.lastRefreshTime = Date.now();

    // Clear existing content
    this.leaderboardContainer.removeAll(true);

    // Show refreshing indicator
    const { width } = this.cameras.main;
    const refreshingText = this.add.text(width / 2, 130, '업데이트 중...', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#F96D00',
    }).setOrigin(0.5, 0.5);
    this.leaderboardContainer.add(refreshingText);

    // Fetch new data
    try {
      const [entries, myRank] = await Promise.all([
        leaderboardService.getTopScores(10),
        leaderboardService.getUserRank(),
      ]);

      this.entries = entries;
      this.myRank = myRank;

      // Clear and redisplay
      this.leaderboardContainer.removeAll(true);
      this.displayLeaderboard();
    } catch (error) {
      console.error('Failed to refresh leaderboard:', error);
      this.leaderboardContainer.removeAll(true);
      this.displayLeaderboard(); // Show cached data
    }
  }

  private cleanupAndExit(): void {
    // Clean up timers
    if (this.autoRefreshTimer) {
      this.autoRefreshTimer.destroy();
      this.autoRefreshTimer = null;
    }
    this.scene.start('MenuScene');
  }

  private async loadLeaderboard(): Promise<void> {
    try {
      // Fetch data in parallel
      const [entries, myRank] = await Promise.all([
        leaderboardService.getTopScores(10),
        leaderboardService.getUserRank(),
      ]);

      this.entries = entries;
      this.myRank = myRank;

      // Hide loading
      this.loadingText.setVisible(false);

      // Display leaderboard
      this.displayLeaderboard();
    } catch (error) {
      this.loadingText.setText('데이터를 불러올 수 없습니다');
    }
  }

  private displayLeaderboard(): void {
    const { width, height } = this.cameras.main;
    const startY = 130;
    const rowHeight = 50;
    const myUserId = leaderboardService.getUserId();

    // Column headers
    const header1 = this.add.text(60, startY, '순위', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888',
    });
    this.leaderboardContainer.add(header1);

    const header2 = this.add.text(130, startY, '닉네임', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888',
    });
    this.leaderboardContainer.add(header2);

    const header3 = this.add.text(width - 60, startY, '점수', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(1, 0);
    this.leaderboardContainer.add(header3);

    // Leaderboard entries
    if (this.entries.length === 0) {
      const noData = this.add.text(width / 2, startY + 80, '아직 기록이 없습니다', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#666666',
      }).setOrigin(0.5, 0.5);
      this.leaderboardContainer.add(noData);
    } else {
      this.entries.forEach((entry, index) => {
        const y = startY + 40 + index * rowHeight;
        const isMe = entry.userId === myUserId;

        // Row background for current user
        if (isMe) {
          const rowBg = this.add.rectangle(width / 2, y, width - 40, rowHeight - 4, 0xF96D00, 0.3)
            .setStrokeStyle(2, 0xF96D00);
          this.leaderboardContainer.add(rowBg);
        }

        // Rank medal
        let rankDisplay: string;
        let rankColor: string;
        if (entry.rank === 1) {
          rankDisplay = '🥇';
          rankColor = '#FFD700';
        } else if (entry.rank === 2) {
          rankDisplay = '🥈';
          rankColor = '#C0C0C0';
        } else if (entry.rank === 3) {
          rankDisplay = '🥉';
          rankColor = '#CD7F32';
        } else {
          rankDisplay = `${entry.rank}`;
          rankColor = isMe ? '#F96D00' : '#FFFFFF';
        }

        // Rank
        const rankText = this.add.text(60, y, rankDisplay, {
          fontFamily: 'Arial Black, Arial',
          fontSize: '20px',
          color: rankColor,
        }).setOrigin(0.5, 0.5);
        this.leaderboardContainer.add(rankText);

        // Username
        const displayName = entry.username + (isMe ? ' (나)' : '');
        const nameText = this.add.text(130, y, displayName, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: isMe ? '#F96D00' : '#FFFFFF',
          fontStyle: isMe ? 'bold' : 'normal',
        }).setOrigin(0, 0.5);
        this.leaderboardContainer.add(nameText);

        // Score
        const scoreText = this.add.text(width - 60, y, entry.score.toLocaleString(), {
          fontFamily: 'Arial Black, Arial',
          fontSize: '18px',
          color: isMe ? '#F96D00' : '#FFFFFF',
        }).setOrigin(1, 0.5);
        this.leaderboardContainer.add(scoreText);
      });
    }

    // My rank section (if not in top 10)
    const inTop10 = this.entries.some(e => e.userId === myUserId);
    if (!inTop10 && this.myRank !== null) {
      const myRankY = height - 100;

      // Separator
      const separator = this.add.rectangle(width / 2, myRankY - 30, width - 40, 2, 0x444444);
      this.leaderboardContainer.add(separator);

      // My rank display
      const myRankText = this.add.text(width / 2, myRankY, `내 순위: ${this.myRank}위`, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '20px',
        color: '#F96D00',
      }).setOrigin(0.5, 0.5);
      this.leaderboardContainer.add(myRankText);
    } else if (this.myRank === null && !inTop10) {
      const myRankY = height - 100;
      const separator = this.add.rectangle(width / 2, myRankY - 30, width - 40, 2, 0x444444);
      this.leaderboardContainer.add(separator);

      const helpText = this.add.text(width / 2, myRankY, '게임을 플레이하여 랭킹에 등록하세요!', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#888888',
      }).setOrigin(0.5, 0.5);
      this.leaderboardContainer.add(helpText);
    }

    // Manual refresh button
    const refreshBtn = this.add.text(width / 2, height - 40, '🔄 즉시 새로고침', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#888888',
      backgroundColor: '#333333',
      padding: { x: 15, y: 8 },
    }).setOrigin(0.5, 0.5);
    refreshBtn.setInteractive({ useHandCursor: true });
    refreshBtn.on('pointerover', () => refreshBtn.setColor('#FFFFFF'));
    refreshBtn.on('pointerout', () => refreshBtn.setColor('#888888'));
    refreshBtn.on('pointerdown', () => this.refreshLeaderboard());
    this.leaderboardContainer.add(refreshBtn);
  }
}
